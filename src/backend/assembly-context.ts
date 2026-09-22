import {hex} from './disassemble';
import {resolveSymbol,symbolizeInstruction} from './library';
import type {ResearchRow} from './research';
import type {Label,Snapshot} from './types';

export function assemblyContext(rows:ResearchRow[],labels:Label[],snapshot?:Snapshot){
 return rows.map(row=>{
  const symbol=row.kind==='code'?symbolizeInstruction(row,labels,snapshot):undefined;
  const lines=[`${hex(row.address)}: ${symbol?symbol.before+symbol.name+symbol.after:row.text}`];
  if(symbol){
   lines.push(`Числовые операнды для проверки: ${row.text}`);
   lines.push(`Ссылка: ${symbol.name} = $${hex(symbol.address)}${symbol.description?' — '+symbol.description:''}`);
  }
  // Register-pair constants often point to tables, although the UI keeps them numeric.
  const pointer=/^LD (?:HL|DE|BC|IX|IY),\$?([0-9A-F]{4})$/i.exec(row.text);
  if(pointer){const address=parseInt(pointer[1],16),entry=resolveSymbol(address,'cpu',labels,snapshot);if(entry)lines.push(`Адрес данных: ${entry.name} = $${hex(address)}${entry.description?' — '+entry.description:''}`);}
  const related=[...row.labels,...labels.filter(l=>l.space==='cpu'&&l.address<=row.address&&l.end>=row.address),...(row.block?[row.block]:[])];
  for(const label of [...new Map(related.map(l=>[l.id,l])).values()]){
   lines.push(`Описание проекта: ${label.name} [$${hex(label.address)}–$${hex(label.end)}]${label.comment?' — '+label.comment:''}`);
  }
  return lines.join('\n');
 }).join('\n\n');
}
