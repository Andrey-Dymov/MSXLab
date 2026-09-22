import type {DebuggerBackend,Snapshot} from './types';
export class WebMSXBackend implements DebuggerBackend {
 private listeners=new Set<(snapshot:Snapshot)=>void>();private pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();private id=0;
 constructor(private frame:HTMLIFrameElement,private ready:()=>void,private error:(s:string)=>void){window.addEventListener('message',this.receive);}
 private receive=(event:MessageEvent)=>{if(event.source!==this.frame.contentWindow||event.origin!==location.origin||event.data?.source!=='msxlab-engine')return;const data=event.data;
 if(data.type==='ready')this.ready();else if(data.type==='error')this.error(data.message);else if(data.type==='snapshot')this.listeners.forEach(fn=>fn(data.snapshot));else if(data.type==='reply'){const p=this.pending.get(data.id);if(p){clearTimeout(p.timer);this.pending.delete(data.id);if(data.error)p.reject(Error(data.error));else p.resolve(data.result);}}};
 command<T=unknown>(command:string,args?:unknown):Promise<T>{return new Promise((resolve,reject)=>{const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Engine did not respond'));},8000);this.pending.set(id,{resolve,reject,timer});this.frame.contentWindow?.postMessage({source:'msxlab-ui',id,command,args},location.origin);});}
 subscribe(fn:(s:Snapshot)=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
 dispose(){window.removeEventListener('message',this.receive);for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Session closed'));}this.pending.clear();this.listeners.clear();}
}
