import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dataDir='/tmp/msxlab-integration-'+Date.now();
const projectDir=new URL('../projects/integration-test/',import.meta.url);
await fs.cp(new URL('../projects/kings-valley/',import.meta.url),projectDir,{recursive:true});
const project=JSON.parse(await fs.readFile(new URL('project.json',projectDir),'utf8'));project.id='integration-test';project.name='Integration Test';project.breakpoints=[];await fs.writeFile(new URL('project.json',projectDir),JSON.stringify(project));
const env={...process.env,MSXLAB_USER_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
let app;const failures=[];let calls=[];
async function start(){app=await electron.launch({args:['.'],env});const page=await app.firstWindow();page.on('pageerror',e=>failures.push(e.message));await page.waitForSelector('.panel-disassembler tbody tr',{timeout:20000});return page;}
async function api(command,args={}){const info=JSON.parse(await fs.readFile(new URL('../.msxlab-runtime.json',import.meta.url),'utf8'));const r=await fetch(info.url,{method:'POST',headers:{Authorization:'Bearer '+info.token,'Content-Type':'application/json'},body:JSON.stringify({command,args})});const body=await r.json();assert(!body.error,body.error);return body.result;}
async function paused(page){await page.waitForFunction(()=>document.querySelector('.backend-badge')?.textContent==='PAUSED');}
try{
 let page=await start();await api('loadProject',{id:'integration-test'});await page.waitForTimeout(4000);await api('pause');await paused(page);
 const registers=await api('registers');assert(Number.isInteger(registers.PC));assert.equal((await api('readMemory',{address:0x4000,length:16})).bytes.length,16);assert.equal((await api('readMemory',{space:'vram',address:0,length:16})).bytes.length,16);calls.push('API registers, CPU, VRAM');
 await page.getByRole('textbox',{name:'Go to address or symbol'}).fill('406C');await page.getByRole('textbox',{name:'Go to address or symbol'}).press('Enter');await page.waitForFunction(()=>document.querySelector('.panel-disassembler input[aria-label="Address"]').value==='406C');assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'406C');assert.equal(await page.locator('.panel-memory input[aria-label="Address"]').inputValue(),'4060');calls.push('Linked navigation');
 await page.getByRole('button',{name:'Back to previous address'}).click();await page.waitForTimeout(80);assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'4000');await page.getByRole('button',{name:'Forward to next address'}).click();await page.waitForTimeout(80);assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'406C');
 // Use controlled RAM rather than assuming which cartridge bank is mapped during boot.
 await page.frames().find(f=>f.url().includes('/engine/index.html')).evaluate(()=>{const b=WMSX.room.machine.eval('bus');[0xc3,0x10,0xc0].forEach((v,i)=>b.write(0xc000+i,v));});
 await page.getByRole('textbox',{name:'Go to address or symbol'}).fill('C000');await page.getByRole('textbox',{name:'Go to address or symbol'}).press('Enter');await page.getByRole('button',{name:'Jump to C010',exact:true}).first().click();await page.waitForTimeout(80);assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'C010');await page.getByRole('button',{name:'Back to previous address'}).click();await page.waitForTimeout(80);assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'C000');await page.getByRole('button',{name:'Back to previous address'}).click();await page.waitForTimeout(80);assert.equal(await page.locator('.panel-disassembler input[aria-label="Address"]').inputValue(),'406C');calls.push('Branch target and back/forward navigation');
 // Label edit on isolated project, saving to disk and undo.
 await page.getByRole('button',{name:'Add label',exact:true}).click();await page.getByRole('textbox',{name:'Label name',exact:true}).fill('INTEGRATION_LABEL');await page.getByRole('textbox',{name:'Label comment',exact:true}).fill('Saved test annotation');await page.getByRole('button',{name:'Save 406C',exact:true}).click();
 await page.waitForTimeout(400);const saved=JSON.parse(await fs.readFile(new URL('project.json',projectDir),'utf8'));assert(saved.labels.some(l=>l.name==='INTEGRATION_LABEL'));calls.push('Atomic project save');
 await page.getByRole('button',{name:'Panels',exact:true}).click();await page.getByRole('button',{name:'New Memory · HEX view',exact:true}).click();assert.equal(await page.locator('.panel-memory').count(),2);calls.push('Multiple memory views');
 await page.locator('.panel-memory').first().getByRole('textbox',{name:'Address',exact:true}).fill('E100');await page.locator('.panel-memory').first().getByRole('textbox',{name:'Address',exact:true}).press('Enter');
 if(await page.getByRole('button',{name:'Switch to light theme',exact:true}).count())await page.getByRole('button',{name:'Switch to light theme',exact:true}).click();await page.waitForTimeout(250);
 // Close the Screen panel; the engine frame and machine must survive.
 const engineBefore=page.frames().find(f=>f.url().includes('/engine/index.html'));
 const seqBefore=await engineBefore.evaluate(()=>WMSX.room.machine.saveState().c.cc);
 await page.getByRole('button',{name:'Close Screen',exact:true}).click();
 await api('run');await page.waitForTimeout(200);await api('pause');await paused(page);
 const engineAfter=page.frames().find(f=>f.url().includes('/engine/index.html'));assert.equal(engineAfter,engineBefore);assert(await engineAfter.evaluate(()=>WMSX.room.machine.saveState().c.cc)>seqBefore);
 await page.getByRole('button',{name:'Panels',exact:true}).click();await page.getByRole('button',{name:'Screen',exact:true}).click();calls.push('Screen close/reopen preserves engine');
 const screenshot=await api('capture');assert((await fs.stat(screenshot.path)).size>100);calls.push('Screenshot to project');
 // Run a deterministic RAM fixture on the actual adapter using UI commands.
 const frame=page.frames().find(f=>f.url().includes('/engine/index.html'));
 await frame.evaluate(()=>{const m=WMSX.room.machine,c=m.eval('cpu'),b=m.eval('bus');[0x3e,0x12,0xcd,0x10,0xc0,0x32,0x00,0xe1,0xc3,0x08,0xc0].forEach((v,i)=>b.write(0xc000+i,v));[0x3c,0xc9].forEach((v,i)=>b.write(0xc010+i,v));const r=c.saveState();Object.assign(r,{PC:0xc000,SP:0xf000,Tn:0,p:0,ai:false,IFF1:0,INT:255});c.loadState(r);});
 await api('step');await page.waitForTimeout(150);await paused(page);assert.equal((await api('registers')).PC,0xc002);assert.equal((await api('registers')).A,0x12);
 await page.getByRole('button',{name:'Step Over',exact:true}).click();await page.waitForTimeout(180);await paused(page);assert.equal((await api('registers')).PC,0xc005);assert.equal((await api('registers')).A,0x13);calls.push('Step and Step Over on real CPU');
 // Restart application on a new local port: workspace must persist independently of origin.
 await page.screenshot({path:'work/integration-light.png'});await app.close();app=null;page=await start();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.equal(await page.locator('.panel-memory').count(),2);assert.equal(await page.locator('.panel-memory').first().getByRole('textbox',{name:'Address',exact:true}).inputValue(),'E100');calls.push('Theme/layout/panel settings survive application restart');
 assert.deepEqual(failures,[]);console.log('PASS',calls.join('; '));
}finally{if(app)await app.close();await fs.rm(projectDir,{recursive:true,force:true});await fs.rm(dataDir,{recursive:true,force:true});}
