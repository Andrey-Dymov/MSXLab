// Bounded CPU-bus-cycle timeline. Events enter only after an observed CALL/interrupt.
export function createCallTimeline(limit=50000){
 let active=false,cycles=0,events=[],stack=[],pending=null,reason='',generation=0,cycleLimit=3579545*30;
 const close=(complete)=>{const id=stack.pop();if(id!==undefined){events[id].end=cycles;events[id].complete=complete;}};
 function finish(why='stopped'){active=false;while(stack.length)close(false);pending=null;reason=why;}
 function enter(pc,sp,kind,returnPC){if(events.length>=limit){finish('limit');return;}const id=events.length;events.push({id,parent:stack.at(-1)??null,address:pc,start:cycles,end:null,depth:stack.length,kind,returnPC,sp,complete:false});stack.push(id);}
 function observe(pc,sp,opcode,flags,interrupt,extended,prefixBytes=0){
  if(!active)return;
  if(!events.length)enter(pc,sp,'partial',null);
  if(pending){const p=pending;pending=null;
   if(p.kind==='call'||p.kind==='interrupt'){
    if(sp===((p.sp-2)&65535))enter(pc,sp,p.kind,p.returnPC);
    else if(p.kind==='call')finish('stack');
   }else if(p.kind==='return'){
    const top=events[stack.at(-1)];
    if(top&&top.returnPC===pc&&sp===((top.sp+2)&65535))close(true);
    else {while(stack.length)close(false);}
   }
  }
  if(!active)return;
  if(!stack.length)enter(pc,sp,'partial',null);
  if(interrupt){pending={kind:'interrupt',sp,returnPC:pc};return;}
  const conditions=[!(flags&64),!!(flags&64),!(flags&1),!!(flags&1),!(flags&4),!!(flags&4),!(flags&128),!!(flags&128)];
  if(opcode===0xcd||((opcode&0xc7)===0xc4&&conditions[(opcode>>3)&7]))pending={kind:'call',sp,returnPC:(pc+prefixBytes+3)&65535};
  else if((opcode&0xc7)===0xc7)pending={kind:'call',sp,returnPC:(pc+prefixBytes+1)&65535};
  else if(opcode===0xc9||((opcode&0xc7)===0xc0&&conditions[(opcode>>3)&7])||(opcode===0xed&&(extended&0xc7)===0x45))pending={kind:'return',sp};
  // Other instructions stay within the current frame; jumps do not create calls.
 }
 return {get active(){return active;},start(seconds=30){if(!Number.isFinite(seconds)||seconds<=0||seconds>30)throw Error('Invalid recording duration');cycleLimit=Math.round(3579545*seconds);active=true;cycles=0;events=[];stack=[];pending=null;reason='';generation++;},stop:finish,reset(){finish('reset');events=[];cycles=0;generation++;},advance(){if(active){cycles++;if(cycles>=cycleLimit)finish('duration');}},observe,snapshot(){return {active,cycles,events,reason,generation,cycleLimit,unit:'bus-cycles'};}};
}
