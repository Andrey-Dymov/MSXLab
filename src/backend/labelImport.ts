import {validTextProfile} from './textStrings';
import {validMusicBlock} from './musicBlocks';
import type {Label,Space} from './types';
export interface LabelImport {labels:Label[];issues:string[];sourceHash?:string;format:string}
const hexValue=(value:unknown)=>typeof value==='string'&&/^(?:\$|0x)?[0-9a-f]+h?$/i.test(value.trim())?parseInt(value.trim().replace(/^(\$|0x)/i,'').replace(/h$/i,''),16):NaN;
export function parseLabels(text:string):LabelImport {
 if(text.length>8000000)throw Error('Label file exceeds 8 MB');
 const result:LabelImport={labels:[],issues:[],format:'JSON'};let entries:unknown[];
 if(/^[\s\uFEFF]*[\[{]/.test(text)){
  const data=JSON.parse(text.replace(/^\uFEFF/,''));if(data.format==='msxlab-labels'&&data.version!==1)throw Error('Unsupported label file version');
  entries=Array.isArray(data)?data:data.labels;if(!Array.isArray(entries))throw Error('Expected a label array or an object with labels');
  if(typeof data.programSha256==='string')result.sourceHash=data.programSha256;else if(typeof data.researchForBuild==='string')result.sourceHash=data.researchForBuild;
 }else{
  result.format='Symbols';entries=[];
  text.split(/\r?\n/).forEach((line,i)=>{const content=line.split(';')[0].trim();if(!content||content.startsWith('#'))return;
   const named=content.match(/^([A-Za-z_.$][\w.$]*):?\s+(?:EQU\s+|=\s*)(\$[\da-f]+|0x[\da-f]+|[\da-f]+h?)$/i);
   const addressed=content.match(/^(\$[\da-f]+|0x[\da-f]+|[\da-f]+h?)\s+([A-Za-z_.$][\w.$]*)$/i);
   if(named||addressed){const name=named?named[1]:addressed![2],address=hexValue(named?named[2]:addressed![1]);entries.push({name,address,end:address,type:'LABEL',space:'cpu',comment:''});}else result.issues.push(`Line ${i+1}: unsupported symbol syntax`);
  });
 }
 if(entries.length>20000)throw Error('Maximum 20,000 labels per import');
 entries.forEach((value,i)=>{
  const row=value as Record<string,unknown>;if(!row||typeof row!=='object'){result.issues.push(`Row ${i+1}: invalid label`);return;}
  const legacy='addressHex'in row;
  const address=legacy?hexValue(row.addressHex):row.address;
  const length=legacy?hexValue(row.length):NaN;
  const end=legacy?(row.endAddressHex?hexValue(row.endAddressHex):Number.isFinite(length)&&length>0?Number(address)+length-1:address):row.end??address;
  const space=legacy?row.source==='VRAM'?'vram':row.source==='ROM'?'rom':row.source===undefined||row.source==='MEM'?'cpu':null:row.space??'cpu';
  const max=space==='cpu'?65535:space==='vram'?131071:16777215;
  if(!['cpu','vram','rom'].includes(space as string)||!Number.isInteger(address)||!Number.isInteger(end)||Number(address)<0||Number(end)<Number(address)||Number(end)>max||typeof row.name!=='string'||!row.name.trim()||row.name.length>500||typeof row.type!=='undefined'&&typeof row.type!=='string'||typeof row.comment!=='undefined'&&typeof row.comment!=='string'){
   result.issues.push(`Row ${i+1}: invalid name, space, address, range or text`);return;
  }
  if(row.screen!==undefined){const c=row.screen as Label['screen'];if(!c||typeof c.format!=='string'||!Number.isInteger(c.romBase)||c.romBase<0||c.romBase>65535||!Number.isInteger(c.halfMapTable)||c.halfMapTable<0||c.halfMapTable>65528){result.issues.push(`Row ${i+1}: invalid screen settings`);return;}}
  if(row.music!==undefined&&!validMusicBlock(row.music)){result.issues.push(`Row ${i+1}: invalid music settings`);return;}
  if(row.textProfile!==undefined&&!validTextProfile(row.textProfile)){result.issues.push(`Row ${i+1}: invalid text settings`);return;}
  result.labels.push({textProfile:validTextProfile(row.textProfile)?row.textProfile:undefined,screen:row.screen as Label['screen'],music:validMusicBlock(row.music)?row.music:undefined,id:crypto.randomUUID(),name:row.name.trim(),address:Number(address),end:Number(end),space:space as Space,type:String(row.type||'LABEL').trim().toUpperCase(),comment:String(row.comment||'')});
 });
 return result;
}
export const labelKey=(l:Label)=>JSON.stringify([l.space,l.address,l.type,l.name]);
export function mergeLabels(existing:Label[],incoming:Label[],replace=false){
 const labels=[...existing];const positions=new Map(labels.map((l,i)=>[labelKey(l),i]));let added=0,updated=0,skipped=0;
 for(const row of incoming){const key=labelKey(row),pos=positions.get(key);if(pos===undefined){positions.set(key,labels.length);labels.push(row);added++;}else if(replace&&(labels[pos].end!==row.end||labels[pos].comment!==row.comment||JSON.stringify(labels[pos].music)!==JSON.stringify(row.music)||JSON.stringify(labels[pos].screen)!==JSON.stringify(row.screen)||JSON.stringify(labels[pos].textProfile)!==JSON.stringify(row.textProfile))){labels[pos]={...row,id:labels[pos].id};updated++;}else skipped++;}
 return {labels:labels.sort((a,b)=>a.address-b.address),added,updated,skipped};
}
