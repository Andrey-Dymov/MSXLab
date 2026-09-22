import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const env={...process.env,MSXLAB_USER_DATA:'/tmp/msxlab-edges-'+Date.now()};delete env.ELECTRON_RUN_AS_NODE;
let app;
try{
 app=await electron.launch({args:['.'],env});const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('.panel-disassembler tbody tr',{timeout:20000});await page.waitForTimeout(1500);
 const frame=page.frames().find(f=>f.url().includes('/engine/index.html'));
 async function request(command,args){return page.evaluate(({command,args})=>new Promise((resolve,reject)=>{const f=document.querySelector('iframe[title="MSX emulator"]'),id=Math.floor(Math.random()*1e9)+1e9;const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('Test request timeout'));},5000);const handler=e=>{if(e.source===f.contentWindow&&e.data.id===id&&e.data.type==='reply'){clearTimeout(timer);window.removeEventListener('message',handler);e.data.error?reject(Error(e.data.error)):resolve(e.data.result);}};window.addEventListener('message',handler);f.contentWindow.postMessage({source:'msxlab-ui',id,command,args},location.origin);}),{command,args});}
 await request('pause');await page.waitForFunction(()=>document.querySelector('.backend-badge').textContent==='PAUSED');await request('breakpoints',[]);
 async function fixture(bytes,patch={}){await frame.evaluate(({bytes,patch})=>{const m=WMSX.room.machine,b=m.eval('bus'),c=m.eval('cpu');bytes.forEach((v,i)=>b.write(0xc000+i,v));const r=c.saveState();Object.assign(r,{PC:0xc000,SP:0xf000,A:0,F:0,B:0,C:0,DE:0,HL:0,Tn:0,p:0,ai:false,IFF1:0,INT:255,IM:1},patch);c.loadState(r);},{bytes,patch});}
 async function step(){await request('step');for(let i=0;i<100;i++){const s=await request('snapshot');if(s.status==='paused')return s;await page.waitForTimeout(10);}throw Error('Step failed to stop');}
 await fixture([0xfb,0x3c,0x00],{INT:247});
 let s=await step();assert.equal(s.registers.PC,0xc001,'EI must be exactly one instruction');assert.equal(s.registers.A,0);assert.equal(s.registers.p,7,'preserve one-instruction interrupt inhibition');
 s=await step();assert.equal(s.registers.PC,0xc002);assert.equal(s.registers.A,1);assert.equal(s.registers.ai,true);
 s=await step();assert.equal(s.registers.PC,0x38);assert.equal(s.registers.SP,0xeffe);assert.equal(s.cpu[0xeffe],2);assert.equal(s.cpu[0xefff],0xc0);
 await fixture([0xdd,0xfd,0x21,0x34,0x12,0x00]);s=await step();assert.equal(s.registers.PC,0xc005);assert.equal(s.registers.IY,0x1234);
 await fixture([0xdd,0xcb,0xfe,0xc6,0x00],{IX:0xe102});await frame.evaluate(()=>WMSX.room.machine.eval('bus').write(0xe100,0));s=await step();assert.equal(s.registers.PC,0xc004);assert.equal(s.cpu[0xe100],1);
 // A taken relative branch and a conditional call which is not taken.
 await fixture([0x18,0xfe]);s=await step();assert.equal(s.registers.PC,0xc000);
 await fixture([0xc4,0x10,0xc0,0x00],{F:0x40});await request('over',{address:0xc003});await page.waitForTimeout(100);s=await request('snapshot');assert.equal(s.registers.PC,0xc003);assert.equal(s.registers.SP,0xf000);
 // HALT repeats at its address; interrupt entry must push the byte after HALT.
 await fixture([0x76,0x00],{IFF1:1});s=await step();assert.equal(s.registers.PC,0xc000);
 await frame.evaluate(()=>{const c=WMSX.room.machine.eval('cpu');c.setINTChannel(3,false);});s=await step();assert.equal(s.registers.PC,0x38);assert.equal(s.cpu[0xeffe],1);assert.equal(s.cpu[0xefff],0xc0);
 // Block repeats are observable one iteration at a time, rather than running until BC=0.
 await fixture([0xed,0xb0,0x00],{B:0,C:2,HL:0xe100,DE:0xe200});await frame.evaluate(()=>{const b=WMSX.room.machine.eval('bus');b.write(0xe100,0x12);b.write(0xe101,0x34);});s=await step();assert.equal(s.registers.PC,0xc000);assert.equal(s.registers.C,1);assert.equal(s.cpu[0xe200],0x12);s=await step();assert.equal(s.registers.PC,0xc002);assert.equal(s.registers.C,0);assert.equal(s.cpu[0xe201],0x34);
 assert.deepEqual(errors,[]);console.log('PASS debugger edges: EI interrupt delay, interrupt return address, repeated DD/FD, indexed CB, branches, conditional Step Over, HALT wake-up and LDIR iterations');
}finally{if(app)await app.close();await fs.rm(env.MSXLAB_USER_DATA,{recursive:true,force:true});}
