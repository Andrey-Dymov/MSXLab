import {message as localizeMessage} from '../i18n';
import {t as tr} from '../i18n';
import {Settings,RefreshCw} from 'lucide-react';
import {textEncodings,textFormats,gameTextPresets,detectTextPreset,matchingTextPreset} from '../backend/textProfiles';
import {useEffect,useMemo,useState} from 'react';
import {useDebugger,select,updateProject} from '../state/debugger';
import {usePanelSetting} from '../state/panelSettings';
import {useOpenView} from '../state/panelActions';
import {scanTexts,defaultTextProfile,type TextProfile,type FoundText} from '../backend/textStrings';
import {hex} from '../backend/disassemble';
import type {Space} from '../backend/types';
export function TextsPanel(){
 const s=useDebugger(),open=useOpenView();
 const [space,setSpace]=usePanelSetting<Space>('source','rom');
 const profile=s.project?.textProfile||detectTextPreset(s.project?.romSha256)?.settings||defaultTextProfile;
 const setProfile=(patch:Partial<TextProfile>)=>{if(s.project)updateProject({textProfile:{...profile,...patch}});};
 const [block,setBlock]=useState('');
 const [settings,setSettings]=useState(false);
 const [captured,setCaptured]=useState<{session:number|string;space:Space;bytes:number[]}|null>(null),[filter,setFilter]=useState(''),[visible,setVisible]=useState(100);
 useEffect(()=>{if(s.snapshot&&(!captured||captured.session!==s.session||captured.space!==space))setCaptured({session:s.session,space,bytes:[...s.snapshot[space]]});},[s.snapshot,s.session,space,captured]);
 const result=useMemo(()=>{try{return {rows:scanTexts(captured?.session===s.session&&captured.space===space?captured.bytes:[],profile,space),error:''};}catch(e){return {rows:[],error:e instanceof Error?e.message:String(e)};}},[captured,s.session,space,profile]);
 useEffect(()=>setVisible(100),[result,filter]);
 const rows=result.rows.filter(r=>r.text.toLowerCase().includes(filter.toLowerCase()));
 const saved=(r:FoundText)=>s.project?.labels.some(l=>l.space===space&&l.address===r.address&&l.end===r.end&&l.type==='DATA MSG');
 function save(r:FoundText){if(!s.project||saved(r))return;updateProject({labels:[...s.project.labels,{id:crypto.randomUUID(),name:`TEXT_${space.toUpperCase()}_${hex(r.address)}`,space,address:r.address,end:r.end,type:'DATA MSG',comment:r.text,textProfile:{...profile,start:r.record,end:r.end+(profile.format==='terminated'||profile.format==='kings-valley'?1:0)}}]});}
 const number=(key:'minimum'|'size'|'start'|'end'|'firstCode'|'ending'|'romBase'|'writer',label:string,hexadecimal=false)=><label>{label} <input key={key+String(profile[key])} aria-label={label} defaultValue={hexadecimal?profile[key].toString(16).toUpperCase():profile[key]} onBlur={e=>{const value=hexadecimal?(/^[0-9a-f]+$/i.test(e.target.value)?parseInt(e.target.value,16):NaN):Number(e.target.value);if(Number.isInteger(value)&&value>=0)setProfile({[key]:value});}}/></label>;
 return <><div className="panel-tools texts-main-tools">
 <select aria-label={tr("Профиль игры")} title={(matchingTextPreset(profile)?.verified?tr(matchingTextPreset(profile)!.verified):'')||tr("Кодировка и формат текста")} value={!s.project?.textProfile?'auto':matchingTextPreset(profile)?.id||'custom'} onChange={e=>{setBlock('');if(e.target.value==='auto'){updateProject({textProfile:undefined});setSpace('rom');}else if(e.target.value==='custom'){setProfile({});setSettings(true);}else{const preset=gameTextPresets.find(p=>p.id===e.target.value);if(preset){setProfile(preset.settings);setSpace('rom');}}}}><option value="auto">{tr("Авто")}</option>{[...new Set(gameTextPresets.map(p=>p.publisher))].map(publisher=><optgroup label={publisher} key={publisher}>{gameTextPresets.filter(p=>p.publisher===publisher).map(p=><option key={p.id} value={p.id}>{p.game}</option>)}</optgroup>)}<option value="custom">{tr("Свои настройки…")}</option></select>
 <input aria-label={tr("Фильтр найденных текстов")} placeholder={tr("Фильтр · {p0} строк",{p0:(rows.length)})} value={filter} onChange={e=>setFilter(e.target.value)}/>
 <button aria-label={tr("Обновить тексты")} title={tr("Обновить тексты из памяти")} disabled={!s.snapshot} onClick={()=>{if(s.snapshot)setCaptured({session:s.session,space,bytes:[...s.snapshot[space]]});}}><RefreshCw size={15}/></button>
 <button aria-label={tr("Настройки поиска текстов")} title={tr("Настройки поиска текстов")} aria-expanded={settings} onClick={()=>setSettings(!settings)}><Settings size={15}/></button>
 </div>
 {settings&&<div className="texts-advanced"><div className="panel-tools"><select aria-label={tr("Источник текстов")} value={space} onChange={e=>setSpace(e.target.value as Space)}><option value="rom">{tr("ROM — file bytes")}</option><option value="cpu">{tr("CPU · RAM")}</option><option value="vram">{tr("VRAM — video memory")}</option></select><select aria-label={tr("Кодировка текста")} value={profile.encoding} onChange={e=>setProfile({encoding:e.target.value as TextProfile['encoding']})}>{Object.entries(textEncodings).map(([k,v])=><option key={k} value={k}>{tr(v)}</option>)}</select><select aria-label={tr("Формат текста")} value={profile.format} onChange={e=>setProfile({format:e.target.value as TextProfile['format']})}>{Object.entries(textFormats).map(([k,v])=><option key={k} value={k}>{tr(v)}</option>)}</select></div>
 <p className="panel-message">{(matchingTextPreset(profile)?.verified?tr(matchingTextPreset(profile)!.verified):'')||tr("Кодировка и формат независимы; производитель не гарантирует совместимость.")}</p>
 <div className="panel-tools">{number('minimum',tr("Минимум"))}{profile.format==='terminated'&&number('ending',tr("Окончание HEX"),true)}{profile.format==='fixed'&&number('size',tr("Длина"))}{number('start',tr("От HEX"),true)}{number('end',tr("До HEX"),true)}</div>
 {profile.encoding==='custom'&&<div className="panel-tools">{number('firstCode',tr("Первый код HEX"),true)}<input style={{width:300}} aria-label={tr("Таблица символов")} value={profile.charset} onChange={e=>setProfile({charset:e.target.value})}/></div>}
 {profile.format==='kings-valley'&&<details><summary>{tr("Адреса драйвера выбранной игры")}</summary><div className="panel-tools">{number('romBase',tr("База ROM HEX"),true)}{number('writer',tr("Процедура вывода HEX"),true)}</div></details>}
 <div className="panel-tools"><select aria-label={tr("Фильтрация текстов")} value={profile.probable?'likely':'all'} onChange={e=>setProfile({probable:e.target.value==='likely'})}><option value="likely">{tr("Вероятные тексты")}</option><option value="all">{tr("Все совпадения")}</option></select><select aria-label={tr("Сохранённые текстовые блоки")} value={block} onChange={e=>{setBlock(e.target.value);const l=s.project?.labels.find(l=>l.id===e.target.value);if(l?.textProfile){setSpace(l.space);setProfile(l.textProfile);}}}><option value="">{tr("Текстовые блоки проекта…")}</option>{s.project?.labels.filter(l=>l.textProfile).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><button onClick={()=>{setBlock('');setProfile({start:0,end:16777215});}}>{tr("Весь диапазон")}</button></div>
 <p className="panel-message">{tr("Настройки сохраняются в проекте. ROM: смещения в файле. Совпадения — кандидаты; сжатые потоки требуют отдельного декодера.")}</p></div>}
 {result.error&&<p className="panel-message" role="alert">{localizeMessage(result.error)}</p>}
 <div className="data-scroll"><table className="debug-table"><thead><tr><th>{tr("Адрес")}</th><th>{tr("Текст")}</th><th>{tr("Байт")}</th><th>{tr("Формат / связь")}</th><th/></tr></thead><tbody>{rows.slice(0,visible).map(r=><tr key={r.address} onClick={()=>select(r.address,space)}><td>{hex(r.address)}</td><td style={{whiteSpace:'pre-wrap',maxWidth:600,overflowWrap:'anywhere'}}>{r.text}</td><td>{r.length}</td><td title={tr("Прямой LD DE + CALL процедуры вывода; найдено по байтам, не доказательство исполнения")}>{r.ending.startsWith('длина ')?tr('длина {p0}',{p0:r.ending.slice(6)}):localizeMessage(r.ending)}{r.referenced?tr(" · вызов вывода"):""}</td><td><button onClick={e=>{e.stopPropagation();select(r.address,space);open('memory',{space,follow:'fixed',address:r.address});}}>{tr("Байты")}</button><button disabled={!s.project||saved(r)} onClick={e=>{e.stopPropagation();save(r);}}>{saved(r)?tr("Сохранено"):tr("В проект")}</button></td></tr>)}</tbody></table>{rows.length>visible&&<button onClick={()=>setVisible(visible+100)}>{tr("Ещё 100")}</button>}</div></>;
}
