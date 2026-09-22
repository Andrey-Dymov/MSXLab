import type {Project,Snapshot} from './types';
import {scopeMatches,scopeCaption} from './memoryScope';
import {hex} from './disassemble';
export function mappedProgramRegions(project:Project|null|undefined,snapshot:Snapshot|null|undefined){
 const regions:{id:string;name:string;start:number;end:number;title:string;planned?:boolean}[]=[];
 if(!project||!snapshot)return regions;
 for(const label of project.labels.filter(l=>l.space==='cpu'&&l.type==='AREA')){
  // Split at page boundaries: adjacent logical pages can belong to different banks.
  for(let page=0;page<4;page++){
   const start=Math.max(label.address,page*16384),end=Math.min(label.end,page*16384+16383);
   if(start>end||!scopeMatches(label.memoryScope,start,snapshot))continue;
   regions.push({id:label.id+':'+page,name:label.name,start,end,title:`${label.name} · $${hex(start)}–$${hex(end)}\n${scopeCaption(label.memoryScope)}\nРазмеченная область проекта\n${label.comment||''}`});
  }
 }
 if(project.kind==='dos'&&!regions.length){
  const name=project.program?.split('/').pop(),file=project.buildFiles?.find(f=>f.name===name);
  if(file&&file.size>0){
   const end=Math.min(65535,0x100+file.size-1);
   for(const page of snapshot.pages){
    const start=Math.max(0x100,page.start),last=Math.min(end,page.end);
    if(start>last||! /ram/i.test(page.format))continue;
    regions.push({id:'com:'+page.start,name:file.name,start,end:last,planned:true,title:`${file.name} · $0100–$${hex(end)}\nДиапазон загрузки COM · ${file.size} байт\nСлот ${page.slot}. Размещение по настройкам проекта; содержимое памяти может измениться.`});
   }
  }
 }
 return regions;
}
