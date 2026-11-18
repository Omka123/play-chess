import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext();
  const requested = [];
  for (const domain of ["abscloud.org", "bauval.org", "pagead2.googlesyndication.com", "www.googletagmanager.com"]) await context.route(`https://${domain}/**`, route => {
    requested.push(route.request().url());
    const body = route.request().url().includes("bauval.org/22/")
      ? '"use strict"; var supplied=window.atOptions; delete window.atOptions; if(!supplied || !supplied.key || supplied.format!=="iframe") throw Error("Missing banner configuration"); var creative=document.createElement("div"); creative.textContent="Test banner loaded"; document.body.appendChild(creative); var image=document.createElement("img"); image.width=100; image.height=50; image.src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2250%22%3E%3C/svg%3E"; document.body.appendChild(image); try { parent.document.addEventListener("click", function () { parent.open("https://example.invalid/unwanted-ad"); }); } catch (_) {}'
      : "/* isolated ad test */";
    return route.fulfill({ contentType: "application/javascript", body });
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = [];
  context.on("weberror", event => errors.push(event.error().message));
  for (const width of [375, 600, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3100/");
    const ad = page.locator(".adsterra-home-ads .adsterra-ad").first();
    await ad.locator("iframe").waitFor();
    const dimensions = await ad.evaluate(node => ({ container: node.clientWidth, iframe: Number(node.querySelector("iframe").width) }));
    assert.ok(dimensions.iframe <= dimensions.container);
    assert.ok([300, 320, 468, 728].includes(dimensions.iframe));
  }
  assert.ok(!requested.some(url => url.includes("abscloud.org/1/")));
  assert.ok(!requested.some(url => url.includes("bauval.org/14/")));
  assert.ok(!requested.some(url => url.includes("bauval.org/21/")));
  assert.equal(await page.locator(".adsterra-sponsored-link").count(), 0);
  const adFrame = page.locator(".adsterra-ad iframe").first();
  assert.ok((await adFrame.getAttribute("src")).startsWith("/ads/adsterra/"));
  await adFrame.scrollIntoViewIfNeeded();
  await adFrame.contentFrame().getByText("Test banner loaded", { exact: true }).waitFor();
  await page.locator('.adsterra-ad [data-ad-status="ready"]').first().waitFor();
  await page.evaluate(() => window.postMessage({ type: "chessnexa-ad", unit: "leaderboard", status: "empty" }, "*"));
  assert.equal(await page.locator('.adsterra-ad [data-ad-status="empty"]').count(), 0, "Ignore messages from outside the ad frame");
  assert.ok(requested.some(url => url.includes("bauval.org/22/")), "Banner SDK must actually execute");
  assert.equal((await context.request.get("http://localhost:3100/ads/adsterra/not-a-unit")).status(), 404);
  const frameResponse = await context.request.get("http://localhost:3100/ads/adsterra/leaderboard");
  assert.equal(frameResponse.status(), 200);
  assert.equal(frameResponse.headers()["x-robots-tag"], "noindex, nofollow");
  assert.ok(frameResponse.headers()["content-security-policy"].startsWith("sandbox "));
  const sandbox = await page.locator(".adsterra-ad iframe").first().getAttribute("sandbox");
  assert.ok(sandbox.includes("allow-scripts") && !sandbox.includes("allow-same-origin") && !sandbox.includes("allow-top-navigation"));
  const before = context.pages().length;
  await page.getByRole("button", { name: /start game/i }).first().click();
  await page.waitForTimeout(300);
  assert.equal(context.pages().length, before);
  assert.ok(page.url().startsWith("http://localhost:3100/"));
  await page.goto("http://localhost:3100/login");
  assert.equal(await page.locator(".adsterra-network").count(), 0);
  await page.goto("http://localhost:3100/learn");
  await page.locator(".adsterra-ad iframe").waitFor();
  assert.equal(await page.locator(".adsbygoogle").count(), 0);
  const emptyContext = await browser.newContext();
  for (const domain of ["bauval.org", "pagead2.googlesyndication.com", "www.googletagmanager.com"]) await emptyContext.route(`https://${domain}/**`, route => route.fulfill({ contentType: "application/javascript", body: "" }));
  const emptyPage = await emptyContext.newPage();
  await emptyPage.goto("http://localhost:3100/learn");
  await emptyPage.locator(".adsterra-ad iframe").scrollIntoViewIfNeeded();
  await emptyPage.getByText("Advertisement unavailable.", { exact: true }).waitFor({ timeout: 25000 });
  assert.equal(await emptyPage.locator(".adsterra-ad iframe").count(), 0, "Remove empty frames instead of leaving white boxes");
  await emptyContext.close();
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Passed: responsive banners including 320×50, script execution, empty-response fallback, message-source validation, iframe isolation, Start game without popups and provider separation. All ad traffic was stubbed.");
} finally { await browser.close(); }
