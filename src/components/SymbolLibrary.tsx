import {t as tr} from '../i18n';
import {useState} from 'react';
import {library,libraryIssues} from '../backend/library';
import {hex} from '../backend/disassemble';
import {select} from '../state/debugger';
export function SymbolLibrary(){const [query,setQuery]=useState('');const symbols=library.filter(e=>e.type==='symbol'&&(e.name+' '+hex(e.address)+' '+e.description).toLowerCase().includes(query.toLowerCase()));return <details><summary>{tr("Shared symbols ·")}{" "}{library.filter(e=>e.type==='symbol').length}</summary><input aria-label={tr("Search shared symbols")} placeholder={tr("Name or address")} value={query} onChange={e=>setQuery(e.target.value)}/>{libraryIssues.map(issue=><p key={issue}>{issue}</p>)}<div style={{maxHeight:260,overflow:'auto'}}>{symbols.map(e=>e.type==='symbol'&&<div key={e.id} title={e.description+tr("\nSource: ")+e.source}><button disabled={e.space==='io'} onClick={()=>{if(e.space!=='io')select(e.address,e.space);}}>{e.space.toUpperCase()} ${hex(e.address)} · {e.name}</button><small> · {e.length}{" "}{tr("bytes")}</small></div>)}</div></details>;}
