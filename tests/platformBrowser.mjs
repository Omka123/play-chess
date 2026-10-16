import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
const origin = process.env.BROWSER_TEST_URL || "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [], contexts = [];
async function player(name) { const context = await browser.newContext(); contexts.push(context); const token = await encode({ secret: "local-browser-test-session-key-for-chessnexa-only", token: { userId: `hub-${randomUUID()}`, name, sub: name, email: `${name}@example.test` }, maxAge: 3600 }); await context.addCookies([{ name: "next-auth.session-token", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); return context; }
try {
  const context = await player("Hub tester"); const page = await context.newPage(); page.setDefaultTimeout(30000); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/hub`); await page.getByRole("heading", { name: "Continue playing" }).waitFor();
  const profileResponse = await context.request.post(`${origin}/api/community`, { headers: { Origin: origin }, data: { type: "profile", username: `hub_${randomUUID().replaceAll("-", "").slice(0, 10)}`, name: "Hub tester", avatar: "knight" } }); assert.ok(profileResponse.ok());
  await page.reload(); await page.getByRole("heading", { name: "Continue playing" }).waitFor();
  await page.getByRole("button", { name: "Clubs", exact: true }).click();
  await page.getByLabel("Club name").fill("Browser knights"); await page.getByLabel("Description", { exact: true }).fill("A club created in the browser test.");
  await page.getByRole("button", { name: "Create club", exact: true }).click(); await page.getByRole("heading", { name: "Browser knights" }).first().waitFor();
  await page.getByLabel("Announcement", { exact: true }).fill("Welcome, chess players!"); await page.getByRole("button", { name: "Post announcement" }).click(); await page.getByText("Welcome, chess players!", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click(); await page.getByLabel("Allow anyone to view my player profile").check(); await page.getByRole("button", { name: "Save visibility" }).click(); await page.getByRole("status").filter({ hasText: "Saved successfully" }).waitFor();
  await page.getByRole("link", { name: "Your public profile", exact: true }).click(); await page.getByRole("heading", { name: "Hub tester", exact: true }).waitFor();
  await page.goto(`${origin}/training`); await page.getByRole("button", { name: "Hint", exact: true }).click(); assert.ok(await page.locator(".hint").count());
  await page.locator('[data-sq="a1"]').click(); await page.locator('[data-sq="a8"]').click(); await page.getByRole("status").filter({ hasText: "Checkmate!" }).waitFor();
  await page.goto(`${origin}/analysis`); await page.getByLabel("PGN or FEN", { exact: true }).fill("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"); await page.getByRole("button", { name: "Load notation" }).click(); await page.getByText("Position 6 / 6", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Previous", exact: true }).click(); await page.getByText("Position 5 / 6", { exact: true }).waitFor();
  await page.getByLabel("Study title").fill("Opening test"); await page.getByRole("button", { name: "Save these positions" }).click(); await page.getByRole("button", { name: "Opening test · 7 positions", exact: true }).waitFor();
  await page.getByRole("button", { name: "Analyse position", exact: true }).click(); await page.getByText(/Evaluation:/).waitFor({ timeout: 60000 }); assert.equal(await page.locator(".board-arrow.best").count(), 1);
  await page.reload(); await page.getByRole("button", { name: "Opening test · 7 positions", exact: true }).click(); await page.getByText("Position 6 / 6", { exact: true }).waitFor();
  const exported = await context.request.get(`${origin}/api/account/export`); assert.ok(exported.ok()); assert.equal((await exported.json()).identity.name, "Hub tester");
  const created = await context.request.post(`${origin}/api/rooms`, { headers: { Origin: origin }, data: { color: "w", tc: 0 } }); const room = await created.json(); assert.ok(created.ok());
  const enabled = await context.request.post(`${origin}/api/rooms/${room.id}`, { headers: { Origin: origin, Authorization: `Bearer ${room.token}` }, data: { type: "watchLink", enabled: true } }); const watch = await enabled.json(); assert.ok(enabled.ok());
  const spectator = await browser.newContext(); contexts.push(spectator); const watchPage = await spectator.newPage(); watchPage.setDefaultTimeout(30000); await watchPage.goto(`${origin}/watch/${room.id}#key=${watch.watchToken}`); await watchPage.getByText(/White to move · Spectator view/).waitFor(); assert.equal(await watchPage.locator('[data-sq="e1"]').count(), 1);
  await context.request.post(`${origin}/api/rooms/${room.id}`, { headers: { Origin: origin, Authorization: `Bearer ${room.token}` }, data: { type: "watchLink", enabled: false } }); await watchPage.getByRole("alert").filter({ hasText: "unavailable" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/hub", "/training", "/analysis", "/account", "/"]) { await page.goto(`${origin}${route}`); await page.getByRole("heading", { level: 1 }).waitFor(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflows at mobile width`); }
  assert.deepEqual(errors, []); console.log("Passed browser: club creation/announcements, public profile consent, puzzle hint/solution, PGN navigation, Stockfish arrow, private study reload, account export and four mobile layouts.");
} finally { await Promise.all(contexts.map((context) => context.close())); await browser.close(); }
