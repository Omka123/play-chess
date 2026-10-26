import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage(); let loads=0;
 await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js**',async route=>{loads++;await route.fulfill({contentType:'application/javascript',body:'/* Test stub: no ads requested. */'});});
 await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({contentType:'application/javascript',body:'/* Analytics stub. */'}));
 await page.goto('http://localhost:3100/');
 const script=page.locator('head script[src*="adsbygoogle.js?client=ca-pub-9915062612412572"]');
 assert.equal(await script.count(),1);assert.equal(await script.getAttribute('crossorigin'),'anonymous');assert.notEqual(await script.getAttribute('async'),null);
 assert.equal(await page.locator('meta[name="google-adsense-account"]').getAttribute('content'),'ca-pub-9915062612412572');
 const ads=await page.request.get('http://localhost:3100/ads.txt');assert.equal(ads.status(),200);assert.equal((await ads.text()).trim(),'google.com, pub-9915062612412572, DIRECT, f08c47fec0942fa0');
 await page.goto('http://localhost:3100/privacy');await page.getByRole('heading',{level:1}).waitFor();assert.ok((await page.locator('body').innerText()).includes('Google AdSense advertising code'));assert.ok(loads>=1);
 console.log('Passed: production AdSense head script, async/crossorigin attributes, publisher metadata, ads.txt and privacy disclosure. Google scripts stubbed; no ad impressions sent.');
}finally{await browser.close();}
