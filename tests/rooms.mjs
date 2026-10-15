import { createRoom, accessRoom } from "../lib/rooms.js";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

const created = [];
try {
  const alice = { id: "alice-test", name: "Alice" };
  const bob = { id: "bob-test", name: "Bob" };
  const accountGame = await createRoom({ name: "Forged name", color: "w" }, alice);
  created.push(accountGame.id);
  assert.equal(accountGame.names.w, "Alice");
  await assert.rejects(accessRoom(accountGame.id, accountGame.token), /Sign in/);
  await assert.rejects(accessRoom(accountGame.id, accountGame.token, undefined, bob), /Sign in/);
  await assert.rejects(accessRoom(accountGame.id, accountGame.invite, { type: "join" }, alice), /different account/);
  const accountGuest = await accessRoom(accountGame.id, accountGame.invite, { type: "join", name: "Forged opponent" }, bob);
  assert.equal(accountGuest.names.b, "Bob");
  assert.equal(accountGuest.users, undefined);
  assert.equal(accountGuest.email, undefined);
  assert.equal((await accessRoom(accountGame.id, accountGame.token, { type: "move", from: "e2", to: "e4", ply: 0 }, alice)).moves.length, 1);
  await assert.rejects(accessRoom(accountGame.id, accountGuest.token, { type: "resign" }), /Sign in/);
  assert.equal((await accessRoom(accountGame.id, accountGuest.token, { type: "resign" }, bob)).result.title, "Alice wins");
  const host = await createRoom({ name: "Host", color: "w", tc: 300 });
  created.push(host.id);
  assert.equal((await accessRoom(host.id, host.token)).joined, false);
  const guest = await accessRoom(host.id, host.invite, { type: "join", name: "Guest" });
  assert.equal(guest.color, "b");
  assert.equal(guest.invite, undefined);
  await assert.rejects(accessRoom(host.id, host.invite, { type: "join" }), /two players/);
  await assert.rejects(accessRoom(host.id, "bad"), /session/);
  await assert.rejects(accessRoom(host.id, guest.token, { type: "move", from: "e7", to: "e5", ply: 0 }), /turn/);
  await assert.rejects(accessRoom(host.id, host.token, { type: "move", from: "e2", to: "e5", ply: 0 }), /legal/);
  const first = await accessRoom(host.id, host.token, { type: "move", from: "e2", to: "e4", ply: 0 });
  assert.equal(first.moves[0].san, "e4");
  await assert.rejects(accessRoom(host.id, guest.token, { type: "move", from: "e7", to: "e5", ply: 0 }), /position changed/);
  const second = await accessRoom(host.id, guest.token, { type: "move", from: "e7", to: "e5", ply: 1 });
  assert.equal(second.moves.length, 2);
  assert.ok(second.clocks.w <= 300000);
  assert.equal((await accessRoom(host.id, guest.token, { type: "resign" })).result.title, "Host wins");
  await assert.rejects(accessRoom(host.id, host.token, { type: "move", from: "g1", to: "f3", ply: 2 }), /not active/);

  const mate = await createRoom({ name: "White", color: "w", tc: 0 });
  created.push(mate.id);
  const black = await accessRoom(mate.id, mate.invite, { type: "join", name: "Black" });
  const sequence = [["f2", "f3"], ["e7", "e5"], ["g2", "g4"], ["d8", "h4"]];
  let result;
  for (let ply = 0; ply < sequence.length; ply++) {
    result = await accessRoom(mate.id, ply % 2 ? black.token : mate.token,
      { type: "move", from: sequence[ply][0], to: sequence[ply][1], ply });
  }
  assert.equal(result.result.title, "Black wins");
  assert.equal(result.result.detail, "Checkmate.");

  // Persisted clocks remain authoritative after reconnecting.
  const timed = await createRoom({ name: "White", color: "w", tc: 180 });
  created.push(timed.id);
  await accessRoom(timed.id, timed.invite, { type: "join", name: "Black" });
  const file = path.join(process.cwd(), ".gambit-rooms", `${timed.id}.json`);
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  data.updated = Date.now() - 181000;
  await fs.writeFile(file, JSON.stringify(data));
  assert.equal((await accessRoom(timed.id, timed.token)).result.title, "Black wins");
  console.log("Passed: invites, sessions, turn order, legal moves, stale moves, resignation, checkmate, and clock expiry.");
} finally {
  for (const userId of ["alice-test", "bob-test"]) {
    for (const id of created) {
      await fs.unlink(path.join(process.cwd(), ".gambit-history", userId, `friend-${id}.json`)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
  }
  for (const id of created) await fs.unlink(path.join(process.cwd(), ".gambit-rooms", `${id}.json`));
}
