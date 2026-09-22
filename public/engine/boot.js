(async()=>{
 const query=new URLSearchParams(location.search),projectId=query.get('project')||'kings-valley';
 const send=(type,data)=>parent.postMessage({source:'msxlab-engine',type,...data},location.origin);
 try {
  const project=await fetch('/projects/'+encodeURIComponent(projectId)+'/project.json').then(r=>{if(!r.ok)throw Error('Project not found');return r.json();});
  const config=await fetch('/engines/config.json').then(r=>r.json());const engine=config.engines.find(e=>e.id===(project.engine||config.active));if(!engine)throw Error('Engine is not configured');
  if(engine.adapter!=='webmsx-6.0.8')throw Error('This engine adapter has not been verified');
  if(WMSX.VERSION!=='6.0.8')throw Error('Debugger adapter is verified for WebMSX 6.0.8 only; this engine needs a compatibility check');
  if(project.launch?.dataDisk)WMSX.DISKB_URL='/projects/'+encodeURIComponent(projectId)+'/data/tables.dsk';
  WMSX.VDP_TYPE=project.launch?.vdp==='V9938'?2:-1;
  WMSX.AUTO_START=false;WMSX.MACHINE=project.machine||'MSX1E';WMSX.CARTRIDGE2_URL=project.secondaryRom?'/projects/'+encodeURIComponent(projectId)+'/'+project.secondaryRom:'';WMSX.CARTRIDGE1_URL=project.rom?'/projects/'+encodeURIComponent(projectId)+'/'+project.rom:'';if(project.disk){WMSX.DISKA_URL='/projects/'+encodeURIComponent(projectId)+'/'+project.disk;WMSX.PRESETS='DISK';}if(project.basicRun)WMSX.BASIC_RUN=project.basicRun;WMSX.SCREEN_FULLSCREEN_MODE=-2;WMSX.SCREEN_CONTROL_BAR=0;WMSX.AUTO_POWER_ON_DELAY=0;
  // Dynamic loading happens after DOM ready, so launch explicitly.
  WMSX.start();
  let tries=0;while(!WMSX.room?.machine?.powerIsOn){if(++tries>200)throw Error('Engine boot timed out');await new Promise(r=>setTimeout(r,50));}
  const rom=project.rom?Array.from(new Uint8Array(await fetch('/projects/'+encodeURIComponent(projectId)+'/'+project.rom).then(r=>r.arrayBuffer()))):[];
  const machine=WMSX.room.machine,cpu=machine.eval('cpu'),vdp=machine.eval('vdp'),bus=machine.eval('bus');
  const {createMemorySlots}=await import('./memory-slots.js');const memorySlots=createMemorySlots(bus,()=>[WMSX.CARTRIDGE1_SLOT,WMSX.CARTRIDGE2_SLOT]);
  if(project.launch?.dataDisk){
   const drive=WMSX.room.diskDrive,write=drive.writeSectorsFromSlot.bind(drive);
   drive.writeSectorsFromSlot=function(d,sector,count,slot,address){
    const result=write(d,sector,count,slot,address);
    if(result&&d===1){
     const disk=drive.getDriveStack(1)[drive.getCurrentDiskNum(1)];
     // Complete the host write before DOS receives success. This also
     // preserves write order and makes immediate project switching safe.
     try{
      for(let offset=0;offset<count;offset+=32){
       const n=Math.min(32,count-offset),body=new Uint8Array(disk.content.slice((sector+offset)*512,(sector+offset+n)*512));
       const request=new XMLHttpRequest();request.open('POST','/api/data-disk?project='+encodeURIComponent(projectId)+'&sector='+(sector+offset),false);request.setRequestHeader('X-MSXLab-Disk','1');request.send(body);
       if(request.status!==200)throw Error('Host data disk write failed');
      }
     }catch(error){console.error(error);return false;}

    }
    return result;
   };
  }
  const psg=machine.eval('psg');
  let musicActive=false,musicSamples=[],musicStartFrame=0,musicEndFrame=0,musicLastFrame=-1,musicFPS=60;
  const psgRegisters=()=>psg.eval('Array.from(register)');
  function sampleMusic(){if(!musicActive)return;const frame=video().frame;if(frame===musicLastFrame)return;musicLastFrame=frame;musicEndFrame=Math.max(0,frame-musicStartFrame);musicSamples.push({frame:musicEndFrame,registers:psgRegisters()});if(musicSamples.length>=7200)musicActive=false;}
  const pcValue=cpu.eval('(function(){return PC;})');
  const interruptPending=cpu.eval('(function(){return !!ackINT;})');
  const boundary=cpu.eval('(function(){return T===0 && (prefix===0 || prefix===7);})');
  let watchpoints=[],insideCPU=false,editingMemory=false,writeWatch=[],lastWrites=[],trackWrites=false,executingAddress=0,executingKind='instruction',executingKnown=false,profiling=false,counts={},callCounts={},callSites={},callsRecorded=false,pendingReason='pause',pendingAccess=null;
  const originalRead=bus.read,originalInput=bus.input,originalOutput=bus.output;
  const {createActivity}=await import('./activity.js');const activity=createActivity();
  const {createCallTimeline}=await import('./call-timeline.js');const callTimeline=createCallTimeline();
  let ioTrace=[];
  const matches=(space,address,access)=>watchpoints.some(w=>w.enabled!==false&&w.space===space&&w.access===access&&address>=w.address&&address<=(w.end??w.address));
  function watchStop(reason,access){if(!pendingAccess){pendingAccess={...access,pc:executingAddress,pcKnown:executingKnown,kind:executingKind};pendingReason=reason;}pendingPause=true;}
  function rememberIO(port,value,access){if(!insideCPU)return;if(trackWrites){ioTrace.push({port,value,access,pc:executingAddress,pcKnown:executingKnown});if(ioTrace.length>500)ioTrace.shift();}if(matches('io',port&255,access)){watchStop('I/O '+access+' watchpoint',{space:'io',address:port&255,port,access,value});}}
  let originTracking=false,originCounts=new Map(),originOverflow=false,originEpoch=0;
  function rememberOrigin(space,address){if(!originTracking||!insideCPU||editingMemory)return;const key=space+':'+address+':'+(executingKnown&&executingKind==='instruction'?executingAddress:'unknown');if(originCounts.has(key))originCounts.set(key,originCounts.get(key)+1);else if(originCounts.size<100000)originCounts.set(key,1);else originOverflow=true;}
  bus.setWriteMonitor((address,value)=>{rememberOrigin('cpu',address);if(!editingMemory&&insideCPU)activity.add('write',address);if(editingMemory||!insideCPU||(!trackWrites&&!writeWatch.length&&!watchpoints.length))return;const before=originalRead.call(bus,address);if(before!==value){lastWrites.push({space:'cpu',address,value,before,pc:executingAddress,pcKnown:executingKnown});if(lastWrites.length>500)lastWrites.shift();}if(writeWatch.includes(address)||matches('cpu',address,'write')){watchStop('write watchpoint',{space:'cpu',address,access:'write',before,value});}});
  bus.read=function(address){const value=originalRead.call(bus,address);if(insideCPU)activity.add('read',address);if(insideCPU&&matches('cpu',address,'read')){watchStop('read watchpoint',{space:'cpu',address,access:'read',value});}return value;};
  bus.input=function(port){if(insideCPU&&activity.enabled&&(port&255)===0x98)activity.add('vramRead',(vdp.eval('vramPointer')-1)&16383);const value=originalInput.call(bus,port);rememberIO(port,value,'read');return value;};
  bus.output=function(port,value){if(insideCPU&&activity.enabled&&(port&255)===0x98)activity.add('vramWrite',vdp.eval('vramPointer')&16383);if(!trackWrites&&!watchpoints.length&&!originTracking){originalOutput.call(bus,port,value);return;}const addr=(port&255)===0x98?vdp.eval('vramPointer')&16383:-1;const before=addr>=0?vdp.eval('vram')[addr]:0;originalOutput.call(bus,port,value);rememberIO(port,value,'write');if(insideCPU&&addr>=0){rememberOrigin('vram',addr);if(before!==value){lastWrites.push({space:'vram',address:addr,before,value,pc:executingAddress,pcKnown:executingKnown});if(lastWrites.length>500)lastWrites.shift();}if(matches('vram',addr,'write')){watchStop('VRAM write watchpoint',{space:'vram',address:addr,access:'write',before,value});}}};
  let original=cpu.busClockPulses,hold=false,mode='run',breakpoints=[],temporary=null,skipAddress=null,pendingPause=false,hit=null,seq=0,trace=[],captureTrace=false,startedAt=0,stepStarted=false;
  const regs=()=>{const r=cpu.saveState();return {...r,R:(r.R&127)|(r.R7||0)};};const video=()=>vdp.eval('({frame:frame,line:currentScanline})');
  const supported=()=>!regs().r8&&regs().tcm===1;
  const boundaryState=()=>({registers:regs(),video:video(),time:performance.now()});
  function stop(reason,address){hold=true;mode='pause';pendingPause=false;temporary=null;const access=pendingAccess;if(access?.access==='write'&&access.space!=='io')access.after=access.space==='cpu'?originalRead.call(bus,access.address):vdp.eval('vram')[access.address];hit={reason,address,video:video(),...(access?{access}: {})};pendingAccess=null;machine.userPause(true);queueMicrotask(publish);}
  function conditionMatches(condition){
   if(!condition)return true;
   const m=/^(AF|BC|DE|HL|IX|IY|SP|PC|A|B|C|F)\s*(==|!=|>=|<=|>|<)\s*(\$[0-9a-f]+|0x[0-9a-f]+|[0-9]+)$/i.exec(condition.trim());if(!m)return false;
   const r=regs(),name=m[1].toUpperCase(),left=name==='AF'?(r.A<<8)|r.F:name==='BC'?(r.B<<8)|r.C:r[name],right=m[3][0]==='$'?parseInt(m[3].slice(1),16):Number(m[3]);
   return {'==':left===right,'!=':left!==right,'>':left>right,'<':left<right,'>=':left>=right,'<=':left<=right}[m[2]];
  }
  function tick(pulses){
   if(hold)return;
   if(!supported()){stop('Unsupported CPU speed/mode',regs().PC);return;}
   if(mode==='run'&&!pendingPause&&!temporary&&!breakpoints.some(b=>b.enabled)&&!captureTrace&&!trackWrites&&!writeWatch.length&&!watchpoints.length&&!profiling&&!callTimeline.active&&!activity.enabled&&!originTracking){executingKnown=false;insideCPU=true;try{original.call(cpu,pulses);}finally{insideCPU=false;}return;}
   for(let i=0;i<pulses;i++){
    const atBoundary=boundary();const pc=pcValue();
    if(atBoundary){
     if(pendingPause){stop(pendingReason,pc);pendingReason='pause';return;}
     const skip=skipAddress===pc;
     if(!skip && (temporary?.address===pc&&(temporary.sp===undefined||temporary.sp===regs().SP)||breakpoints.some(b=>b.enabled&&b.address===pc&&memorySlots.matches(b.memoryScope,pc)&&conditionMatches(b.condition)))){stop('breakpoint',pc);return;}
     executingAddress=pc;executingKnown=true;
     const interrupt=interruptPending();executingKind=interrupt?'interrupt':'instruction';
     if(!interrupt)activity.add('execute',pc);
     if(callTimeline.active){const r=regs();let prefixBytes=0,op=bus.read(pc);while((op===0xdd||op===0xfd)&&prefixBytes<16){prefixBytes++;op=bus.read((pc+prefixBytes)&65535);}callTimeline.observe(pc,r.SP,op,r.F,interrupt,bus.read((pc+prefixBytes+1)&65535),prefixBytes);}
     if(profiling&&!interrupt){
      counts[pc]=(counts[pc]||0)+1;
      let opAddress=pc,op=bus.read(opAddress),prefixes=0;
      while((op===0xdd||op===0xfd)&&prefixes++<16){opAddress=(opAddress+1)&65535;op=bus.read(opAddress);}
      let target=null;
      if(op===0xcd||(op&0xc7)===0xc4){
       const f=regs().F,conditions=[!(f&64),!!(f&64),!(f&1),!!(f&1),!(f&4),!!(f&4),!(f&128),!!(f&128)];
       if(op===0xcd||conditions[(op>>3)&7])target=bus.read((opAddress+1)&65535)|(bus.read((opAddress+2)&65535)<<8);
      }else if((op&0xc7)===0xc7)target=op&0x38;
      if(target!==null){callCounts[target]=(callCounts[target]||0)+1;const key=pc+':'+target;callSites[key]=(callSites[key]||0)+1;}
     }
     if(captureTrace){trace.push({address:pc,kind:interrupt?'interrupt':'instruction',bytes:interrupt?[]:Array.from({length:4},(_,j)=>bus.read((pc+j)&65535)),registers:regs()});if(trace.length>500)trace.shift();}
    }
    insideCPU=true;try{original.call(cpu,1);callTimeline.advance();}finally{insideCPU=false;}skipAddress=null;stepStarted=true;
    if(boundary()&&mode==='step'&&stepStarted){stop(pendingPause?pendingReason:'step / interrupt boundary',regs().PC);pendingReason='pause';return;}
   }
   if(temporary && !pendingPause && performance.now()-startedAt>5000){pendingPause=true;pendingReason='run-to timeout';}
  }
  function install(){original=cpu.busClockPulses;cpu.busClockPulses=tick;vdp.eval('cpuBusClockPulses = cpu.busClockPulses');}
  install();
  function snapshot(){return {memorySlots:memorySlots.snapshot(),callTimeline:callTimeline.snapshot(),activity:activity.snapshot(),sound:{registers:psgRegisters(),capturing:musicActive,frames:musicEndFrame,samples:musicSamples.length,fps:musicFPS},seq:++seq,status:hold||machine.eval('userPaused')?'paused':'running',rom,registers:regs(),cpu:Array.from({length:65536},(_,i)=>bus.read(i)),vram:vdp.eval('Array.from(vram.slice(0,16384))'),vdpRegisters:vdp.eval('Array.from(register)'),video:video(),hit,trace,capabilities:{step:supported(),stepOver:supported(),breakpoints:supported()},recording:{active:recording,replaying,events:events.length,frames:Math.max(0,video().frame-startFrame)},lastWrites,ioTrace,counts,calls:{totals:callCounts,sites:callSites,recorded:callsRecorded},monitoring:{writes:trackWrites,profile:profiling,trace:captureTrace},engine:engine.name,pages:Array.from({length:4},(_,i)=>{let slot=bus.getSlotForAddress(i*16384),number=String((bus.getPrimarySlotConfig()>>(i*2))&3);if(slot.getSubSlotForAddress){number+='.'+((slot.getSecondarySlotConfig()>>(i*2))&3);slot=slot.getSubSlotForAddress(i*16384);}return {start:i*16384,end:i*16384+16383,slot:number,format:slot.format?.name||'Unknown'};})};}
  function publish(){send('snapshot',{snapshot:snapshot()});}
  function run(){skipAddress=regs().PC;hold=false;mode='run';hit=null;pendingPause=false;pendingAccess=null;pendingReason='pause';temporary=null;machine.userPause(false);}
  const keyboard=WMSX.room.keyboard,originalKey=keyboard.processMSXKey,originalVideoPulse=machine.videoClockPulse;
  let recording=false,replaying=false,events=[],recordState=null,recordKeyboard=null,startFrame=0,endFrame=0,replayIndex=0;
  keyboard.processMSXKey=function(key,pressed){if(recording){events.push({frame:video().frame-startFrame,key,pressed});if(events.length>=10000){recording=false;endFrame=Math.max(1,video().frame-startFrame);}}return originalKey.call(keyboard,key,pressed);};
  machine.videoClockPulse=function(){if(replaying){const frame=video().frame-startFrame;while(replayIndex<events.length&&events[replayIndex].frame<=frame){const e=events[replayIndex++];originalKey.call(keyboard,e.key,e.pressed);}if(frame>=endFrame){replaying=false;keyboard.releaseControllers();pendingPause=true;pendingReason='replay completed';}}const result=originalVideoPulse.call(machine);sampleMusic();return result;};
  function restoreMachine(saved){originCounts.clear();originOverflow=false;originEpoch++;callTimeline.reset();activity.reset();musicActive=false;musicSamples=[];musicEndFrame=0;musicLastFrame=-1;lastWrites=[];ioTrace=[];trace=[];counts={};callCounts={};callSites={};callsRecorded=false;executingKnown=false;cpu.busClockPulses=original;machine.loadState(saved);install();hold=!!machine.eval('userPaused');temporary=null;pendingPause=false;pendingAccess=null;pendingReason='pause';hit=null;mode=hold?'pause':'run';}
  const setRegisterValue=cpu.eval(`(function(name,value){
   switch(name){
    case 'AF':toAF(value);break;case 'BC':toBC(value);break;
    case 'A':A=value;break;case 'F':F=value;break;case 'B':B=value;break;case 'C':C=value;break;
    case 'DE':DE=value;break;case 'HL':HL=value;break;case 'IX':IX=value;break;case 'IY':IY=value;break;
    case 'SP':SP=value;break;case 'AF2':AF2=value;break;case 'BC2':BC2=value;break;case 'DE2':DE2=value;break;case 'HL2':HL2=value;break;
    case 'I':I=value;break;case 'R':R=value&127;R7=value&128;break;
    case 'PC':PC=value;prefix=0;T=0;instruction=instructionsNoPrefix[0];ackINT=INT!==255&&!!IFF1;break;
   }
  })`);
  function requireStopped(){if(!hold||!boundary())throw Error('Pause at an instruction boundary before editing');}
  function writeMemory(args){
   requireStopped();const {space,address,bytes,expected}=args||{};const limit=space==='cpu'?65536:space==='vram'?16384:0;
   if(!Number.isInteger(address)||address<0||!Array.isArray(bytes)||!bytes.length||bytes.length>256||address+bytes.length>limit||bytes.some(b=>!Number.isInteger(b)||b<0||b>255))throw Error('Invalid memory edit; CPU/VRAM only, 1–256 bytes');
   const vram=vdp.eval('vram');const read=a=>space==='vram'?vram[a]:originalRead.call(bus,a);
   if(space==='cpu')for(let i=0;i<bytes.length;i++){let slot=bus.getSlotForAddress(address+i);if(slot.getSubSlotForAddress)slot=slot.getSubSlotForAddress(address+i);if(!/^RAM/.test(slot.format?.name||''))throw Error('CPU edits are allowed only in mapped RAM; ROM and cartridge control regions are read-only');}
   const before=bytes.map((_,i)=>read(address+i));
   if(expected&&(!Array.isArray(expected)||expected.length!==bytes.length||expected.some((b,i)=>b!==before[i])))throw Error('Memory has changed since this edit was prepared');
   editingMemory=true;try{bytes.forEach((b,i)=>space==='vram'?vram[address+i]=b:bus.write(address+i,b));}finally{editingMemory=false;}
   return {space,address,before,after:bytes.map((_,i)=>read(address+i))};
  }
  window.addEventListener('message',async event=>{
   if(event.source!==parent||event.origin!==location.origin||event.data?.source!=='msxlab-ui')return;
   const {id,command,args}=event.data;
   try {
    let result=true;
    if(command==='writeMemory'){result=writeMemory(args);}
    else if(command==='setRegister'){requireStopped();const limits={AF:65535,BC:65535,DE:65535,HL:65535,IX:65535,IY:65535,SP:65535,PC:65535,AF2:65535,BC2:65535,DE2:65535,HL2:65535,A:255,F:255,B:255,C:255,I:255,R:255};if(!Object.hasOwn(limits,args?.name)||!Number.isInteger(args.value)||args.value<0||args.value>limits[args.name])throw Error('Invalid register or value');setRegisterValue(args.name,args.value);hit=null;result=regs();}
    else if(command==='run')run();
    else if(command==='pause'){if(!hold){pendingPause=true;machine.userPause(false);}}
    else if(command==='step'){if(!hold||!boundary())throw Error('Pause at an instruction boundary first');if(!supported())throw Error('Step is supported only on Z80 1×');skipAddress=regs().PC;hold=false;mode='step';hit=null;pendingAccess=null;pendingPause=false;pendingReason='pause';stepStarted=false;machine.userPause(false);}
    else if(command==='until'||command==='over'){if(!supported())throw Error('Unsupported CPU mode');const target=Number(args.address);if(!Number.isInteger(target)||target<0||target>65535)throw Error('Invalid address');run();temporary={address:target,sp:command==='over'?regs().SP:undefined};startedAt=performance.now();}
    else if(command==='breakpoints'){breakpoints=args.filter(b=>Number.isInteger(b.address)&&b.address>=0&&b.address<65536);}
    else if(command==='recordInput'){recordState=machine.saveState(true);recordKeyboard=keyboard.saveState();events=[];startFrame=video().frame;recording=true;replaying=false;run();}
    else if(command==='stopRecording'){recording=false;endFrame=Math.max(1,video().frame-startFrame);result={events:events.length,frames:endFrame};}
    else if(command==='replayInput'){if(!recordState)throw Error('Record a scenario first');recording=false;restoreMachine(recordState);keyboard.loadState(recordKeyboard);startFrame=video().frame;replayIndex=0;replaying=true;run();}
    else if(command==='importRecording'){if(args.version!==1||args.engine!==engine.id||args.project!==projectId||args.build!==(project.buildSha256||project.romSha256)||(args.launch||null)!==(project.launchHash||null)||!Array.isArray(args.events)||args.events.length>10000)throw Error('Recording is incompatible with this project/build');recordState=args.state;recordKeyboard=args.keyboard;events=args.events;endFrame=args.endFrame;recording=false;replaying=false;}
    else if(command==='exportRecording'){if(!recordState)throw Error('No recorded scenario');result={version:1,engine:engine.id,project:projectId,build:project.buildSha256||project.romSha256,launch:project.launchHash||null,state:recordState,keyboard:recordKeyboard,events,endFrame};}
    else if(command==='saveState'){result=machine.saveState(true);}
    else if(command==='loadState'){if(recording)throw Error('Stop recording before restoring a checkpoint');replaying=false;keyboard.releaseControllers();restoreMachine(args);}
    else if(command==='watchpoints'){if(!Array.isArray(args)||args.length>1000||args.some(w=>!['cpu','vram','io'].includes(w.space)||!['read','write'].includes(w.access)||w.space==='vram'&&w.access==='read'||!Number.isInteger(w.address)||w.address<0||!Number.isInteger(w.end??w.address)||(w.end??w.address)<w.address||(w.end??w.address)>=(w.space==='io'?256:w.space==='vram'?16384:65536)))throw Error('Invalid watchpoint range/access');watchpoints=args;}
    else if(command==='writeWatch'){writeWatch=args.filter(n=>Number.isInteger(n)&&n>=0&&n<65536);}
    else if(command==='activity'){activity.setEnabled(args);}
    else if(command==='resetActivity'){activity.reset(args?.space);}
    else if(command==='musicStart'){musicFPS=vdp.eval('videoStandard.targetFPS');musicStartFrame=video().frame;musicEndFrame=0;musicLastFrame=-1;musicSamples=[];musicActive=true;sampleMusic();}
    else if(command==='musicStop'){if(musicActive){sampleMusic();musicEndFrame=Math.max(musicEndFrame,video().frame-musicStartFrame);}musicActive=false;}
    else if(command==='musicRead'){result={version:1,chip:'AY-3-8910',clock:1789772.5,fps:musicFPS,frames:musicEndFrame,samples:musicSamples,project:projectId,build:project.buildSha256||project.romSha256};}
    else if(command==='trackWrites'){trackWrites=!!args;lastWrites=[];ioTrace=[];}
    else if(command==='callTimelineStart'){if(!supported())throw Error('Unsupported CPU mode');callTimeline.start(args?.seconds??30);}
    else if(command==='callTimelineStop'){callTimeline.stop();}
    else if(command==='profile'){profiling=!!args;if(profiling){counts={};callCounts={};callSites={};callsRecorded=true;}}
    else if(command==='trace'){captureTrace=!!args;trace=[];}
    else if(command==='compareSnapshot'){originTracking=args?.record!==false;result={...snapshot(),writeOrigins:{counts:Object.fromEntries(originCounts),overflow:originOverflow,epoch:originEpoch}};}
    else if(command==='readSlotMemory'){result=memorySlots.read(args);}
    else if(command==='snapshot'){result=snapshot();}
    else if(command==='inspect'){const c=document.querySelector('canvas');if(!c)throw Error('Screen is not ready');if(!hold&&!machine.eval('userPaused'))throw Error('Pause before inspection');result={png:c.toDataURL('image/png'),state:snapshot(),width:c.width,height:c.height};}
    else if(command==='capture'){const c=document.querySelector('canvas');if(!c)throw Error('Screen is not ready');result=c.toDataURL('image/png');}
    else throw Error('Unknown engine command');
    send('reply',{id,result});if(command!=='snapshot'&&command!=='capture'&&command!=='readSlotMemory')publish();
   }catch(error){send('reply',{id,error:String(error.message||error)});}
  });
  send('ready',{project:projectId});publish();setInterval(publish,300);
 }catch(error){send('error',{message:String(error.message||error)});document.body.textContent='Engine error: '+error.message;}
})();
