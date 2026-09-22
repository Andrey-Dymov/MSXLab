import {message as localizeMessage} from '../i18n';
import {t as tr} from '../i18n';
import {useState} from 'react';
import {parseLabels,mergeLabels,type LabelImport} from '../backend/labelImport';
import {useDebugger,store,updateProject,flushResearch} from '../state/debugger';
import {hex} from '../backend/disassemble';
export function LabelTransfer({close}:{close:()=>void}){
 const s=useDebugger();const [parsed,setParsed]=useState<LabelImport|null>(null),[source,setSource]=useState({name:'',text:''}),[replace,setReplace]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const preview=mergeLabels(s.project?.labels||[],parsed?.labels||[],replace);
 async function apply(){if(!s.project||!parsed)return;setBusy(true);const id=s.project.id;try{
  await window.desktop!.archiveLabels(id,source.name,source.text);
  const current=store.get().project;if(current?.id!==id)throw Error('Project changed; import was not applied');
  const next=mergeLabels(current.labels,parsed.labels,replace);updateProject({labels:next.labels});await flushResearch();setMessage(`Imported: ${next.added} added, ${next.updated} updated. Undo is available in Research History.`);setParsed(null);
 }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <div className="label-transfer"><header><strong>{tr("Import / export project labels")}</strong><button aria-label={tr("Close label transfer")} onClick={close}>×</button></header><p>{tr("JSON from MSXLab or MSXStudio; symbols as NAME: EQU $4015, NAME = 0x4015, or 4015 NAME. Symbol addresses are hexadecimal.")}</p><input aria-label={tr("Import label file")} type="file" accept=".json,.sym,.txt,.map" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>8000000)throw Error('Label file exceeds 8 MB');const text=await file.text();setParsed(parseLabels(text));setSource({name:file.name,text});setMessage('');}catch(error){setParsed(null);setMessage(error instanceof Error?error.message:String(error));}}}/><button disabled={busy||!s.project} onClick={async()=>{try{const id=s.project!.id;await flushResearch();const result=await window.desktop!.exportLabels(id);setMessage('Export saved: '+result.path);}catch(e){setMessage(e instanceof Error?e.message:String(e));}}}>{tr("Export labels")}</button>
 {parsed&&<><p>{source.name} · {parsed.format} · {parsed.labels.length}{" "}{tr("valid labels ·")}{" "}{parsed.issues.length}{" "}{tr("rejected rows")}</p>{parsed.sourceHash&&parsed.sourceHash!==(s.project?.buildSha256||s.project?.romSha256)&&<p className="project-warning">{tr("Source labels refer to a different program hash. Verify addresses against this build.")}</p>}<label><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>{tr("Update matching names, types and addresses (otherwise keep existing)")}</label><p>{preview.added}{" "}{tr("new ·")}{" "}{preview.updated}{" "}{tr("updated ·")}{" "}{preview.skipped}{" "}{tr("skipped. Other labels stay intact.")}</p><div className="label-import-preview">{parsed.labels.slice(0,12).map(l=><div key={l.id}>{hex(l.address)}–{hex(l.end)} · {l.type} · {l.name}</div>)}{parsed.issues.length>0&&<details><summary>{tr("Rejected rows")}</summary>{parsed.issues.slice(0,100).map((issue,i)=><div key={i}>{localizeMessage(issue)}</div>)}</details>}</div><button disabled={busy||!(preview.added+preview.updated)} onClick={()=>void apply()}>{tr("Import valid labels")}</button></>}
 <p role="status">{busy?tr("Saving…"):message}</p></div>;
}
