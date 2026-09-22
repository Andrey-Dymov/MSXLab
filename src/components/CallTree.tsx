import {t as tr} from '../i18n';
import {useState} from 'react';
import {ChevronRight,ChevronDown,ArrowRight,X} from 'lucide-react';
import type {Label} from '../backend/types';
import type {callGraph} from '../backend/callGraph';
import {hex} from '../backend/disassemble';
type Graph=ReturnType<typeof callGraph>;
function Branch({label,graph,direction,path,onGo}:{label:Label;graph:Graph;direction:'incoming'|'outgoing';path:string[];onGo:(l:Label)=>void}){
 const [open,setOpen]=useState(false);const cycle=path.includes(label.id),edges=[...(graph[direction].get(label.id)?.values()||[])];
 return <div className="call-tree-branch"><div><button aria-label={tr("Раскрыть связи ")+label.name} disabled={cycle||!edges.length||path.length>=12} onClick={()=>setOpen(!open)}>{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button><button title={label.comment||tr("Перейти к функции")} onClick={()=>onGo(label)}>{label.name} <code>${hex(label.address)}</code><ArrowRight size={12}/></button>{cycle&&<small>{tr("↩ повторная ссылка")}</small>}</div>{open&&edges.map(e=><Branch key={e.label.id} label={e.label} graph={graph} direction={direction} path={[...path,label.id]} onGo={onGo}/>)}{open&&!!graph.indirect.get(label.id)?.length&&<small>{tr("Косвенный переход: цель не определена")}</small>}</div>;
}
export function CallTree({root,graph,onGo,close}:{root:Label;graph:Graph;onGo:(l:Label)=>void;close:()=>void}){
 const [direction,setDirection]=useState<'incoming'|'outgoing'>('outgoing');const edges=[...(graph[direction].get(root.id)?.values()||[])];
 return <section className="call-tree"><header><strong>{tr("Связи ·")}{" "}{root.name}</strong><button title={tr("Закрыть связи")} onClick={close}><X size={16}/></button></header><div className="project-segments"><button aria-pressed={direction==='incoming'} onClick={()=>setDirection('incoming')}>{tr("Кто вызывает")}</button><button aria-pressed={direction==='outgoing'} onClick={()=>setDirection('outgoing')}>{tr("Что вызывает")}</button></div><p>{tr("Прямые вызовы из размеченного кода. Общие функции показаны ссылками.")}</p><div className="call-tree-content">{edges.map(e=><div key={e.label.id}><Branch label={e.label} graph={graph} direction={direction} path={[root.id]} onGo={onGo}/><small>{tr("Вызов:")}{" "}{e.sites.map(a=>'$'+hex(a)).join(', ')}</small></div>)}{!edges.length&&<p>{tr("Прямые вызовы не найдены в размеченном коде.")}</p>}{!!graph.indirect.get(root.id)?.length&&<p>{tr("Косвенные переходы:")}{" "}{graph.indirect.get(root.id)!.map(a=>'$'+hex(a)).join(', ')}{tr(". Цели не определены.")}</p>}</div></section>;
}
