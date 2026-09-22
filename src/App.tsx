import {message as localizeMessage} from './i18n';
import {t as tr} from './i18n';
import {t,useLanguage} from './i18n';
import {togglePanelPopup,revealPanel} from './components/PanelPopup';
import {CommandInput} from './components/CommandInput';
import {PanelIcon} from './components/PanelIcon';
import {Layouts} from './components/Layouts';
import {Settings as SettingsDialog} from './components/Settings';
import {remote} from './backend/remote';
import {EngineSurface} from './components/EngineSurface';
import {useDebugger,initialize,command,reset,select,store,navigate} from './state/debugger';
import {decode} from './backend/disassemble';
import { useEffect, useRef, useState } from 'react';
import { DockviewReact, DockviewDefaultTab, type IDockviewPanelHeaderProps, themeDark, themeLight, type DockviewApi, type DockviewReadyEvent } from 'dockview-react';
import { Maximize2, ArrowLeft, ArrowRight, Settings, Play, Pause, StepForward, CornerDownRight, RotateCcw, LayoutGrid, PanelTop, Check, ChevronDown, Sun, Moon } from 'lucide-react';
import { Panel, panels, panelGroups, type PanelId } from './panels';
const components = { panel: Panel };
function PanelTab(props:IDockviewPanelHeaderProps){useLanguage();const id=props.params?.kind as PanelId;return <div className="panel-tab-with-icon">{panels.some(p=>p[0]===id)&&<PanelIcon id={id}/>}<DockviewDefaultTab {...props}/><button className="panel-popup-open" title={t("Открыть панель в большом окне")} aria-label={t('Expand panel')+': '+t(panels.find(p=>p[0]===id)?.[1]||id)} onPointerDown={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();props.api.setActive();togglePanelPopup(props.api.id);}}><Maximize2 size={13}/></button></div>;}

