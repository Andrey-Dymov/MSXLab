import type {Label} from './types';
import type {ViewKind} from '../state/panelActions';
export function labelView(label:Label):{kind:ViewKind;preferences:Record<string,unknown>}{
 const {address,space,type}=label;
 if(label.memoryScope&&space==='cpu'){const m=label.memoryScope;return {kind:type==='PROC'?'disassembler':'memory',preferences:{physicalMemory:true,memoryFile:'',physicalSlot:m.primary+(m.secondary===null?'':'.'+m.secondary),physicalPage:address>>>14,physicalOffset:address&16383,physicalBank:m.bank??0}};}

 if(type==='SCREEN')return {kind:'levels',preferences:{screenBlockId:label.id}};
 if(type==='MUSIC')return {kind:'music',preferences:{musicBlockId:label.id,musicSource:'rom'}};
 if(type==='PROC'&&space==='cpu')return {kind:'disassembler',preferences:{fixedAddress:address,followPC:false,listingMode:'procedure'}};
 if(/^DATA BM[124]$/.test(type))return {kind:'bitmap',preferences:{source:space,base:address,bpp:Number(type.at(-1)),blockEnd:label.end}};
 const kind=/^DATA (DW|DEC[12])$/.test(type)?'numbers':/^DATA (MSG|SCR0|SCR1|SCR80)$/.test(type)?'text':'memory';
 return {kind,preferences:{space,address,follow:'fixed',format:type==='DATA DW'||type==='DATA DEC2'?'u16le':'u8'}};
}
