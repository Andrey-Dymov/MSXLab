export interface TextCandidate {address:number;end:number;text:string;length:number;ending:string}
export interface TextScanOptions {minimum:number;ending:'auto'|'00'|'24'|'ff'|'any'|'custom';customEnding?:number;charset?:string;firstCode?:number}
// Scan byte sequences, not decoded instructions. Results are candidates, not proof of use.
export function findTextStrings(bytes:readonly number[],o:TextScanOptions):TextCandidate[]{
 if(!Number.isInteger(o.minimum)||o.minimum<1)throw Error('Минимальная длина должна быть положительным целым числом');
 if(o.ending==='custom'&&(!Number.isInteger(o.customEnding)||o.customEnding!<0||o.customEnding!>255))throw Error('Окончание: один байт HEX от 00 до FF');
 const chars=o.charset?Array.from(o.charset):null,first=o.firstCode??0;
 if(chars&&(!Number.isInteger(first)||first<0||first+chars.length>256))throw Error('Таблица символов должна помещаться в диапазон байтов 00–FF');
 const ends=new Set(o.ending==='auto'?[0,36,255]:o.ending==='any'?[]:[o.ending==='custom'?o.customEnding!:parseInt(o.ending,16)]);
 const glyph=(b:number)=>ends.has(b)?'':chars?(chars[b-first]||''):(b>=32&&b<=126?String.fromCharCode(b):'');
 const results:TextCandidate[]=[];
 let start=0,text='';
 function flush(pos:number){if(pos-start>=o.minimum&&/\p{L}/u.test(text)&&(o.ending==='any'||ends.has(bytes[pos]))){results.push({address:start,end:pos-1,text,length:pos-start,ending:pos===bytes.length?'конец памяти':bytes[pos].toString(16).toUpperCase().padStart(2,'0')});}text='';}
 for(let i=0;i<bytes.length;i++){const c=glyph(bytes[i]);if(c){if(!text)start=i;text+=c;}else flush(i);}
 flush(bytes.length);return results;
}

export interface TextProfile {encoding:'ascii'|'msx-int'|'msx-jp'|'msx-ru'|'kings-valley'|'custom';format:'terminated'|'fixed'|'length8'|'length16'|'kings-valley';ending:number;minimum:number;size:number;start:number;end:number;charset:string;firstCode:number;probable:boolean;romBase:number;writer:number}
export const defaultTextProfile:TextProfile={encoding:'ascii',format:'terminated',ending:0,minimum:4,size:16,start:0,end:16777215,charset:'',firstCode:0,probable:true,romBase:0x4000,writer:0x4055};
import charsets from '../data/textCharsets.json';
export function validTextProfile(v:unknown):v is TextProfile{const p=v as TextProfile;return !!p&&['ascii','msx-int','msx-jp','msx-ru','kings-valley','custom'].includes(p.encoding)&&['terminated','fixed','length8','length16','kings-valley'].includes(p.format)&&['ending','minimum','size','start','end','firstCode','romBase','writer'].every(k=>Number.isInteger(p[k as keyof TextProfile])&&Number(p[k as keyof TextProfile])>=0)&&p.ending<=255&&p.minimum>0&&p.size>0&&p.size<=65536&&p.start<=p.end&&p.end<=16777215&&p.firstCode<=255&&p.romBase<=65535&&p.writer<=65535&&typeof p.charset==='string'&&Array.from(p.charset).length+p.firstCode<=256&&typeof p.probable==='boolean';}
export interface FoundText extends TextCandidate {referenced:boolean;score:number;record:number}
export function scanTexts(bytes:readonly number[],p:TextProfile,space='rom'):FoundText[]{
 if(!validTextProfile(p))throw Error('Проверьте диапазон, длину и параметры кодировки');
 const custom=Array.from(p.charset),stop=Math.min(bytes.length,p.end+1),out:FoundText[]=[],seen=new Set<number>();
 const glyph=(b:number):string=>p.encoding==='custom'?(custom[b-p.firstCode]||''):p.encoding==='kings-valley'?(b===0?' ':b>=0x10&&b<=0x19?String.fromCharCode(b+32):b>=0x21&&b<=0x3a?String.fromCharCode(b+32):b===0x1a?'©':''):p.encoding==='ascii'?(b>=32&&b<127?String.fromCharCode(b):''):(charsets[p.encoding][b]||'');
 const records=new Set<number>();
 // Only a direct LD DE,address followed by CALL writer is evidence for this decoder.
 if(p.format==='kings-valley')for(let i=0;i+5<bytes.length;i++)if(bytes[i]===0x11&&bytes[i+3]===0xcd&&(bytes[i+4]|bytes[i+5]<<8)===p.writer){const a=(bytes[i+1]|bytes[i+2]<<8)-(space==='rom'?p.romBase:0);if(a>=0&&a<bytes.length)records.add(a);}
 function add(a:number,b:number,ending:string,record=a,referenced=false){if(a<p.start||b>=stop||b<a||seen.has(a))return;const chars=bytes.slice(a,b+1).map(glyph);if(chars.some(c=>!c))return;const text=chars.join(''),trim=text.trim(),letters=Array.from(trim).filter(c=>/\p{L}/u.test(c)).length;const ratio=letters/Math.max(1,Array.from(trim).length);const words=trim.split(/\s+/);const score=ratio+(words.length>1?.2:0)+(referenced?1:0);if(trim.length<p.minimum||!letters)return;if(p.probable&&(ratio<.5||/(.)\1{3}/u.test(trim)||(!referenced&&words.every(w=>w.length<3))))return;seen.add(a);out.push({address:a,end:b,text,length:b-a+1,ending,record,referenced,score});}
 if(p.format==='kings-valley'){
  // Each stream starts with a VRAM destination, FE changes destination, FF ends.
  const parse=(r:number,ref:boolean)=>{let a=r;for(let segment=0;segment<32;segment++){if(a+2>=stop)return;const v=bytes[a]|bytes[a+1]<<8;if(v<0x1800||v>0x3fff)return;a+=2;const start=a;while(a<stop&&a-start<256&&bytes[a]!==254&&bytes[a]!==255)a++;if(a===stop||a-start>=256)return;add(start,a-1,bytes[a]===254?'FE · новая позиция':'FF',r,ref);if(bytes[a++]===255)return;}};
  for(const r of records)parse(r,true);
  for(let i=p.start;i+3<stop;i++)if(!records.has(i))parse(i,false);
 }else if(p.format==='fixed'){for(let a=p.start;a+p.size<=stop;a+=p.size)add(a,a+p.size-1,'фикс. длина');}
 else if(p.format==='length8'||p.format==='length16'){const header=p.format==='length8'?1:2;for(let i=p.start;i+header<stop;i++){const n=bytes[i]+(header===2?bytes[i+1]*256:0);if(n>=p.minimum&&n<=4096&&i+header+n<=stop)add(i+header,i+header+n-1,'длина '+n,i);}}
 else {let start=p.start;for(let i=p.start;i<stop;i++){if(bytes[i]===p.ending){add(start,i-1,p.ending.toString(16).toUpperCase().padStart(2,'0'));start=i+1;}else if(!glyph(bytes[i]))start=i+1;}}
 const distinct=p.format==='kings-valley'?out.filter(r=>!out.some(other=>other!==r&&other.address<r.address&&other.end>=r.end)):out;
 return distinct.sort((a,b)=>Number(b.referenced)-Number(a.referenced)||b.score-a.score||a.address-b.address);
}
