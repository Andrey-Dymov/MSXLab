import {t as tr} from '../i18n';
import {ArrowUp,ArrowDown} from 'lucide-react';
export function BlockNavigation({address,size,length,onGo,label='блок'}:{address:number;size:number;length:number;onGo:(address:number)=>void;label?:string}){
 const step=Math.max(1,Math.floor(size));
 return <><button type="button" aria-label={tr("Предыдущий {p0}",{p0:(tr(label))})} title={tr("Назад на {p0} байт (${p1})",{p0:(step),p1:(step.toString(16).toUpperCase())})} disabled={!length||address<step} onClick={()=>onGo(address-step)}><ArrowUp size={16}/></button><button type="button" aria-label={tr("Следующий {p0}",{p0:(tr(label))})} title={tr("Вперёд на {p0} байт (${p1})",{p0:(step),p1:(step.toString(16).toUpperCase())})} disabled={!length||address+step>=length} onClick={()=>onGo(address+step)}><ArrowDown size={16}/></button></>;
}
