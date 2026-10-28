import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import { PRACTICAL_LESSONS } from '../lib/practicalLessons.js';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({contentType:'application/javascript',body:'/* Ad stub */'}));await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'application/javascript',body:'/* Analytics stub */'}));
 const origin='http://localhost:3100';
 await page.goto(origin+'/learn/first-chess-game');const opening=page.locator('.lesson-walkthrough');await opening.waitFor();
 for(let i=0;i<7;i++)await opening.getByRole('button',{name:'Next example move',exact:true}).click();await opening.locator('[data-sq="g1"][aria-label*="White king"]').waitFor();await opening.getByRole('button',{name:'Reset example',exact:true}).click();await opening.locator('[data-sq="e1"][aria-label*="White king"]').waitFor();
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://chessnexa.in/learn/first-chess-game');
 await page.goto(origin+'/learn/spot-a-knight-fork');const fork=page.locator('.lesson-walkthrough');for(let i=0;i<3;i++)await fork.getByRole('button',{name:'Next example move',exact:true}).click();await fork.locator('[data-sq="d6"][aria-label*="White knight"]').waitFor();
 await page.goto(origin+'/learn/checkmate-or-stalemate');const examples=page.locator('.lesson-walkthrough');assert.equal(await examples.count(),2);await examples.nth(0).getByRole('button',{name:'Next example move',exact:true}).click();assert.equal(await examples.nth(0).locator('.mated-king').count(),1);await examples.nth(1).getByRole('button',{name:'Next example move',exact:true}).click();assert.equal(await examples.nth(1).locator('.mated-king').count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto(origin+'/editorial');await page.getByRole('heading',{name:'How our learning guides work'}).waitFor();await page.goto(origin+'/about');assert.ok(!(await page.locator('body').innerText()).includes('does not currently provide rated matchmaking'));for(const lesson of PRACTICAL_LESSONS){await page.goto(origin+'/learn/'+lesson.slug);await page.getByRole('heading',{level:1,name:lesson.title,exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lesson.slug+' mobile overflow');if(lesson.challenge){const exercise=page.locator('.lesson-exercise');const move=lesson.challenge.moves[0];await exercise.locator('[data-sq="'+move.slice(0,2)+'"]').click();await exercise.locator('[data-sq="'+move.slice(2,4)+'"]').click();await exercise.getByRole('status').filter({hasText:lesson.challenge.success}).waitFor();}else{await page.locator('.lesson-notation').filter({hasText:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *'}).waitFor();}}assert.deepEqual(errors,[]);
 console.log('Passed: worked opening/castling, reset, fork capture, mate/stalemate comparison, canonical URL, editorial page, corrected About and mobile width. External Google scripts stubbed.');
}finally{await browser.close();}
