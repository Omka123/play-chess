import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const origin = "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const nativeCode = 'void document.cookie; var slot=document.getElementById("container-1d589910dbc993bba5edb9c597ce4a5f"); if(!slot) throw Error("Missing native container"); var link=document.createElement("a"); link.href="https://example.invalid/banner"; link.textContent="Test native banner loaded"; link.style.display="block"; link.style.maxWidth="100%"; slot.appendChild(link);';
try {
  const context = await browser.newContext();
  const requested = [], errors = [];
  context.on("weberror", event => errors.push(event.error().message));
  for (const domain of ["abscloud.org", "bauval.org", "pagead2.googlesyndication.com", "www.googletagmanager.com"]) await context.route(`https://${domain}/**`, route => {
    const url = route.request().url(); requested.push(url);
    const body = url.includes("bauval.org/21/") ? nativeCode : url.includes("bauval.org/22/") ? '"use strict"; var options=window.atOptions; delete window.atOptions; if(!options.key)throw Error("Missing options"); document.body.appendChild(document.createTextNode("Sync banner initialized"));' : "/* stub */";
    return route.fulfill({ contentType: "application/javascript", body });
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  for (const width of [375, 600, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    await page.getByText("Test native banner loaded", { exact: true }).waitFor();
    assert.equal(await page.locator("#container-1d589910dbc993bba5edb9c597ce4a5f").count(), 1);
    await page.locator('.adsterra-native[data-ad-status="ready"]').waitFor();
    assert.equal(await page.locator(".adsterra-network iframe").count(), 0);
    assert.ok(await page.locator(".adsterra-native").evaluate(node => node.scrollWidth <= node.clientWidth + 1));
  }
  assert.ok(requested.some(url => url.includes("bauval.org/21/")));
  assert.ok(!requested.some(url => url.includes("abscloud.org") || url.includes("bauval.org/14/") || url.includes("bauval.org/22/")));
  assert.equal(await page.locator(".adsterra-sponsored-link").count(), 0);
  const pages = context.pages().length;
  await page.getByRole("button", { name: /start game/i }).first().click();
  await page.waitForTimeout(300);
  assert.equal(context.pages().length, pages);
  assert.ok(page.url().startsWith(origin));
  await page.goto(origin + "/login");
  assert.equal(await page.locator(".adsterra-network").count(), 0);
  await page.goto(origin + "/learn");
  await page.getByText("Test native banner loaded", { exact: true }).waitFor();
  assert.equal(await page.locator("#container-1d589910dbc993bba5edb9c597ce4a5f").count(), 1);
  assert.equal(await page.locator(".adsbygoogle").count(), 0);
  // Preserve the sync-banner global cleanup regression even though the active
  // public placement now uses the publisher's async native unit.
  await page.goto(origin + "/ads/adsterra/leaderboard");
  await page.getByText("Sync banner initialized", { exact: true }).waitFor();
  assert.equal((await context.request.get(origin + "/ads/adsterra/not-a-unit")).status(), 404);
  const emptyContext = await browser.newContext();
  for (const domain of ["bauval.org", "pagead2.googlesyndication.com", "www.googletagmanager.com"]) await emptyContext.route(`https://${domain}/**`, route => route.fulfill({ contentType: "application/javascript", body: "" }));
  const emptyPage = await emptyContext.newPage(); await emptyPage.goto(origin + "/learn");
  await emptyPage.getByText("Advertisement unavailable.", { exact: true }).waitFor({ timeout: 25000 });
  await emptyContext.close();
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Passed: native inline embed with cookie access, single container, responsive widths, Start game without a new tab, excluded popup scripts, private-route exclusion, sync cleanup compatibility and empty-response fallback. Provider traffic was stubbed.");
} finally { await browser.close(); }
