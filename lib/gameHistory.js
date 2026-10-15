import { promises as fs } from "node:fs";
import path from "node:path";
import { command, useRedis } from "./roomStore.js";

const directory = path.join(process.cwd(), ".gambit-history");
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
  await Promise.all(Object.entries(room.users || {}).map(([color, userId]) => saveGame(userId, {
    id: `friend-${room.id}`, mode: "friend", names: room.names, color,
    moves: room.moves, tc: room.tc, result: room.result,
    outcome: room.winner ? room.winner === color ? "win" : "loss" : "draw",
    finishedAt: room.finishedAt || Date.now(),
  })));
}
