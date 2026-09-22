import {createServer} from 'vite';
import assert from 'node:assert/strict';
const server=await createServer({server:{middlewareMode:true}});
try{
 const {resolveAnnotations}=await server.ssrLoadModule('/src/backend/annotations.ts');
 const ld={address:0x103,size:2,bytes:[14,9],kind:'code',text:'LD C,09',labels:[]};
 const call={address:0x105,size:3,bytes:[205,5,0],kind:'code',text:'CALL 0005',labels:[{id:'comment',type:'COMMENT',name:'note',address:0x105,end:0x107,comment:'Project note'}]};
 const entries=resolveAnnotations(call,[ld,call],{dos:true});
 assert.equal(entries.length,2);assert.equal(entries[0].description,'Project note');assert.equal(entries[1].name,'BDOS · _STROUT');
 assert.equal(resolveAnnotations(call,[call],{dos:true})[1].name,'BDOS');
 assert(!resolveAnnotations(call,[ld,call]).some(e=>e.id.startsWith('dos:')));
 assert.equal(resolveAnnotations({...call,kind:'data'},[ld,call],{dos:true}).length,1);
 const out={address:0,size:2,bytes:[211,152],kind:'code',text:'OUT (98),A',labels:[]};
 assert(resolveAnnotations(out,[out]).some(e=>e.origin==='reference'));
 console.log('PASS: common annotation model, project comments, DOS context, unknown C, data, hardware ports');
}finally{await server.close();}
