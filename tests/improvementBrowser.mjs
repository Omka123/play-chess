import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { randomUUID } from 'node:crypto';
const origin=process.env.BROWSER_TEST_URL || 'http://localhost:3100';
const browser=await chromium.launch({...(process.env.BROWSER_CHANNEL === 'chromium' ? {} : {channel:'msedge'}),headless:true});
try {
 const context=await browser.newContext();
 const token=await encode({secret:process.env.NEXTAUTH_SECRET || 'local-browser-test-session-key-for-chessnexa-only',token:{userId:`improve-${randomUUID()}`,name:'Improvement tester',sub:randomUUID(),email:'improve@example.test'},maxAge:3600});
 await context.addCookies([{name:'next-auth.session-token',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${origin}/improve`);await page.getByText(/Puzzle rating 200/).waitFor();
 await page.locator('select').filter({has:page.locator('option[value="fork-queen"]')}).selectOption('fork-queen');
 for(const [from,to] of [['c3','e4'],['e4','d6']]) {await page.locator(`[data-sq="${from}"]`).click();await page.locator(`[data-sq="${to}"]`).click();if(from==='c3')await page.waitForTimeout(700);}
 await page.getByRole('status').filter({hasText:/Solved!/}).waitFor();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Board colour').selectOption('blue');await page.getByLabel('Piece style').selectOption('symbols');await page.getByRole('button',{name:'Save preferences',exact:true}).click();await page.getByText('Preferences saved across devices.').waitFor();assert.equal(await page.locator('html').getAttribute('data-board-theme'),'blue');
 for(const tab of ['Insights','Repertoire','Daily plan','Revision','Courses','Studies','Partners','Events','Offline']) {await page.getByRole('button',{name:tab,exact:true}).click();}
 await page.goto(`${origin}/variants`);await page.locator('select').first().selectOption('kingofthehill');await page.getByRole('button',{name:'Start new variant game'}).click();await page.locator('[data-sq="e2"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await page.getByRole('status').filter({hasText:'Black to move'}).waitFor();
 await page.setViewportSize({width:390,height:844});for(const route of ['/improve','/variants','/insights','/analysis']){await page.goto(origin+route);await page.getByRole('heading',{level:1}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} mobile overflow`);}
 await page.setViewportSize({width:1100,height:900});
 await page.goto(origin+'/improve#repertoire');await page.getByRole('heading',{name:'Your opening repertoire',exact:true}).waitFor();await page.getByLabel('Repertoire title').fill('Browser repertoire');await page.getByRole('button',{name:'Create repertoire',exact:true}).click();await page.locator('[data-sq="e2"]').click();await page.locator('[data-sq="e4"]').click();await page.getByRole('button',{name:'e4',exact:true}).waitFor();await page.getByRole('button',{name:'Practise this position',exact:true}).click();await page.locator('[data-sq="e2"]').click();await page.locator('[data-sq="e4"]').click();await page.getByRole('status').filter({hasText:'Recalled correctly'}).waitFor();
 await page.goto(origin+'/improve#offline');await page.getByRole('button',{name:'Download offline study',exact:true}).click();await page.getByRole('status').filter({hasText:'Public training pages downloaded'}).waitFor({timeout:90000});
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();const urls=[];for(const key of keys)if(key.startsWith('chessnexa-public-'))for(const req of await (await caches.open(key)).keys())urls.push(new URL(req.url).pathname);return urls;});assert.ok(cached.includes('/improve'));assert.ok(!cached.some(path=>path.startsWith('/api/')));
 await context.setOffline(true);await page.goto(origin+'/improve');await page.getByRole('heading',{name:'Your improvement centre'}).waitFor();await page.getByText('You are offline.',{exact:false}).waitFor();await context.setOffline(false);await page.getByRole('button',{name:'Offline',exact:true}).click();await page.getByRole('button',{name:'Remove offline downloads',exact:true}).click();await page.getByRole('status').filter({hasText:'Offline downloads removed'}).waitFor();
 assert.deepEqual(errors,[]);console.log('Passed improvement browser: multi-move tactics, saved preferences, tool tabs, keyboard variant moves, mobile layouts, repertoire recall, offline reload, private-cache exclusion and download removal.');
}finally{await browser.close();}


