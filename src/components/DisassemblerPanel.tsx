import {t as tr} from '../i18n';
import {StandardReference} from './StandardReference';
import {t,useLanguage} from '../i18n';
import {MSXHeader} from './MSXHeader';
import {scopeMatches} from '../backend/memoryScope';
import {createPortal} from 'react-dom';
import {MemoryScope,MemorySourcePicker} from './PhysicalMemoryPanel';
import {ProgramMap} from './ProgramMap';
import {SelectionActions} from './SelectionActions';
import {Settings,Map,MousePointer2,Crosshair,List,Tags,Play,ChevronRight,ArrowUp,ArrowDown,ChevronsUp,SquarePen,PanelTop} from 'lucide-react';
import {symbolizeInstruction} from '../backend/library';
import {useOpenView} from '../state/panelActions';
import {labelView} from '../backend/labelView';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useDebugger,select,command,toggleBreakpoint,store} from '../state/debugger';
import {usePanelSetting} from '../state/panelSettings';
import {hex,disassemble,instructionReference} from '../backend/disassemble';
import {researchIndex,researchListing,type ResearchRow} from '../backend/research';
import {AddressBar} from './DebugPanels';
import {LabelEditor} from './LabelEditor';
import type {Label} from '../backend/types';
function DisassemblerPanelCPU(){useLanguage();
 const [settingsAnchor,setSettingsAnchor]=useState<{left:number;top:number}|null>(null);
 useEffect(()=>{if(!settingsAnchor)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSettingsAnchor(null);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[settingsAnchor]);
 const [mapOpen,setMapOpen]=useState(false);
 const s=useDebugger();const reference=s.hoverReference!==undefined?s.hoverReference:s.reference;
 useEffect(()=>()=>store.set({hoverReference:undefined}),[]);const openView=useOpenView();const [follow,setFollow]=usePanelSetting('followPC',false);const [fixed,setFixed]=usePanelSetting<number|null>('fixedAddress',null);
 const [operands,setOperands]=usePanelSetting<'symbols'|'addresses'>('operandDisplay','symbols');
 const [mode,setMode]=usePanelSetting<'annotated'|'code'|'procedure'>('listingMode','annotated');const [limit,setLimit]=useState(300);const [editing,setEditing]=useState<Label|null>(null);
 const [selectedRows,setSelectedRows]=useState<number[]>([]);const rangeAnchor=useRef<number|null>(null);
 const ownSelection=useRef<number|null>(null),[selectionAddress,setSelectionAddress]=useState(s.selected);
 useEffect(()=>{if(ownSelection.current===s.selected&&s.space==='cpu'){ownSelection.current=null;return;}ownSelection.current=null;setSelectedRows([]);rangeAnchor.current=null;if(s.space==='cpu')setSelectionAddress(s.selected);},[s.selected,s.space,s.session]);
 const address=follow?s.snapshot?.registers.PC??s.selected:fixed??selectionAddress;
 const visibleLabels=(s.project?.labels||[]).filter(l=>scopeMatches(l.memoryScope,l.address,s.snapshot));const index=researchIndex(visibleLabels);const proc=index.procedureAt(address),data=index.dataAt(address),block=mode==='procedure'?proc||data:data||proc;
 useEffect(()=>{setLimit(300);},[proc?.id,s.project?.id]);
 useEffect(()=>{setEditing(null);},[s.project?.id]);
 const rows=useMemo<ResearchRow[]>(()=>{
  if(!s.snapshot)return [];
  if(mode==='code')return disassemble(s.snapshot.cpu,address,512).filter(r=>r.address<(Math.floor(address/512)+1)*512).map(r=>({...r,kind:'code',labels:index.labelsIn(r.address,r.address+r.size)}));
  if(mode==='procedure'&&!proc)return [];
  return researchListing(s.snapshot.cpu,mode==='procedure'?proc!.address:address,index,mode==='procedure'?limit:512,mode==='procedure'?proc!.end:65535).filter(r=>mode==='procedure'||r.address<(Math.floor(address/512)+1)*512);
 },[s.snapshot,address,index,mode,proc,limit]);
 const scrollRef=useRef<HTMLDivElement>(null),scrollLanding=useRef<'top'|'bottom'|null>(null);
 useEffect(()=>{const jump=(event:Event)=>{const target=(event as CustomEvent<{address:number}>).detail.address;if(!Number.isInteger(target))return;ownSelection.current=null;setFollow(false);setFixed(null);setSelectionAddress(target);setSelectedRows([]);rangeAnchor.current=null;scrollLanding.current='top';if(scrollRef.current)scrollRef.current.scrollTop=0;};window.addEventListener('msxlab:assembly-entry',jump);return()=>window.removeEventListener('msxlab:assembly-entry',jump);},[setFollow,setFixed]);
 const wheelState=useRef({time:0,locked:false,total:0,direction:0});
 useLayoutEffect(()=>{const node=scrollRef.current;if(node&&scrollLanding.current){node.scrollTop=scrollLanding.current==='bottom'?node.scrollHeight:0;scrollLanding.current=null;}},[address,limit,mode]);
 function edgeWheel(event:React.WheelEvent<HTMLDivElement>){
  if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY||!rows.length)return;
  const state=wheelState.current,now=performance.now(),direction=Math.sign(event.deltaY),node=event.currentTarget;
  if(now-state.time>200||state.direction!==direction){state.locked=false;state.total=0;}
  state.time=now;state.direction=direction;
  const edge=direction<0?node.scrollTop<=1:node.scrollTop+node.clientHeight>=node.scrollHeight-1;
  if(!edge){state.total=0;return;}if(state.locked)return;
  state.total+=Math.abs(event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?node.clientHeight:1);
  if(state.total<45)return;
  state.locked=true;state.total=0;
  const last=rows.at(-1)!;
  if(direction>0&&mode==='procedure'&&proc&&last.address+last.size<=proc.end){setLimit(n=>n+300);return;}
  const target=direction<0?previousSection:mode==='procedure'?nextSection:sections.find(l=>l.address>last.address);
  scrollLanding.current=direction<0?'bottom':'top';
  if(mode==='procedure'&&target){goSection(target);return;}
  const next=direction<0?Math.max(0,(Math.ceil(address/512)-1)*512):last.address+last.size;
  if(next>=65536||next===address){scrollLanding.current=null;return;}go(next);
 }
 const chosenRows=rows.filter(r=>selectedRows.includes(r.address));
 const sections=index.all.filter(l=>/^(PROC|AREA|SECTION|SCREEN|MUSIC|DATA(?:\s.*)?)$/i.test(l.type));
 const section=sections.filter(l=>l.address<=address&&l.end>=address).sort((a,b)=>(a.end-a.address)-(b.end-b.address))[0];
 const anchor=section?.address??address,previousSection=sections.filter(l=>l.address<anchor).at(-1),nextSection=sections.find(l=>l.address>anchor);
 function goSection(l:Label){if(mode==='procedure'&&l.type.toUpperCase()!=='PROC')setMode('annotated');go(l.address);}
 function go(n:number){setSelectedRows([]);rangeAnchor.current=null;ownSelection.current=null;setSelectionAddress(n);setFollow(false);setFixed(null);select(n);}
 function chooseRow(r:ResearchRow,event:React.MouseEvent){
  const primary=rows.find(x=>s.selected>=x.address&&s.selected<x.address+x.size)?.address;
  let next:number[],main=r.address;
  if(event.shiftKey){const anchor=rangeAnchor.current??primary??r.address;const a=rows.findIndex(x=>x.address===anchor),b=rows.indexOf(r);const range=a<0?[r.address]:rows.slice(Math.min(a,b),Math.max(a,b)+1).map(x=>x.address);next=event.metaKey||event.ctrlKey?[...new Set([...selectedRows,...range])]:range;rangeAnchor.current=anchor;}
  else if(event.metaKey||event.ctrlKey){const old=selectedRows.length?selectedRows:primary===undefined?[]:[primary];next=old.includes(r.address)?old.filter(a=>a!==r.address):[...old,r.address];if(!next.length)next=[r.address];if(!next.includes(main))main=next.at(-1)!;rangeAnchor.current=main;}
  else{next=[r.address];rangeAnchor.current=r.address;}
  setSelectedRows(next);if(s.selected!==main||s.space!=='cpu')ownSelection.current=main;select(main);const active=rows.find(x=>x.address===main);store.set({reference:active?.kind==='code'?instructionReference(active,s.snapshot?.registers):null});
 }
 return <><AddressBar value={address} onGo={n=>{setFollow(false);setFixed(n);select(n);}}>
  <MemorySourcePicker assembly/>
  <button title={tr("Карта программы")} aria-label={tr("Карта программы")} onClick={()=>setMapOpen(true)}><Map size={16}/></button>
  <button aria-label={tr("Previous described block")} title={previousSection?tr("Предыдущий блок: ")+previousSection.name:tr("Предыдущий участок · $0200")} disabled={!previousSection&&address===0} onClick={()=>previousSection?goSection(previousSection):go(Math.max(0,(Math.ceil(address/512)-1)*512))}><ArrowUp size={16}/></button><button aria-label={tr("Next described block")} title={nextSection?tr("Следующий блок: ")+nextSection.name:tr("Следующий участок · $0200")} disabled={!nextSection&&(!rows.length||rows.at(-1)!.address+rows.at(-1)!.size>=65536)} onClick={()=>nextSection?goSection(nextSection):rows.length&&go(rows.at(-1)!.address+rows.at(-1)!.size)}><ArrowDown size={16}/></button>
  <button title={tr("Выполнить до выбранного адреса")} aria-label={tr("Run to selection")} disabled={!s.snapshot} onClick={()=>command('until',{address:s.selected})}><Play size={16}/></button>
  {mode!=='procedure'&&<button title={tr("Следующая страница")} aria-label={tr("Next page")} disabled={!rows.length||rows.at(-1)!.address+rows.at(-1)!.size>65535} onClick={()=>{const last=rows.at(-1)!;go(last.address+last.size);}}><ChevronRight size={16}/></button>}
 <button aria-label={t("Настройки дизассемблера")} title={t("Настройки дизассемблера")} aria-expanded={!!settingsAnchor} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setSettingsAnchor(settingsAnchor?null:{left:Math.max(8,Math.min(r.left,window.innerWidth-300)),top:Math.min(r.bottom+4,window.innerHeight-220)});}}><Settings size={16}/></button></AddressBar>
 {settingsAnchor&&createPortal(<><div className="memory-source-dismiss" onClick={()=>setSettingsAnchor(null)}/><div className="assembler-settings" style={settingsAnchor}><strong>{t("Настройки дизассемблера")}</strong>  <button title={tr("Следовать за выбранным адресом")} aria-label={tr("Follow selection")} onClick={()=>{setFollow(false);setFixed(null);setSelectionAddress(s.selected);}}><MousePointer2 size={16}/>{" "}{tr("Следовать за выделением")}</button><button title={t("Следовать за PC")} aria-label={tr("Follow PC")} aria-pressed={follow} onClick={()=>{setFixed(null);setFollow(!follow);if(s.snapshot)select(s.snapshot.registers.PC);}} className={follow?'selected':''}><Crosshair size={16}/>{" "}{tr("Следовать за PC")}</button>
  <label className="compact-tool-select" title={tr("Режим дизассемблера")}><List size={16}/>{" "}{tr("Вид")}{" "}<select aria-label={tr("Listing mode")} value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="annotated">{t("Код + данные")}</option><option value="procedure">{t("Процедура")}</option><option value="code">{t("Код")}</option></select></label>
  <label className="compact-tool-select" title={tr("Показывать имена или адреса")}><Tags size={16}/>{" "}{tr("Операнды")}{" "}<select aria-label={tr("Operand display")} value={operands} onChange={e=>setOperands(e.target.value as typeof operands)}><option value="symbols">{t("Имена")}</option><option value="addresses">{t("Адреса")}</option></select></label>
</div></>,document.body)}
 {s.project?.researchMismatch&&<div className="project-warning">{tr("Labels belong to another build. Verify the ranges or use Raw Z80.")}</div>}
 {index.containing(s.selected).filter(l=>l.type==='COMMENT'&&l.end>l.address).map(l=><div key={l.id} className="procedure-context"><strong>{tr("Описание блока")}</strong> <span>${hex(l.address)}–${hex(l.end)} · {l.end-l.address+1}{" "}{tr("bytes")}</span><button title={tr("Редактировать описание блока")} onClick={()=>setEditing(l)}><SquarePen size={16}/></button><p>{l.comment}</p></div>)}
 {block&&<div className="procedure-context"><div><strong>{block.type} · {block.name}</strong> <span>${hex(block.address)}–${hex(block.end)} · {block.end-block.address+1}{" "}{tr("bytes · +$")}{hex(address-block.address)}</span><button title={tr("К началу блока")} aria-label={tr("Block start")} onClick={()=>go(block.address)}><ChevronsUp size={16}/></button><button title={tr("Редактировать блок")} aria-label={tr("Edit block")} onClick={()=>setEditing(block)}><SquarePen size={16}/></button><button title={tr("Открыть просмотрщик блока")} aria-label={tr("Open block view")} onClick={()=>{const view=labelView(block);openView(view.kind,view.preferences);}}><PanelTop size={16}/></button></div>{block.comment&&<p>{block.comment}</p>}{data&&proc&&mode!=='procedure'&&<small>{tr("Inside procedure")}{" "}{proc.name} · ${hex(proc.address)}–${hex(proc.end)}</small>}</div>}
 {mapOpen&&<ProgramMap close={()=>setMapOpen(false)} onGo={l=>{if(l.space==='cpu')go(l.address);else{const view=labelView(l);openView(view.kind,view.preferences);}}}/>}
 {editing&&<LabelEditor key={editing.id} label={editing} close={()=>setEditing(null)}/>}
 {mode==='procedure'&&!proc&&<p className="panel-message">{tr("No procedure is defined at this address. Select a PROC label or use Code + data.")}</p>}
 <div ref={scrollRef} className="data-scroll assembly-scroll" onWheel={edgeWheel}><table className="debug-table code-table" onMouseDown={e=>{if(e.shiftKey||e.metaKey||e.ctrlKey)e.preventDefault();}}><tbody>{rows.map((r,i)=>{
  if(r.block?.type==='DATA MSXHEADER'&&r.size===16)return <tr key={r.address}><td>{hex(r.address)}</td><td colSpan={4}><MSXHeader bytes={r.bytes} address={r.address} onGo={go}/></td></tr>;
  const symbol=r.kind==='code'?symbolizeInstruction(r,visibleLabels,s.snapshot||undefined):undefined;const referenced=reference&&reference.address>=r.address&&reference.address<r.address+r.size;const bp=s.project?.breakpoints.some(b=>b.enabled&&b.address===r.address&&scopeMatches(b.memoryScope,r.address,s.snapshot));const target=r.target===undefined?undefined:index.symbolAt(r.target);const rowNames=r.labels.filter(l=>l.address===r.address&&!['COMMENT','AREA'].includes(l.type.toUpperCase()));
  const described=r.kind==='code'&&index.containing(r.address).some(l=>!!l.comment?.trim());
  return <tr key={i} data-row-kind={r.kind} onMouseEnter={()=>store.set({hoverReference:r.kind==='code'?instructionReference(r,s.snapshot?.registers):null})} onMouseLeave={()=>store.set({hoverReference:undefined})} className={`${selectedRows.includes(r.address)?'multi-selected-row':''} ${referenced?'reference-target':''} ${s.selected>=r.address&&s.selected<r.address+r.size?'selected-row':''} ${s.snapshot?.registers.PC===r.address?'pc-row':''} ${r.kind==='data'?'data-row':''}`} onClick={e=>chooseRow(r,e)}>
   <td><button disabled={r.kind==='data'} aria-label={tr("Breakpoint ")+hex(r.address)} onClick={e=>{e.stopPropagation();const existing=s.project?.breakpoints.find(b=>b.address===r.address&&scopeMatches(b.memoryScope,r.address,s.snapshot));const c=s.snapshot?.memorySlots?.columns.find(c=>c.activePages.includes(r.address>>>14));toggleBreakpoint(r.address,existing?existing.memoryScope:c?{primary:c.primary,secondary:c.secondary,...(c.bankCount?{bank:c.banks?.[r.address>>>14]}:{})}:undefined);}} className={bp?'breakpoint-dot':''}>{bp?'●':'·'}</button></td><td onDoubleClick={()=>setEditing(rowNames[0]||{id:crypto.randomUUID(),name:'',address:chosenRows.length>1?chosenRows[0].address:r.address,end:chosenRows.length>1?chosenRows.at(-1)!.address+chosenRows.at(-1)!.size-1:r.address+r.size-1,space:'cpu',type:r.kind==='data'?'DATA':'LABEL',comment:'',memoryScope:(()=>{const c=s.snapshot?.memorySlots?.columns.find(c=>c.activePages.includes(r.address>>>14));return c?{primary:c.primary,secondary:c.secondary,...(c.bankCount?{bank:c.banks?.[r.address>>>14]}:{})}:undefined;})()})} title={tr("Двойной клик — редактировать метку")}>{rowNames.map(l=><div className="assembly-label" key={l.id} title={'$'+hex(l.address)}>{l.name}:</div>)}<span className="instruction-address">{referenced&&<span className="reference-arrow" title={tr("Referenced by hovered or selected instruction")}>{reference?.kind==='branch'?'↪':'◇'}</span>}{hex(r.address)}</span></td><td className="instruction-bytes">{r.bytes.map(b=>hex(b,2)).join(' ')}</td>
   <td className={described?'assembly-described':undefined} title={[described?tr('Входит в область с описанием'):undefined,r.text,symbol?.name,symbol?.description,symbol?.source,target?.comment,r.note].filter(Boolean).join(' · ')}><span className="assembly-command-layout"><span className="assembly-command-code">{operands==='symbols'&&symbol?<>{symbol.before}<span className="assembly-symbol">{symbol.name}</span>{symbol.after}</>:r.text}{r.target!==undefined&&<button className="branch-target" title={'$'+hex(r.target)+(target?' · '+target.name:'')+(target?.comment?' · '+target.comment:'')} aria-label={tr("Jump to ")+hex(r.target)} onClick={e=>{e.stopPropagation();go(r.target!);}}> ↗</button>}</span>{r.ascii&&<span className="data-ascii"> {r.ascii}</span>}{r.kind==='boundary'&&<span className="boundary-warning">{" "}{tr("⚠ boundary")}</span>}</span></td>
   <td className="selection-anchor assembly-description"><StandardReference row={r} rows={rows} dos={s.project?.kind==='dos'&&!!s.snapshot?.pages.some(p=>r.address>=p.start&&r.address<=p.end&&/ram/i.test(p.format))}/>{chosenRows.length>1&&r.address===chosenRows[0].address&&<SelectionActions key={s.session} rows={chosenRows} onAddLabel={()=>{const first=chosenRows[0],last=chosenRows.at(-1)!,c=s.snapshot?.memorySlots?.columns.find(c=>c.activePages.includes(first.address>>>14));setEditing({id:crypto.randomUUID(),name:'',type:'DATA',space:'cpu',address:first.address,end:last.address+last.size-1,comment:'',memoryScope:c?{primary:c.primary,secondary:c.secondary,...(c.bankCount?{bank:c.banks?.[first.address>>>14]}:{})}:undefined});}}/>}</td>
  </tr>;
 })}</tbody></table>{mode==='procedure'&&rows.length>0&&rows.at(-1)!.address+rows.at(-1)!.size<=proc!.end&&<button onClick={()=>setLimit(limit+300)}>{tr("Show more of procedure")}</button>}</div></>;
}

export function DisassemblerPanel(){return <MemoryScope kind="assembly"><DisassemblerPanelCPU/></MemoryScope>;}
