import {message as localizeMessage, t as tr} from '../i18n';
import {useEffect,useState} from 'react';
import type {AiConfig} from '../backend/types';
export function AiSettings(){
 const [config,setConfig]=useState<AiConfig|null>(null),[models,setModels]=useState(''),[key,setKey]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{window.desktop!.readAiConfig().then(c=>{setConfig(c);setModels(c.models.join('\n'));}).catch(e=>setMessage(String(e)));},[]);
 async function save(){
  if(!config)return;
  setBusy(true);
  try{setConfig(await window.desktop!.saveAiConfig({...config,models:models.split('\n').map(m=>m.trim()).filter(Boolean),...(key?{apiKey:key}:{})}));setKey('');setMessage('Настройки сохранены.');}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 }
 return <details className="ai-settings"><summary>{tr("ИИ ·")} {config?.enabled?tr("включён"):tr("выключен")}</summary>
  <p>{tr('ai.setupHelp')}</p><p>{tr('ai.sentContext')}</p>
  {config&&<>
   <label><span><input type="checkbox" disabled={busy} checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> {tr('Включить ИИ')}</span></label>
   <label>{tr('Адрес API')}<input disabled={busy} aria-label={tr('AI API URL')} placeholder="https://api.example.com/v1" value={config.baseUrl} onChange={e=>setConfig({...config,baseUrl:e.target.value,hasKey:false})}/></label>
   <label>{tr('Модели по порядку, каждая с новой строки')}<textarea disabled={busy} aria-label={tr('AI models')} value={models} onChange={e=>setModels(e.target.value)}/></label>
   <label>{tr('ai.key')}<input disabled={busy} type="password" autoComplete="new-password" spellCheck={false} aria-label={tr('ai.key')} value={key} onChange={e=>setKey(e.target.value)}/></label>
   <p>{tr(config.hasKey?'ai.keyPresent':'ai.keyMissing')} {tr('ai.keyHelp')}</p>
   <button disabled={busy} onClick={()=>void save()}>{tr('Сохранить настройки ИИ')}</button>
  </>}
  {message&&<p role="status">{localizeMessage(message)}</p>}
 </details>;
}
