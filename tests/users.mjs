import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureGoogleUser } from "../lib/users.js";

await assert.rejects(ensureGoogleUser({ sub: "invalid", email_verified: false }), /verified/);
let user;
try {
  const profile = { sub: `test-${randomUUID()}`, email_verified: true, name: "Test Player", email: "test@example.com" };
  user = await ensureGoogleUser(profile);
  const returning = await ensureGoogleUser({ ...profile, name: "Changed Google name" });
  assert.equal(returning.id, user.id);
  assert.equal(returning.createdAt, user.createdAt);
  assert.equal(returning.name, "Test Player");
  assert.equal(user.email, profile.email);
  assert.match(user.id, /^[a-f0-9]{64}$/);
  console.log("Passed: verified Google identity and persistent returning account.");
} finally {
  if (user) await fs.unlink(path.join(process.cwd(), ".gambit-users", `${user.id}.json`));
}
