// Explicit opt-in integration test. Creates only isolated, uniquely named test
// databases; never changes the application's configured database or source.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
process.env.GAMBIT_STORAGE = "mongodb";
process.env.MONGODB_DB = `chessnexa_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const { mongoCommand: run, mongoDatabase, closeMongo } = await import("../lib/mongoStore.js");
const { upgradeMongoDocuments } = await import("../lib/mongoSchema.js");
const { adminOverview } = await import("../lib/admin.js");
const { communityTransaction } = await import("../lib/communityStore.js");
const { saveGame, listGames } = await import("../lib/gameHistory.js");
const { ensureGoogleUser } = await import("../lib/users.js");
const { insertRoom, updateRoom, roomPage } = await import("../lib/roomStore.js");
const { collectSnapshot, restoreSnapshot } = await import("../lib/backups.js");
let passed = false;
try {
  assert.equal(await run(["SET", "gambit:community:fixture", "first", "NX"]), "OK");
  assert.equal(await run(["SET", "gambit:community:fixture", "second", "NX"]), null);
  const user = await ensureGoogleUser({ sub: "mongo-isolated-test", email_verified: true, name: "Fixture", email: "fixture@example.invalid" });
  assert.equal((await ensureGoogleUser({ sub: "mongo-isolated-test", email_verified: true })).id, user.id);
  const db = await mongoDatabase();
  const nativeUser = await db.collection("users").findOne({ _id: user.id });
  assert.equal(nativeUser.email, "fixture@example.invalid");
  assert.equal(nativeUser.value, undefined);
  process.env.ADMIN_USER_ID = user.id; process.env.ADMIN_EMAIL = user.email;
  const adminData = await adminOverview(user, { search: user.email });
  assert.equal(adminData.users.length, 1);
  assert.equal(adminData.users[0].email, user.email);
  assert.equal(adminData.users[0].isOwner, true);
  assert.equal((await adminOverview(user, { search: ".*" })).users.length, 0);
  assert.equal(await db.collection("records").countDocuments({ _id: `gambit:user:${user.id}` }), 0);
  const legacyUser = { id: "legacy-fixture", name: "Legacy", email: "legacy@example.invalid", createdAt: "2026-01-01" };
  await db.collection("records").insertOne({ _id: "gambit:user:legacy-fixture", type: "string", value: JSON.stringify(legacyUser), revision: "legacy" });
  await db.collection("historyEntries").insertOne({ key: "gambit:history:legacy-fixture", field: "legacy", value: '{"id":"legacy","moves":[]}' });
  await run(["HSETNX", "gambit:history:legacy-fixture", "other", '{"id":"other"}']);
  assert.equal((await upgradeMongoDocuments()).users, 1);
  assert.equal((await upgradeMongoDocuments({ apply: true })).users, 1);
  assert.equal((await upgradeMongoDocuments({ apply: true })).users, 0);
  assert.deepEqual(JSON.parse(await run(["GET", "gambit:user:legacy-fixture"])), legacyUser);
  assert.equal(typeof (await db.collection("historyEntries").findOne({ field: "legacy" })).value, "object");
  await communityTransaction(s => { s.counter = 0; });
  await Promise.all(Array.from({ length: 8 }, () => communityTransaction(s => { s.counter++; })));
  assert.equal(await communityTransaction(s => s.counter, { readOnly: true }), 8);
  assert.equal(typeof (await db.collection("records").findOne({ _id: "gambit:community:v1" })).value, "object");
  await Promise.all(Array.from({ length: 5 }, () => saveGame(user.id, { id: "fixture", finishedAt: 1, moves: [] })));
  assert.equal((await listGames(user.id)).length, 1);
  const id = "abcdef0123456789abcdef01";
  await insertRoom({ id, expires: Date.now() + 60000, moves: [] });
  await Promise.all([updateRoom(id, r => { r.moves.push("a"); }), updateRoom(id, r => { r.moves.push("b"); })]);
  assert.equal(await updateRoom(id, r => r.moves.length, { readOnly: true }), 2);
  assert.deepEqual((await roomPage()).ids, [id]);
  assert.ok((await run(["TTL", `gambit:room:${id}`])) > 0);
  const expired = "gambit:room:abcdef0123456789abcdef02";
  await run(["SET", expired, "expired", "EX", -1]);
  assert.equal(await run(["GET", expired]), null);
  const snapshot = await collectSnapshot();
  assert.equal(snapshot.backend, "mongodb");
  assert.equal((await restoreSnapshot(snapshot)).dryRun, true);
  assert.ok(snapshot.entries.some(e => e.type === "hash" && e.value.includes("fixture")));
  assert.ok(snapshot.entries.some(e => e.key === "gambit:community:v1"));
  let cursor = "0"; const scanned = [];
  do { const page = await run(["SCAN", cursor, "MATCH", "gambit:*", "COUNT", 1]); cursor = page[0]; scanned.push(...page[1]); } while (cursor !== "0");
  assert.equal(new Set(scanned).size, snapshot.entries.length);
  await run(["DEL", `gambit:history:${user.id}`]);
  assert.equal((await listGames(user.id)).length, 0);
  passed = true;
} catch (error) { console.error("MongoDB integration failed", { name: error.name, status: error.status, code: error.code, detail: error.message.replace(/mongodb[^\s]+/g, "[redacted]").slice(0, 300) }); process.exitCode = 1; }
finally {
  // Delete only fixture keys from the uniquely generated test database.
  try { let cursor = "0"; const keys = []; do { const page = await run(["SCAN", cursor, "MATCH", "gambit:*", "COUNT", 100]); cursor = page[0]; keys.push(...page[1]); } while (cursor !== "0"); if (keys.length) await run(["DEL", ...keys]); } catch (error) { console.error("Isolated fixture cleanup failed", { status: error.status, detail: error.message }); process.exitCode = 1; }
  await closeMongo();
}
if (passed && !process.exitCode) console.log("Passed MongoDB: accounts, atomic concurrent community/room updates, idempotent history, expiry, room scan, backups and isolated fixture cleanup.");
