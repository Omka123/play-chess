import assert from "node:assert/strict";
import { isAdmin, requireAdmin } from "../lib/adminAccess.js";
import { adminOverview, adminAction } from "../lib/admin.js";
import { isModerator } from "../lib/moderation.js";
import { registerPlayer } from "../lib/community.js";
import { communityTransaction } from "../lib/communityStore.js";

const original = { id: process.env.ADMIN_USER_ID, email: process.env.ADMIN_EMAIL, moderators: process.env.MODERATOR_EMAILS };
const owner = { id: "admin-owner-fixture", email: "owner@example.invalid", name: "Owner" };
const other = { id: "admin-player-fixture", email: "player@example.invalid", name: "Other" };
try {
  delete process.env.ADMIN_USER_ID; delete process.env.ADMIN_EMAIL;
  assert.equal(isAdmin(owner), false);
  process.env.ADMIN_USER_ID = owner.id;
  assert.equal(isAdmin(owner), false);
  process.env.ADMIN_EMAIL = "OWNER@example.invalid";
  assert.equal(isAdmin(owner), true);
  assert.equal(isAdmin({ ...owner, id: other.id, isAdmin: true }), false);
  assert.equal(isAdmin({ ...owner, email: other.email }), false);
  assert.equal(isAdmin({ ...other, staff: true, role: "admin", isAdmin: true }), false);
  assert.throws(() => requireAdmin(null), /Administrator access/);
  process.env.MODERATOR_EMAILS = other.email;
  assert.equal(isModerator(other), true);
  assert.equal(isAdmin(other), false);
  await assert.rejects(adminOverview(other), /Administrator access/);
  await assert.rejects(adminAction(other, { type: "suspend", userId: owner.id, note: "Unauthorized admin call" }), /Administrator access/);
  await registerPlayer(owner);
  // Remove the other account's moderator role before testing owner actions.
  process.env.MODERATOR_EMAILS = "";
  await registerPlayer(other);
  const overview = await adminOverview(owner, { search: other.name, page: -10 });
  assert.equal(overview.pagination.page, 1);
  assert.ok(overview.users.some(p => p.id === other.id));
  assert.equal(overview.users.find(p => p.id === other.id).isOwner, false);
  assert.ok(!JSON.stringify(overview).includes("ADMIN_EMAIL"));
  await assert.rejects(adminAction(owner, { type: "suspend", userId: owner.id, note: "Cannot suspend owner" }), /Moderator accounts/);
  await assert.rejects(adminAction(owner, { type: "suspend", userId: other.id, note: "" }), /note/);
  await adminAction(owner, { type: "suspend", userId: other.id, note: "Fixture suspension for verified test" });
  assert.equal(await communityTransaction(s => s.players[other.id].suspended, { readOnly: true }), true);
  await adminAction(owner, { type: "restore", userId: other.id, note: "Restore fixture after test" });
  assert.equal(await communityTransaction(s => s.players[other.id].suspended, { readOnly: true }), false);
  const audit = await communityTransaction(s => s.moderationAudit.filter(e => e.target === other.id), { readOnly: true });
  assert.equal(audit.length, 2);
  assert.ok(audit.every(e => e.moderatorId === owner.id));
  await communityTransaction(s => { s.players[owner.id].deleted = true; });
  await assert.rejects(adminOverview(owner), /deleted/);
  await assert.rejects(adminAction(owner, { type: "restore", userId: other.id, note: "Deleted owner must be denied" }), /deleted/);
} finally {
  for (const [key, value] of [["ADMIN_USER_ID", original.id], ["ADMIN_EMAIL", original.email], ["MODERATOR_EMAILS", original.moderators]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
}
console.log("Passed: owner-only admin access, fail-closed configuration, denied forged/moderator roles, user listing, owner protection and audited player actions.");
