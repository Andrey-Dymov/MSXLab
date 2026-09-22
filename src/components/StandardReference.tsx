import {resolveAnnotations} from '../backend/annotations';
import type {ResearchRow} from '../backend/research';
import {useDebugger} from '../state/debugger';
/** One renderer for project labels and context-resolved reference entries. */
export function StandardReference({row,rows,dos=false,file=false}:{row:ResearchRow;rows:ResearchRow[];dos?:boolean;file?:boolean}){
 const s=useDebugger();
 const entries=resolveAnnotations(row,rows,{dos,snapshot:file?undefined:s.snapshot||undefined});
 return <>{entries.map(entry=><div key={entry.id} className="assembly-annotation" title={[entry.detail,entry.description,'Источник: '+entry.source].filter(Boolean).join('\n')}>
 {entry.name&&<><strong>{entry.name}</strong>{entry.description?' — ':''}</>}{entry.description}
 </div>)}</>;
}
