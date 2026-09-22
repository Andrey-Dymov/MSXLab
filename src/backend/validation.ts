import type {Breakpoint,Watchpoint} from './types';
export function validateBreakpoints(input:unknown):Breakpoint[]{
 if(!Array.isArray(input)||input.length>1000)throw Error('Expected at most 1000 breakpoints');
 return input.map(p=>{if(!p||!Number.isInteger(p.address)||p.address<0||p.address>65535||p.condition!==undefined&&typeof p.condition!=='string')throw Error('Invalid breakpoint');const condition=p.condition?.trim();if(condition&&!/^(AF|BC|DE|HL|IX|IY|SP|PC|A|B|C|F)\s*(==|!=|>=|<=|>|<)\s*(\$[0-9a-f]+|0x[0-9a-f]+|[0-9]+)$/i.test(condition))throw Error('Invalid breakpoint condition');return {address:p.address,enabled:p.enabled!==false,condition};});
}
export function validateWatchpoints(input:unknown):Watchpoint[]{
 if(!Array.isArray(input)||input.length>1000)throw Error('Expected at most 1000 watchpoints');
 return input.map(p=>{const limit=p?.space==='cpu'?65536:p?.space==='vram'?16384:p?.space==='io'?256:0;const end=p?.end??p?.address;if(!p||!Number.isInteger(p.address)||p.address<0||!Number.isInteger(end)||end<p.address||end>=limit||!['read','write'].includes(p.access)||p.space==='vram'&&p.access==='read')throw Error('Invalid watchpoint range or access');return {space:p.space,address:p.address,end,access:p.access,enabled:p.enabled!==false};});
}
