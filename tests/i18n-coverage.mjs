import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseSync} from 'rolldown/utils';
const locales=['ru','en','ja','pt','nl','es','zh'];
const packs=Object.fromEntries(locales.map(l=>[l,JSON.parse(fs.readFileSync(`src/i18n/${l}.json`,'utf8'))]));
const placeholders=s=>[...s.matchAll(/\{[A-Za-z]\w*\}/g)].map(m=>m[0]).sort();
for(const [locale,pack] of Object.entries(packs))for(const [key,value] of Object.entries(pack)){
 assert.deepEqual(placeholders(value),placeholders(key),`${locale}: interpolation tokens: ${key}`);
 assert.ok(!/ZXQ\d+QXZ|⟬\d+⟭|⟦\d+⟧/.test(value),`${locale}: translation marker leaked: ${key}`);
}
// Literal code examples, product names and hardware notation deliberately remain unchanged.
const technical=new Set(['MSXLab','M','MSX','Lab','Electron · React · TypeScript','MSXLab 0.8','PC','R','W','bpp','PNG','$0000 — $FFFF','UPDATE_SOUND','DEMO','A == $10','VRAM','CPU','X','Y','MSX1E','MSX1J','+0A','RESERVED','3E 01 00','BIOS / BASIC','RAM','· HEX','Hz','LD A,#0; LD (HL),A','ROM','ROM +$','ASCII:']);
const missing=[];
for(const file of [...fs.readdirSync('src',{recursive:true}).filter(f=>/\.(tsx|ts)$/.test(f)&&!f.startsWith('i18n/')).map(f=>'src/'+f),'electron/main.cjs']){
 const source=fs.readFileSync(file,'utf8');
 function check(key,offset){if(!Object.hasOwn(packs.en,key))missing.push(`${file}:${source.slice(0,offset).split('\n').length} missing key ${JSON.stringify(key)}`);}
 function walk(n){if(!n||typeof n!=='object')return;
  if(n.type==='CallExpression'&&['tr','t','uiText'].includes(n.callee?.name)&&n.arguments[0]?.type==='Literal')check(n.arguments[0].value,n.start);
  if(n.type==='JSXText'&&/[A-Za-zА-Яа-я]/.test(n.value)&&!technical.has(n.value.trim()))missing.push(`${file}: untranslated text ${n.value.trim()}`);
  if(n.type==='JSXAttribute'&&['title','placeholder','aria-label','label','ariaLabel'].includes(n.name.name)&&n.value?.type==='Literal'&&/[A-Za-zА-Яа-я]/.test(n.value.value)&&!technical.has(n.value.value.trim()))missing.push(`${file}: untranslated attribute ${n.value.value}`);
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 }
 walk(parseSync(file,source).program);
}
for(const key of JSON.parse(fs.readFileSync('src/i18n/messages.json','utf8')))if(!Object.hasOwn(packs.en,key))missing.push('Missing message: '+key);
assert.deepEqual(missing,[]);
console.log('PASS UI translation coverage, native labels, message catalog, interpolation tokens and no leaked translation markers');
