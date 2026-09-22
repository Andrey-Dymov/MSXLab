import {store,command,updateProject,flushResearch} from '../state/debugger';
import type {Snapshot,Label} from './types';
type Call=(name:string,args?:any)=>Promise<any>;
const modes:Record<string,string>={apiCapabilities:'read',restartProject:'execution',markInitialState:'save',restoreInitialState:'execution',listPanels:'read',readPanel:'read',captureImage:'read',readSlots:'read',readSlotMemory:'read',rememberState:'read',compareState:'read',runFor:'execution',runUntil:'execution',upsertLabels:'research',undoResearch:'research'};
export const automationCommands=Object.keys(modes);
const baselines=new Map<string,{project:string;session:number;snapshot:Snapshot}>();
let undo:{project:string;session:number;before:Label[];after:string}|null=null;
function integer(value:unknown,min:number,max:number,name:string):number{if(!Number.isInteger(value)||Number(value)<min||Number(value)>max)throw Error('Invalid '+name);return Number(value);}
function named(value:unknown):string{if(typeof value!=='string'||!/^[-\w]{1,64}$/.test(value))throw Error('Expected name: 1–64 letters, digits, _ or -');return value;}
function panel(id:string){const el=Array.from(document.querySelectorAll<HTMLElement>('[data-automation-panel]')).find(e=>e.dataset.automationPanel===id);if(!el)throw Error('Panel is not mounted');return el;}
function visible(el:HTMLElement){const r=el.getBoundingClientRect();return !!el.getClientRects().length&&r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';}
export async function automation(name:string,args:any,call:Call):Promise<unknown>{
 const initial=store.get(),project=initial.project?.id,session=initial.session;
 const check=()=>{if(store.get().project?.id!==project||store.get().session!==session)throw Error('Project or session changed');};
 const fresh=async()=>{const value=await command<Snapshot>('snapshot');if(!value)throw Error(store.get().error||'Snapshot unavailable');check();return value;};
 const reply=(data:unknown)=>({project,session,observedAt:new Date().toISOString(),effect:modes[name],data});
 if(name==='apiCapabilities')return {version:2,commands:modes,existing:['loadProject','configureLaunch','launchProfile','reset','saveCheckpoint','restoreCheckpoint','readMemory','readDisassembly','readLabels','readReferences','until','setBreakpoints','setWatchpoints'],limitations:['Panel rows are rendered rows, not a separate full data model','runFor uses wall time; stopping can be delayed by emulator workload','Slot and image appearance events are not yet supported','State comparison covers CPU view, VRAM, registers and mappings; not disconnected RAM banks']};
 if(name==='listPanels')return reply(Array.from(document.querySelectorAll<HTMLElement>('[data-automation-panel]')).map(el=>({id:el.dataset.automationPanel,title:el.getAttribute('aria-label'),visible:visible(el),focused:el.contains(document.activeElement),preferences:JSON.parse(el.dataset.automationPreferences||'{}')})));
 if(name==='readPanel'){
  const el=panel(args.id),limit=integer(args.limit??100,1,500,'limit');
  return reply({id:args.id,visible:visible(el),preferences:JSON.parse(el.dataset.automationPreferences||'{}'),text:el.innerText.slice(0,50000),rows:Array.from(el.querySelectorAll('tr')).slice(0,limit).map(row=>Array.from(row.querySelectorAll('th,td')).map(c=>c.textContent)),controls:Array.from(el.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select')).map(e=>({name:e.getAttribute('aria-label'),value:e.type==='password'?undefined:e.value,checked:e instanceof HTMLInputElement&&e.type==='checkbox'?e.checked:undefined})),images:Array.from(el.querySelectorAll('canvas,img')).map((e,i)=>({index:i,label:e.getAttribute('aria-label')||e.getAttribute('alt'),kind:e.tagName}))});
 }
 if(name==='captureImage'){
  if(!args.panelId){const png=await command<string>('capture');check();if(!png)throw Error('Screen unavailable');return reply({mimeType:'image/png',png});}
  const el=panel(args.panelId),images=el.querySelectorAll<HTMLCanvasElement|HTMLImageElement>('canvas,img'),index=integer(args.index??0,0,1000,'image index'),source=images[index];if(!source)throw Error('Panel image not found; use readPanel');
  const width=source instanceof HTMLCanvasElement?source.width:source.naturalWidth,height=source instanceof HTMLCanvasElement?source.height:source.naturalHeight;if(!width||!height)throw Error('Image not ready');
  const x=integer(args.x??0,0,width-1,'x'),y=integer(args.y??0,0,height-1,'y'),w=integer(args.width??width-x,1,width-x,'width'),h=integer(args.height??height-y,1,height-y,'height');if(w*h>16777216)throw Error('Image too large');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d')!.drawImage(source,x,y,w,h,0,0,w,h);return reply({mimeType:'image/png',width:w,height:h,png:canvas.toDataURL('image/png')});
 }
 if(!project)throw Error('No project');
 if(name==='restartProject')return call('loadProject',{id:project});
 if(name==='markInitialState')return call('saveCheckpoint',{name:'api-initial',replace:args.replace===true});
 if(name==='restoreInitialState')return call('restoreCheckpoint',{name:'api-initial'});
 if(name==='readSlots'){const snap=await fresh();return reply({sequence:snap.seq,slots:snap.memorySlots});}
 if(name==='readSlotMemory'){const data=await command('readSlotMemory',args);check();if(!data)throw Error(store.get().error||'Slot unavailable');return reply(data);}
 if(name==='rememberState'){const key=named(args.name),snapshot=await fresh();if(baselines.size>=8&&!baselines.has(key))throw Error('At most 8 comparison states; reuse a name');baselines.set(key,{project,session,snapshot});return reply({name:key,sequence:snapshot.seq});}
 if(name==='compareState'){
  const baseline=baselines.get(named(args.name));if(!baseline||baseline.project!==project||baseline.session!==session)throw Error('No baseline for this session');const now=await fresh(),limit=integer(args.limit??1000,1,10000,'limit');let total=0;const changes:unknown[]=[];
  for(const space of ['cpu','vram'] as const){const before=baseline.snapshot[space],after=now[space];for(let address=0;address<Math.max(before.length,after.length);address++)if(before[address]!==after[address]){total++;if(changes.length<limit)changes.push({space,address,before:before[address],after:after[address]});}}
  return reply({fromSequence:baseline.snapshot.seq,toSequence:now.seq,total,truncated:total>limit,changes,registers:Object.fromEntries(Object.keys(now.registers).filter(k=>now.registers[k]!==baseline.snapshot.registers[k]).map(k=>[k,{before:baseline.snapshot.registers[k],after:now.registers[k]}])),slots:{before:baseline.snapshot.memorySlots,after:now.memorySlots}});
 }
 if(name==='runUntil'){
  if(args.event==='address'){integer(args.address,0,65535,'address');return reply(await call('until',{address:args.address}));}
  if(args.event==='time')return automation('runFor',{milliseconds:args.milliseconds},call);
  if(args.event!=='write')throw Error('Supported events: address, write, time');
  const space=args.space??'cpu';if(!['cpu','vram'].includes(space))throw Error('Write event requires cpu or vram');const snapshot=await fresh();if(snapshot.status!=='paused')throw Error('Pause before installing a temporary write event');
  const address=integer(args.address,0,snapshot[space as 'cpu'|'vram'].length-1,'address'),timeout=integer(args.timeoutMs??3000,1,5000,'timeoutMs');
  const points=[...(initial.project!.watchpoints||[]),{space,address,end:address,access:'write',enabled:true}];const installed=await command('watchpoints',points);if(installed===undefined)throw Error(store.get().error||'Cannot install write event');
  try{await call('run');const deadline=performance.now()+timeout;while(performance.now()<deadline){check();const now=await fresh();if(now.status==='paused')return reply({reason:now.hit,registers:now.registers});await new Promise(r=>setTimeout(r,20));}check();return reply({reason:'timeout',stopped:await call('pause')});}
  finally{if(store.get().session===session&&store.get().project?.id===project)await command('watchpoints',store.get().project!.watchpoints||[]);}
 }
 if(name==='runFor'){
  const ms=integer(args.milliseconds,1,5000,'milliseconds'),start=performance.now();await call('run');await new Promise(r=>setTimeout(r,ms));check();const stopped=await call('pause');return reply({requestedMs:ms,elapsedMs:performance.now()-start,reason:stopped.hit||'time limit',stopped});
 }
 if(name==='upsertLabels'){
  if(!Array.isArray(args.labels)||!args.labels.length||args.labels.length>500)throw Error('Expected 1–500 labels');const before=structuredClone(initial.project!.labels),next=structuredClone(before),ids=new Set<string>();
  for(const raw of args.labels){if(!raw||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>200||typeof raw.comment!=='string'||raw.comment.length>20000||!['cpu','vram','rom'].includes(raw.space)||!['PROC','DATA','COMMENT','AREA','LABEL','DATA DB','DATA DW'].includes(raw.type))throw Error('Invalid label');const id=raw.id??crypto.randomUUID();if(typeof id!=='string'||id.length>100||ids.has(id))throw Error('Invalid or duplicate label id');ids.add(id);const max=raw.space==='cpu'?65535:raw.space==='vram'?(initial.snapshot?.vram.length??16384)-1:(initial.snapshot?.rom.length??0)-1;integer(raw.address,0,max,'address');integer(raw.end,raw.address,max,'end');
   if(raw.memoryScope){integer(raw.memoryScope.primary,0,3,'slot');if(raw.memoryScope.secondary!==null)integer(raw.memoryScope.secondary,0,3,'subslot');if(raw.memoryScope.bank!==undefined)integer(raw.memoryScope.bank,0,255,'bank');if(raw.space!=='cpu')throw Error('Slot scope requires CPU addresses');}
   const label:Label={id,name:raw.name.trim(),comment:raw.comment,space:raw.space,type:raw.type,address:raw.address,end:raw.end,...(raw.memoryScope?{memoryScope:raw.memoryScope}:{})};const i=next.findIndex(l=>l.id===id);if(i<0)next.push(label);else next[i]={...next[i],...label};
  }check();updateProject({labels:next});await flushResearch();undo={project,session,before,after:JSON.stringify(next)};return reply({saved:true,ids:[...ids]});
 }
 if(name==='undoResearch'){if(!undo||undo.project!==project||undo.session!==session)throw Error('No research undo for this session');if(JSON.stringify(store.get().project!.labels)!==undo.after)throw Error('Labels changed since API edit; undo refused');updateProject({labels:undo.before});await flushResearch();undo=null;return reply({restored:true});}
 throw Error('Unsupported automation command');
}
