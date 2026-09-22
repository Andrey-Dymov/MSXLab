import {scopeLabel} from '../i18n/display';
import {message as localizeMessage} from '../i18n';
import {t as tr} from '../i18n';
import {StandardReference} from './StandardReference';
import {SelectionActions} from './SelectionActions';
import {MSXHeader} from './MSXHeader';
import {researchIndex,researchListing} from '../backend/research';
import {Cpu} from 'lucide-react';
import {SlotRegions} from './SlotRegions';
import {sameScope,scopeCaption} from '../backend/memoryScope';
import {LabelEditor} from './LabelEditor';
import type {Label} from '../backend/types';
import {createPortal} from 'react-dom';
import {Fragment,createContext,useContext,useEffect,useState,useRef,useLayoutEffect,type ReactNode} from 'react';
import {useDebugger,command,toggleBreakpoint} from '../state/debugger';
import {usePanelSetting} from '../state/panelSettings';
import {decode,disassemble,hex,parseAddress} from '../backend/disassemble';
type Source = 'cpu'|'vram'|'rom';
const ScopeContext=createContext<any>(null);
export function MemoryScope({kind,children}:{kind:string;children:ReactNode}){
 const [file,setFile]=usePanelSetting('memoryFile','');
 const [physical,setPhysical]=usePanelSetting('physicalMemory',false);
 const [id,setId]=usePanelSetting('physicalSlot','0'),[bank,setBank]=usePanelSetting('physicalBank',0),[page,setPage]=usePanelSetting('physicalPage',0),[offset,setOffset]=usePanelSetting('physicalOffset',0);
 const [,setSpace]=usePanelSetting<Source>('space','cpu'),[,setFollow]=usePanelSetting('follow','fixed'),[,setAddress]=usePanelSetting('address',0);
 const [navigation,setNavigation]=useState(0);
 const [,setFixed]=usePanelSetting<number|null>('fixedAddress',null),[,setFollowPC]=usePanelSetting('followPC',false),[,setListing]=usePanelSetting('listingMode','annotated');
 useEffect(()=>{if(kind!=='assembly')return;const jump=(event:Event)=>{
  const label=(event as CustomEvent<Label>).detail;if(label.space!=='cpu')return;
  setFile('');setFollowPC(false);setFixed(label.address);setListing('annotated');
  if(label.memoryScope){const scope=label.memoryScope;setId(String(scope.primary)+(scope.secondary===null?'':'.'+scope.secondary));setBank(scope.bank??0);setPage(label.address>>>14);setOffset(label.address&16383);setPhysical(true);}else setPhysical(false);
  setNavigation(n=>n+1);
 };window.addEventListener('msxlab:label-entry',jump);return()=>window.removeEventListener('msxlab:label-entry',jump);},[kind,setFile,setFollowPC,setFixed,setListing,setId,setBank,setPage,setOffset,setPhysical]);
 const normal=(source:Source)=>{setSpace(source);setFollow('fixed');setAddress(0);setPhysical(false);};
 return <ScopeContext.Provider value={{file,setFile,physical,setPhysical,id,setId,bank,setBank,page,setPage,offset,setOffset,normal}}><Fragment key={navigation}>{file?<FileMemory kind={kind}/>:physical?<PhysicalMemory key={kind} kind={kind}/>:children}</Fragment></ScopeContext.Provider>;
}
export function MemorySourcePicker({space='cpu',onChange,assembly=false}:{space?:Source;onChange?:(space:Source)=>void;assembly?:boolean}){
 const ctx=useContext(ScopeContext),s=useDebugger(),columns=s.snapshot?.memorySlots?.columns||[];
 const selectedSlot=columns.find(c=>c.id===ctx.id);
 const selectedLabel=selectedSlot?(selectedSlot.kind==='ram'?'RAM':selectedSlot.format==='DiskPatch'?tr("Дисковый ROM"):selectedSlot.connector?tr("Картридж"):selectedSlot.format==='BIOS'?(ctx.page===0?'BIOS':'BASIC'):selectedSlot.format):'';
 const [files,setFiles]=useState<{name:string;path:string;size:number}[]>([]);
 useEffect(()=>{let live=true;if(s.project)void window.desktop?.listMemoryFiles(s.project.id).then(v=>{if(live)setFiles(v);}).catch(()=>{});return()=>{live=false;};},[s.project?.id]);
 const [anchor,setAnchor]=useState<{left:number;top:number}|null>(null);
 useEffect(()=>{if(!anchor)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setAnchor(null);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[anchor]);
 return <><button aria-label={tr("Memory source")} aria-expanded={!!anchor} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setAnchor(anchor?null:{left:Math.max(8,Math.min(r.left,window.innerWidth-620)),top:Math.max(8,Math.min(r.bottom+4,window.innerHeight-365))});}}>{ctx.file?ctx.file.split('/').pop():ctx.physical?tr("Слот {p0}{p1}{p2}{p3}",{p0:(ctx.id),p1:(selectedLabel?' · '+selectedLabel:''),p2:(selectedSlot?.connector?' · '+selectedSlot.connector:''),p3:(ctx.bank!==undefined&&columns.find(c=>c.id===ctx.id)?.bankCount?tr(" · банк ")+ctx.bank:'')}):space==='cpu'?'CPU':space==='vram'?'VRAM':tr("ROM file")} ▾</button>{anchor&&createPortal(<><div className="memory-source-dismiss" onClick={()=>setAnchor(null)}/><div className="memory-picker-map" style={{left:anchor.left,top:anchor.top}}><div className="memory-source-options">{(['cpu','vram','rom'] as Source[]).filter(v=>(!assembly||v==='cpu')&&(v!=='rom'||!files.length)).map(v=><button key={v} onClick={()=>{ctx.setFile('');if(onChange)onChange(v);else if(assembly)ctx.setPhysical(false);else ctx.normal(v);setAnchor(null);}}>{v==='cpu'?tr("CPU · текущая память"):v==='vram'?tr("VRAM · видео"):tr("ROM · файл")}</button>)}{files.map(f=><button key={f.path} title={f.path} onClick={()=>{ctx.setFile(f.path);setAnchor(null);}}>{/\.com$/i.test(f.name)?'COM':tr("Файл")} · {f.name}</button>)}</div><div className="memory-picker-scroll"><table><thead><tr><th>{tr("Адрес")}</th>{columns.map(c=><th key={c.id}>{c.connector?tr("Разъём ")+c.connector:tr("Слот ")+c.primary}<small>{c.secondary!==null?tr("Подслот ")+c.secondary:''}</small></th>)}</tr></thead><tbody>{[0,1,2,3].map(p=><tr key={p}><th>{hex(p*16384)}</th>{columns.map(c=>{const available=c.kind!=='empty'&&c.start!==null&&c.start<=p*16384+16383&&c.end!==null&&c.end>=p*16384;return <td key={c.id}><button className={'memory-picker-cell memory-kind-'+c.kind+(available&&c.activePages.includes(p)?' cpu-active':'')+(ctx.physical&&c.id===ctx.id&&p===ctx.page?' picked':'')} disabled={!available} aria-label={tr("Выбрать слот {p0}, окно {p1}",{p0:(c.id),p1:(p)})} onClick={()=>{ctx.setFile('');ctx.setId(c.id);ctx.setPage(p);ctx.setOffset(0);ctx.setBank(c.banks?.[p]??0);ctx.setPhysical(true);setAnchor(null);}}>{available?(c.kind==='ram'?'RAM':c.format==='DiskPatch'?tr("Диск ROM"):c.connector?tr("Картридж"):c.format==='BIOS'?(p===0?'BIOS':'BASIC'):c.format):'—'}{available&&c.bankCount&&<small className="slot-bank-caption">{tr("Банк")}{" "}{c.banks?.[p]}</small>}{available&&<SlotRegions labels={s.project?.labels||[]} slot={c} page={p} compact/>} {available&&c.activePages.includes(p)&&<span className="slot-cpu-icon" title={tr("Сейчас видит CPU")} aria-label={tr("Сейчас видит CPU")}><Cpu size={12}/></span>}</button></td>;})}</tr>)}</tbody></table></div><small>{tr("Строка — 16 КБ · ● видит процессор")}</small></div></>,document.body)}</>;
}
function PhysicalMemory({kind}:{kind:string}){
 const scrollRef=useRef<HTMLDivElement>(null),landing=useRef<'top'|'bottom'|null>(null),wheel=useRef({time:0,locked:false,total:0,direction:0});
 const [editing,setEditing]=useState<Label|null>(null);
 const [selected,setSelected]=useState<number[]>([]);const anchor=useRef<number|null>(null);

 const s=useDebugger(),columns=s.snapshot?.memorySlots?.columns||[];
 const {id,setId,bank,setBank,page,setPage,offset,setOffset}=useContext(ScopeContext);
 const [data,setData]=useState<{key:string;bytes:number[];address:number}|null>(null),[error,setError]=useState(''),[where,setWhere]=useState('0000');
 const slot=columns.find(c=>c.id===id),base=page*16384,requestKey=[s.session,id,bank,page].join(':');
 useEffect(()=>{setWhere(hex(base+offset));},[base,offset]);
 useEffect(()=>{
  let alive=true,busy=false;setData(null);setError('');
  async function refresh(){if(busy||!slot||slot.kind==='empty'||slot.start===null)return;busy=true;
   try{const result=await command<{bytes:number[];address:number}>('readSlotMemory',{primary:slot.primary,secondary:slot.secondary,page,bank:slot.bankCount?bank:undefined,length:16384});if(alive){if(result)setData({...result,key:requestKey});else setError('Не удалось прочитать память');}}
   finally{busy=false;}
  }
  void refresh();const timer=setInterval(refresh,750);return()=>{alive=false;clearInterval(timer);};
 },[requestKey,slot?.format]);
 const scope=slot?{primary:slot.primary,secondary:slot.secondary,...(slot.bankCount?{bank}: {})}:undefined;
 const scopedLabels=(s.project?.labels||[]).filter(l=>l.space==='cpu'&&!!l.memoryScope&&sameScope(l.memoryScope,scope));
 const editAt=(address:number,last=address)=>setEditing(scopedLabels.find(l=>l.address===address)||{id:crypto.randomUUID(),name:'',address,end:last,space:'cpu',type:kind==='assembly'?'PROC':'DATA',comment:'',memoryScope:scope});
 const current=data?.key===requestKey?data:null;
 const start=Math.max(base+offset,current?.address??base),end=current?current.address+current.bytes.length:base;
 const memory=current?Object.assign(Array(65536).fill(0),Object.fromEntries(current.bytes.map((b,i)=>[current.address+i,b]))):[];
 const rows=current&&start<end?researchListing(memory,start,researchIndex(scopedLabels),512).filter(r=>r.address>=start&&r.address<Math.min(end,(Math.floor(start/512)+1)*512)&&r.address+r.size<=end):[];
 useEffect(()=>{setSelected([base+offset]);anchor.current=base+offset;if(scrollRef.current)scrollRef.current.scrollTop=0;},[requestKey,offset]);
 const chosen=rows.filter(r=>selected.includes(r.address));
 const editSelection=(fallback:number)=>{const first=chosen[0],last=chosen.at(-1);editAt(first?.address??fallback,last?last.address+last.size-1:fallback);};
 const choose=(address:number,event:React.MouseEvent)=>{if(event.shiftKey&&anchor.current!==null){const a=Math.min(anchor.current,address),b=Math.max(anchor.current,address);const range=rows.filter(r=>r.address>=a&&r.address<=b).map(r=>r.address);setSelected(event.metaKey||event.ctrlKey?[...new Set([...selected,...range])]:range);}else if(event.metaKey||event.ctrlKey){setSelected(selected.includes(address)?selected.filter(a=>a!==address):[...selected,address]);anchor.current=address;}else if(!selected.includes(address)||selected.length<2){setSelected([address]);anchor.current=address;}};
 const go=(address:number)=>{setSelected([]);anchor.current=null;setPage(address>>>14);setOffset(address&16383);};
 const move=(direction:number)=>{
  const last=rows.at(-1),target=direction>0?(last?last.address+last.size:start+512):Math.max(base,(Math.ceil(start/512)-1)*512);
  if(target<base||target>=end||target===start)return;
  landing.current=direction>0?'top':'bottom';go(target);
 };
 useLayoutEffect(()=>{if(scrollRef.current&&landing.current&&current){scrollRef.current.scrollTop=landing.current==='bottom'?scrollRef.current.scrollHeight:0;landing.current=null;}},[start,current]);
 const edgeWheel=(e:React.WheelEvent<HTMLDivElement>)=>{
  if(kind!=='assembly'||e.ctrlKey||e.metaKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  const n=e.currentTarget,d=Math.sign(e.deltaY),w=wheel.current,now=performance.now();
  if(now-w.time>200||w.direction!==d){w.locked=false;w.total=0;}w.time=now;w.direction=d;
  if(d<0?n.scrollTop>1:n.scrollTop+n.clientHeight<n.scrollHeight-1){w.total=0;return;}
  if(w.locked)return;w.total+=Math.abs(e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?n.clientHeight:1);
  if(w.total>=45){w.locked=true;w.total=0;move(d);}
 };
 const readable=slot&&slot.kind!=='empty'&&slot.start!==null;
 return <><div className="panel-tools"><form onSubmit={e=>{e.preventDefault();const n=parseAddress(where);if(n!==null)go(n);}}><input aria-label={tr("Адрес в выбранном слоте")} value={where} onChange={e=>setWhere(e.target.value)} style={{width:80}}/><button>→</button></form><button disabled={offset===0} onClick={()=>kind==='assembly'?move(-1):setOffset(Math.max(0,offset-512))}>↑</button><button disabled={kind==='assembly'?!(rows.at(-1)&&rows.at(-1)!.address+rows.at(-1)!.size<end):offset+512>=16384} onClick={()=>kind==='assembly'?move(1):setOffset(offset+512)}>↓</button><MemorySourcePicker assembly={kind==='assembly'}/>
 {slot?.bankCount&&<label>{tr("Банк")}{" "}<select aria-label={tr("Банк RAM")} value={bank} onChange={e=>setBank(Number(e.target.value))}>{Array.from({length:slot.bankCount},(_,i)=><option key={i} value={i}>{i}</option>)}</select></label>}
</div>
 <p className="panel-message">{tr("Слот")}{" "}{id}{slot?.bankCount?tr(" · банк {p0}",{p0:(bank)}):''} · {slot?.activePages.includes(page)&&(!slot.bankCount||slot.banks?.[page]===bank)?tr("подключён к CPU в этом окне"):tr("не подключён к CPU в этом окне")}{tr(". Только чтение. Выбор не переключает память игры.")}</p>
 <div className="panel-tools"><button disabled={!scope} onClick={()=>editSelection(start)}>{tr("Метка…")}</button><span>{scopeLabel(scope)}{" "}{tr("· метки и остановки привязаны к этой памяти")}</span></div>{editing&&<LabelEditor label={editing} close={()=>setEditing(null)}/>}
 {!readable?<p className="panel-message">{slot?.kind==='empty'?tr("Слот пуст."):tr("Независимое чтение этого устройства пока не поддерживается.")}</p>:error?<p role="alert">{localizeMessage(error)}</p>:!current?<p>{tr("Чтение…")}</p>:!current.bytes.length?<p>{tr("В этом адресном окне нет памяти.")}</p>:<div ref={scrollRef} onWheel={edgeWheel} className="data-scroll"><table className="debug-table"><thead><tr><th>{tr("Адрес")}</th><th>{kind==='assembly'?tr("Байты"):tr("Данные")}</th><th>{kind==='assembly'?tr("Команда"):tr("Текст")}</th>{kind==='assembly'&&<th>{tr("Описание")}</th>}</tr></thead><tbody>{kind==='assembly'?rows.map(r=>{const label=scopedLabels.find(l=>l.address===r.address&&l.type!=='AREA');const match=r.kind==='code'?/\$?[0-9A-F]{4}(?=\)|$)/.exec(r.text):null;const target=r.target??(match?parseInt(match[0].replace('$',''),16):undefined);return <tr key={r.address} className={selected.includes(r.address)?'multi-selected-row selected-row':''} onClick={e=>choose(r.address,e)} onMouseDown={e=>{if(e.shiftKey||e.metaKey||e.ctrlKey)e.preventDefault();}}><td><button disabled={r.kind==='data'} aria-label={tr("Breakpoint ")+hex(r.address)} onClick={e=>{e.stopPropagation();toggleBreakpoint(r.address,scope);}}>{s.project?.breakpoints.some(b=>b.enabled&&b.address===r.address&&sameScope(b.memoryScope,scope))?'●':'·'}</button><span title={tr("Двойной клик — редактировать метку")} onDoubleClick={()=>editSelection(r.address)}>{hex(r.address)}{label&&<span className="assembly-label"> {label.name}</span>}</span></td>{r.block?.type==='DATA MSXHEADER'&&r.size===16?<td colSpan={3}><MSXHeader bytes={r.bytes} address={r.address} onGo={go}/></td>:<><td>{r.bytes.map(b=>hex(b,2)).join(' ')}</td><td><span className="assembly-command-layout"><span className="assembly-command-code">{target!==undefined&&match?<>{r.text.slice(0,match.index)}<button className="branch-target" title={tr("Перейти к адресу в выбранной памяти")} aria-label={tr("Jump to ")+hex(target)} onClick={e=>{e.stopPropagation();go(target);}}>{match[0]} ↗</button>{r.text.slice(match.index+match[0].length)}</>:r.text}</span></span></td><td className="assembly-description"><StandardReference row={r} rows={rows} dos={s.project?.kind==='dos'&&slot?.kind==='ram'}/>{chosen.length>1&&r.address===chosen[0].address&&<SelectionActions key={s.session} rows={chosen} memoryScope={scope} onAddLabel={()=>{const first=chosen[0],last=chosen.at(-1)!;setEditing({id:crypto.randomUUID(),name:'',type:'DATA',space:'cpu',address:first.address,end:last.address+last.size-1,comment:'',memoryScope:scope});}}/>}</td></>}</tr>;}):Array.from({length:32},(_,i)=>start+i*16).filter(a=>a<end).map(a=>{const bytes=memory.slice(a,Math.min(a+16,end));return <tr key={a}><td>{hex(a)}</td><td><code>{bytes.map(b=>kind==='numbers'?String(b).padStart(3):hex(b,2)).join(' ')}</code></td><td><code>{bytes.map(b=>b>=32&&b<127?String.fromCharCode(b):'·').join('')}</code></td></tr>;})}</tbody></table></div>}
 </>;
}

