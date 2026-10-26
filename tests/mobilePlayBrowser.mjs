import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const width of [320,360,390,430]) {
 const context=await browser.newContext({viewport:{width,height:700},isMobile:true,hasTouch:true});
 const token=await encode({secret:'local-browser-test-session-key-for-chessnexa-only',token:{userId:'mobile-'+randomUUID(),name:'Omkar Prajapati',sub:randomUUID(),email:'mobile@example.test'},maxAge:3600});
 await context.addCookies([{name:'next-auth.session-token',value:token,url:'http://localhost:3100',httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3100/');await page.locator('.mobile-header-account').getByRole('link',{name:'My account',exact:true}).waitFor();
 const start=page.getByRole('button',{name:'Start Game',exact:true});await start.waitFor();
 const preview=await page.locator('.stage .board:visible').boundingBox(), setup=await page.locator('.match-panel:visible').boundingBox();assert.ok(preview.y<setup.y, 'Setup board must precede controls');if(width===390)await page.screenshot({path:tmpdir()+'/chessnexa-mobile-setup.png',fullPage:false});
 const box=await start.boundingBox();assert.ok(box.y>=0&&box.y+box.height<700,`${width}: Start Game is below the fold`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: overflow`);
 assert.equal(await page.locator('.sidebar-extra').isVisible(),false);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('link',{name:/Analysis studio/}).waitFor();await page.getByRole('button',{name:'Close menu',exact:true}).click();
 await start.click();await page.getByText('Your move',{exact:true}).waitFor();
 const board=await page.locator('.stage .board:visible').first().boundingBox(),panel=await page.locator('.match-panel:visible').boundingBox();assert.ok(board.y<panel.y,`${width}: active game board should precede controls`);
 await page.locator('[data-sq="e2"]:visible').click();await page.locator('[data-sq="e4"]:visible').click();await page.getByRole('button',{name:/e4/}).first().waitFor();
 if(width===390)await page.screenshot({path:tmpdir()+'/chessnexa-mobile-game.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log(`Passed ${width}px: visible Start Game, compact menu, board-first active game, legal e4, no overflow/errors.`);
 await context.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto('http://localhost:3100/');await page.getByRole('button',{name:'Start Game',exact:true}).waitFor();const stage=await page.locator('.stage:visible').first().boundingBox(),controls=await page.locator('.match-panel:visible').boundingBox();assert.ok(controls.x>stage.x);assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).isVisible(),false);console.log('Passed desktop: side-by-side board and controls retained.');
}finally{await browser.close();}
