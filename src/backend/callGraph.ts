import {researchIndex,researchListing} from './research';
import type {Label} from './types';
export function callGraph(memory:number[],labels:Label[]){
 const index=researchIndex(labels),procedures=index.procedures;
 const outgoing=new Map<string,Map<string,{label:Label;sites:number[]}>>(),incoming=new Map<string,Map<string,{label:Label;sites:number[]}>>(),indirect=new Map<string,number[]>();
 for(const source of procedures){
  const edges=new Map<string,{label:Label;sites:number[]}>();outgoing.set(source.id,edges);
  for(const row of researchListing(memory,source.address,index,65536,source.end)){
   if(row.kind!=='code')continue;
   if(/^JP \((HL|IX|IY)\)/.test(row.text)){indirect.set(source.id,[...(indirect.get(source.id)||[]),row.address]);continue;}
   if(!row.call||row.target===undefined)continue;
   const target=index.procedureAt(row.target)||index.symbolAt(row.target)||{id:'address-'+row.target,name:'$'+row.target.toString(16).toUpperCase(),address:row.target,end:row.target,space:'cpu' as const,type:'LABEL',comment:''};
   const edge=edges.get(target.id)||{label:target,sites:[]};edge.sites.push(row.address);edges.set(target.id,edge);
   const parents=incoming.get(target.id)||new Map();const parent=parents.get(source.id)||{label:source,sites:[]};parent.sites.push(row.address);parents.set(source.id,parent);incoming.set(target.id,parents);
  }
 }
 return {outgoing,incoming,indirect};
}
