import type {MemoryScope,Snapshot} from './types';
export const sameScope=(a?:MemoryScope,b?:MemoryScope)=>a?.primary===b?.primary&&a?.secondary===b?.secondary&&a?.bank===b?.bank;
export function scopeMatches(scope:MemoryScope|undefined,address:number,snapshot?:Pick<Snapshot,'memorySlots'>|null){
 if(!scope)return true;
 const page=address>>>14,c=snapshot?.memorySlots?.columns.find(c=>c.primary===scope.primary&&c.secondary===scope.secondary);
 return !!c?.activePages.includes(page)&&(scope.bank===undefined||c.banks?.[page]===scope.bank);
}
export const scopeCaption=(s?:MemoryScope)=>s?`Слот ${s.primary}${s.secondary===null?'':'.'+s.secondary}${s.bank===undefined?'':' · банк '+s.bank}`:'CPU · любой слот';
