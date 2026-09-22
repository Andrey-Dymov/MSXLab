import {automation,automationCommands} from './automation';
import {searchMemory as scanMemory} from './memorySearch';
import {validateCheckpoint,type Checkpoint} from './checkpoints';
import {researchIndex,researchListing,directReferences} from './research';
import {validateBreakpoints,validateWatchpoints} from './validation';
import {decode,disassemble} from './disassemble';
import {store,command,loadProject,reset,updateProject,flushResearch} from '../state/debugger';
async function checked<T=unknown>(name:string,args?:unknown){const result=await command<T>(name,args);if(result===undefined)throw Error(store.get().error||'Command failed');return result;}
export async function remote(commandName:string,args:any={}){
 if(automationCommands.includes(commandName))return automation(commandName,args,remote);
 const s=store.get();
 if(['listCheckpoints','saveCheckpoint','restoreCheckpoint'].includes(commandName)){
  if(!s.project||!s.snapshot)throw Error('Project is not ready');const p=s.project;
  const files=(await window.desktop!.listSessions(p.id)).filter(n=>n==='checkpoint'||n.startsWith('checkpoint-'));
  if(commandName==='listCheckpoints')return {project:p.id,checkpoints:files.map(file=>({name:file==='checkpoint'?'@legacy':file.slice(11),file}))};
  const name=args.name;if(typeof name!=='string'||!(/^[A-Za-z0-9_-]{1,64}$/.test(name)||commandName==='restoreCheckpoint'&&name==='@legacy'))throw Error('Checkpoint name: 1–64 letters, digits, hyphens or underscores');
  const file=name==='@legacy'?'checkpoint':'checkpoint-'+name;
  const current=()=>{if(store.get().project?.id!==p.id||store.get().session!==s.session)throw Error('Project or launch session changed');};current();
  if(commandName==='saveCheckpoint'){
   if(args.replace!==undefined&&typeof args.replace!=='boolean')throw Error('replace must be boolean');if(files.includes(file)&&!args.replace)throw Error('Checkpoint already exists; use replace: true');
   const state=await checked('saveState');current();await window.desktop!.saveSession(p.id,file,{version:1,project:p.id,engine:p.engine,build:p.buildSha256||p.romSha256,launch:p.launchHash||null,createdAt:new Date().toISOString(),state});current();return {project:p.id,name,saved:true};
  }
  const data=await window.desktop!.loadSession(p.id,file) as Checkpoint;validateCheckpoint(data,p);current();await checked('loadState',data.state);return {project:p.id,name,restored:true};
 }
 if(commandName==='status')return {project:s.project?.id,status:s.snapshot?.status||(s.error?'error':'loading'),engine:s.snapshot?.engine,error:s.error,hit:s.snapshot?.hit||null};
 if(commandName==='searchMemory'){
  if(!s.project)throw Error('No project');const space=args.space??'cpu',mode=args.mode??'number',format=args.format??'u8',offset=args.offset??0,limit=args.limit??100;
  if(!['cpu','vram','rom'].includes(space)||typeof args.query!=='string'||!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>500||args.aligned!==undefined&&typeof args.aligned!=='boolean')throw Error('Invalid search arguments');
  const snapshot=await checked<any>('snapshot');if(store.get().session!==s.session)throw Error('Project or launch session changed');const bytes=snapshot[space];const found=scanMemory(bytes,{start:args.start??0,end:args.end??bytes.length-1,mode,format,query:args.query,aligned:args.aligned});
  return {project:s.project.id,space,snapshotSequence:snapshot.seq,total:found.total,retained:found.matches.length,offset,matches:found.matches.slice(offset,offset+limit).map(r=>({...r,labels:s.project!.labels.filter(l=>l.space===space&&l.address===r.address).map(l=>l.name)}))};
 }
 if(['readLabels','readDisassembly','readReferences'].includes(commandName)){
  if(!s.project)throw Error('No project');
  const offset=args.offset??0,limit=args.limit??100;
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>500)throw Error('Invalid page (limit 1–500)');
  if(args.address!==undefined&&(!Number.isInteger(args.address)||args.address<0||args.address>16777215))throw Error('Invalid address');
  if(args.space!==undefined&&!['cpu','vram','rom'].includes(args.space))throw Error('Unknown memory space');
  if(args.query!==undefined&&typeof args.query!=='string'||args.type!==undefined&&typeof args.type!=='string')throw Error('Query and type must be strings');
  if(commandName==='readLabels'){
   const query=(args.query||'').toLowerCase();const labels=s.project.labels.filter(l=>(!args.space||l.space===args.space)&&(!args.type||l.type===args.type.toUpperCase())&&(args.address===undefined||l.address<=args.address&&l.end>=args.address)&&(!query||(l.name+' '+l.comment).toLowerCase().includes(query)));
   return {project:s.project.id,total:labels.length,offset,labels:labels.slice(offset,offset+limit).map(l=>({...l,length:l.end-l.address+1}))};
  }
  if(args.space!==undefined&&args.space!=='cpu')throw Error('Code analysis uses CPU memory');if(args.address!==undefined&&args.address>65535)throw Error('Invalid CPU address');
  const snapshot=await checked<any>('snapshot');if(store.get().project?.id!==s.project.id)throw Error('Project changed during analysis');
  const index=researchIndex(s.project.labels);
  if(commandName==='readReferences'){
   const block=args.address===undefined?undefined:index.procedureAt(args.address);const start=block?.address??args.address,end=block?.end??args.address;
   const direction=args.direction??'all';if(!['all','incoming','outgoing'].includes(direction))throw Error('Invalid reference direction');if(direction!=='all'&&args.address===undefined)throw Error('address required for scoped references');
   const rows=directReferences(snapshot.cpu,index).filter(r=>direction==='all'||(direction==='incoming'?r.target!>=start&&r.target!<=end:r.address>=start&&r.address<=end));
   return {project:s.project.id,total:rows.length,offset,block,references:rows.slice(offset,offset+limit),snapshotSequence:snapshot.seq};
  }
  const address=args.address??snapshot.registers.PC,mode=args.mode??'annotated';if(address>65535||!['annotated','raw','procedure'].includes(mode))throw Error('Invalid CPU address or listing mode');
  const procedure=index.procedureAt(address);if(mode==='procedure'&&!procedure)throw Error('No marked procedure at address');
  const start=mode==='procedure'?procedure!.address:address;
  const rows=mode==='raw'?disassemble(snapshot.cpu,start,limit):researchListing(snapshot.cpu,start,index,limit,mode==='procedure'?procedure!.end:65535);
  return {project:s.project.id,address:start,mode,procedure,rows,snapshotSequence:snapshot.seq,pages:snapshot.pages};
 }
 if(commandName==='setBreakpoints'){
  if(!s.project)throw Error('No project');const points=validateBreakpoints(args.points);updateProject({breakpoints:points});await flushResearch();return points;
 }
 if(commandName==='setWatchpoints'){
  if(!s.project)throw Error('No project');const points=validateWatchpoints(args.points);updateProject({watchpoints:points});await flushResearch();return points;
 }
 if(commandName==='stepOver'){
  const snapshot=await checked<any>('snapshot');if(snapshot.status!=='paused')throw Error('Pause before stepping');
  const instruction=decode(snapshot.cpu,snapshot.registers.PC);await checked(instruction.call?'over':'step',instruction.call?{address:(instruction.address+instruction.size)&65535}:undefined);return stopped();
 }
 if(commandName==='readTrace')return (await checked<any>('snapshot')).trace;
 if(commandName==='trace'){if(typeof args.enabled!=='boolean')throw Error('enabled must be boolean');store.set({traceOn:args.enabled});return checked('trace',args.enabled);}
 if(commandName==='loadProject'){await loadProject(args.id);await ready();return {project:store.get().project?.id};}
 if(commandName==='reset'){reset();await ready();return true;}
 if(commandName==='registers')return (await checked<any>('snapshot')).registers;
 if(commandName==='readMemory'){
  const space=args.space??'cpu';if(!['cpu','vram','rom'].includes(space))throw Error('Unknown memory space');
  const start=args.address,length=args.length??64,snapshot=await checked<any>('snapshot'),limit=snapshot[space].length;
  if(!Number.isInteger(start)||!Number.isInteger(length)||start<0||length<1||length>4096||start+length>limit)throw Error('Invalid memory range (max 4096 bytes)');
  return {space,address:start,bytes:snapshot[space].slice(start,start+length)};
 }
 if(commandName==='capture'){const png=await checked<string>('capture');if(!s.project)throw Error('No screen');return window.desktop!.capture(s.project.id,png);}
 if(['pause','step','until'].includes(commandName)){await checked(commandName,args);return stopped();}
 if(['run','writeMemory','setRegister'].includes(commandName))return checked(commandName,args);
 throw Error('Unsupported command');
}
async function ready(){for(let i=0;i<100;i++){if(store.get().snapshot&&!store.get().loading)return;if(store.get().error)throw Error(store.get().error);await new Promise(r=>setTimeout(r,100));}throw Error('Engine startup timed out');}

async function stopped(){const deadline=Date.now()+7000;while(Date.now()<deadline){const snapshot=await checked<any>('snapshot');if(snapshot.status==='paused')return {status:'paused',registers:snapshot.registers,hit:snapshot.hit};await new Promise(r=>setTimeout(r,15));}throw Error('CPU did not reach a stopped state');}
