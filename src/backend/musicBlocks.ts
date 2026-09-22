import type {Label,Snapshot,MusicBlock} from './types';
import {decodeRomTrack,romMusicCapture} from './romMusic';
export const musicFormats=[{id:'kings-valley',name:'King’s Valley · note stream'}];
export function decodeMusicBlock(label:Label,snapshot:Snapshot,project:string){
 const c=label.music;if(!validMusicBlock(c))throw Error('Music block has invalid format settings');
 if(!musicFormats.some(f=>f.id===c.format))throw Error('Unsupported music format: '+c.format);
 if(label.space==='vram')throw Error('This decoder supports CPU and ROM sources');
 if(![50,60].includes(c.tickRate)||!Number.isInteger(c.periodTable)||c.periodTable<0||c.periodTable>65524||!Number.isInteger(c.romBase)||c.romBase<0||c.romBase>65535)throw Error('Invalid music settings');
 const memory=label.space==='rom'?snapshot.rom:snapshot.cpu,base=label.space==='rom'?c.romBase:0;
 const byte=(a:number)=>{if(!Number.isInteger(a)||a<base||a>=base+memory.length)throw Error('Music address outside source');return memory[a-base];};
 const count=c.channels.length;if(count<1||count>3)throw Error('Choose 1–3 channels');
 const addresses=c.layout==='table'?c.channels.map((_,i)=>{const offset=label.address+i*2;if(offset+1>label.end)throw Error('Pointer table exceeds block range');const a=offset+base;return byte(a)|byte(a+1)<<8;}):c.channels;
 if(addresses.some(a=>!Number.isInteger(a)||a<0||a>65535))throw Error('Invalid channel address');
 return romMusicCapture(addresses.map(a=>decodeRomTrack(memory,a,c.periodTable,base)),c.tickRate,project,label.name);
}

export function validMusicBlock(value:unknown):value is MusicBlock{const c=value as MusicBlock;return !!c&&typeof c.format==='string'&&c.format.length>0&&['streams','table'].includes(c.layout)&&Array.isArray(c.channels)&&c.channels.length>0&&c.channels.length<=3&&c.channels.every(a=>Number.isInteger(a)&&a>=0&&a<=65535)&&[50,60].includes(c.tickRate)&&Number.isInteger(c.periodTable)&&c.periodTable>=0&&c.periodTable<=65524&&Number.isInteger(c.romBase)&&c.romBase>=0&&c.romBase<=65535;}
