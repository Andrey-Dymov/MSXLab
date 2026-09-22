import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const languages=['ru','en','ja','pt','nl','es','zh'],packs=Object.fromEntries(languages.map(l=>[l,JSON.parse(fs.readFileSync(`src/i18n/${l}.json`,'utf8'))]));
for(const l of languages){assert.deepEqual(Object.keys(packs[l]).sort(),Object.keys(packs.en).sort());for(const value of Object.values(packs[l]))assert.ok(typeof value==='string'&&value.trim());}
let source=fs.readFileSync('src/i18n/index.ts','utf8').replace("import {useSyncExternalStore} from 'react';","const useSyncExternalStore=()=>{};");
for(const l of languages)source=source.replace(`import ${l} from './${l}.json';`,`const ${l}=${JSON.stringify(packs[l])};`);
const saved=new Map([['msxlab.language','ja']]);globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};globalThis.document={documentElement:{lang:''}};globalThis.window={desktop:{savePreference:async()=>{}}};
source=source.replace("import messagePatterns from './messages.json';",'const messagePatterns='+fs.readFileSync('src/i18n/messages.json','utf8')+';');
const {t,setLanguage,message}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
assert.equal(t('Run'),'実行');assert.equal(document.documentElement.lang,'ja');
for(const l of languages){setLanguage(l);assert.equal(t('Pause'),packs[l].Pause);assert.equal(saved.get('msxlab.language'),l);assert.equal(document.documentElement.lang,l);}
for(const symbol of ['ADD_ATOHL','constructor','__proto__','toString','<script>'])assert.equal(t(symbol),symbol);
for(const l of languages){setLanguage(l);const values={p0:'MY_LABEL_<>&',p1:'E000'};const key='Checkpoint saved: {p0}';assert.equal(t(key,{p0:values.p0}),packs[l][key].replace('{p0}',values.p0));assert.equal(message('Checkpoint saved: '+values.p0),t(key,{p0:values.p0}));assert.equal(message("Error invoking remote method 'test': Error: Invalid address"),t('Invalid address'));assert.equal(message('External diagnostic xyz'),'External diagnostic xyz');}
setLanguage('zh');setLanguage('invalid');assert.equal(document.documentElement.lang,'zh');
console.log(`PASS ${languages.length} language packs, ${Object.keys(packs.en).length} keys each, selection, persistence, fallback and unchanged user symbols`);
