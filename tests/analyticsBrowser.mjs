import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 const page = await browser.newPage(); let requests = 0;
 await page.route("https://pagead2.googlesyndication.com/**", route => route.fulfill({contentType:"application/javascript",body:"/* AdSense test stub. */"}));

 await page.route('https://www.googletagmanager.com/gtag/js**', async route => { requests++; await route.fulfill({contentType:'application/javascript',body:'/* Analytics test stub: no visitor data is sent. */'}); });
 await page.route(/https:\/\/[^/]*google-analytics\.com\//, route => route.abort());
 await page.goto('http://localhost:3100/privacy');
 await page.waitForFunction(() => window.dataLayer && [...window.dataLayer].some(value => value[0] === 'config'));
 const configs = await page.evaluate(() => [...window.dataLayer].filter(value => value[0] === 'config').map(value => Array.from(value)));
 assert.equal(configs.length,1); assert.equal(configs[0][1],'G-6P7MVWK6YT'); assert.equal(configs[0][2].allow_google_signals,false);
 assert.equal(requests,1); assert.equal(await page.locator('#google-analytics').count(),1);
 await page.getByRole('link',{name:'Contact',exact:true}).first().click();
 assert.equal(await page.locator('#google-analytics').count(),1);assert.equal(requests,1);
 console.log('Passed: production Analytics ID, one initialization, one script load across navigation; external tracking stubbed.');
}finally{await browser.close();}
