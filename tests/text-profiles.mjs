import assert from 'node:assert/strict';import fs from 'node:fs';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});try{
 const {scanTexts:s,defaultTextProfile:p}=await server.ssrLoadModule('/src/backend/textStrings.ts');
 const {gameTextPresets,detectTextPreset,textEncodings,textFormats}=await server.ssrLoadModule('/src/backend/textProfiles.ts');
 assert.equal(detectTextPreset('unknown'),undefined);assert.equal(detectTextPreset(gameTextPresets[0].romHashes[0]).publisher,'Konami');
 for(const preset of gameTextPresets){assert(textEncodings[preset.settings.encoding]);assert(textFormats[preset.settings.format]);}
 const b=x=>[...Buffer.from(x)];
 assert.equal(s([...b('HELLO WORLD'),0],p)[0].text,'HELLO WORLD');
 assert.equal(s([...b('HELLO$'),0],{...p,ending:36})[0].text,'HELLO');
 assert.equal(s(b('HELLOWORLD'),{...p,format:'fixed',size:5}).length,2);
 assert.equal(s([5,...b('HELLO')],{...p,format:'length8'})[0].address,1);
 assert.equal(s([5,0,...b('HELLO')],{...p,format:'length16'})[0].text,'HELLO');
 assert.equal(s([128,129,130,131,0],{...p,encoding:'custom',charset:'АБВГ',firstCode:128})[0].text,'АБВГ');
 assert.equal(s([...b('>c`~cc>'),0],p).length,0);
 assert.equal(s([...b('>c`~cc>'),0],{...p,probable:false}).length,1);
 const rom=[...fs.readFileSync('projects/kings-valley/program/kvalley.rom')];
 const kv={...p,encoding:'kings-valley',format:'kings-valley'};const rows=s(rom,kv);
 for(const phrase of ['GAME OVER','PUSH SPACE KEY','PLAY START','KONAMI 1985'])assert(rows.some(r=>r.text.includes(phrase)),phrase);
 assert(rows.find(r=>r.text==='GAME OVER').referenced);
 assert(!rows.some(r=>r.text==='AME OVER'));
 const r=rows.find(r=>r.text==='GAME OVER');assert.equal(s(rom,{...kv,start:r.record,end:r.end+1})[0].text,'GAME OVER');
 const {parseLabels,mergeLabels}=await server.ssrLoadModule('/src/backend/labelImport.ts');const label={id:'x',name:'msg',space:'rom',address:1,end:8,type:'DATA MSG',comment:'',textProfile:kv};const imported=parseLabels(JSON.stringify([label]));assert.deepEqual(imported.labels[0].textProfile,kv);assert.equal(mergeLabels([label],[{...label,textProfile:{...kv,minimum:5}}],true).updated,1);
 console.log('PASS formats, filters, charset, real ROM messages, references, block ranges and metadata round-trip');console.log(rows.map(r=>`${r.address.toString(16)} ${r.text}`).join('\n'));
}finally{await server.close()}
