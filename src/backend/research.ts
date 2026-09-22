import {decode,hex,type Instruction} from './disassemble';
import type {Label,Space} from './types';
export const labelTypes=['SCREEN','MUSIC','LABEL','PROC','COMMENT','AREA','DATA','DATA DB','DATA DW','DATA MSG','DATA DEC1','DATA DEC2','DATA SCR0','DATA SCR1','DATA SCR80','DATA BM1','DATA BM2','DATA BM2X','DATA BM4','DATA MSXHEADER'];
export const labelTypeDescriptions:Record<string,string>={'DATA MSXHEADER':'структура заголовка MSX ROM',ALL:'все типы',SCREEN:'экран или уровень',MUSIC:'музыкальные данные',LABEL:'имя адреса',PROC:'процедура',COMMENT:'комментарий к участку',AREA:'область памяти',DATA:'блок данных','DATA DB':'байты, HEX','DATA DW':'16-битные числа, HEX','DATA MSG':'текстовая строка','DATA DEC1':'8-битные числа, десятичные','DATA DEC2':'16-битные числа, десятичные','DATA SCR0':'символы экрана SCREEN 0','DATA SCR1':'символы экрана SCREEN 1','DATA SCR80':'символы экрана на 80 столбцов','DATA BM1':'изображение, 1 бит на пиксель','DATA BM2':'изображение, 2 бита на пиксель','DATA BM2X':'метка формата BM2X, просмотр как байты','DATA BM4':'изображение, 4 бита на пиксель'};
export const labelTypeCaption=(type:string)=>labelTypeDescriptions[type]?type+' — '+labelTypeDescriptions[type]:type;

