import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createFromFile,updateBuild}=require('../electron/projects.cjs');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'msxlab-atomic-'));let project;
try{
 const input=path.join(temp,'APP.COM');await fs.writeFile(input,Buffer.from([0x3e,0x11,0xc9]));project=await createFromFile(input,'Atomic test');const dir=path.resolve('projects',project.id);const manifest=path.join(dir,'project.json');const oldProgram=await fs.readFile(path.join(dir,project.program)),oldDisk=await fs.readFile(path.join(dir,project.disk));const originalManifest=await fs.readFile(manifest);
 await fs.writeFile(input,Buffer.from([0x3e,0x22,0xc9]));const rename=fs.rename;
 fs.rename=async(src,dst)=>{if(dst===manifest)throw Error('Injected final commit failure');return rename(src,dst);};
 try{await assert.rejects(updateBuild(project,input),/Injected final commit failure/);}finally{fs.rename=rename;}
 assert.deepEqual(await fs.readFile(manifest),originalManifest);assert.deepEqual(await fs.readFile(path.join(dir,project.program)),oldProgram);assert.deepEqual(await fs.readFile(path.join(dir,project.disk)),oldDisk);
 const updated=await updateBuild({...project,labels:[{name:'OLD_LABEL'}]},input);assert.notEqual(updated.program,project.program);assert.notEqual(updated.disk,project.disk);assert.equal(updated.researchMismatch,true);assert.deepEqual(await fs.readFile(path.join(dir,project.program)),oldProgram);assert.equal((await fs.readFile(path.join(dir,updated.program)))[1],0x22);
 const again=await updateBuild(updated,input);assert.equal(again.program,updated.program);assert.deepEqual(await fs.readFile(path.join(dir,again.disk)),await fs.readFile(path.join(dir,updated.disk)));
 const beforeFailure=await fs.readFile(manifest);await fs.writeFile(input,Buffer.alloc(800000,0));await assert.rejects(updateBuild(again,input),/fit on disk/);assert.deepEqual(await fs.readFile(manifest),beforeFailure);
 console.log('PASS build transaction: injected commit failure preserves complete old bundle; immutable versions, retry, mismatch flag and capacity failure');
}finally{if(project)await fs.rm(path.join('projects',project.id),{recursive:true,force:true});await fs.rm(temp,{recursive:true,force:true});}
