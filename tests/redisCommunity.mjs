import assert from "node:assert/strict";
import { registerPlayer, matchmaking, socialAction } from "../lib/community.js";
import { accessRoom } from "../lib/rooms.js";
const originalFetch = globalThis.fetch;
const values = new Map(), hashes = new Map();
let firstConflict = true;
process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
globalThis.fetch = async (_url, options) => {
  const args = JSON.parse(options.body);
  let result;
  if (args[0] === "GET") result = values.get(args[1]) || null;
  else if (args[0] === "SET") { result = values.has(args[1]) ? null : "OK"; if (result) values.set(args[1], args[2]); }
  else if (args[0] === "EVAL") {
    const [, script, , key, before, after] = args;
    if (firstConflict) { firstConflict = false; result = 0; }
    else if ((values.get(key) || "") === before) { values.set(key, after); result = 1; }
    else result = 0;
  } else if (args[0] === "HSETNX") {
    const hash = hashes.get(args[1]) || new Map();
    result = hash.has(args[2]) ? 0 : 1;
    if (result) hash.set(args[2], args[3]);
    hashes.set(args[1], hash);
  } else throw new Error(`Unexpected test command ${args[0]}`);
  return Response.json({ result });
};
try {
  const users = Array.from({ length: 4 }, (_, index) => ({ id: `redis-community-${index}`, name: `Player ${index}` }));
  await Promise.all(users.map(registerPlayer));
  await Promise.all(users.map((user) => matchmaking(user, { tc: 60 })));
  const statuses = await Promise.all(users.map((user) => socialAction(user)));
  assert.ok(statuses.every((status) => status.active));
  assert.equal(new Set(statuses.map((status) => status.active.id)).size, 2);
  const roomId = statuses[0].active.id;
  const participants = statuses.map((status, index) => status.active.id === roomId ? index : -1).filter((index) => index >= 0);
  assert.equal(participants.length, 2);
  const loser = participants[0], winner = participants[1];
  await accessRoom(roomId, statuses[loser].active.token, { type: "resign" }, users[loser]);
  await Promise.all(participants.map((index) => accessRoom(roomId, statuses[index].active.token, undefined, users[index])));
  const loserProfile = await registerPlayer(users[loser]), winnerProfile = await registerPlayer(users[winner]);
  assert.equal(loserProfile.ratings.bullet, 184); assert.equal(winnerProfile.ratings.bullet, 216);
  assert.equal(loserProfile.ratedCount, 1); assert.equal(winnerProfile.ratedCount, 1);
  assert.equal(hashes.get(`gambit:history:${users[loser].id}`).size, 1);
  console.log("Passed: Redis CAS retries, four-player simultaneous matchmaking, no duplicate seats, concurrent result reads and exactly-once ratings/history.");
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
}
