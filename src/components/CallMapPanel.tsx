import {t as tr} from '../i18n';
import {useMemo} from 'react';
import {useDebugger,select} from '../state/debugger';
import {callGraph} from '../backend/callGraph';
import {CallMap} from './CallMap';
export function CallMapPanel(){
 const s=useDebugger(),labels=s.project?.labels;
 const memory=s.snapshot?.cpu;
 const signature=useMemo(()=>labels?.filter(l=>l.space==='cpu'&&l.type==='PROC').map(l=>memory?.slice(l.address,l.end+1).join(',')).join(';')||'',[memory,labels]);
 const graph=useMemo(()=>callGraph(memory||[],labels||[]),[signature,labels,s.session]);
 if(!memory||!labels)return <p className="panel-message">{tr("Загрузите проект для просмотра дерева вызовов.")}</p>;
 return <CallMap embedded labels={labels} graph={graph} onGo={l=>{select(l.address);window.dispatchEvent(new CustomEvent('msxlab:assembly-entry',{detail:{address:l.address}}));}}/>;
}
