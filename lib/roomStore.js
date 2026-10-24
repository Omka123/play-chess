import { promises as fs } from "node:fs";
import path from "node:path";

const directory = path.join(process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), ".gambit-rooms");
const queues = new Map();
const storageError = (message, status = 503) => Object.assign(new Error(message), { status });
const redisKey = (id) => `gambit:room:${id}`;
const ttl = (room) => Math.max(1, Math.ceil((room.expires - Date.now()) / 1000));

// Bounded pages allow scheduled workers to progress without one unbounded scan.
export async function roomPage(cursor = "0", limit = 100) {
  if (!/^\d{1,20}$/.test(String(cursor))) throw storageError("Invalid room cursor.", 400);
  limit = Math.max(1, Math.min(200, Number(limit) || 100));
  if (useRedis()) {
    const [next, keys] = await command(["SCAN", String(cursor), "MATCH", "gambit:room:*", "COUNT", limit]);
    return { cursor: String(next), ids: keys.map((key) => key.slice("gambit:room:".length)).filter((id) => /^[a-f0-9]{24}$/.test(id)) };
  }
  let files;
  try { files = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return { cursor: "0", ids: [] }; throw error; }
  const ids = files.filter((entry) => entry.isFile() && /^[a-f0-9]{24}\.json$/.test(entry.name)).map((entry) => entry.name.slice(0, -5)).sort();
  const offset = Number(cursor), end = offset + limit;
  return { cursor: end < ids.length ? String(end) : "0", ids: ids.slice(offset, end) };
}
const compareAndSet = `if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0`;

export function useRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return true;
  if (url || token || process.env.VERCEL) {
    throw storageError("Online games need a database. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the deployment environment, then redeploy.");
  }
  return false;
}

export async function command(args) {
  let response;
  try {
    response = await fetch(process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ""), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch { throw storageError("The game database is unavailable. Please try again shortly."); }
  let data;
  try { data = await response.json(); } catch { throw storageError("The game database returned an invalid response."); }
  if (!response.ok || data.error) {
    // Never expose database response details or credentials to players.
    console.error("Game database request failed", { status: response.status, command: args[0] });
    throw storageError("Could not access the game database. Check the deployment’s database credentials and permissions.");
  }
  return data.result;
}

export async function insertRoom(room, { ifNotExists = false } = {}) {
  if (useRedis()) {
    const result = await command(["SET", redisKey(room.id), JSON.stringify(room), "EX", ttl(room), "NX"]);
    if (result !== "OK" && !ifNotExists) throw storageError("Could not create a game. Please try again.");
    return;
  }
  await fs.mkdir(directory, { recursive: true });
  try { await fs.writeFile(path.join(directory, `${room.id}.json`), JSON.stringify(room), { flag: "wx" }); }
  catch (error) { if (!ifNotExists || error.code !== "EEXIST") throw error; }
}

export async function updateRoom(id, update, { readOnly = false, persistResult = false } = {}) {
  if (useRedis()) {
    // Atomic compare-and-set protects joins, moves and clocks across Vercel instances.
    for (let attempt = 0; attempt < 12; attempt++) {
      const raw = await command(["GET", redisKey(id)]);
      if (!raw) throw storageError("Room not found or expired. Create a new game.", 404);
      const room = JSON.parse(raw);
      const hadResult = Boolean(room.result);
      const result = await update(room);
      if (readOnly && (!persistResult || hadResult || !room.result)) return result;
      const saved = await command(["EVAL", compareAndSet, 1, redisKey(id), raw, JSON.stringify(room), ttl(room)]);
      if (saved === 1) return result;
    }
    throw storageError("The game is busy. Please try again.", 409);
  }
  const previous = queues.get(id) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const file = path.join(directory, `${id}.json`);
    let room;
    try { room = JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") throw storageError("Room not found.", 404); throw error; }
    const hadResult = Boolean(room.result);
    const result = await update(room);
    if (readOnly && (!persistResult || hadResult || !room.result)) return result;
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(room));
    await fs.rename(temporary, file);
    return result;
  });
  queues.set(id, task);
  try { return await task; } finally { if (queues.get(id) === task) queues.delete(id); }
}
