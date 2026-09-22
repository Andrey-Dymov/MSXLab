import {t as tr} from '../i18n';
import {useState} from 'react';
import {command,select,store,useDebugger} from '../state/debugger';
import {hex,parseAddress} from '../backend/disassemble';
import type {Registers} from '../backend/types';
const pairs=(r:Registers):Record<string,number>=>({AF:(r.A<<8)|r.F,BC:(r.B<<8)|r.C,DE:r.DE,HL:r.HL,IX:r.IX,IY:r.IY,PC:r.PC,SP:r.SP,"AF′":r.AF2,"BC′":r.BC2,"DE′":r.DE2,"HL′":r.HL2,I:r.I,R:r.R&255,IM:r.IM,IFF1:r.IFF1});
const wireName=(name:string)=>name.replace('′','2');
export function RegistersPanel(){
 const s=useDebugger(),[editing,setEditing]=useState(false),[name,setName]=useState('AF'),[value,setValue]=useState('0000');
 const historical=s.history===null?null:s.historical,r=historical?.registers||s.snapshot?.registers;
 if(!r)return <p className="panel-message">{tr("Waiting for CPU")}</p>;
 const current=pairs(r),previous=s.previous?pairs(s.previous.registers):current;
 const allowed=!historical&&s.snapshot?.status==='paused'&&s.project?.kind!=='mock';
 function choose(next:string){setName(next);setValue(hex(current[next],next.length===1?2:4));}
 return <>
  {historical&&<div className="panel-tools">{tr("Historical registers")}{" "}<button onClick={()=>store.set({history:null,historical:null})}>{tr("Live")}</button></div>}
  <div className="panel-tools"><button disabled={!allowed} onClick={()=>{choose(name);setEditing(!editing);}}>{editing?tr("Close editor"):tr("Edit register")}</button><span>{editing?tr("Click a register to edit"):tr("Click value → address")}</span></div>
  {editing&&<form className="panel-tools" onSubmit={async e=>{e.preventDefault();const n=parseAddress(value);if(n===null){store.set({error:'Enter a hexadecimal register value'});return;}const result=await command('setRegister',{name:wireName(name),value:n});if(result){store.set({notice:'Register '+name+' updated'});if(name==='PC')select(n);}}}>
   <select aria-label={tr("Register to edit")} value={name} onChange={e=>choose(e.target.value)}>{Object.keys(current).filter(n=>!['IM','IFF1'].includes(n)).map(n=><option key={n}>{n}</option>)}</select>
   <input aria-label={tr("New register value")} value={value} size={5} onChange={e=>setValue(e.target.value)}/><button disabled={!allowed}>{tr("Write register")}</button>
  </form>}
  <div className="register-grid">{Object.entries(current).map(([key,n])=><button key={key} className={!historical&&previous[key]!==n?'changed':''} title={tr("{p0} decimal · {p1} binary",{p0:(n),p1:(n.toString(2).padStart(key.length===1?8:16,'0'))})} onClick={()=>editing&&!['IM','IFF1'].includes(key)?choose(key):select(n)}><span>{key}</span><code>{hex(n,key.length===1?2:4)}</code></button>)}</div>
  <div className="flags">{[['S',7],['Z',6],['5',5],['H',4],['3',3],['P/V',2],['N',1],['C',0]].map(([label,bit])=><div key={label} className={(r.F&(1<<Number(bit)))?'flag-on':''}>{label}</div>)}</div>
 </>;
}
