import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { collectSnapshot, encryptSnapshot, decryptSnapshot, restoreSnapshot } from "../lib/backups.js";
// Synthetic records and an ephemeral key. No production storage or key is used.
const root = await fs.mkdtemp(path.join(os.tmpdir(), "chessnexa-drill-"));
const source = path.join(root, "source"), target = path.join(root, "restored");
try {
  const files = { ".gambit-users/drill.json": { id: "drill", name: "Synthetic player" }, ".gambit-history/drill/game.json": { id: "game", moves: [], result: "draw" }, ".gambit-community/state.json": { players: { drill: { name: "Synthetic player" } } } };
  for (const [file, value] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(source, file)), { recursive: true }); await fs.writeFile(path.join(source, file), JSON.stringify(value)); }
  const snapshot = await collectSnapshot({ root: source, redis: false });
  const key = randomBytes(32).toString("base64");
  const encrypted = encryptSnapshot(snapshot, key);
  assert.ok(!encrypted.includes("Synthetic player"));
  const decoded = decryptSnapshot(encrypted, key);
  assert.equal((await restoreSnapshot(decoded, { root: target, redis: false })).dryRun, true);
  await assert.rejects(fs.access(target));
  await restoreSnapshot(decoded, { root: target, redis: false, dryRun: false });
  for (const [file, value] of Object.entries(files)) assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, file), "utf8")), value);
  console.log(`PASS synthetic encrypted restore drill: ${snapshot.entries.length} records verified. Production backup recovery remains a separate operator check.`);
} finally {
  const resolved = path.resolve(root), temporary = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== temporary || !path.basename(resolved).startsWith("chessnexa-drill-")) throw new Error("Refusing cleanup outside the drill directory.");
  await fs.rm(resolved, { recursive: true, force: true });
}
