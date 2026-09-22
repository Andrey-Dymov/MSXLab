import assert from 'node:assert/strict';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
globalThis.localStorage={setItem(){}};let saved;
globalThis.window={desktop:{saveProject:async(_,p)=>{saved=structuredClone(p);return true;}}};
try{
 const {resolveSymbol}=await server.ssrLoadModule('/src/backend/library.ts');
 const {sameScope}=await server.ssrLoadModule('/src/backend/memoryScope.ts');
 const {labelView}=await server.ssrLoadModule('/src/backend/labelView.ts');
 const a={primary:3,secondary:0,bank:2},b={primary:3,secondary:0,bank:3};
 const labels=[a,b].map((memoryScope,i)=>({id:String(i),name:'BANK_'+i,address:0x4000,end:0x4003,space:'cpu',type:'PROC',comment:'',memoryScope}));
 const snapshot={pages:[],memorySlots:{columns:[{primary:3,secondary:0,activePages:[1],banks:[0,2,0,0]}]}};
 assert.equal(resolveSymbol(0x4000,'cpu',labels,snapshot).name,'BANK_0');snapshot.memorySlots.columns[0].banks[1]=3;
 assert.equal(resolveSymbol(0x4000,'cpu',labels,snapshot).name,'BANK_1');snapshot.memorySlots.columns[0].activePages=[];
 assert.equal(resolveSymbol(0x4000,'cpu',labels,snapshot),undefined);
 assert.equal(labelView(labels[0]).preferences.physicalBank,2);
 const {store,toggleBreakpoint,flushResearch}=await server.ssrLoadModule('/src/state/debugger.ts');
 store.set({project:{id:'test',labels,breakpoints:[],watches:[]}});
 toggleBreakpoint(0x4000,a);toggleBreakpoint(0x4000,b);await flushResearch();assert.equal(saved.breakpoints.length,2);
 toggleBreakpoint(0x4000,a);await flushResearch();assert.equal(saved.breakpoints.length,1);assert(sameScope(saved.breakpoints[0].memoryScope,b));assert.deepEqual(saved.labels,labels);
 console.log('PASS same-address labels resolve by active bank; scoped view and independent breakpoint persistence');
}finally{await server.close();delete globalThis.window;delete globalThis.localStorage;}
