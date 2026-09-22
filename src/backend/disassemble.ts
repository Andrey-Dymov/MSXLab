import tables from './opcodes.json';
export const hex=(n:number,width=4)=>Math.trunc(n).toString(16).toUpperCase().padStart(width,'0');
export const parseAddress=(s:string)=>{const t=s.trim().replace(/^\$/,'').replace(/^0x/i,'');return /^[0-9a-f]{1,4}$/i.test(t)?parseInt(t,16):null;};
interface Op {o:number[];p:string;z:number;m:string}
const maps=Object.fromEntries(Object.entries(tables).map(([key,ops])=>[key,new Map((ops as Op[]).map(op=>[op.o[op.o.length-1],op]))]));
export interface Instruction {address:number;size:number;bytes:number[];text:string;call:boolean;target?:number}
export function decode(memory:number[],address:number):Instruction {
 const read=(i:number)=>memory[(address+i)&65535]??0;let offset=0,key='main',op:Op|undefined;
 // Repeated DD/FD prefixes: the last prefix wins. Bound malformed streams.
 let index=0;while(offset<16&&(read(offset)===0xdd||read(offset)===0xfd)){index=read(offset++);}
 if(offset>=16)return {address,size:1,bytes:[read(0)],text:'DB $'+hex(read(0),2),call:false};
 const lead=read(offset);let codeLength=1,extra=offset;
 if(index&&lead===0xcb){key='DDCB';op=maps[key].get(read(offset+2));codeLength=2;extra=offset-1;}
 else if(lead===0xcb||lead===0xed){key=lead===0xcb?'CB':'ED';op=maps[key].get(read(offset+1));codeLength=2;}
 else if(index){key=index===0xdd?'DD':'FD';op=maps[key].get(lead);if(op){codeLength=2;extra=offset-1;}else{key='main';op=maps.main.get(lead);}}
 else op=maps.main.get(lead);
 if(!op)return {address,size:offset+codeLength,bytes:Array.from({length:offset+codeLength},(_,i)=>read(i)),text:'DB '+Array.from({length:offset+codeLength},(_,i)=>'$'+hex(read(i),2)).join(','),call:false};
 const size=op.z+extra;const operandStart=key==='DDCB'?offset+1:extra+codeLength;
 let text=op.p.replace(/\$(\d)/g,(_,n:string)=>hex(read(operandStart+Number(n)-1),2));
 if(key==='DDCB'&&index===0xfd)text=text.replaceAll('IX','IY');
 // Indexed displacement is signed, unlike ordinary immediate bytes.
 text=text.replace(/\((IX|IY)\+([0-9A-F]{2})\)/g,(_,register:string,value:string)=>{const d=parseInt(value,16);return '('+register+(d>127?'-'+hex(256-d,2):'+'+hex(d,2))+')';});
 let target:number|undefined;
 if(/^(JR|DJNZ)\b/.test(text)){const b=read(size-1);target=(address+size+(b>127?b-256:b))&65535;text=text.replace(/[0-9A-F]{2}$/, '$'+hex(target));}
 else if(/^RST\b/.test(text)){target=parseInt(text.slice(4),16);}
 else if(/^(JP|CALL)\b/.test(text)&&!text.includes('(')){target=read(size-2)|(read(size-1)<<8);}
 return {address,size,bytes:Array.from({length:size},(_,i)=>read(i)),text,call:/^CALL\b|^RST\b/.test(text),target};
}
export function disassemble(memory:number[],start:number,count=60){const rows:Instruction[]=[];let address=start;for(let i=0;i<count;i++){const row=decode(memory,address);rows.push(row);address=(address+row.size)&65535;}return rows;}

export function instructionReference(instruction:Instruction,registers:{[key:string]:unknown}={}){
 if(instruction.target!==undefined)return {address:instruction.target,kind:'branch' as const};
 const text=instruction.text;if(/^(IN|OUT)\b/.test(text))return null;
 const absolute=/\(\$?([0-9A-F]{4})\)/.exec(text);
 if(absolute)return {address:parseInt(absolute[1],16),kind:'memory' as const};
 const indirect=/\((HL|DE|BC|IX|IY)(?:([+-])([0-9A-F]{2}))?\)/.exec(text);
 if(!indirect)return null;
 const value=indirect[1]==='BC'?Number(registers.B)*256+Number(registers.C):Number(registers[indirect[1]]);
 if(!Number.isFinite(value))return null;
 return {address:(value+(indirect[3]?parseInt(indirect[3],16)*(indirect[2]==='-'?-1:1):0))&65535,kind:/^JP\b/.test(text)?'branch' as const:'memory' as const};
}
