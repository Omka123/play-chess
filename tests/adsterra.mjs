import assert from "node:assert/strict";
import { ADSTERRA, adsterraDocument, bannerUnit, adsterraPage, adProvider } from "../lib/adsterra.js";
assert.equal(bannerUnit(299), null);
assert.equal(bannerUnit(320), "mobile");
assert.equal(bannerUnit(468), "banner");
assert.equal(bannerUnit(728), "leaderboard");
for (const unit of Object.keys(ADSTERRA.units)) {
  const html = adsterraDocument(unit);
  assert.ok(html.includes(`https://bauval.org/22/${ADSTERRA.units[unit].key}`));
  assert.ok(html.includes('"format":"iframe"'));
}
assert.equal(adsterraPage("/"), true);
assert.equal(adsterraPage("/learn/test"), true);
for (const route of ["/login", "/admin", "/account", "/api/auth/callback/google"]) assert.equal(adsterraPage(route), false);
const previous = process.env.NEXT_PUBLIC_AD_PROVIDER;
process.env.NEXT_PUBLIC_AD_PROVIDER = "none"; assert.equal(adProvider(), "none");
if (previous === undefined) delete process.env.NEXT_PUBLIC_AD_PROVIDER; else process.env.NEXT_PUBLIC_AD_PROVIDER = previous;
console.log("Passed: Adsterra unit configuration, responsive sizing, isolated iframe options, public route selection and provider switch.");
