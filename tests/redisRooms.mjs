import assert from "node:assert/strict";
import { createRoom, accessRoom } from "../lib/rooms.js";

const originalFetch = globalThis.fetch;
const values = new Map();
let conflict = true;
const commands = [];
process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
process.env.VERCEL = "1";
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://redis.test");
  assert.equal(options.headers.Authorization, "Bearer test-only");
  const args = JSON.parse(options.body);
  commands.push(args[0]);
  let result;
  if (args[0] === "SET") {
    assert.equal(args[3], "EX");
    assert.ok(args[4] > 0 && args[4] <= 86400);
    assert.equal(args[5], "NX");
    result = values.has(args[1]) ? null : "OK";
    if (result) values.set(args[1], args[2]);
  } else if (args[0] === "GET") result = values.get(args[1]) || null;
  else if (args[0] === "EVAL") {
    assert.equal(args[2], 1);
    if (conflict) { conflict = false; result = 0; }
    else if (values.get(args[3]) === args[4]) { values.set(args[3], args[5]); result = 1; }
    else result = 0;
  } else throw new Error("Unexpected Redis command");
  return Response.json({ result });
};

try {
  const host = await createRoom({ name: "Host", color: "w", tc: 300 });
  assert.equal(host.color, "w");
  assert.equal(host.joined, false);
  assert.deepEqual(host.moves, []);
  const guest = await accessRoom(host.id, host.invite, { type: "join", name: "Guest" });
  assert.equal(guest.color, "b");
  assert.equal(guest.invite, undefined);
  const outcomes = await Promise.allSettled([
    accessRoom(host.id, host.token, { type: "move", from: "e2", to: "e4", ply: 0 }),
    accessRoom(host.id, host.token, { type: "move", from: "d2", to: "d4", ply: 0 }),
  ]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  commands.length = 0;
  const storedBefore = values.get(`gambit:room:${host.id}`);
  const room = await accessRoom(host.id, guest.token);
  assert.deepEqual(commands, ["GET"]);
  assert.equal(values.get(`gambit:room:${host.id}`), storedBefore);
  assert.equal(room.moves.length, 1);
  await assert.rejects(accessRoom(host.id, host.invite, { type: "join" }), /two players/);
  await assert.rejects(accessRoom(host.id, "bad"), /session/);
  const raw = JSON.parse(values.get(`gambit:room:${host.id}`));
  raw.updated = Date.now() - 301000;
  values.set(`gambit:room:${host.id}`, JSON.stringify(raw));
  assert.equal((await accessRoom(host.id, guest.token)).result.title, "Host wins");
  assert.equal((await accessRoom(host.id, guest.token)).result.title, "Host wins");
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await assert.rejects(createRoom({}), /Set UPSTASH_REDIS/);
  delete process.env.UPSTASH_REDIS_REST_URL;
  await assert.rejects(createRoom({}), /Set UPSTASH_REDIS/);
  console.log("Passed: Redis REST storage, CAS retries, concurrent moves, private sessions, clocks, TTL, and Vercel configuration errors.");
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL;
}
