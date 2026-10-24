import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";
import { command, useRedis } from "./roomStore.js";
const folders = [".gambit-users", ".gambit-community", ".gambit-history", ".gambit-rooms"];
const aad = Buffer.from("chessnexa-backup-v1");
function keyBuffer(key) { const buffer = Buffer.from(key || "", "base64"); if (buffer.length !== 32) throw new Error("GAMBIT_BACKUP_KEY must be 32 random bytes encoded as base64."); return buffer; }
function allowedFile(file) { const pieces = file.split("/"); return folders.includes(pieces[0]) && pieces.length >= 2 && pieces.every((part) => /^[a-zA-Z0-9._-]+$/.test(part) && part !== "." && part !== "..") && pieces.at(-1).endsWith(".json"); }
export async function collectSnapshot({ root = process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), redis = useRedis(), run = command } = {}) {
  const entries = []; let bytes = 0;
  if (redis) {
    let cursor = "0"; const seen = new Set();
    do { const result = await run(["SCAN", cursor, "MATCH", "gambit:*", "COUNT", 100]); cursor = String(result[0]); for (const key of result[1]) { if (seen.has(key)) continue; seen.add(key); const type = await run(["TYPE", key]); if (type === "none") continue; if (!["string", "hash"].includes(type)) throw new Error(`Unsupported database type in backup: ${type}`); const value = await run([type === "string" ? "GET" : "HGETALL", key]); entries.push({ key, type, value, ttl: await run(["TTL", key]) }); bytes += JSON.stringify(value).length; if (bytes > 100000000 || entries.length > 100000) throw new Error("Backup exceeds the configured 100 MB limit. Use a managed database snapshot."); } } while (cursor !== "0");
  } else {
    const base = path.resolve(root);
    async function visit(relative) {
      const resolved = path.resolve(base, relative); if (!resolved.startsWith(base + path.sep)) throw new Error("Invalid backup path.");
      let info; try { info = await fs.lstat(resolved); } catch (error) { if (error.code === "ENOENT") return; throw error; }
      if (info.isSymbolicLink()) throw new Error("Backup source must not contain symbolic links.");
      if (info.isDirectory()) { for (const file of await fs.readdir(resolved)) await visit(`${relative}/${file}`); }
      else if (info.isFile() && allowedFile(relative)) { const value = await fs.readFile(resolved, "utf8"); JSON.parse(value); bytes += Buffer.byteLength(value); if (bytes > 100000000 || entries.length >= 100000) throw new Error("Backup exceeds the configured 100 MB limit."); entries.push({ file: relative, value }); }
    }
    for (const folder of folders) await visit(folder);
  }
  return { version: 1, backend: redis ? "redis" : "local", createdAt: Date.now(), entries };
}
export function encryptSnapshot(snapshot, key) { const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", keyBuffer(key), iv); cipher.setAAD(aad); const data = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(snapshot)))), cipher.final()]); return JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") }); }
export function decryptSnapshot(encrypted, key) { const value = JSON.parse(encrypted); if (value.version !== 1) throw new Error("Unsupported backup version."); const decipher = createDecipheriv("aes-256-gcm", keyBuffer(key), Buffer.from(value.iv, "base64")); decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(value.tag, "base64")); const compressed = Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]); return JSON.parse(gunzipSync(compressed, { maxOutputLength: 150000000 }).toString()); }
export async function restoreSnapshot(snapshot, { root = process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), redis = useRedis(), run = command, dryRun = true } = {}) {
  if (snapshot.version !== 1 || snapshot.backend !== (redis ? "redis" : "local") || !Array.isArray(snapshot.entries) || snapshot.entries.length > 100000) throw new Error("Invalid backup or storage backend mismatch.");
  for (const entry of snapshot.entries) {
    if (redis) { if (!/^gambit:(user|history|room|community):[a-zA-Z0-9:_-]+$/.test(entry.key || "") || !["string", "hash"].includes(entry.type) || (entry.type === "string" ? typeof entry.value !== "string" : !Array.isArray(entry.value) || entry.value.length % 2 || entry.value.some((value) => typeof value !== "string"))) throw new Error("Invalid database entry."); }
    else { if (!allowedFile(entry.file || "") || typeof entry.value !== "string") throw new Error("Unsafe backup path."); JSON.parse(entry.value); }
  }
  if (dryRun) return { entries: snapshot.entries.length, dryRun: true };
  if (redis) {
    for (const entry of snapshot.entries) { const remaining = entry.ttl > 0 ? Math.floor(entry.ttl - (Date.now() - snapshot.createdAt) / 1000) : entry.ttl; if (entry.ttl > 0 && remaining <= 0) continue; if (entry.type === "string") await run(["SET", entry.key, entry.value, ...(remaining > 0 ? ["EX", remaining] : [])]); else { await run(["DEL", entry.key]); if (entry.value.length) await run(["HSET", entry.key, ...entry.value]); if (remaining > 0) await run(["EXPIRE", entry.key, remaining]); } }
  } else {
    const base = path.resolve(root); await fs.mkdir(base, { recursive: true });
    for (const entry of snapshot.entries) { const pieces = entry.file.split("/"); let folder = base; for (const part of pieces.slice(0, -1)) { folder = path.join(folder, part); try { await fs.mkdir(folder); } catch (error) { if (error.code !== "EEXIST") throw error; } const info = await fs.lstat(folder); if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Restore path contains a symbolic link or non-directory."); } const file = path.join(folder, pieces.at(-1)); try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error("Restore file must not be a symbolic link."); } catch (error) { if (error.code !== "ENOENT") throw error; } await fs.writeFile(file, entry.value, { mode: 0o600 }); }
  }
  return { entries: snapshot.entries.length, dryRun: false };
}
