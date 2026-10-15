// Run against the isolated development server described in README.md.
// Uses test JWTs only; never signs in through Google or loads real user data.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";

const origin = process.env.BROWSER_TEST_URL || "http://localhost:3100";
const secret = "local-browser-test-session-key-for-chessnexa-only";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
const prefix = randomUUID().slice(0, 8);
const contexts = [];
async function player(label) {
  const context = await browser.newContext(); contexts.push(context);
  const jwt = await encode({ secret, token: { userId: `browser-${prefix}-${label}`, sub: `browser-${prefix}-${label}`, name: label, email: `${label}@example.test`, createdAt: new Date().toISOString() }, maxAge: 3600 });
  await context.addCookies([{ name: "next-auth.session-token", value: jwt, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
  return { context, page };
}
async function api(context, route, input) {
  const response = input ? await context.request.post(`${origin}${route}`, { headers: { Origin: origin }, data: input }) : await context.request.get(`${origin}${route}`);
  const data = await response.json(); assert.ok(response.ok(), `${route}: ${JSON.stringify(data)}`); return data;
}
try {
  const a = await player("Alice"), b = await player("Bob");
  await api(a.context, "/api/community"); await api(b.context, "/api/community");
  const pa = await api(a.context, "/api/community", { type: "profile", name: "Alice Chess", username: `alice_${prefix}`, avatar: "queen" });
  const pb = await api(b.context, "/api/community", { type: "profile", name: "Bob Chess", username: `bob_${prefix}`, avatar: "knight" });
  await api(a.context, "/api/community", { type: "request", username: pb.profile.username });
  await api(b.context, "/api/community", { type: "accept", userId: pa.profile.id });
  await a.page.goto(`${origin}/?online=1`); await b.page.goto(`${origin}/?online=1`);
  await a.page.getByRole("button", { name: "Find a game / resume" }).click();
  await b.page.getByRole("button", { name: "Find a game / resume" }).click();
  await a.page.getByText("Rated online game", { exact: false }).waitFor({ timeout: 30000 });
  await b.page.getByText("Rated online game", { exact: false }).waitFor({ timeout: 30000 });
  const sa = await a.page.evaluate(() => JSON.parse(sessionStorage.getItem("gambit:room")));
  const ra = await a.context.request.get(`${origin}/api/rooms/${sa.id}`, { headers: { Authorization: `Bearer ${sa.token}` } });
  const roomA = await ra.json();
  const white = roomA.color === "w" ? a : b, black = roomA.color === "b" ? a : b;
  await black.page.locator('[data-sq="d7"]:visible').click(); await black.page.locator('[data-sq="d5"]:visible').click();
  await black.page.getByRole("button", { name: /Cancel premove/ }).waitFor();
  await white.page.locator('[data-sq="e2"]:visible').click(); await white.page.locator('[data-sq="e4"]:visible').click();
  await white.page.getByRole("button", { name: "d5", exact: true }).waitFor({ timeout: 15000 });
  await white.page.getByRole("button", { name: "Offer draw", exact: true }).click();
  await black.page.getByRole("button", { name: "Accept draw", exact: true }).click();
  await a.page.getByRole("dialog").waitFor(); await b.page.getByRole("dialog").waitFor();
  await a.page.getByRole("button", { name: "Back to board", exact: true }).click(); await b.page.getByRole("button", { name: "Back to board", exact: true }).click();
  await a.page.getByRole("button", { name: "Request rematch", exact: true }).click();
  await b.page.getByRole("button", { name: "Accept rematch", exact: true }).click();
  await a.page.getByText("Unrated friend game", { exact: false }).waitFor({ timeout: 15000 });
  await b.page.getByText("Unrated friend game", { exact: false }).waitFor({ timeout: 15000 });
  a.page.once("dialog", (dialog) => dialog.accept());
  await a.page.getByRole("button", { name: "Resign", exact: true }).click();
  await a.page.getByRole("dialog").waitFor();
  await a.page.getByRole("button", { name: "Back to board", exact: true }).click();
  await a.page.goto(`${origin}/account`);
  await a.page.getByRole("heading", { name: "Game history", exact: true }).waitFor();
  assert.ok(await a.page.getByRole("button", { name: "Replay", exact: true }).count() >= 2);
  await a.page.getByRole("button", { name: "Replay", exact: true }).first().click();
  await a.page.getByRole("button", { name: "Share replay", exact: true }).click();
  const link = a.page.getByRole("textbox", { name: "Shared game replay link" }); await link.waitFor();
  const publicUrl = await link.inputValue();
  const anonymous = await browser.newContext(); contexts.push(anonymous);
  const publicPage = await anonymous.newPage(); await publicPage.goto(publicUrl);
  await publicPage.getByRole("heading", { name: /Alice Chess.*Bob Chess|Bob Chess.*Alice Chess/ }).waitFor();
  const unauthorized = await anonymous.request.get(`${origin}/api/community`); assert.equal(unauthorized.status(), 401);
  const engine = await a.page.evaluate(async () => {
    return await new Promise((resolve, reject) => {
      const worker = new Worker("/engine/stockfish-19-lite-single.js"); let info = "";
      const timer = setTimeout(() => { worker.terminate(); reject(new Error("Engine timed out")); }, 20000);
      worker.onerror = () => { clearTimeout(timer); reject(new Error("Engine failed")); };
      worker.onmessage = ({ data }) => {
        const line = String(data);
        if (line === "uciok") { worker.postMessage("position startpos"); worker.postMessage("go depth 8"); }
        if (line.includes("score")) info = line;
        if (line.startsWith("bestmove")) { clearTimeout(timer); worker.terminate(); resolve({ best: line, info }); }
      };
      worker.postMessage("uci");
    });
  });
  assert.match(engine.best, /bestmove [a-h][1-8][a-h][1-8]/); assert.match(engine.info, /score/);
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(mobile);
  const login = await mobile.newPage(); await login.goto(`${origin}/login`);
  await login.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
  assert.equal(await login.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  assert.deepEqual(errors, []);
  console.log("Passed browser: two-account matchmaking, queued premove, draw offer, rematch, account history, public replay, auth boundary, real Stockfish WASM, and mobile login.");
} finally { for (const context of contexts) await context.close(); await browser.close(); }
