import {store,updateProject} from '../state/debugger';
import {validateWatchpoints} from './validation';
import type {Space} from './types';
export function watchAddress(address:number,space:Space='cpu',end=address){
 const s=store.get();if(!s.project)return;if(space==='rom'){store.set({error:'Watchpoints use CPU or VRAM addresses, not offsets in a ROM file'});return;}
 const points=s.project.watchpoints||[],same=points.findIndex(p=>p.space===space&&p.address===address&&(p.end??p.address)===end&&p.access==='write');
 try{updateProject({watchpoints:validateWatchpoints(same<0?[...points,{space,address,end,access:'write',enabled:true}]:points.map((p,i)=>i===same?{...p,enabled:true}:p))});}catch(e){store.set({error:e instanceof Error?e.message:String(e)});return;}
 store.set({notice:'Write watchpoint: '+space.toUpperCase()+' $'+address.toString(16).toUpperCase(),error:''});
}
export function pinWatch(address:number){const s=store.get();if(!Number.isInteger(address)||address<0||address>65535){store.set({error:'Invalid CPU address'});return;}if(s.project)updateProject({watches:[...new Set([...s.project.watches,address])]});}
