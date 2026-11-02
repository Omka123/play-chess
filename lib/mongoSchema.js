import { isDeepStrictEqual } from "node:util";
import { mongoDatabase, mongoValue } from "./mongoStore.js";

// Re-runnable conversion. Stop application writes before applying schema changes.
// Each legacy record is removed only after an equivalent native user is verified.
export async function upgradeMongoDocuments({ apply = false } = {}) {
  const db = await mongoDatabase(), records = db.collection("records"), users = db.collection("users"), history = db.collection("historyEntries");
  const counts = { users: 0, records: 0, historyEntries: 0, applied: apply };
  for await (const doc of records.find({ type: "string" })) {
    const value = mongoValue(doc.value);
    if (/^gambit:user:[a-zA-Z0-9-]{1,100}$/.test(doc._id)) {
      if (!value || typeof value !== "object" || Array.isArray(value) || value.id !== doc._id.slice(12)) throw Error("Invalid legacy user; conversion stopped without removing it.");
      if (apply) {
        try { await users.insertOne({ ...value, _id: value.id }); } catch (e) { if (e.code !== 11000) throw e; }
        const { _id, ...stored } = await users.findOne({ _id: value.id });
        if (!isDeepStrictEqual(stored, value)) throw Error("Native and legacy user differ; both were preserved. Pause writes and resolve before retrying.");
        const result = await records.deleteOne({ _id: doc._id, revision: doc.revision, value: doc.value });
        if (!result.deletedCount) throw Error("Legacy user changed during conversion; pause writes and retry.");
      }
      counts.users++;
    } else if (typeof doc.value === "string" && value && typeof value === "object") {
      if (apply && !(await records.updateOne({ _id: doc._id, revision: doc.revision, value: doc.value }, { $set: { value } })).matchedCount) throw Error("Record changed during conversion; retry after pausing writes.");
      counts.records++;
    }
  }
  for await (const doc of history.find({ value: { $type: "string" } })) {
    const value = mongoValue(doc.value);
    if (!value || typeof value !== "object") continue;
    if (apply && !(await history.updateOne({ _id: doc._id, value: doc.value }, { $set: { value } })).matchedCount) throw Error("History changed during conversion; retry after pausing writes.");
    counts.historyEntries++;
  }
  return counts;
}
