import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  for (const domain of ["pagead2.googlesyndication.com", "www.googletagmanager.com"]) await context.route(`https://${domain}/**`, route => route.fulfill({ contentType: "application/javascript", body: "/* test */" }));
  const page = await context.newPage();
  const response = await page.goto("http://localhost:3100/learn/start-here");
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { name: "Build a chess habit you can explain." }).waitFor();
  assert.equal(await page.locator(".study-path-session").count(), 6);
  await page.locator(".study-path-answer summary").first().click();
  assert.ok(await page.locator(".study-path-answer").first().getAttribute("open") !== null);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const worksheet = await context.request.get("http://localhost:3100/chess-practice-worksheet.txt");
  assert.equal(worksheet.status(), 200);
  assert.ok((await worksheet.text()).includes("THE OPPONENT'S REPLY"));
  await page.goto("http://localhost:3100/learn");
  assert.equal(await page.getByRole("link", { name: "Open the beginner practice plan" }).getAttribute("href"), "/learn/start-here");
  console.log("Passed: public beginner path, six sessions, no-JavaScript answers, mobile width, worksheet download and learning-index navigation.");
} finally { await browser.close(); }
