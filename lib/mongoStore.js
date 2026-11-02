import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const error = (message, status = 503) => Object.assign(new Error(message), { status });
export function useMongo() {
  if (process.env.GAMBIT_LOCAL_STORAGE === "true") return false;
  if (process.env.GAMBIT_STORAGE && !["redis", "mongodb"].includes(process.env.GAMBIT_STORAGE)) throw error("GAMBIT_STORAGE must be mongodb or redis.");
  if (process.env.GAMBIT_STORAGE === "mongodb" && !process.env.MONGODB_URI) throw error("MongoDB selected but MONGODB_URI is missing.");
  return Boolean(process.env.MONGODB_URI) && process.env.GAMBIT_STORAGE !== "redis";
}
const cache = globalThis;
export async function mongoDatabase() {
  const uri = process.env.MONGODB_URI, name = process.env.MONGODB_DB || "chessnexa";
  if (!uri || !/^[a-zA-Z0-9_-]{1,38}$/.test(name)) throw error("Configure MONGODB_URI and MONGODB_DB (1–38 letters, digits, underscores or hyphens).");
  if (!cache.__chessMongo || cache.__chessMongo.uri !== uri || cache.__chessMongo.name !== name) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, writeConcern: { w: "majority" } });
    const entry = { uri, name, client };
    entry.ready = client.connect().then(async () => {
      const db = client.db(name);
      await db.collection("records").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db.collection("historyEntries").createIndex({ key: 1, field: 1 }, { unique: true });
      return db;
    }).catch(async () => { if (cache.__chessMongo === entry) delete cache.__chessMongo; await client.close().catch(() => {}); throw error("MongoDB unavailable. Check credentials and Atlas network access."); });
    cache.__chessMongo = entry;
  }
  return cache.__chessMongo.ready;
}
export async function closeMongo() { const entry = cache.__chessMongo; delete cache.__chessMongo; if (entry) await entry.client.close(); }

// Keep the existing storage API's JSON wire format while storing BSON objects.
export function mongoValue(value) {
  if (typeof value !== "string") return value;
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : value; } catch { return value; }
}
const wireValue = value => typeof value === "string" ? value : JSON.stringify(value);
const userKey = key => typeof key === "string" && /^gambit:user:[a-zA-Z0-9-]{1,100}$/.test(key);
const userPayload = doc => { const { _id, ...user } = doc; return user; };

