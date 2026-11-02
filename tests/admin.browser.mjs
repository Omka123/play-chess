import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
const origin = "http://localhost:3100";
// Run only against an isolated local-storage server with these fixture credentials.
const secret = "local-browser-test-session-key-for-chessnexa-only";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const contexts = [];
async function account(id, name, email) {
  const context = await browser.newContext(); contexts.push(context);
  await context.route("https://pagead2.googlesyndication.com/**", route => route.fulfill({ contentType: "application/javascript", body: "/* test */" }));
  await context.route("https://www.googletagmanager.com/**", route => route.fulfill({ contentType: "application/javascript", body: "/* test */" }));
  const token = await encode({ secret, token: { userId: id, name, email, sub: id, isAdmin: true }, maxAge: 3600 });
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  assert.equal((await context.request.get(origin + "/api/community")).status(), 200);
  return context;
}
try {
  const guest = await browser.newContext(); contexts.push(guest);
  assert.equal((await guest.request.get(origin + "/api/admin")).status(), 401);
  const owner = await account("admin-owner-browser", "Owner Fixture", "owner@example.invalid");
  const other = await account("admin-other-browser", "Other Fixture", "other@example.invalid");
  const moderator = await account("admin-moderator-browser", "Moderator Fixture", "mod@example.invalid");
  for (const denied of [other, moderator]) {
    assert.equal((await denied.request.get(origin + "/api/admin")).status(), 403);
    assert.equal((await denied.request.get(origin + "/api/admin?view=moderation")).status(), 403);
    assert.equal((await denied.request.get(origin + "/admin")).status(), 404);
    assert.equal((await (await denied.request.get(origin + "/api/auth/session")).json()).user.isAdmin, false);
  }
  assert.equal((await owner.request.post(origin + "/api/admin", { headers: { Origin: "https://other.invalid" }, data: { type: "suspend", userId: "admin-other-browser", note: "Must reject cross-origin mutation" } })).status(), 403);
  const page = await owner.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(origin + "/admin");
  await page.getByRole("heading", { name: "Site administration" }).waitFor();
  let row = page.getByRole("row").filter({ hasText: "Other Fixture" });
  await row.getByRole("button", { name: "Suspend", exact: true }).click();
  await page.getByLabel("Reason for this action").fill("Suspending this isolated browser fixture for a test");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await row.getByRole("button", { name: "Restore access", exact: true }).waitFor();
  await row.getByRole("button", { name: "Restore access", exact: true }).click();
  await page.getByLabel("Reason for this action").fill("Restoring the isolated browser fixture after the test");
  await page.getByRole("button", { name: "Save action", exact: true }).click();
  await row.getByRole("button", { name: "Suspend", exact: true }).waitFor();
  await page.getByRole("button", { name: "Reports & audit", exact: true }).click();
  await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();
  await page.getByText("Recent moderation actions", { exact: true }).click();
  await page.getByText("Restoring the isolated browser fixture after the test", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Users", exact: true }).click();
  await page.getByRole("heading", { name: "Registered users" }).waitFor();
  await page.getByLabel("Search name, username or user ID").fill("Other Fixture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".admin-users-table caption")?.textContent === "1 matching account");
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole("button", { name: "Service status", exact: true }).click();
  await page.getByRole("heading", { name: "Service status", exact: true }).waitFor();
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Passed admin browser: guest/outsider/moderator denial, ignored forged role, owner access, cross-origin rejection, suspend/restore, audit, search and mobile layout.");
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