export const isData=(label:Label)=>['MUSIC','SCREEN'].includes(label.type)||/^DATA(?:\s|$)/i.test(label.type);
export const isProcedure=(label:Label)=>label.type.toUpperCase()==='PROC';
export function researchIndex(labels:Label[],space:Space='cpu'){
 const all=labels.filter(l=>l.space===space&&Number.isInteger(l.address)&&Number.isInteger(l.end)&&l.address>=0&&l.end>=l.address).sort((a,b)=>a.address-b.address||a.end-b.end||a.id.localeCompare(b.id));
 const starts=new Map<number,Label[]>();for(const l of all)starts.set(l.address,[...(starts.get(l.address)||[]),l]);
 const specific=(items:Label[])=>items.sort((a,b)=>(a.end-a.address)-(b.end-b.address)||a.id.localeCompare(b.id));
 const procedures=all.filter(isProcedure),data=all.filter(isData);
 const semanticStarts=[...new Set([...procedures,...data].map(l=>l.address))].sort((a,b)=>a-b);
 const startsSorted=[...starts.keys()].sort((a,b)=>a-b);
 const next=(values:number[],address:number)=>{let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>>1;if(values[mid]<=address)lo=mid+1;else hi=mid;}return values[lo]??65536;};
 const labelsIn=(start:number,end:number)=>{let lo=0,hi=all.length;while(lo<hi){const mid=(lo+hi)>>>1;if(all[mid].address<start)lo=mid+1;else hi=mid;}const result:Label[]=[];for(let i=lo;i<all.length&&all[i].address<end;i++)result.push(all[i]);return result;};
 const containing=(address:number)=>specific(all.filter(l=>l.address<=address&&l.end>=address));
 const orderedProcedures=specific([...procedures]),orderedData=specific([...data]);
 const procedureAt=(address:number)=>orderedProcedures.find(l=>l.address<=address&&l.end>=address);
 const dataAt=(address:number)=>orderedData.find(l=>l.address<=address&&l.end>=address);
 const symbolAt=(address:number)=>{const exact=(starts.get(address)||[]).filter(l=>l.type.toUpperCase()!=='COMMENT');return exact.find(isProcedure)||exact.find(isData)||exact.find(l=>l.type==='LABEL')||exact[0];};
 return {all,starts,procedures,data,containing,procedureAt,dataAt,symbolAt,labelsIn,nextStart:(address:number)=>next(startsSorted,address),nextSemantic:(address:number)=>next(semanticStarts,address)};
}
export type ResearchIndex=ReturnType<typeof researchIndex>;
export interface ResearchRow extends Instruction {kind:'code'|'data'|'boundary';labels:Label[];block?:Label;note?:string;ascii?:string}
export function researchListing(memory:number[],start:number,index:ResearchIndex,count=100,end=65535):ResearchRow[]{
 const rows:ResearchRow[]=[];const limit=Math.min(end,memory.length-1,65535);let address=Math.max(0,start);
 while(address<=limit&&rows.length<count){
  const data=index.dataAt(address),proc=index.procedureAt(address);
  // Semantic boundaries must not be consumed as operands of a preceding instruction.
  let stop=Math.min(limit+1,proc?proc.end+1:65536,index.nextSemantic(address));
  let row:ResearchRow;
  if(data?.type==='DATA MSXHEADER'&&address===data.address&&data.end-data.address===15&&address+16<=limit+1){
   const bytes=memory.slice(address,address+16);rows.push({address,size:16,bytes,text:'MSX ROM HEADER',call:false,kind:'data',block:data,labels:index.labelsIn(address,address+16)});address+=16;continue;
  }
  if(data){
   stop=Math.min(stop,data.end+1,index.nextStart(address));
   const type=data.type.toUpperCase(),word=/^DATA (DW|DEC2)$/.test(type),decimal=/^DATA DEC[12]$/.test(type),text=/^DATA (MSG|SCR0|SCR1|SCR80)$/.test(type);
   const n=Math.min(stop-address,word&&(address-data.address)%2?1:type==='DATA MSG'?64:text?16:8);const bytes=memory.slice(address,address+n);
   // Preserve odd trailing bytes instead of reading outside a declared word block.
   const size=word&&n>=2?n-(n%2):n;const used=bytes.slice(0,size);
   const values=word&&size>=2?Array.from({length:size/2},(_,i)=>used[i*2]|used[i*2+1]<<8):used;
   const directive=word&&size>=2?'DW':'DB';
   row={address,size,bytes:used,call:false,kind:'data',block:data,labels:[],text:type==='DATA MSG'?messageDirective(used):directive+' '+values.map(v=>decimal?String(v):'$'+hex(v,directive==='DW'?4:2)).join(', '),ascii:type==='DATA MSG'?undefined:used.map(v=>v>=32&&v<127?String.fromCharCode(v):'·').join(''),note:text?'ASCII preview; MSX-specific glyphs remain raw bytes':/^DATA BM/.test(type)?'Graphics bytes — open Bitmap for a visual interpretation':undefined};
  }else{
   const decoded=decode(memory,address);
   if(address+decoded.size>stop){const bytes=memory.slice(address,stop);row={address,size:bytes.length,bytes,text:'DB '+bytes.map(b=>'$'+hex(b,2)).join(', '),call:false,kind:'boundary',labels:[],block:proc,note:'Instruction crosses a declared block boundary; check the label range'};}
   else row={...decoded,kind:'code',labels:[],block:proc};
  }
  // Preserve all annotations, including labels placed inside multi-byte instructions.
  row.labels=index.labelsIn(address,address+row.size);
  rows.push(row);address+=row.size;
 }
 return rows;
}
export function directReferences(memory:number[],index:ResearchIndex){
 // Scan the union of code ranges once; overlapping PROC labels must not multiply work.
 const ranges:{start:number;end:number}[]=[];
 for(const proc of index.procedures){const start=proc.address,end=Math.min(proc.end,65535,memory.length-1);if(start>end)continue;const last=ranges.at(-1);if(last&&start<=last.end+1)last.end=Math.max(last.end,end);else ranges.push({start,end});}
 const result:ResearchRow[]=[];
 for(const range of ranges)for(const row of researchListing(memory,range.start,index,65536,range.end))if(row.kind==='code'&&row.target!==undefined)result.push(row);
 return result;
}

// Use numeric bytes for quotes, backslashes and non-ASCII characters: assembler
// escaping and MSX character encodings vary, but these byte values are exact.
export function messageDirective(bytes:number[]){
 const parts:string[]=[];let run='';
 const flush=()=>{if(run){parts.push("'"+run+"'");run='';}};
 for(const byte of bytes){if(byte>=32&&byte<127&&byte!==39&&byte!==92)run+=String.fromCharCode(byte);else{flush();parts.push('$'+hex(byte,2));}}
 flush();return 'DB '+parts.join(', ');
}
