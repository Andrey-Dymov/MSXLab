import type {MusicCapture} from './music';
export const kingsValleyHash='29d64ae6679838a7b3200b7ae8bf1e05807eda4a9f27bbd1d535205d024abd58';
export const romSongs=[{name:'In-game',id:11,count:2},{name:'Closing door',id:13,count:2},{name:'Pyramid exit',id:15,count:2},{name:'Map fanfare',id:17,count:3},{name:'Stage clear',id:20,count:3},{name:'Start game',id:23,count:3},{name:'Game over',id:26,count:3}];
export interface RomNote {address:number;byte:number;start:number;duration:number;midi:number|null;volume:number;period:number}
export interface RomTrack {address:number;notes:RomNote[];commands:{address:number;tick:number;text:string}[];ticks:number;end:string}
export function decodeRomTrack(rom:number[],address:number,periodTable=0x7ce9,base=0x4000):RomTrack{
 const read=(a:number)=>{const x=rom[a-base];if(a<base||a>=base+rom.length||!Number.isInteger(x))throw Error('Music pointer outside ROM: '+a.toString(16));return x;};
 let pc=address,tempo=1,octave=0,volume=15,detune=false,time=0,count=0;const notes:RomNote[]=[],commands:RomTrack['commands']=[];
 for(let steps=0;steps<10000;steps++){
  const at=pc,v=read(pc++),hi=v>>4,n=v&15;
  const command=(text:string)=>commands.push({address:at,tick:time,text});
  if(v===255){command('End');return {address,notes,commands,ticks:time,end:'End'};}
  if(v===254){const repeats=read(pc++),target=read(pc++)|read(pc++)<<8;command('Loop '+(repeats===255?'∞':repeats)+' → $'+target.toString(16).toUpperCase());if(repeats===255)return {address,notes,commands,ticks:time,end:'Loop → $'+target.toString(16).toUpperCase()};if(!repeats||repeats>127)throw Error('Unsupported loop count');if(++count===repeats)count=0;else pc=target;continue;}
  if(hi===13){if(!n)throw Error('Zero tempo requires counter-wrap semantics');tempo=n;command('Tempo '+n+' ticks');continue;}
  if(hi===15){volume=n;command('Volume '+n+' · decay '+read(pc++)+', '+read(pc++));continue;}
  if(hi===14){if(n&8){detune=true;command('Detune +1');}else{octave=n;command('Octave shift '+n);}continue;}
  const duration=(n+1)*tempo,period=hi<12?(read(periodTable+hi)<<octave)+(detune?1:0):0,midi=period?Math.round(69+12*Math.log2(1789772.5/(16*period)/440)):null;
  notes.push({address:at,byte:v,start:time,duration,midi,period,volume:hi<12?volume:0});time+=duration;
 }
 throw Error('Music decode limit reached');
}
export function decodeRomSong(rom:number[],id:number,count:number){return Array.from({length:count},(_,i)=>{const offset=0x3cf5+(id+i-1)*2;return decodeRomTrack(rom,rom[offset]|rom[offset+1]<<8);});}

export function romMusicCapture(tracks:RomTrack[],fps:number,project:string,name:string):MusicCapture{return {version:1,chip:'AY-3-8910',clock:1789772.5,fps,frames:Math.max(0,...tracks.map(t=>t.ticks)),project,source:'ROM score · '+name,samples:[],scoreNotes:tracks.flatMap((track,channel)=>track.notes.map(n=>({address:n.address,channel,start:n.start,end:n.start+n.duration,midi:n.midi,volume:n.volume,frequency:n.period?1789772.5/(16*n.period):0,noise:false,envelope:false}))) };}
