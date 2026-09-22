import type {ResearchRow} from './research';
import type {Label,Snapshot} from './types';
import {symbolizeInstruction} from './library';
import {dosFunctions,dosReferenceSource} from './dosReference';
export interface Annotation {id:string;name:string;description:string;source:string;detail?:string;origin:'project'|'reference'}
export function resolveAnnotations(row:ResearchRow,rows:ResearchRow[],options:{dos?:boolean;snapshot?:Snapshot;labels?:Label[]}={}):Annotation[]{
 const result:Annotation[]=[];
 for(const label of row.labels){
  const showName=label.type!=='COMMENT'&&(label.address!==row.address||label.type==='AREA');
  if(showName||label.comment)result.push({id:label.id,name:showName?label.name:'',description:label.comment,source:'Метки проекта',origin:'project',detail:`${label.type} · $${label.address.toString(16)}–$${label.end.toString(16)}`});
 }
 if(row.kind!=='code')return result;
 if(options.dos&&/^CALL (?:\$)?0005$/.test(row.text)){
  const previous=rows[rows.indexOf(row)-1];
  const value=previous?.kind==='code'&&previous.address+previous.size===row.address&&previous.bytes.length===2&&previous.bytes[0]===14?previous.bytes[1]:undefined;
  const entry=value===undefined?undefined:dosFunctions[value];
  result.push({id:'dos:'+(value??'entry'),name:entry?'BDOS · '+entry.name:'BDOS',description:entry?.description||'Вызов MSX-DOS; номер функции в C',source:dosReferenceSource,origin:'reference',detail:value===undefined?'Номер функции статически не определён':`C=$${value.toString(16).toUpperCase().padStart(2,'0')} по предыдущей LD C; путь исполнения не проверен`});
 }else{
  const symbol=symbolizeInstruction(row,options.labels||[],options.snapshot);
  if(symbol&&symbol.source!=='Project')result.push({id:'reference:'+symbol.address+':'+symbol.name,name:symbol.name,description:symbol.description.trim(),source:symbol.source,origin:'reference'});
 }
 return result;
}
