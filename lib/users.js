import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { command, useRedis } from "./roomStore.js";

export async function ensureGoogleUser(profile) {
  if (!profile.sub || profile.email_verified !== true) throw new Error("A verified Google account is required.");
  const id = createHash("sha256").update(`google:${profile.sub}`).digest("hex");
  const user = { id, name: (profile.name || "Chess player").slice(0, 30),
    email: profile.email, image: profile.picture || null, createdAt: new Date().toISOString() };
  if (useRedis()) {
    const key = `gambit:user:${id}`;
    await command(["SET", key, JSON.stringify(user), "NX"]);
    return JSON.parse(await command(["GET", key]));
  }
  const directory = path.join(process.env.GAMBIT_DATA_DIRECTORY || process.cwd(), ".gambit-users");
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `${id}.json`);
  try { await fs.writeFile(file, JSON.stringify(user), { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  return JSON.parse(await fs.readFile(file, "utf8"));
}
