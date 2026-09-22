import {t as tr} from '../i18n';
import type {Label,MemorySlotColumn} from '../backend/types';
import {hex} from '../backend/disassemble';
// Only explicitly scoped AREA annotations describe physical placement.
export function slotRegions(labels:Label[],slot:MemorySlotColumn,page:number,bank=slot.banks?.[page]){
 return labels.filter(l=>l.type==='AREA'&&l.space==='cpu'&&l.memoryScope?.primary===slot.primary&&l.memoryScope.secondary===slot.secondary&&(!slot.bankCount||l.memoryScope.bank===bank)&&l.address<=page*16384+16383&&l.end>=page*16384);
}
export function SlotRegions({labels,slot,page,bank,compact=false}:{labels:Label[];slot:MemorySlotColumn;page:number;bank?:number;compact?:boolean}){
 const regions=slotRegions(labels,slot,page,bank);
 if(compact)return <>{regions.map(l=><small className="slot-region-compact" key={l.id} title={l.name+'\n'+l.comment}><span>{l.name.replace(/ · дополнение$/i,' +')}</span><span className="slot-region-address">${hex(Math.max(l.address,page*16384))}–${hex(Math.min(l.end,page*16384+16383))}</span></small>)}</>;
 return <>{regions.map(l=><small className="slot-region" key={l.id} title={l.comment}><b>{l.name}</b><span>${hex(Math.max(l.address,page*16384))}–${hex(Math.min(l.end,page*16384+16383))}{slot.bankCount?tr(" · банк ")+(bank??slot.banks?.[page]):''}</span></small>)}</>;
}
