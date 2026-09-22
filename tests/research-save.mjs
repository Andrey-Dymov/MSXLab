import assert from 'node:assert/strict';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});const project={version:1,id:'first',labels:[],breakpoints:[],watches:[]};let reject=true,loaded=0,saved=0;
globalThis.localStorage={setItem(){}};globalThis.window={desktop:{listProjects:async()=>[{id:'first',name:'First',kind:'rom'},{id:'second',name:'Second',kind:'rom'}],saveProject:async()=>{if(reject)throw Error('Simulated disk failure');saved++;return true;},loadProject:async(id)=>{loaded++;return {...project,id};},savePreference:async()=>{}}};
try{
 const {store,updateProject,flushResearch,loadProject,retryResearchSave}=await server.ssrLoadModule('/src/state/debugger.ts');store.set({project,saved:true});
 updateProject({labels:[{id:'a',name:'Keep me',address:1,end:1,type:'LABEL',space:'cpu',comment:''}]});await assert.rejects(flushResearch,/Simulated disk failure/);await loadProject('second');assert.equal(loaded,0);assert.equal(store.get().project.id,'first');assert.equal(store.get().project.labels[0].name,'Keep me');assert.equal(store.get().saved,false);
 store.set({error:''});assert.equal(store.get().saveError,'Simulated disk failure');reject=false;retryResearchSave();await flushResearch();assert.equal(saved,1);assert.equal(store.get().saved,true);assert.equal(store.get().error,'');await loadProject('second');assert.equal(loaded,1);assert.equal(store.get().project.id,'second');assert.equal(store.get().saved,true);
 console.log('PASS failed research write blocks project switch without losing edits; retry saves and switching resumes');
}finally{await server.close();delete globalThis.window;delete globalThis.localStorage;}
