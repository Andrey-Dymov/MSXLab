import {normalizeCommand} from '../i18n/commands';
import {t as tr} from '../i18n';
import {useRef, useState} from 'react';
import {ArrowRight, History, Search} from 'lucide-react';
import {parseAddress} from '../backend/disassemble';
import {select, useDebugger} from '../state/debugger';

const HISTORY_KEY='msxlab.command-history.v1';
function readHistory():string[]{
 try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'&&!!v.trim()).slice(0,30):[];}catch{return [];}
}
export function CommandInput({openView}:{openView:(kind:'memory'|'numbers'|'text'|'bitmap'|'disassembler',preferences:Record<string,unknown>)=>void}){
 const {project}=useDebugger();
 const [query,setQuery]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 const [history,setHistory]=useState(readHistory);
 const remember=()=>{const value=query.trim();if(!value)return;const next=[value,...history.filter(item=>item!==value)].slice(0,30);setHistory(next);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next));}catch{/* History is optional when storage is unavailable. */}};
 const [focused,setFocused]=useState(false);
 const [submitted,setSubmitted]=useState(false);
 const normalized=normalizeCommand(query.trim());
 const target=normalized.replace(/^(?:перейти|перейди|переход|покажи|показать|открой|открыть|go|goto)\s+(?:(?:к|на|по|to|адресу|адрес|address)\s+)*/i,'').trim();
 const show=/^(покажи|показать)\s/i.test(normalized);
 const parts=target.split(/\s+как\s+/i);
 const range=parts[0].split(/\s*[–—-]\s*/);
 const end=range.length===2?parseAddress(range[1].replace(/\s*[hн]$/i,'')):null;
 const format=parts[1]?.trim().toLowerCase();
 const address=parseAddress(range[0].replace(/\s*[hн]$/i,''));
 const label=project?.labels.find(l=>l.name.toLowerCase()===parts[0].toLowerCase());
 const destination=address??label?.address;
 const choices=([{kind:'memory',name:'HEX',aliases:['hex','байты']},{kind:'numbers',name:'числа',aliases:['числа','чисел']},{kind:'text',name:'текст',aliases:['текст','текста']},{kind:'bitmap',name:'графику',aliases:['графику','графика','картинку']} ] as const).filter(c=>!format||c.aliases.some(a=>a===format));
 const valid=destination!==undefined&&range.length<=2&&(range.length===1||(end!==null&&end>=destination))&&(!show||choices.length>0);
 const execute=(kind:'memory'|'numbers'|'text'|'bitmap'|'disassembler')=>{if(destination===undefined)return;remember();const space=address===null?label?.space||'cpu':'cpu';if(kind==='disassembler')select(destination,space);openView(kind,{address:destination,base:destination,space,source:space,follow:'fixed',blockEnd:end,format:kind==='memory'?'hex':'u8'});setQuery('');setFocused(false);setSubmitted(false);};
 return <form className="search-placeholder" onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}} onSubmit={e=>{e.preventDefault();setFocused(true);setSubmitted(true);}}>
  <Search size={13}/><input ref={inputRef} aria-label={tr("Go to address or symbol")} aria-describedby={focused?'command-input-hint':undefined} placeholder={tr("Адрес, имя или команда…")} value={query} onChange={e=>{setQuery(e.target.value);setSubmitted(false);setFocused(true);}} onKeyDown={e=>{if(e.key==='Escape'){setFocused(false);setSubmitted(false);}}}/>
  {focused&&<div id="command-input-hint" className="command-input-hint command-input-menu">
   {history.length>0&&<div className="command-history"><strong>{tr("Последние команды")}</strong><div className="command-history-list" aria-label={tr("Последние команды")}>{history.map(item=><button type="button" key={item} title={item} onClick={()=>{setQuery(item);setSubmitted(false);inputRef.current?.focus();}}><History size={13}/><span>{item}</span></button>)}</div></div>}
   {valid?<>{(show?choices:[{kind:'disassembler' as const,name:'код'}]).map(choice=><button key={choice.kind} type="button" onClick={()=>execute(choice.kind)}><ArrowRight size={16}/>{show?tr("Показать"):tr("Перейти к")} ${destination!.toString(16).toUpperCase().padStart(4,'0')}{end!==null?'–$'+end.toString(16).toUpperCase().padStart(4,'0'):''}{show?tr(" как ")+tr(choice.name):''}</button>)}</>:<><strong>{submitted?tr("Команда не распознана"):tr("Что можно вводить")}</strong><ul className="command-examples"><li><code>5000</code>{" "}{tr("— адрес в HEX")}</li><li><code>{tr('Покажи {p0}',{p0:'6000–60FF'})}</code></li><li><code>{tr('Покажи {p0} как текст',{p0:'6000'})}</code></li><li><code>{tr('Перейти к адресу {p0}',{p0:'5000 h'})}</code></li><li><code>{tr('Покажи {p0}',{p0:'6000'})}</code></li><li><code>UPDATE_SOUND</code>{" "}{tr("— имя метки")}</li><li><code>{tr('Перейти к адресу {p0}',{p0:tr("INIT_HARDWARE")})}</code></li></ul><div>{tr("Выберите действие. Имена должны существовать в проекте.")}</div>{submitted&&<div>{tr("Поддерживаются переход и просмотр данных по адресу или имени. Другие команды ИИ ещё не подключены.")}</div>}</>}
  </div>}
 </form>;
}
