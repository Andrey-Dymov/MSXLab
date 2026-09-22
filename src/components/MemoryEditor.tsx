import {t as tr} from '../i18n';
import {useState} from 'react';
import {command,store} from '../state/debugger';
import {hex,parseAddress} from '../backend/disassemble';
import type {Space} from '../backend/types';
interface Edit {space:Space;address:number;before:number[];after:number[]}
export function MemoryEditor({space,address,memory,close}:{space:Space;address:number;memory:number[];close:()=>void}){
 const [where,setWhere]=useState(hex(address)),[text,setText]=useState(hex(memory[address]||0,2)),[last,setLast]=useState<Edit|null>(null),[busy,setBusy]=useState(false);
 return <form className="memory-editor" onSubmit={async e=>{e.preventDefault();const at=parseAddress(where),bytes=text.trim().split(/\s+/).map(x=>/^[0-9a-f]{2}$/i.test(x)?parseInt(x,16):NaN);if(at===null||bytes.some(Number.isNaN)||bytes.length>256){store.set({error:'Enter an address and 1–256 hex byte pairs'});return;}setBusy(true);try{const result=await command<Edit>('writeMemory',{space,address:at,bytes});if(result){setLast(result);store.set({notice:'Memory edited at '+hex(at)});}}finally{setBusy(false);}}}>
  <div className="panel-tools"><strong>{tr("Edit")}{" "}{space.toUpperCase()}</strong><input aria-label={tr("Edit memory address")} value={where} onChange={e=>setWhere(e.target.value)}/><button type="button" onClick={close}>{tr("Close")}</button></div>
  <textarea aria-label={tr("New memory bytes")} value={text} onChange={e=>setText(e.target.value)} placeholder="3E 01 00"/>
  <div className="panel-tools"><button disabled={busy}>{tr("Write bytes")}</button><button type="button" disabled={!last||busy} onClick={async()=>{if(!last)return;setBusy(true);try{const done=await command('writeMemory',{space:last.space,address:last.address,bytes:last.before,expected:last.after});if(done){setLast(null);store.set({notice:'Memory edit undone'});}}finally{setBusy(false);}}}>{tr("Undo last write")}</button><span>{tr("Paused machine only · HEX bytes")}</span></div>
 </form>;
}
