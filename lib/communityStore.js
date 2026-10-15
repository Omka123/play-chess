import { promises as fs } from "node:fs";
import path from "node:path";
import { command, useRedis } from "./roomStore.js";

const file = path.join(process.env.GAMBIT_TEST_STORAGE || process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), ".gambit-community", "state.json");
const key = "gambit:community:v1";
const initial = () => ({ players: {}, queue: {}, matches: {}, rooms: {}, challenges: {}, ratedGames: {} });
const cas = `local old = redis.call('GET', KEYS[1])
if (not old and ARGV[1] == '') or old == ARGV[1] then
 redis.call('SET', KEYS[1], ARGV[2]); return 1
end
return 0`;
let pending = Promise.resolve();

// Callbacks must have no side effects: Redis may retry after a competing update.
export async function communityTransaction(update, { readOnly = false } = {}) {
  if (useRedis()) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const raw = await command(["GET", key]);
      const state = raw ? JSON.parse(raw) : initial();
      const result = update(state);
      const next = JSON.stringify(state);
      if (readOnly || next === raw || await command(["EVAL", cas, 1, key, raw || "", next]) === 1) return result;
    }
    throw Object.assign(new Error("Players are busy. Please try again."), { status: 409 });
  }
  const task = pending.catch(() => {}).then(async () => {
    let state;
    try { state = JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; state = initial(); }
    const result = update(state);
    if (!readOnly) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
      await fs.rename(`${file}.tmp`, file);
    }
    return result;
  });
  pending = task;
  return task;
}
