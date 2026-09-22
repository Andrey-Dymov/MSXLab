import {musicNotes,type MusicCapture} from './music';
const be=(n:number,size:number)=>Array.from({length:size},(_,i)=>(n>>>((size-i-1)*8))&255);
const vlq=(n:number)=>{const bytes=[n&127];while((n=Math.floor(n/128))>0)bytes.unshift((n&127)|128);return bytes;};
const chunk=(name:string,bytes:number[])=>[...Array.from(name,c=>c.charCodeAt(0)),...be(bytes.length,4),...bytes];
// SMF format 1: conductor plus three PSG voices. Fixed 120 BPM preserves captured seconds.
export function musicMidi(c:MusicCapture,channels:boolean[]=[true,true,true]):Uint8Array{
 const ticks=(frame:number)=>Math.round(frame/c.fps*960),end=ticks(c.frames),notes=musicNotes(c);
 const tracks=[chunk('MTrk',[0,255,81,3,7,161,32,...vlq(end),255,47,0])];
 for(let ch=0;ch<3;ch++){
  if(!channels[ch])continue;
  const events:{tick:number;bytes:number[];order:number}[]=[];
  let active:{pitch:number;end:number}|undefined;
  function finish(){if(active)events.push({tick:active.end,bytes:[0x80+ch,active.pitch,0],order:0});active=undefined;}
  for(const n of notes.filter(n=>n.channel===ch)){
   const start=ticks(n.start),stop=ticks(n.end);if(stop<=start)continue;
   if(n.midi===null||n.midi<0||n.midi>127){finish();continue;}
   if(c.scoreNotes||!active||active.pitch!==n.midi||active.end!==start){finish();events.push({tick:start,bytes:[0x90+ch,n.midi,127],order:2});active={pitch:n.midi,end:stop};}else active.end=stop;
   events.push({tick:start,bytes:[0xb0+ch,11,Math.max(1,Math.round((n.envelope?8:n.volume)/15*127))],order:1});
  }
  finish();
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  const name=Array.from('PSG '+ 'ABC'[ch],c=>c.charCodeAt(0)),data=[0,255,3,name.length,...name,0,0xb0+ch,0,0,0,0xb0+ch,32,0,0,0xc0+ch,80,0,0xb0+ch,7,100,0,0xb0+ch,11,127,0,0xb0+ch,10,64];let previous=0;
  for(const e of events){data.push(...vlq(e.tick-previous),...e.bytes);previous=e.tick;}
  data.push(...vlq(Math.max(0,end-previous)),255,47,0);tracks.push(chunk('MTrk',data));
 }
 return new Uint8Array([...chunk('MThd',[0,1,...be(tracks.length,2),1,224]),...tracks.flat()]);
}
