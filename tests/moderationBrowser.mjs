// Use only the isolated local server documented in README.md.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
const origin = process.env.BROWSER_TEST_URL || "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const contexts = [], errors = [];
const prefix = randomUUID().slice(0, 8);
async function account(name, email) {
  const context = await browser.newContext(); contexts.push(context);
  const id = `moderation-browser-${randomUUID()}`;
  const jwt = await encode({ secret: "local-browser-test-session-key-for-chessnexa-only", token: { userId: id, name, sub: id, email }, maxAge: 3600 });
  await context.addCookies([{ name: "next-auth.session-token", value: jwt, url: origin, httpOnly: true, sameSite: "Lax" }]);
  await context.request.get(`${origin}/api/community`);
  return context;
}
async function post(context, route, input, expected = 200, token) {
  const response = await context.request.post(`${origin}${route}`, { headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, data: input });
  const data = await response.json(); assert.equal(response.status(), expected, JSON.stringify(data)); return data;
}
try {
  const moderator = await account("Moderator", "moderator@example.test");
  const reporter = await account("Reporter", "reporter@example.test");
  const target = await account("Target", "target@example.test");
  await post(target, "/api/community", { type: "profile", username: `target_${prefix}`, name: "Test Target", avatar: "king" });
  const forbidden = await reporter.request.get(`${origin}/api/moderation`); assert.equal(forbidden.status(), 403);
  const reporting = await reporter.newPage(); reporting.on("pageerror", (error) => errors.push(error.message));
  await reporting.goto(`${origin}/report?type=player&target=target_${prefix}`);
  await reporting.getByRole("textbox", { name: "Describe what happened" }).fill("Please review this profile under our community standards. This is a test report.");
  await reporting.getByRole("button", { name: "Submit report", exact: true }).click();
  await reporting.getByRole("heading", { name: "Report received", exact: true }).waitFor();
  const admin = await moderator.newPage(); admin.on("pageerror", (error) => errors.push(error.message));
  await admin.goto(`${origin}/moderation`);
  await admin.getByRole("heading", { name: "Community moderation", exact: true }).waitFor();
  await admin.getByRole("textbox", { name: "Note for the next action" }).fill("Temporary test suspension after reviewing the profile.");
  await admin.getByRole("button", { name: "Suspend player", exact: true }).click();
  await admin.getByText("Action saved to the moderation log.", { exact: true }).waitFor();
  await post(target, "/api/matchmaking", { tc: 300 }, 403);
  const targetRow = admin.getByRole("row").filter({ hasText: `target_${prefix}` });
  await admin.getByRole("textbox", { name: "Note for the next action" }).fill("Test completed. Restore online play access.");
  await targetRow.getByRole("button", { name: "Restore account", exact: true }).click();
  await admin.getByText("Action saved to the moderation log.", { exact: true }).waitFor();
  const room = await post(reporter, "/api/rooms", { color: "w", tc: 0 }, 201);
  const joined = await post(target, `/api/rooms/${room.id}`, { type: "join" }, 200, room.invite);
  await post(target, `/api/rooms/${room.id}`, { type: "resign" }, 200, joined.token);
  const shared = await post(reporter, "/api/history/share", { id: `friend-${room.id}` });
  const anonymous = await browser.newContext(); contexts.push(anonymous);
  assert.equal((await anonymous.request.get(`${origin}/game/${shared.id}`)).status(), 200);
  await post(moderator, "/api/moderation", { type: "hideReplay", replayId: shared.id, note: "Hide a reported replay during test review." });
  assert.equal((await anonymous.request.get(`${origin}/game/${shared.id}`)).status(), 404);
  await post(moderator, "/api/moderation", { type: "restoreReplay", replayId: shared.id, note: "Restore the replay after test review." });
  assert.equal((await anonymous.request.get(`${origin}/game/${shared.id}`)).status(), 200);
  const learning = await anonymous.newPage(); learning.on("pageerror", (error) => errors.push(error.message));
  await learning.goto(`${origin}/learn`);
  assert.equal(await learning.locator(".lesson-card").count(), 10);
  assert.equal(await learning.getByText("Sample promotion", { exact: true }).count(), 0);
  await learning.goto(`${origin}/learn/pawn-promotion-basics`);
  const exercise = learning.locator(".lesson-exercise");
  await exercise.locator('[data-sq="a7"]').click(); await exercise.locator('[data-sq="a8"]').click();
  await learning.getByRole("button", { name: "Promote to queen", exact: true }).click();
  await exercise.getByText(/The pawn becomes a queen immediately/).waitFor();
  await learning.setViewportSize({ width: 390, height: 844 });
  assert.equal(await learning.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log("Passed browser: reports, denied moderator access, suspension/restore controls, blocked matchmaking, shared-replay hide/restore, ten guides, promotion exercise and mobile layout.");
} finally { for (const context of contexts) await context.close(); await browser.close(); }
