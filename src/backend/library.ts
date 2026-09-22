import {scopeMatches} from './memoryScope';
import raw from '../data/library.json';
import type {Label,Snapshot} from './types';
import type {Instruction} from './disassemble';
export interface SymbolEntry {type:'symbol';id:string;name:string;address:number;length:number;space:'cpu'|'vram'|'rom'|'io';description:string;source:string;scope:string}
export interface PatternEntry {type:'pattern';id:string;name:string;pattern:string;description:string;source:string}
export type LibraryEntry=SymbolEntry|PatternEntry;
export const libraryIssues:string[]=[];
export const library:LibraryEntry[]=[];
for(const item of raw.entries){const e=item as LibraryEntry;if(!e.id||!e.name||!e.source||(e.type==='symbol'? !Number.isInteger(e.address)||!Number.isInteger(e.length)||e.length<1||e.address<0||e.address+e.length>(e.space==='io'?256:65536):e.type!=='pattern'||!e.pattern)){libraryIssues.push('Invalid entry: '+e.id);continue;}library.push(e);}
export const commonPatterns=library.filter((e):e is PatternEntry=>e.type==='pattern');
export function resolveSymbol(address:number,space:SymbolEntry['space'],labels:Label[],snapshot?:Pick<Snapshot,'pages'|'memorySlots'>&Partial<Pick<Snapshot,'cpu'>>){
 const project=labels.filter(l=>scopeMatches(l.memoryScope,address,snapshot)&&l.space===space&&!['COMMENT','AREA'].includes(l.type.toUpperCase())&&l.address<=address&&l.end>=address).sort((a,b)=>Number(!!b.memoryScope)-Number(!!a.memoryScope)||Number(b.address===address)-Number(a.address===address)||(a.end-a.address)-(b.end-b.address)||a.id.localeCompare(b.id))[0];
 if(project)return {name:project.name+(address===project.address?'':'+'+(address-project.address)),description:project.comment,source:'Project',address};
 const matches=library.filter((e):e is SymbolEntry=>e.type==='symbol'&&e.space===space&&address>=e.address&&address<e.address+e.length&&(e.scope!=='bios'||!!snapshot?.pages.some(p=>address>=p.start&&address<=p.end&&/BIOS/i.test(p.format))));
 matches.sort((a,b)=>Number(b.address===address)-Number(a.address===address)||a.length-b.length||a.id.localeCompare(b.id));const symbol=matches[0];
 if(!symbol&&snapshot?.cpu&&snapshot.pages.some(p=>address>=p.start&&address<=p.end&&/BIOS/i.test(p.format))){
  const cpu=snapshot.cpu;
  const entry=library.find((e):e is SymbolEntry=>e.type==='symbol'&&e.scope==='bios'&&e.space==='cpu'&&e.address<0x200&&cpu[e.address]===0xc3&&(cpu[e.address+1]|cpu[e.address+2]<<8)===address&&snapshot.pages.some(p=>e.address>=p.start&&e.address<=p.end&&/BIOS/i.test(p.format)));
  if(entry)return {name:entry.name+'.impl',description:'Тело BIOS: адрес проверен по JP из стандартного входа $'+entry.address.toString(16).toUpperCase().padStart(4,'0')+'. '+entry.description,source:'Текущая BIOS / '+entry.source,address};
 }
 return symbol?{name:symbol.name+(address===symbol.address?'':'+'+(address-symbol.address)),description:symbol.description,source:symbol.source,address}:undefined;
}
export function symbolizeInstruction(row:Instruction,labels:Label[],snapshot?:Pick<Snapshot,'pages'|'memorySlots'>&Partial<Pick<Snapshot,'cpu'>>){
 let expression:RegExp|undefined,space:SymbolEntry['space']='cpu';
 if(row.target!==undefined)expression=/\$?[0-9A-F]+$/;
 else if(/^(IN|OUT)\b/.test(row.text)){expression=/(?<=\()\$?[0-9A-F]{2}(?=\))/;space='io';}
 else expression=/(?<=\()\$?[0-9A-F]{4}(?=\))/;
 const match=expression.exec(row.text);if(!match)return undefined;
 const address=row.target??parseInt(match[0].replace('$',''),16),symbol=resolveSymbol(address,space,labels,snapshot);if(!symbol)return undefined;
 return {...symbol,before:row.text.slice(0,match.index),after:row.text.slice(match.index+match[0].length)};
}
