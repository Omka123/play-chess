import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext();
  const requested = [];
  for (const domain of ["abscloud.org", "bauval.org", "pagead2.googlesyndication.com", "www.googletagmanager.com"]) await context.route(`https://${domain}/**`, route => {
    requested.push(route.request().url());
    const body = route.request().url().includes("bauval.org/22/")
      ? 'try { parent.document.addEventListener("click", function () { parent.open("https://example.invalid/unwanted-ad"); }); } catch (_) {}'
      : "/* isolated ad test */";
    return route.fulfill({ contentType: "application/javascript", body });
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  for (const width of [375, 600, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3100/");
    const ad = page.locator(".adsterra-home-ads .adsterra-ad").first();
    await ad.locator("iframe").waitFor();
    const dimensions = await ad.evaluate(node => ({ container: node.clientWidth, iframe: Number(node.querySelector("iframe").width) }));
    assert.ok(dimensions.iframe <= dimensions.container);
    assert.ok([300, 468, 728].includes(dimensions.iframe));
  }
  assert.ok(!requested.some(url => url.includes("abscloud.org/1/")));
  assert.ok(!requested.some(url => url.includes("bauval.org/14/")));
  assert.ok(!requested.some(url => url.includes("bauval.org/21/")));
  assert.equal(await page.locator(".adsterra-sponsored-link").count(), 0);
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
  console.log("Passed: production Adsterra rendering, responsive banner widths, blocked click-ad scripts, iframe isolation, Start game without popups, login exclusion and Google unit separation. All ad traffic was stubbed.");
} finally { await browser.close(); }
