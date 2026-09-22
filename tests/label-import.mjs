import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
try{
 const {parseLabels,mergeLabels}=await server.ssrLoadModule('/src/backend/labelImport.ts');
 const p=JSON.parse(await fs.readFile('projects/kings-valley/project.json','utf8'));
 const roundtrip=parseLabels(JSON.stringify({format:'msxlab-labels',version:1,labels:p.labels}));assert.equal(roundtrip.labels.length,p.labels.length);assert.equal(roundtrip.issues.length,0);assert.equal(mergeLabels(p.labels,roundtrip.labels).added,0);
 const legacy=parseLabels(JSON.stringify([{name:'DRAW',source:'MEM',addressHex:'4000',length:'0010',type:'PROC',comment:'draw sprite'},{name:'VRAM',source:'VRAM',addressHex:'0010',endAddressHex:'0020',type:'DATA DB'},{name:'bad',addressHex:'QQ'}]));assert.equal(legacy.labels[0].end,0x400f);assert.equal(legacy.labels[1].space,'vram');assert.equal(legacy.issues.length,1);
 const symbols=parseLabels('DRAW: EQU 0x4000\nPLAY = $4567\n5000 UPDATE ; comment\n# header\nbroken');assert.equal(symbols.labels.length,3);assert.equal(symbols.issues.length,1);assert.equal(symbols.labels[1].address,0x4567);
 const updated={...legacy.labels[0],comment:'new',end:0x4020,id:'ignored'};assert.equal(mergeLabels(legacy.labels,[updated]).skipped,1);const merged=mergeLabels(legacy.labels,[updated],true);assert.equal(merged.updated,1);assert.equal(merged.labels[1].id,legacy.labels[0].id);assert.equal(merged.labels[1].end,0x4020);
 assert.equal(mergeLabels([],symbols.labels.concat(symbols.labels)).labels.length,3);
 assert.throws(()=>parseLabels('{"format":"msxlab-labels","version":2,"labels":[]}'));assert.throws(()=>parseLabels('{}'));assert.equal(parseLabels('[{"name":"oops","address":65536,"space":"cpu"}]').issues.length,1);
 const {labelView}=await server.ssrLoadModule('/src/backend/labelView.ts');assert.equal(labelView(legacy.labels[0]).kind,'disassembler');const bitmap=labelView({...legacy.labels[0],type:'DATA BM2'});assert.equal(bitmap.kind,'bitmap');assert.equal(bitmap.preferences.bpp,2);assert.equal(labelView({...legacy.labels[0],type:'DATA DW'}).preferences.format,'u16le');
 console.log('PASS label import: native roundtrip, legacy hex ranges, symbols, invalid rows, duplicate merge, explicit update and typed viewer configuration');
}finally{await server.close();}
