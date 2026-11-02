import nextEnv from "@next/env";
import { createHash } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const source = process.argv.find(v => v.startsWith("--source="))?.split("=")[1];
const apply = process.argv.includes("--apply");
const verify = process.argv.includes("--verify");
if (apply && verify) { console.error("Choose --apply or --verify."); process.exit(1); }
if (!["redis", "local"].includes(source)) { console.error("Use --source=redis or --source=local; --apply copies to an empty MongoDB database. Stop application writes first."); process.exit(1); }
process.env.GAMBIT_STORAGE = "redis";
const { collectSnapshot } = await import("../lib/backups.js");
const { mongoCommand, mongoDatabase, closeMongo } = await import("../lib/mongoStore.js");
try {
  if (source === "redis" && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) throw Error("Redis source credentials are missing.");
  const snapshot = await collectSnapshot({ redis: source === "redis" });
  const fingerprint = snapshot => createHash("sha256").update(JSON.stringify(snapshot.entries.map(e => [e.key || e.file, e.type || "file", Array.isArray(e.value) ? Array.from({ length: e.value.length / 2 }, (_, i) => [e.value[i * 2], e.value[i * 2 + 1]]).sort(([a], [b]) => a.localeCompare(b)) : e.value]).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
  const entries = [];
  for (const entry of snapshot.entries) {
    if (source === "redis") { if (entry.ttl !== -2) entries.push(entry); continue; }
    const parts = entry.file.split("/"), id = parts.at(-1).replace(/\.json$/, "");
    if (parts[0] === ".gambit-community" && parts[1] === "state.json") entries.push({ key: "gambit:community:v1", type: "string", value: entry.value, ttl: -1 });
    else if (parts[0] === ".gambit-users" && parts.length === 2) entries.push({ key: `gambit:user:${id}`, type: "string", value: entry.value, ttl: -1 });
    else if (parts[0] === ".gambit-rooms" && parts.length === 2) { const room = JSON.parse(entry.value); if (room.expires > Date.now()) entries.push({ key: `gambit:room:${id}`, type: "string", value: entry.value, ttl: Math.ceil((room.expires - Date.now()) / 1000) }); }
    else if (parts[0] === ".gambit-history" && parts.length === 3) { const key = `gambit:history:${parts[1]}`; let item = entries.find(e => e.key === key); if (!item) { item = { key, type: "hash", value: [], ttl: -1 }; entries.push(item); } item.value.push(id, entry.value); }
    else throw Error("Unrecognized local data file.");
  }
  const db = await mongoDatabase();
  const existing = await db.collection("records").countDocuments({}), orphaned = await db.collection("historyEntries").countDocuments({}), nativeUsers = await db.collection("users").countDocuments({});
  console.log(JSON.stringify({ mode: apply ? "copy" : verify ? "verify" : "dry-run", source, sourceRecords: entries.length, destinationRecords: existing, destinationHistoryEntries: orphaned }));
  if (verify) {
    const normalize = value => Array.isArray(value) ? JSON.stringify(Array.from({ length: value.length / 2 }, (_, i) => [value[i * 2], value[i * 2 + 1]]).sort(([a], [b]) => a.localeCompare(b))) : value;
    let checked = 0;
    for (const entry of entries) {
      if (entry.ttl >= 0 && entry.ttl * 1000 <= Date.now() - snapshot.createdAt) continue;
      const actual = await mongoCommand([entry.type === "string" ? "GET" : "HGETALL", entry.key]);
      if (normalize(actual) !== normalize(entry.value)) throw Object.assign(Error("Source and MongoDB differ. Do not cut over; pause writes and copy into a fresh database."), { status: 409 });
      checked++;
    }
    if (fingerprint(snapshot) !== fingerprint(await collectSnapshot({ redis: source === "redis" }))) throw Object.assign(Error("Source changed during verification. Pause writes and retry."), { status: 409 });
    console.log(JSON.stringify({ verifiedSourceRecords: checked, sourceStableDuringVerification: true }));
  }
  if (apply) {
    if (existing || orphaned || nativeUsers) throw Object.assign(Error("Destination is not empty. Choose a new MONGODB_DB; existing data will not be overwritten."), { status: 409 });
    let copied = 0, expired = 0;
    const normalize = value => Array.isArray(value) ? JSON.stringify(Array.from({ length: value.length / 2 }, (_, i) => [value[i * 2], value[i * 2 + 1]]).sort(([a], [b]) => a.localeCompare(b))) : value;
    for (const entry of entries) {
      const ttl = entry.ttl >= 0 ? Math.floor(entry.ttl - (Date.now() - snapshot.createdAt) / 1000) : -1;
      if (entry.ttl >= 0 && ttl <= 0) { expired++; continue; }
      if (entry.type === "string") await mongoCommand(["SET", entry.key, entry.value, "NX", ...(ttl > 0 ? ["EX", ttl] : [])]);
      else if (entry.type === "hash") { if (entry.value.length) await mongoCommand(["HSET", entry.key, ...entry.value]); else continue; if (ttl > 0) await mongoCommand(["EXPIRE", entry.key, ttl]); }
      else throw Error("Unsupported source record type.");
      const actual = await mongoCommand([entry.type === "string" ? "GET" : "HGETALL", entry.key]);
      if (normalize(actual) !== normalize(entry.value)) throw Error("Copied record verification failed.");
      copied++;
    }
    const after = await collectSnapshot({ redis: source === "redis" });
    const sourceStable = fingerprint(snapshot) === fingerprint(after);
    console.log(JSON.stringify({ verifiedCopiedRecords: copied, expiredSkipped: expired, sourceStableDuringCopy: sourceStable, originalSourceUnchanged: true }));
    if (!sourceStable) throw Object.assign(Error("Source changed during migration. Do not switch storage. Pause all source writes and retry with a new empty destination database."), { status: 409 });
  }
} catch (error) { console.error(error.status ? error.message : "Migration failed. Check source/Atlas access and keep the original source active."); process.exitCode = 1; }
finally { await closeMongo(); }
