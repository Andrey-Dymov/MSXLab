const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
(async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'msx-data-disk-'));try{
 await fs.mkdir(path.join(dir,'data'));await fs.writeFile(path.join(dir,'project.json'),JSON.stringify({launch:{dataDisk:true}}));await fs.writeFile(path.join(dir,'data/tables.dsk'),Buffer.alloc(737280));
 const {write}=require('../electron/data-disk.cjs');
 await Promise.all([write(dir,2,Buffer.alloc(512,1)),write(dir,3,Buffer.alloc(512,2)),write(dir,2,Buffer.alloc(512,3))]);
 const disk=await fs.readFile(path.join(dir,'data/tables.dsk'));assert.equal(disk[1024],3);assert.equal(disk[1536],2);assert.equal(disk[2048],0);
 await assert.rejects(write(dir,-1,Buffer.alloc(512)));await assert.rejects(write(dir,1440,Buffer.alloc(512)));await assert.rejects(write(dir,0,Buffer.alloc(1)));
 await fs.writeFile(path.join(dir,'project.json'),'{}');await assert.rejects(write(dir,0,Buffer.alloc(512)));
 console.log('PASS: persistent sector writes preserve order and reject invalid/unconfigured writes');
}finally{await fs.rm(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
