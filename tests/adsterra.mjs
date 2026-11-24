import assert from "node:assert/strict";
import { ADSTERRA, adsterraDocument, bannerUnit, adsterraPage, adProvider } from "../lib/adsterra.js";
assert.equal(bannerUnit(299), null);
assert.equal(bannerUnit(300), "mobile");
assert.equal(bannerUnit(320), "mobileBanner");
assert.equal(ADSTERRA.units.mobileBanner.key, "873b488ad18870fc13a9c9400101be00");
assert.equal(bannerUnit(468), "banner");
assert.equal(bannerUnit(728), "leaderboard");
assert.equal(ADSTERRA.native.src, "https://bauval.org/21/1d589910dbc993bba5edb9c597ce4a5f");
assert.equal(ADSTERRA.native.container, "container-1d589910dbc993bba5edb9c597ce4a5f");
for (const unit of Object.keys(ADSTERRA.units)) {
  const html = adsterraDocument(unit);
  assert.ok(html.includes(`https://bauval.org/22/${ADSTERRA.units[unit].key}`));
  assert.ok(html.includes('"format":"iframe"'));
  assert.ok(html.includes("window.atOptions="));
  assert.ok(!html.includes("var atOptions="));
}
assert.equal(adsterraPage("/"), true);
assert.equal(adsterraPage("/learn/test"), true);
for (const route of ["/login", "/admin", "/account", "/api/auth/callback/google"]) assert.equal(adsterraPage(route), false);
const previous = process.env.NEXT_PUBLIC_AD_PROVIDER;
process.env.NEXT_PUBLIC_AD_PROVIDER = "none"; assert.equal(adProvider(), "none");
if (previous === undefined) delete process.env.NEXT_PUBLIC_AD_PROVIDER; else process.env.NEXT_PUBLIC_AD_PROVIDER = previous;
console.log("Passed: Adsterra unit configuration, responsive sizing, isolated iframe options, public route selection and provider switch.");
