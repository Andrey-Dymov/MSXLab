const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bytesAt(dir,relative){const base=await fs.realpath(dir),file=await fs.realpath(path.resolve(base,relative));if(!file.startsWith(base+path.sep))throw Error('ROM outside project');return fs.readFile(file);}
async function current(dir){const p=JSON.parse(await fs.readFile(path.join(dir,'project.json')));if(p.kind!=='rom')throw Error('ROM projects only');return {p,bytes:await bytesAt(dir,p.rom||p.program)};}
async function records(dir){const root=path.join(dir,'rom-versions');await fs.mkdir(root,{recursive:true});const out=[];for(const f of await fs.readdir(root)){if(f.endsWith('.json'))out.push(JSON.parse(await fs.readFile(path.join(root,f))));}return out.sort((a,b)=>Number(b.parent===null)-Number(a.parent===null)||a.created.localeCompare(b.created));}
async function store(dir,bytes,name,parent,changed){const id=crypto.randomUUID(),root=path.join(dir,'rom-versions');const record={id,name:name.trim().slice(0,120),created:new Date().toISOString(),size:bytes.length,sha256:hash(bytes),parent,changed};await fs.writeFile(path.join(root,id+'.rom'),bytes,{flag:'wx'});const temp=path.join(root,id+'.tmp');await fs.writeFile(temp,JSON.stringify(record,null,2));await fs.rename(temp,path.join(root,id+'.json'));return record;}
async function save(dir,name,source){if(typeof name!=='string'||!name.trim())throw Error('Enter version name');const {bytes}=await current(dir);let list=await records(dir);if(!list.length)list=[await store(dir,bytes,'Original',null,0)];const original=await bytesAt(dir,'rom-versions/'+list[0].id+'.rom');if(hash(original)!==list[0].sha256)throw Error('Original ROM checksum mismatch');const next=source?await fs.readFile(source):bytes;if(next.length!==original.length)throw Error('ROM size must remain '+original.length+' bytes');let changed=0;for(let i=0;i<bytes.length;i++)if(bytes[i]!==next[i])changed++;return store(dir,next,name,hash(bytes),changed);}
async function list(dir){const {bytes}=await current(dir);return {activeHash:hash(bytes),versions:await records(dir)};}
async function load(dir,id){if(typeof id!=='string'||! /^[a-f0-9-]{36}$/.test(id))throw Error('Invalid version');const {p,bytes}=await current(dir),items=await records(dir),r=items.find(v=>v.id===id);if(!r)throw Error('Version not found');const file='rom-versions/'+id+'.rom',data=await bytesAt(dir,file);if(hash(data)!==r.sha256||data.length!==bytes.length)throw Error('ROM size or checksum mismatch');return require('./projects.cjs').updateBuild(p,path.join(dir,file));}
async function suggestName(dir,baselineId){
 const {p,bytes}=await current(dir),items=await records(dir);
 const baseline=baselineId?items.find(v=>v.id===baselineId):items.at(-1);
 if(baselineId&&!baseline)throw Error('Baseline version not found');
 if(!baseline)return {name:'Исходная версия',description:'Нет сохранённой версии для сравнения',changed:0,mode:'local'};
 const before=await bytesAt(dir,'rom-versions/'+baseline.id+'.rom');
 if(hash(before)!==baseline.sha256||before.length!==bytes.length)throw Error('Baseline size or checksum mismatch');
 let changed=0;const touched=new Set();const ranges=[];let start=-1;
 const labels=(p.labels||[]).filter(l=>l.space==='rom'&&l.type!=='COMMENT');
 for(let i=0;i<bytes.length;i++){if(before[i]!==bytes[i]){changed++;if(start<0)start=i;for(const l of labels)if(i>=l.address&&i<=l.end)touched.add(l.name);}else if(start>=0){if(ranges.length<64)ranges.push([start,i-1]);start=-1;}}
 if(start>=0&&ranges.length<64)ranges.push([start,bytes.length-1]);
 const blocks=[...touched];const name=!changed?'Копия — без изменений':blocks.length?'Изменения: '+blocks.slice(0,3).join(', ')+(blocks.length>3?' и другие':''):'ROM — изменено '+changed+' байт';
 // This bounded context is ready for explicit AI naming later; no ROM bytes or requests.
 return {name:name.slice(0,120),description:'Сравнение с «'+baseline.name+'»: '+changed+' изменённых байт',changed,mode:'local',context:{baseline:baseline.name,changed,blocks:blocks.slice(0,30),ranges}};
}
async function patch(dir,name,baseHash,patches){
 if(typeof name!=='string'||!name.trim()||!Array.isArray(patches)||!patches.length||patches.length>65536)throw Error('Invalid ROM patch');
 const {bytes}=await current(dir);if(hash(bytes)!==baseHash)throw Error('ROM изменился. Откройте уровень заново перед сохранением.');
 const next=Buffer.from(bytes),seen=new Set();for(const p of patches){if(!Number.isInteger(p.offset)||p.offset<0||p.offset>=bytes.length||!Number.isInteger(p.value)||p.value<0||p.value>255||p.before!==bytes[p.offset]||seen.has(p.offset))throw Error('Invalid or stale ROM patch');seen.add(p.offset);next[p.offset]=p.value;}
 const existing=await records(dir);if(!existing.length)await store(dir,bytes,'Original',null,0);
 return store(dir,next,name,hash(bytes),patches.filter(p=>p.before!==p.value).length);
}
module.exports={save,list,load,suggestName,patch};
