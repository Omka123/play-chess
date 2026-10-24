import { promises as fs } from "node:fs";
import path from "node:path";
import { command, useRedis } from "./roomStore.js";
import { settleRatedGame } from "./community.js";
import { assertAccountActive, isReplayHidden } from "./moderation.js";
import { communityTransaction } from "./communityStore.js";

const directory = path.join(process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), ".gambit-history");
function check(userId, id) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(userId) || (id && !/^[a-zA-Z0-9-]{1,100}$/.test(id))) throw new Error("Invalid history identifier.");
}
export async function saveGame(userId, game) {
  check(userId, game.id);
  const value = JSON.stringify(game);
  if (useRedis()) { await command(["HSETNX", `gambit:history:${userId}`, game.id, value]); return; }
  const folder = path.join(directory, userId);
  await fs.mkdir(folder, { recursive: true });
  try { await fs.writeFile(path.join(folder, `${game.id}.json`), value, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
export async function listGames(userId) {
  check(userId);
  let games;
  if (useRedis()) {
    const data = await command(["HGETALL", `gambit:history:${userId}`]);
    games = [];
    for (let i = 1; i < data.length; i += 2) games.push(JSON.parse(data[i]));
  } else {
    const folder = path.join(directory, userId);
    let files;
    try { files = await fs.readdir(folder); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    games = await Promise.all(files.filter((file) => /^[a-zA-Z0-9-]+\.json$/.test(file)).map(async (file) => JSON.parse(await fs.readFile(path.join(folder, file), "utf8"))));
  }
  return games.sort((a, b) => b.finishedAt - a.finishedAt);
}

export async function archiveRoom(room) {
  if (!room.result) return;
  const rating = await settleRatedGame(room);
  const deleted = await communityTransaction((state) => Object.values(room.users || {}).filter((id) => state.players[id]?.deleted), { readOnly: true });
  await Promise.all(Object.entries(room.users || {}).filter(([, userId]) => !deleted.includes(userId)).map(([color, userId]) => saveGame(userId, {
    id: `friend-${room.id}`, mode: "friend", names: room.names, color,
    moves: room.moves, tc: room.tc, increment: room.increment || 0, rated: Boolean(room.rated), rating: rating ? { category: rating.category, before: rating.before[color], after: rating.after[color], change: rating.after[color] - rating.before[color] } : null, dailyDays: room.dailyDays || null, result: room.result, opponentId: room.users?.[color === "w" ? "b" : "w"] || null,
    outcome: room.winner ? room.winner === color ? "win" : "loss" : "draw",
    finishedAt: room.finishedAt || Date.now(),
  })));
}

export async function shareGame(userId, gameId) {
  await assertAccountActive({ id: userId });
  const game = (await listGames(userId)).find((entry) => entry.id === gameId);
  if (!game) throw Object.assign(new Error("Game not found."), { status: 404 });
  const { randomBytes } = await import("node:crypto");
  const id = randomBytes(24).toString("hex");
  const { opponentId, ...publicGame } = game;
  await saveGame("shared", { ...publicGame, id });
  await communityTransaction((state) => { state.replayOwners ||= {}; state.replayOwners[id] = userId; });
  return id;
}
export async function sharedGame(id) {
  if (!/^[a-f0-9]{48}$/.test(id)) return null;
  if (await isReplayHidden(id)) return null;
  if (useRedis()) { const value = await command(["HGET", "gambit:history:shared", id]); return value ? JSON.parse(value) : null; }
  try { return JSON.parse(await fs.readFile(path.join(directory, "shared", `${id}.json`), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
