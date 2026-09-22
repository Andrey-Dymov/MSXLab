import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={documentElement:{lang:''},createElement:()=>({})};
globalThis.window={desktop:{savePreference:async()=>{}}};
const server=await createServer({plugins:[{name:'test-popup-host',enforce:'pre',load(id){if(id.endsWith('/src/components/PanelPopup.tsx'))return 'export const togglePanelPopup=()=>{};export const revealPanel=()=>{};export function PanelPopup({children}){return children;}';}}],server:{middlewareMode:true},customLogger:{info(){},warn(){},warnOnce(){},error:console.error,clearScreen(){},hasErrorLogged(){return false},hasWarned:false}});
try{
 const {store}=await server.ssrLoadModule('/src/state/debugger.ts');
 const {setLanguage,t}=await server.ssrLoadModule('/src/i18n/index.ts');
 const {normalizeCommand}=await server.ssrLoadModule('/src/i18n/commands.ts');
 const {MockDebuggerBackend}=await server.ssrLoadModule('/src/backend/MockDebuggerBackend.ts');
 const snapshot=await new MockDebuggerBackend().command('snapshot');
 const label='USER_LABEL_Пример';
 const project={id:'i18n-fixture',name:'PROJECT_Пример',kind:'mock',labels:[{id:'label',name:label,address:0x8000,end:0x8001,space:'cpu',type:'PROC',comment:'USER_COMMENT_Пример'}],patterns:[],breakpoints:[],watchpoints:[],watches:[0x8000],assets:[],resources:[],engine:'test',machine:'MSX1E',buildFiles:[]};
 snapshot.memorySlots={columns:[{id:'3.0',primary:3,secondary:0,kind:'ram',format:'RAMNormal',start:0,end:65535,size:65536,activePages:[0,1,2,3]}]};
 store.set({project,projects:[project],snapshot,loading:false});
 const {Panel,panels}=await server.ssrLoadModule('/src/panels.tsx');
 const {Settings}=await server.ssrLoadModule('/src/components/Settings.tsx');
 const {library}=await server.ssrLoadModule('/src/backend/library.ts');
 const referenceDescriptions=library.map(x=>x.description||'').filter(Boolean);
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#x27;');
 let count=0;const untranslated=[];
 for(const lang of ['ru','en','ja','pt','nl','es','zh']){
  setLanguage(lang);const preview=[];
  for(const key of ['Покажи {p0}','Покажи {p0} как текст','Перейти к адресу {p0}'])assert.equal(normalizeCommand(t(key,{p0:label})),key.replace('{p0}',label),lang+' command example');
  assert.equal(normalizeCommand(label),label);
  for(const [kind] of panels){
   const html=renderToStaticMarkup(React.createElement(Panel,{params:{kind},api:{id:'test-'+kind,updateParameters(){}},containerApi:{}}));count++;
   if(['compare','memory-slots','watches'].includes(kind))preview.push('<article><h2>'+t(panels.find(p=>p[0]===kind)[1])+'</h2>'+html+'</article>');
   if(lang==='en'){
    let text=html.replaceAll(label,'').replaceAll(project.name,'').replaceAll(project.labels[0].comment,'');
    // Reference-document excerpts and user annotations are content, not interface labels.
    for(const description of referenceDescriptions)text=text.replaceAll(escape(description),'');
    const matches=text.match(/[^<>]*[А-Яа-я][^<>]*/g);if(matches)untranslated.push([kind,[...new Set(matches)].slice(0,8)]);
   }
   if(kind==='watches'){assert.ok(html.includes(label));assert.ok(html.includes(t('Break on write')));}
   if(kind==='compare'){assert.ok(html.includes(t('Baseline')));assert.ok(html.includes('value="changed"'));assert.ok(html.includes('value="increased"'));}
   if(kind==='memory'){assert.ok(html.includes('value="selection"'));assert.ok(html.includes('value="fixed"'));}
  }
  const settings=renderToStaticMarkup(React.createElement(Settings,{close(){}}));assert.ok(settings.includes(t('Language')));
  if(process.env.I18N_PREVIEW_DIR){const directory=process.env.I18N_PREVIEW_DIR;fs.mkdirSync(directory,{recursive:true});fs.copyFileSync('src/styles.css',directory+'/styles.css');fs.writeFileSync(directory+'/'+lang+'.html','<!doctype html><html lang="'+lang+'" data-theme="light"><meta charset="utf-8"><link rel="stylesheet" href="styles.css"><style>body{padding:20px;font-size:14px}article{border:1px solid #bcc4ce;border-radius:8px;margin:12px 0;padding:14px}.panel-body{max-height:330px;overflow:auto}.modal-shade{position:static;padding:0;background:none}.settings-dialog{width:100%;max-height:none;box-shadow:none}.panel-tools{flex-wrap:wrap}h1,h2{font-size:18px}</style><h1>MSXLab · '+lang+'</h1><main>'+preview.join('')+'<article>'+settings+'</article></main></html>');}

 }
 console.log('Untranslated rendered text:',JSON.stringify(untranslated));
 assert.deepEqual(untranslated,[]);
 console.log(`PASS ${count} panel renders across seven languages, localized command examples, preserved option values and user annotations`);
}finally{await server.close();}