// Storage compatibility boundary: no Lua is executed. EVAL maps only the two
// existing application compare-and-set operations to atomic MongoDB writes.
export async function mongoCommand(args) {
  try { return await execute(args); }
  catch (cause) { if (cause.status) throw cause; throw error("MongoDB storage operation failed. Check database access and document size."); }
}
async function execute([op, ...args]) {
  const db = await mongoDatabase(), records = db.collection("records"), fields = db.collection("historyEntries"), users = db.collection("users");
  const key = args[0];
  const live = { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
  const find = () => records.findOne({ _id: key, ...live });
  const insert = async (doc) => { try { await records.insertOne(doc); return true; } catch (e) { if (e.code === 11000) return false; throw e; } };
  if (op === "GET") {
    if (userKey(key)) { const user = await users.findOne({ _id: key.slice(12) }); if (user) return JSON.stringify(userPayload(user)); }
    const doc = await find(); return doc?.type === "string" ? wireValue(doc.value) : null;
  }
  if (op === "SET") {
    const [id, value, ...options] = args, ex = options.indexOf("EX"), nx = options.includes("NX");
    if (userKey(id)) {
      const user = mongoValue(value);
      if (!user || typeof user !== "object" || Array.isArray(user) || user.id !== id.slice(12)) throw error("Invalid user document.", 400);
      if (nx && await records.findOne({ _id: id, ...live })) return null;
      try { if (nx) await users.insertOne({ ...user, _id: user.id }); else await users.replaceOne({ _id: user.id }, { ...user, _id: user.id }, { upsert: true }); }
      catch (e) { if (e.code === 11000 && nx) return null; throw e; }
      return "OK";
    }
    const doc = { _id: id, type: "string", value: mongoValue(value), revision: randomUUID(), expiresAt: ex >= 0 ? new Date(Date.now() + Number(options[ex + 1]) * 1000) : null };
    if (nx) { await records.deleteOne({ _id: id, expiresAt: { $lte: new Date() } }); return await insert(doc) ? "OK" : null; }
    await records.replaceOne({ _id: id }, doc, { upsert: true }); return "OK";
  }
  if (op === "EVAL") {
    const [script, count, id, old, next, seconds] = args;
    if (count !== 1 || !script.includes("redis.call('GET'") || !script.includes("redis.call('SET'")) throw error("Unsupported compare-and-set operation.");
    const current = await records.findOne({ _id: id, ...live });
    if (!current && old !== "") return 0;
    if (current && wireValue(current.value) !== old) return 0;
    const doc = { _id: id, type: "string", value: mongoValue(next), revision: randomUUID(), expiresAt: seconds ? new Date(Date.now() + Number(seconds) * 1000) : null };
    if (!current) { await records.deleteOne({ _id: id, expiresAt: { $lte: new Date() } }); return await insert(doc) ? 1 : 0; }
    return (await records.replaceOne({ _id: id, revision: current.revision, ...live }, doc)).modifiedCount;
  }
  if (op === "HSET" || op === "HSETNX") {
    try { await records.updateOne({ _id: key }, { $setOnInsert: { type: "hash", expiresAt: null } }, { upsert: true }); }
    catch (e) { if (e.code !== 11000) throw e; }
    let added = 0;
    for (let i = 1; i < args.length; i += 2) {
      const filter = { key, field: args[i] }, value = mongoValue(args[i + 1]);
      try { const result = await fields.updateOne(filter, op === "HSETNX" ? { $setOnInsert: { value } } : { $set: { value } }, { upsert: true }); added += result.upsertedCount; }
      catch (e) { if (e.code !== 11000 || op !== "HSETNX") throw e; }
    }
    return added;
  }
  if (op === "HGET") { const doc = (await find()) ? await fields.findOne({ key, field: args[1] }) : null; return doc ? wireValue(doc.value) : null; }
  if (op === "HGETALL") return (await find()) ? (await fields.find({ key }).sort({ field: 1 }).toArray()).flatMap(doc => [doc.field, wireValue(doc.value)]) : [];
  if (op === "DEL") { await fields.deleteMany({ key: { $in: args } }); const removedUsers = await users.deleteMany({ _id: { $in: args.filter(userKey).map(key => key.slice(12)) } }); return (await records.deleteMany({ _id: { $in: args } })).deletedCount + removedUsers.deletedCount; }
  if (op === "TYPE") { if (userKey(key) && await users.findOne({ _id: key.slice(12) }, { projection: { _id: 1 } })) return "string"; return (await find())?.type || "none"; }
  if (op === "TTL") { if (userKey(key) && await users.findOne({ _id: key.slice(12) }, { projection: { _id: 1 } })) return -1; const doc = await find(); return !doc ? -2 : doc.expiresAt ? Math.max(0, Math.ceil((doc.expiresAt - Date.now()) / 1000)) : -1; }
  if (op === "EXPIRE") return (await records.updateOne({ _id: key, ...live }, { $set: { expiresAt: new Date(Date.now() + Number(args[1]) * 1000) } })).matchedCount;
  if (op === "SCAN") {
    const pattern = args[args.indexOf("MATCH") + 1], limit = Math.max(1, Math.min(200, Number(args[args.indexOf("COUNT") + 1]) || 100));
    if (!["gambit:*", "gambit:room:*"].includes(pattern)) throw error("Unsupported storage scan.");
    const offset = Number(key); if (!Number.isSafeInteger(offset) || offset < 0) throw error("Invalid scan cursor.", 400);
    const pipeline = [{ $match: { _id: { $regex: pattern === "gambit:*" ? "^gambit:" : "^gambit:room:" }, ...live } }, { $project: { _id: 1 } }];
    if (pattern === "gambit:*") pipeline.push({ $unionWith: { coll: "users", pipeline: [{ $project: { _id: { $concat: ["gambit:user:", "$_id"] } } }] } }, { $group: { _id: "$_id" } });
    pipeline.push({ $sort: { _id: 1 } }, { $skip: offset }, { $limit: limit + 1 });
    const docs = await records.aggregate(pipeline).toArray();
    return [docs.length > limit ? String(offset + limit) : "0", docs.slice(0, limit).map(doc => doc._id)];
  }
  throw error("Unsupported storage operation.");
}
