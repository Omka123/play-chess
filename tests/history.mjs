import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { saveGame, listGames, archiveRoom } from "../lib/gameHistory.js";

const user = `test-${randomUUID()}`, opponent = `test-${randomUUID()}`;
const id = randomUUID();
try {
  assert.deepEqual(await listGames(user), []);
  await saveGame(user, { id, finishedAt: 1, outcome: "win" });
  await saveGame(user, { id, finishedAt: 2, outcome: "loss" });
  assert.equal((await listGames(user)).length, 1);
  assert.equal((await listGames(user))[0].outcome, "win");
  assert.deepEqual(await listGames(opponent), []);
  await archiveRoom({ id, users: { w: user, b: opponent }, names: { w: "Alice", b: "Bob" }, moves: [], tc: 0, result: { title: "Alice wins", detail: "Checkmate." }, winner: "w", finishedAt: 3, tokens: { w: "secret" } });
  assert.equal((await listGames(user))[0].outcome, "win");
  assert.equal((await listGames(opponent))[0].outcome, "loss");
  assert.equal((await listGames(opponent))[0].tokens, undefined);
  await assert.rejects(listGames("../private"), /Invalid/);
  console.log("Passed: persistent history, duplicate saves, private account lists, opponent outcomes, and identifier validation.");
} finally {
  for (const userId of [user, opponent]) for (const gameId of [id, `friend-${id}`]) await fs.unlink(path.join(process.cwd(), ".gambit-history", userId, `${gameId}.json`)).catch((error) => { if (error.code !== "ENOENT") throw error; });
}
