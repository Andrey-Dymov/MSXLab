import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
try{
 const {researchIndex,researchListing,directReferences}=await server.ssrLoadModule('/src/backend/research.ts');
 const label=(id,address,end,type='PROC',space='cpu')=>({id,name:id,address,end,type,space,comment:id+' description'});
 const memory=Array(65536).fill(0);memory.splice(0x8000,15,0xcd,0x00,0x81,0x18,0xfb,0xcd,0x00,0x82,0x34,0x12,0x56,0xc9,0xcd,0x00,0x90);
 const labels=[label('main',0x8000,0x800b),label('data',0x8005,0x800a,'DATA DW'),label('comment',0x8001,0x8002,'COMMENT'),label('same start',0x8000,0x800b,'COMMENT'),label('VRAM data',0x8000,0x8010,'DATA','vram')];
 const index=researchIndex(labels);assert.equal(index.symbolAt(0x8000).name,'main');assert.equal(index.procedureAt(0x8009).name,'main');
 let rows=researchListing(memory,0x8000,index,100,0x800b);assert.deepEqual(rows.map(r=>r.address),[0x8000,0x8003,0x8005,0x800b]);assert.equal(rows[2].text,'DW $00CD, $3482, $5612');assert.equal(rows[2].kind,'data');assert.equal(rows[0].labels.length,3);assert.equal(rows.at(-1).text,'RET');assert.equal(directReferences(memory,index).length,2);assert(!directReferences(memory,index).some(r=>r.address===0x8005));
 const nested=researchIndex([...labels,label('inner',0x8003,0x8004)]);assert.equal(nested.procedureAt(0x8003).name,'inner');assert.equal(directReferences(memory,nested).length,2);
 rows=researchListing(memory,0x8000,researchIndex([label('short',0x8000,0x8001)]),100,0x8001);assert.equal(rows[0].kind,'boundary');assert.equal(rows[0].size,2);assert.equal(rows[0].target,undefined);
 rows=researchListing(memory,0x8005,researchIndex([label('odd',0x8005,0x8007,'DATA DW')]),10,0x8007);assert.deepEqual(rows.map(r=>r.size),[2,1]);assert.equal(rows[1].text,'DB $82');
 rows=researchListing(memory,0x8006,researchIndex([label('aligned words',0x8005,0x800a,'DATA DW')]),10,0x800a);assert.equal(rows[0].size,1);assert.equal(rows[1].address,0x8007);assert.equal(rows[1].text,'DW $3482, $5612');
 rows=researchListing(memory,0x8005,researchIndex([label('decimal',0x8005,0x8007,'DATA DEC1')]),10,0x8007);assert.equal(rows[0].text,'DB 205, 0, 130');
 memory[65535]=0xcd;rows=researchListing(memory,65535,researchIndex([]));assert.equal(rows.length,1);assert.equal(rows[0].size,1);assert.equal(rows[0].kind,'boundary');
 rows=researchListing(memory,0x8000,researchIndex([label('text',0x8000,0x8003,'DATA MSG')]));assert.equal(rows[0].size,4);assert.equal(rows[0].kind,'data');assert.equal(rows[0].ascii.length,4);
 const project=JSON.parse(await fs.readFile('projects/kings-valley/project.json','utf8'));const liveIndex=researchIndex(project.labels);assert.equal(liveIndex.procedureAt(0x454d).name,'SPRITE.REV.MOVE');assert.equal(liveIndex.dataAt(0x4325).name,'L4323');
 const start=performance.now();const refs=directReferences(memory,liveIndex);assert(performance.now()-start<3000);assert.equal(refs.length,new Set(refs.map(r=>r.address)).size);
 const rom=await fs.readFile('projects/kings-valley/program/kvalley.rom');const game=Array(65536).fill(0);for(let i=0;i<rom.length&&0x4000+i<65536;i++)game[0x4000+i]=rom[i];let procedures=0;
 for(const proc of liveIndex.procedures.filter(l=>l.address>=0x4000&&l.end<0x4000+rom.length)){const listing=researchListing(game,proc.address,liveIndex,65536,proc.end);assert.equal(listing[0].address,proc.address);assert.equal(listing.at(-1).address+listing.at(-1).size-1,proc.end);assert.deepEqual(listing.flatMap(r=>r.bytes),game.slice(proc.address,proc.end+1));for(let i=1;i<listing.length;i++)assert.equal(listing[i].address,listing[i-1].address+listing[i-1].size);procedures++;}assert(procedures>300);console.log('PASS',procedures,'real ROM procedures preserve every byte and respect declared ranges');
 console.log('PASS semantic listing: procedures, typed data, overlaps, annotations inside instructions, boundaries, end of memory, unique references and King’s Valley labels');
}finally{await server.close();}
