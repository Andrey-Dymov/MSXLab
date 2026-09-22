import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createFromFile,changeType}=require('../electron/projects.cjs');
const tmp=await fs.mkdtemp('/tmp/msx-loader-');let p;
try{
 await fs.writeFile(tmp+'/START.BAS','10 BLOAD "PART1.OBJ",R\r\n20 BLOAD "PART2.OBJ",R\r\n');
 await fs.writeFile(tmp+'/PART1.OBJ',Buffer.from([254,0,144,0,144,0,144,201]));await fs.writeFile(tmp+'/PART2.OBJ',Buffer.from([254,0,144,0,144,0,144,201]));
 p=await createFromFile(tmp+'/START.BAS','Loader test');p=await changeType(p,'loader',tmp+'/START.BAS',{machine:'MSX2E',files:[tmp+'/PART1.OBJ',tmp+'/PART2.OBJ']});
 assert.equal(p.basicRun,'START.BAS');assert.equal(p.machine,'MSX2E');assert.equal(p.launch.mode,'loader');assert.deepEqual(p.buildFiles.map(f=>f.name),['START.BAS','PART1.OBJ','PART2.OBJ']);
 const disk=await fs.readFile('projects/'+p.id+'/'+p.disk);const names=Array.from({length:112},(_,i)=>disk.subarray(3584+i*32,3595+i*32).toString());for(const n of ['START   BAS','PART1   OBJ','PART2   OBJ'])assert(names.includes(n));
 const before=await fs.readFile('projects/'+p.id+'/project.json');await assert.rejects(changeType(p,'loader',tmp+'/START.BAS',{files:[tmp+'/PART1.OBJ',tmp+'/PART1.OBJ']}),/Повторное/);assert.deepEqual(await fs.readFile('projects/'+p.id+'/project.json'),before);
 console.log('PASS loader disk preserves names, both overlapping-address modules, MSX2 selection and atomic rejection');
}finally{if(p)await fs.rm('projects/'+p.id,{recursive:true,force:true});await fs.rm(tmp,{recursive:true,force:true});}
