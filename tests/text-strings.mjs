import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
try{
 const {findTextStrings:scan}=await server.ssrLoadModule('/src/backend/textStrings.ts');
 const ascii=s=>Array.from(s,c=>c.charCodeAt(0));
 const options={minimum:4,ending:'auto'};
 const bytes=[...ascii('HELLO'),0,...ascii('GAME OVER'),36,...ascii('SCORE'),255,...ascii('12345'),0,...ascii('END')];
 const rows=scan(bytes,options);
 assert.deepEqual(rows.map(r=>r.text),['HELLO','GAME OVER','SCORE']);
 assert.deepEqual(rows[0],{address:0,end:4,text:'HELLO',length:5,ending:'00'});
 assert.equal(rows[1].address,6);
 assert.equal(scan(ascii('NO TERMINATOR'),options).length,0);
 assert.equal(scan(ascii('NO TERMINATOR'),{...options,ending:'any'})[0].ending,'конец памяти');
 assert.equal(scan([...ascii('COST $5'),0],{...options,ending:'00'})[0].text,'COST $5');
 assert.equal(scan([...ascii('HELLO'),13],{...options,ending:'custom',customEnding:13})[0].ending,'0D');
 assert.equal(scan([128,129,130,131,0],{...options,charset:'АБВГ',firstCode:128})[0].text,'АБВГ');
 assert.equal(scan([...ascii('HEY'),0],options).length,0);
 assert.equal(scan([0,255,0],options).length,0);
 assert.throws(()=>scan([],{...options,ending:'custom',customEnding:NaN}));
 assert.throws(()=>scan([],{...options,minimum:0}));
 assert.throws(()=>scan([],{...options,charset:'abc',firstCode:255}));
 console.log('PASS text scan: endings, EOF, offsets, minimum length, custom charset and invalid options');
}finally{await server.close();}
