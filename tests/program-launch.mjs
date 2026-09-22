import {_electron as electron} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const env={...process.env,MSXLAB_USER_DATA:'/tmp/msxlab-program-test'};delete env.ELECTRON_RUN_AS_NODE;
const created=[];let app;
try{
 await fs.writeFile('/tmp/msxlab-test.com',Buffer.from([0x3e,0x42,0x32,0x00,0xe1,0xc3,0x05,0x01]));
 await fs.writeFile('/tmp/msxlab-test.bas','10 SCREEN 1\r\n20 PRINT "MSXLAB BASIC TEST"\r\n30 GOTO 30\r\n');
 app=await electron.launch({args:['.'],env});const page=await app.firstWindow();await page.waitForSelector('.panel-disassembler tbody tr',{timeout:20000});
 const info=JSON.parse(await fs.readFile('.msxlab-runtime.json','utf8'));
 async function api(command,args={}){const r=await fetch(info.url,{method:'POST',headers:{Authorization:'Bearer '+info.token,'Content-Type':'application/json'},body:JSON.stringify({command,args})});const x=await r.json();assert(!x.error,x.error);return x.result;}
 for(const kind of ['com','bas']){const p=await api('createProject',{sourcePath:'/tmp/msxlab-test.'+kind,name:kind+' test'});created.push(p.id);await api('loadProject',{id:p.id});await page.waitForTimeout(12000);await page.screenshot({path:'work/launch-'+kind+'.png'});if(kind==='com'){const value=await api('readMemory',{address:0xe100,length:1});console.log('COM_MARKER',value);assert.equal(value.bytes[0],0x42);
 const before=JSON.parse(await fs.readFile('projects/'+p.id+'/project.json','utf8'));
 const invalid=await fetch(info.url,{method:'POST',headers:{Authorization:'Bearer '+info.token,'Content-Type':'application/json'},body:JSON.stringify({command:'updateBuild',args:{id:p.id,sourcePath:'/tmp/msxlab-test.bas'}})});assert.equal(invalid.status,400);assert.deepEqual(JSON.parse(await fs.readFile('projects/'+p.id+'/project.json','utf8')),before);
 await fs.writeFile('/tmp/msxlab-test.com',Buffer.from([0x3e,0x43,0x32,0x00,0xe1,0xc3,0x05,0x01]));await api('updateBuild',{id:p.id,sourcePath:'/tmp/msxlab-test.com',run:true});await page.waitForTimeout(12000);assert.equal((await api('readMemory',{address:0xe100,length:1})).bytes[0],0x43);assert((await fs.readdir('projects/'+p.id+'/builds')).some(n=>n.endsWith('.COM')));console.log('BUILD_UPDATE_AND_RESTART_PASS');}else {const frame=page.frames().find(f=>f.url().includes('/engine/index.html'));const text=await frame.evaluate(()=>{const v=WMSX.room.machine.eval('vdp').eval('Array.from(vram.slice(0,16384))');return String.fromCharCode(...v);});assert(text.includes('MSXLAB BASIC TEST'));console.log('BASIC_TEXT_FOUND');}}
 console.log('PROGRAM_LAUNCH_PASS');
}finally{if(app)await app.close();for(const id of created)await fs.rm('projects/'+id,{recursive:true,force:true});await fs.rm(env.MSXLAB_USER_DATA,{recursive:true,force:true});for(const ext of ['com','bas'])await fs.rm('/tmp/msxlab-test.'+ext,{force:true});}
