import {message as localizeMessage} from '../i18n';
import {t as tr,locale} from '../i18n';
import {WandSparkles} from 'lucide-react';
import {useEffect,useState} from 'react';
import {flushResearch,loadProject} from '../state/debugger';
import type {RomVersion} from '../backend/types';
const suggestedName=()=>`ROM ${new Date().toLocaleString('sv-SE').replaceAll(':','-')}`;
export function RomVersions({id}:{id:string}){
 const [versions,setVersions]=useState<RomVersion[]>([]),[active,setActive]=useState(''),[name,setName]=useState(suggestedName),[nameInfo,setNameInfo]=useState(''),[selected,setSelected]=useState(''),[pending,setPending]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function refresh(){const r=await window.desktop!.listRomVersions(id);setVersions(r.versions);setActive(r.activeHash);return r;}
 useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[id]);
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');try{await flushResearch();await fn();await refresh();}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function save(){await window.desktop!.saveRomVersion(id,name);setName(suggestedName());}
 async function load(version:string){await window.desktop!.loadRomVersion(id,version);await loadProject(id);setPending('');}
 async function requestLoad(){await action(async()=>{const r=await refresh();if(!r.versions.some(v=>v.sha256===r.activeHash)){setPending(selected);return;}await load(selected);});}
 return <section className="rom-versions"><div className="rom-version-save"><label>{tr("Название версии")}<input aria-label={tr("ROM version name")} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><div className="panel-tools"><button title={tr("Предложить имя по изменениям: сравнение с выбранной версией, иначе с последней сохранённой. ИИ выключен.")} aria-label={tr("Suggest ROM version name")} disabled={busy} onClick={()=>void action(async()=>{const r=await window.desktop!.suggestRomName(id,selected||undefined);setName(r.name);setNameInfo(r.description+' · локально, без ИИ');})}><WandSparkles size={16}/>{" "}{tr("Предложить имя")}</button><button disabled={busy||!name.trim()} onClick={()=>void action(save)}>{tr("Сохранить текущую")}</button><button disabled={busy||!name.trim()} onClick={()=>void action(async()=>{const file=await window.desktop!.pickLaunchFile();if(file){await window.desktop!.saveRomVersion(id,name,file);setName(suggestedName());}})}>{tr("Добавить из файла…")}</button></div></div>
 {nameInfo&&<p className="panel-message">{nameInfo}</p>}<label className="rom-version-picker">{tr("Сохранённые ROM ·")}{" "}{versions.length}<select aria-label={tr("Saved ROM version")} disabled={busy} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{tr("Выберите версию…")}</option>{versions.map(v=><option key={v.id} value={v.id}>{v.name}{v.sha256===active?tr(" · текущая"):''} · {new Date(v.created).toLocaleString(locale())}</option>)}</select></label><button disabled={busy||!selected||versions.find(v=>v.id===selected)?.sha256===active} onClick={()=>void requestLoad()}>{tr("Загрузить выбранную")}</button>
 {pending&&<div className="rom-load-confirm" role="alertdialog" aria-label={tr("Несохранённые изменения ROM")}><p>{tr("Текущий ROM отличается от сохранённых версий. Что сделать перед загрузкой?")}</p><div className="panel-tools"><button disabled={busy||!name.trim()} onClick={()=>void action(async()=>{await save();await load(pending);})}>{tr("Сохранить и загрузить")}</button><button disabled={busy} onClick={()=>void action(()=>load(pending))}>{tr("Загрузить без сохранения")}</button><button disabled={busy} onClick={()=>setPending('')}>{tr("Отмена")}</button></div></div>}
 {error&&<p role="alert">{localizeMessage(error)}</p>}<p className="panel-message">{tr("Сохраняется ROM на диске. Загрузка перезапускает программу; размер и настройки запуска сохраняются.")}</p></section>;
}