function FileMemory({kind}:{kind:string}){
 const ctx=useContext(ScopeContext),s=useDebugger();const [origin,setOrigin]=useState(/\.com$/i.test(ctx.file)?'0100':'4000');const [offset,setOffset]=useState(0),[bytes,setBytes]=useState<number[]>([]),[error,setError]=useState('');
 useEffect(()=>{setOffset(0);setOrigin(/\.com$/i.test(ctx.file)?'0100':'4000');},[ctx.file]);
 useEffect(()=>{let live=true;setBytes([]);setError('');if(s.project)void window.desktop!.readMemoryFile(s.project.id,ctx.file,offset,kind==='assembly'?544:512).then(v=>{if(live)setBytes(v);}).catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[ctx.file,offset,s.project?.id,kind]);
 const base=parseAddress(origin)??0,memory=Array(65536).fill(0);bytes.forEach((b,i)=>{memory[(base+offset+i)&65535]=b;});
 const instructions:(import('../backend/research').ResearchRow&{fileOffset:number})[]=[];let consumed=0;if(kind==='assembly')while(consumed<Math.min(512,bytes.length)){const row=decode(memory,(base+offset+consumed)&65535);if(consumed+row.size>bytes.length)break;instructions.push({...row,kind:'code' as const,labels:[],fileOffset:offset+consumed});consumed+=row.size;}

 return <><div className="panel-tools"><code>+{offset.toString(16).toUpperCase().padStart(4,'0')}</code><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-512))}>↑</button><button disabled={bytes.length<512} onClick={()=>setOffset(offset+(kind==='assembly'?consumed:512))}>↓</button>{kind==='assembly'&&<label>{tr("База HEX")}{" "}<input aria-label={tr("Базовый адрес файла")} value={origin} onChange={e=>setOrigin(e.target.value)} style={{width:60}}/></label>}<MemorySourcePicker assembly={kind==='assembly'}/></div><p className="panel-message">{ctx.file} · {kind==='assembly'?tr("команды Z80 · адрес = база + смещение файла"):tr("байты файла")}{" "}{tr("· без загрузки в игру")}</p>{error?<p role="alert">{localizeMessage(error)}</p>:<div className="data-scroll"><table className="debug-table"><thead><tr><th>{kind==='assembly'?tr("Адрес / файл"):tr("Файл")}</th><th>{tr("Байты")}</th><th>{kind==='assembly'?tr("Команда Z80"):tr("Текст")}</th>{kind==='assembly'&&<th>{tr("Описание")}</th>}</tr></thead><tbody>{kind==='assembly'?instructions.map(r=><tr key={r.fileOffset}><td>{hex(r.address)} · +{hex(r.fileOffset)}</td><td>{r.bytes.map(b=>hex(b,2)).join(' ')}</td><td><span className="assembly-command-layout"><span className="assembly-command-code">{r.text}</span></span></td><td className="assembly-description"><StandardReference row={r} rows={instructions} dos={s.project?.kind==='dos'&&/\.com$/i.test(ctx.file)} file/></td></tr>):Array.from({length:Math.ceil(bytes.length/16)},(_,i)=><tr key={i}><td>{(offset+i*16).toString(16).toUpperCase().padStart(4,'0')}</td><td>{bytes.slice(i*16,i*16+16).map(b=>hex(b,2)).join(' ')}</td><td>{bytes.slice(i*16,i*16+16).map(b=>b>=32&&b<127?String.fromCharCode(b):'·').join('')}</td></tr>)}</tbody></table></div>}</>;
}