function persist(key:string,value:string){localStorage.setItem(key,value);void window.desktop?.savePreference(key,value).catch(()=>store.set({error:'Workspace could not be saved'}));}
const KEY = 'msxlab.layout.v1';
const columns: PanelId[][] = [['projects','labels','patterns'],['disassembler','trace'],['memory','numbers','text','bitmap'],['screen','vram-map'],['registers','stack','breakpoints','watches']];
const widths=[.13,.27,.24,.21,.15];
const heights=[[.29,.39,.32],[.70,.30],[.25,.25,.22,.28],[.65,.35],[.32,.24,.23,.21]];
function defaultLayout(api: DockviewApi) {
 api.clear();
 columns.forEach((col,i)=> {
  const id=col[0];
  api.addPanel({id,component:'panel',title:t(panels.find(p=>p[0]===id)![1]),params:{kind:id},position:i?{referencePanel:columns[i-1][0],direction:'right'}:undefined});
 });
 columns.forEach(col=>col.slice(1).forEach((id,j)=>api.addPanel({id,component:'panel',title:t(panels.find(p=>p[0]===id)![1]),params:{kind:id},position:{referencePanel:col[j],direction:'below'}})));
 columns.forEach((col,i)=>col.forEach((id,j)=>api.getPanel(id)?.group.api.setSize({width:api.width*widths[i],height:api.height*heights[i][j]})));
 api.addPanel({id:'sprites',component:'panel',title:'Sprites',params:{kind:'sprites'},position:{referencePanel:'bitmap',direction:'within'}});
 api.addPanel({id:'tilemap',component:'panel',title:'Tilemap',params:{kind:'tilemap'},position:{referencePanel:'screen',direction:'within'}});
 api.getPanel('bitmap')?.api.setActive();
 api.getPanel('screen')?.api.setActive();
 addMemoryMap(api);
 api.getPanel('disassembler')?.api.setActive();
}
function addMemoryMap(api: DockviewApi) {
 const existing=api.getPanel('memory-map');
 if(existing) api.removePanel(existing);
 const panel=api.addPanel({id:'memory-map',component:'panel',title:'Memory Map',params:{kind:'memory-map'},position:{direction:'above'}});
 panel.group.api.setSize({height:85});
}
export default function App() {
 const [language]=useLanguage();
 const debug=useDebugger();
 useEffect(()=>window.desktop?.onRefresh((shortcut)=>{if(shortcut==='command-r'&&document.activeElement?.matches('.source-editor')){document.activeElement.dispatchEvent(new Event('source-build-shortcut'));return;}void command<import('./backend/types').Snapshot>('snapshot').then(snapshot=>{if(snapshot)store.set({snapshot,notice:'Панели обновлены без перезапуска эмулятора'});});}),[]);
 useEffect(()=>{void initialize();return window.desktop?.onControl(remote);},[]);
 const apiRef=useRef<DockviewApi|null>(null);
 useEffect(()=>{for(const panel of apiRef.current?.panels||[]){const title=panels.find(p=>p[0]===panel.params?.kind)?.[1];if(title)panel.api.setTitle(t(title));}},[language]);
 const cleanup=useRef<()=>void>(()=>{});
 const [mode,setMode]=useState<'workspace'|'empty'>('workspace');
 const [theme,setTheme]=useState<'dark'|'light'>(()=>{try{return localStorage.getItem('msxlab.theme')==='light'?'light':'dark';}catch{return 'dark';}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{persist('msxlab.theme',theme);}catch{}},[theme]);
 const [menu,setMenu]=useState(false);
 const [groupOpen,setGroupOpen]=useState<Record<string,boolean>>(()=>Object.fromEntries(panelGroups.map(g=>{try{return [g.title,localStorage.getItem('msxlab.panel-group.'+g.ids[0])!=='closed'];}catch{return [g.title,true];}})));
 function rememberGroup(title:string,id:string,open:boolean){setGroupOpen(previous=>previous[title]===open?previous:{...previous,[title]:open});try{persist('msxlab.panel-group.'+id,open?'open':'closed');}catch{store.set({error:'Workspace could not be saved'});}}

 const [settings,setSettings]=useState(false);
 const [layouts,setLayouts]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>()=>cleanup.current(),[]);
 function ready({api}:DockviewReadyEvent) {
  apiRef.current=api;
  try {
   const raw=localStorage.getItem(KEY);
   if(raw) api.fromJSON(JSON.parse(raw)); else defaultLayout(api);
  } catch { defaultLayout(api); setNotice(tr("Saved layout was reset")); }
  if (!localStorage.getItem('msxlab.viewers.v2')) {
   for (const [id,anchor,title] of [['sprites','bitmap','Sprites'],['tilemap','screen','Tilemap']] as const) {
    if(!api.getPanel(id)) api.addPanel({id,component:'panel',title,params:{kind:id},position:api.getPanel(anchor)?{referencePanel:anchor,direction:'within'}:undefined});
   }
   try{persist('msxlab.viewers.v2','1');persist(KEY,JSON.stringify(api.toJSON()));}catch{}
  }
  if(!localStorage.getItem('msxlab.adaptive-map.v3')) {
   addMemoryMap(api);
   try{persist('msxlab.adaptive-map.v3','1');persist(KEY,JSON.stringify(api.toJSON()));}catch{}
  }
  if(!localStorage.getItem('msxlab.compact-map.v4')) {
   const map=api.getPanel('memory-map');
   if(map && map.group.api.width>map.group.api.height) map.group.api.setSize({height:85});
   try{persist('msxlab.compact-map.v4','1');persist(KEY,JSON.stringify(api.toJSON()));}catch{}
  }
  for(const panel of api.panels){const title=panels.find(p=>p[0]===panel.params?.kind)?.[1];if(title)panel.api.setTitle(t(title));}
  const saveLayout=()=>{try{persist(KEY,JSON.stringify(api.toJSON()));}catch{setNotice(tr("Layout could not be saved"));}};
  const listener=api.onDidLayoutChange(saveLayout);
  window.addEventListener('beforeunload',saveLayout);
  cleanup.current=()=>{window.removeEventListener('beforeunload',saveLayout);listener.dispose();};
 }
 function openPanel(id:PanelId,duplicate=false) {
  const api=apiRef.current;if(!api)return;
  const existing=api.getPanel(id)||api.panels.find(p=>p.params?.kind===id);
  const targetId=existing&&!duplicate?existing.id:duplicate?`${id}-${crypto.randomUUID()}`:id;
  if(existing&&!duplicate)existing.api.setActive();
  else api.addPanel({id:targetId,component:'panel',title:t(panels.find(p=>p[0]===id)![1]),params:{kind:id},...(['assets','music'].includes(id)&&api.getPanel('disassembler')?{position:{referencePanel:'disassembler',direction:'within' as const}}:{})});
  revealPanel(targetId);
  setMenu(false);
 }
 return <div className="app-shell">
  <header className="titlebar"><div className="title-spacer"/><span>MSXLab <em>— {debug.project?.name||'MSXLab'}</em></span><div className="title-tag">{t("LIVE DEBUGGER · EXPERIMENTAL")}</div></header>
  <div className="toolbar"><span className="app-mark">M<span>▧</span></span><div className="run-controls"><button onClick={()=>command('run')} disabled={!debug.snapshot||debug.snapshot.status==='running'}><Play size={14}/>{t("Run")}</button><button onClick={()=>command('pause')} disabled={!debug.snapshot||debug.snapshot.status==='paused'}><Pause size={14}/>{t("Pause")}</button><button onClick={()=>command('step')} disabled={debug.snapshot?.status!=='paused'||!debug.snapshot?.capabilities.step}><StepForward size={14}/>{t("Step Into")}</button><button onClick={()=>{if(!debug.snapshot)return;const r=decode(debug.snapshot.cpu,debug.snapshot.registers.PC);void command(r.call?'over':'step',r.call?{address:(r.address+r.size)&65535}:undefined);}} disabled={debug.snapshot?.status!=='paused'||!debug.snapshot?.capabilities.stepOver}><CornerDownRight size={14}/>{t("Step Over")}</button><button onClick={reset} disabled={!debug.project}><RotateCcw size={14}/>{t("Reset")}</button><span className="backend-badge"><i/>{t(debug.loading?'LOADING':debug.snapshot?.status.toUpperCase()||'OFFLINE')}</span></div><div className="navigation-controls"><button aria-label={t("Back to previous address")} disabled={debug.navigationIndex===0} onClick={()=>navigate(-1)}><ArrowLeft size={14}/></button><button aria-label={t("Forward to next address")} disabled={debug.navigationIndex>=debug.navigation.length-1} onClick={()=>navigate(1)}><ArrowRight size={14}/></button></div><CommandInput openView={(kind,preferences)=>{setMode('workspace');const api=apiRef.current;if(!api)return;if(kind==='disassembler'){openPanel(kind);return;}api.addPanel({id:kind+'-'+crypto.randomUUID(),component:'panel',title:t(panels.find(p=>p[0]===kind)![1]),params:{kind,preferences},position:api.panels.find(p=>p.params?.kind===kind)?{referencePanel:api.panels.find(p=>p.params?.kind===kind)!.id,direction:'within'}:undefined});}}/><div className="layout-controls"><button onClick={()=>setSettings(true)} title={t("Workspace settings")} aria-label={t("Workspace settings")}><Settings size={14}/></button><button onClick={()=>setTheme(theme==='dark'?'light':'dark')} title={t(theme==='dark'?'Switch to light theme':'Switch to dark theme')} aria-label={t(theme==='dark'?'Switch to light theme':'Switch to dark theme')}>{theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}</button><button className={mode==='empty'?'selected':''} onClick={()=>setMode('empty')} title={tr("Step 1: empty Electron shell")}><PanelTop size={14}/>{t("Empty shell")}</button><button className={mode==='workspace'?'selected':''} onClick={()=>setMode('workspace')} title={tr("Step 2: panel workspace")}><LayoutGrid size={14}/>{t("Workspace")}</button></div></div>
  <main>
  <div className="workspace-area"><div className="workspace-caption"><span><span className="caption-dot"/> {debug.project?.name.toUpperCase()||tr("PROJECT")} <em>/ {t(mode==='workspace'?'Research workspace':'Empty application shell')}</em></span><div className="workspace-actions"><button onClick={()=>setLayouts(true)} disabled={mode==='empty'}>{t("Layouts…")}</button><button onClick={()=>{defaultLayout(apiRef.current!);setNotice(tr("Default layout restored"));}} disabled={mode==='empty'} title={t("Restore default workspace")}><RotateCcw size={12}/>{t("Reset layout")}</button><button onClick={()=>setMenu(!menu)} aria-expanded={menu}><LayoutGrid size={12}/>{t("Panels")}<ChevronDown size={11}/></button></div></div>
  {menu&&<div className="panels-menu">{[[panelGroups[0],panelGroups[2],panelGroups[4]],[panelGroups[1],panelGroups[3]]].map((groups,column)=><div className="panel-menu-column" key={column}>{groups.map(group=><details className="panel-menu-group" key={group.title} open={groupOpen[group.title]!==false} onToggle={e=>rememberGroup(group.title,group.ids[0],e.currentTarget.open)}><summary>{t(group.title)}<span>{group.ids.length}</span></summary>{group.ids.map(id=>{const title=panels.find(p=>p[0]===id)![1];return <div className="panel-menu-row" key={id}><button onClick={()=>{setMode('workspace');openPanel(id);}}><span className="panel-menu-label"><PanelIcon id={id}/><span>{t(title)}</span></span>{apiRef.current?.getPanel(id)&&<Check size={12}/>}</button>{['memory','numbers','text','bitmap','disassembler','structures','assets','fonts','tiles','levelmap','sprites','tilemap'].includes(id)&&<button title={t('New view')+': '+t(title)} aria-label={t('New view')+': '+t(title)} onClick={()=>openPanel(id,true)}>+</button>}</div>;})}</details>)}</div>)}</div>}
  <div className="dock-container" style={{visibility:mode==='workspace'?'visible':'hidden'}}><DockviewReact defaultTabComponent={PanelTab} components={components} onReady={ready} theme={theme==='dark'?themeDark:themeLight}/></div>
  {mode==='empty'&&<div className="empty-shell"><div className="empty-logo">MSX<span>Lab</span></div><p>{t("Desktop shell is ready")}</p><small>Electron · React · TypeScript</small><button onClick={()=>setMode('workspace')}><LayoutGrid size={15}/>{t("Open workspace")}</button></div>}
  </div></main>
  <footer><span><PanelTop size={12}/>{debug.snapshot?.engine||t('Engine offline')} <span className="footer-divider">|</span> {localizeMessage(debug.error)||(debug.snapshot?.hit?tr("{p0} · ${p1}",{p0:(tr(debug.snapshot.hit.reason)),p1:(debug.snapshot.hit.address.toString(16).toUpperCase())}):localizeMessage(notice||debug.notice))}</span><span>{panels.length} {t("panel types")} <span className="footer-divider">|</span> {t("Layout saved locally")} <span className="footer-divider">|</span> MSXLab 0.8</span></footer>
 {layouts&&apiRef.current&&<Layouts api={apiRef.current} close={()=>setLayouts(false)}/>}
 {settings&&<SettingsDialog close={()=>setSettings(false)}/>}
 <EngineSurface/>
 </div>;
}
