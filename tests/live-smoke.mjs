import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
const env={...process.env,MSXLAB_USER_DATA:'/tmp/msxlab-live-test'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.'],env});
try{
 const page=await app.firstWindow();page.on('pageerror',e=>console.log('PAGEERROR',e.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 await page.waitForSelector('.panel-disassembler .debug-table tbody tr',{timeout:20000});
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.backend-badge')?.textContent==='PAUSED');
 console.log('PAUSED',await page.locator('.panel-registers').innerText());
 await page.getByRole('button',{name:'Step Into',exact:true}).click();await page.waitForTimeout(250);
 console.log('AFTER_STEP',await page.locator('.panel-registers').innerText());
 const engine=page.frames().find(f=>f.url().includes('/engine/index.html'));
 console.log('ENGINE',engine?.url(),await engine?.locator('canvas').count());
 await page.screenshot({path:'work/live-debugger.png'});
 assert(await page.locator('.panel-memory tbody tr').count()>0);
 assert(await page.locator('.panel-labels tbody tr').count()>0);
 await page.getByRole('button',{name:'Run',exact:true}).click();await page.waitForTimeout(200);
 console.log('SUCCESS');
}finally{await app.close();}
