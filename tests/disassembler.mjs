import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createServer} from 'vite';
// Oracle is the CPU instruction definitions from the unchanged shipped engine,
// independently authored from the imported MSXStudio disassembler tables.
const source=await fs.readFile('engines/webmsx-6.0.8/wmsx.js','utf8');
const start=source.indexOf('wmsx.CPU=function'),end=source.indexOf('wmsx.CPU.BASE_CLOCK=',start);
assert(start>=0&&end>start);
const context=vm.createContext({wmsx:{Util:{toHex2:n=>n.toString(16)},Machine:{MACHINE_TYPE:{MSXTR:4}}},WMSX:{R800_TIMING:0}});
vm.runInContext(source.slice(start,end).replace(/,\s*$/,';'),context);
const cpu=new context.wmsx.CPU(),oracle=cpu.eval('instructionsByPrefixZ80');
const server=await createServer({server:{middlewareMode:true}});
let checked=0;
try{
 const {decode}=await server.ssrLoadModule('/src/backend/disassemble.ts');
 const memory=Array(65536).fill(0),base=0x8000;
 const families=[[],[0xed],[0xcb],[0xdd],[0xfd],[0xdd,0xcb],[0xfd,0xcb]];
 for(let family=0;family<families.length;family++)for(let opcode=0;opcode<256;opcode++){
  if([0,3,4].includes(family)&&[0xcb,0xdd,0xed,0xfd].includes(opcode))continue;
  const ref=oracle[family][opcode]||oracle[0][opcode],mnemonic=ref.mnemonic;
  const prefix=families[family],indexedBits=family>=5;
  const bytes=indexedBits?[...prefix,0xfe,opcode]:[...prefix,opcode];
  if(!indexedBits&&mnemonic.includes('+d'))bytes.push(0xfe);
  if(/\bnn\b/.test(mnemonic))bytes.push(0x34,0x12);
  else if(/\bn\b/.test(mnemonic))bytes.push(0x34);
  else if(/\be\b/.test(mnemonic))bytes.push(0xfe);
  memory.fill(0,base,base+16);memory.splice(base,bytes.length,...bytes);
  const actual=decode(memory,base);
  // Undefined ED codes are intentionally rendered as DB, preserving exact bytes.
  if(family===1&&actual.text.startsWith('DB')){assert.equal(actual.size,2);checked++;continue;}
  let expected=mnemonic.replace(/\bnn\b/g,'1234').replace(/\bn\b/g,'34').replace(/\+d/g,'-02').replace(/\be\b/g,'$'+((base+bytes.length-2)&65535).toString(16).toUpperCase().padStart(4,'0')).toUpperCase().replace(/\s*,\s*/g,',');
  // These undocumented aliases are rendered explicitly as IM 0/1 in the imported table.
  if(family===1&&[0x4e,0x6e].includes(opcode))expected='IM 0/1';
  assert.equal(actual.text,expected,`mnemonic family ${family}, opcode ${opcode.toString(16)}`);
  assert.equal(actual.size,bytes.length,`length family ${family}, opcode ${opcode.toString(16)}`);
  assert.deepEqual(actual.bytes,bytes);checked++;
 }
 const special=[
  [[0xdd,0xfd,0x21,0x34,0x12],5,'LD IY,1234'],
  [[0xfd,0xdd,0x36,0x80,0xa5],5,'LD (IX-80),A5'],
  [[0xdd,0xed,0x43,0x34,0x12],5,'LD (1234),BC'],
  [[0xdd,0xfd,0xcb,0xff,0xc0],5,'SET 0,(IY-01),B'],
  [[0xdd,0xeb],2,'EX DE,HL'],
  [[0xfd,0x76],2,'HALT'],
  [[0xdd,0x20,0xfe],3,'JR NZ,$8001'],
 ];
 for(const [bytes,size,text] of special){memory.splice(base,bytes.length,...bytes);const op=decode(memory,base);assert.equal(op.size,size);assert.equal(op.text,text);}
 memory[65535]=0x21;memory[0]=0x34;memory[1]=0x12;assert.equal(decode(memory,65535).text,'LD HL,1234');
 memory[65535]=0x18;memory[0]=0xfe;assert.equal(decode(memory,65535).target,65535);
 for(let n=0;n<8;n++){memory[base]=0xc7+n*8;assert.equal(decode(memory,base).target,n*8);assert(decode(memory,base).call);}
 memory.fill(0xdd);assert.equal(decode(memory,0).size,1); // corrupt/unbounded prefix stream remains renderable
 console.log(`PASS disassembler: ${checked} opcode slots against WebMSX CPU definitions, signed offsets, repeated/ignored prefixes, wraparound and RST targets`);
}finally{await server.close();}
