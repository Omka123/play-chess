import { promises as fs } from "node:fs";
import path from "node:path";
import { collectSnapshot, encryptSnapshot, decryptSnapshot, restoreSnapshot } from "../lib/backups.js";
const [mode = "create", file, ...options] = process.argv.slice(2);
const key = process.env.GAMBIT_BACKUP_KEY;
async function create() { const snapshot = await collectSnapshot(); const directory = path.resolve(process.env.GAMBIT_BACKUP_DIRECTORY || ".gambit-backups"); await fs.mkdir(directory, { recursive: true }); const target = path.join(directory, `backup-${new Date().toISOString().replaceAll(":", "-")}.json.enc`); await fs.writeFile(target, encryptSnapshot(snapshot, key), { flag: "wx", mode: 0o600 }); console.log(`Encrypted ${snapshot.entries.length} records to ${target}`); }
try {
  if (mode === "create") await create();
  else if (mode === "watch") { const hours = Number(file || 24); if (!Number.isFinite(hours) || hours < 1 || hours > 168) throw new Error("Choose an interval of 1–168 hours."); await create(); let busy = false; setInterval(async () => { if (busy) return; busy = true; try { await create(); } catch { console.error("Scheduled backup failed. Check storage access and the backup key."); } finally { busy = false; } }, hours * 3600000); console.log(`Automatic backups run every ${hours} hours while this process remains running.`); }
  else if (["inspect", "restore"].includes(mode) && file) { const snapshot = decryptSnapshot(await fs.readFile(path.resolve(file), "utf8"), key); console.log(await restoreSnapshot(snapshot, { dryRun: mode !== "restore" || !options.includes("--confirm-restore") })); }
  else throw new Error("Use create, watch [hours], inspect [file], or restore [file] --confirm-restore. Stop writes before restoring. Store the key separately from backups.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
