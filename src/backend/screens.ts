export const screenFormats=[{id:'kings-valley-level',name:'King’s Valley · стены и объекты'}];
export interface ScreenBlock {format:string;romBase:number;halfMapTable:number}
export function decodeLevel(rom:number[],start:number,config:ScreenBlock){
 if(config.format!=='kings-valley-level')throw Error('Unsupported screen format: '+config.format);
 const read=(a:number)=>{if(!Number.isInteger(a)||a<config.romBase||a>=config.romBase+rom.length)throw Error('Screen address outside ROM');return rom[a-config.romBase];},word=(a:number)=>read(a)|read(a+1)<<8;
 let cursor=start+config.romBase;const parts:{address:number;bytes:number[]}[]=[];
 for(let i=0;i<4;i++){const selector=read(cursor++),group=selector>>4;if(group>3)throw Error('Invalid half-map group');const address=word(config.halfMapTable+group*2)+(selector&15)*44;parts.push({address,bytes:Array.from({length:44},(_,j)=>read(address+j))});if(group===3)break;}
 const width=parts.length*16,cells=Array.from({length:22},(_,y)=>Array.from({length:width},(_,x)=>{const part=parts[x>>4],offset=y*2+((x%16)>>3);return {wall:!!(part.bytes[offset]&(128>>(x%8))),address:part.address+offset};}));
 const objects:{kind:string;x:number;y:number;address:number;detail:number;direction?:number}[]=[];
 const coord=(kind:string,y:number,x:number,address:number,detail=0,roomBit=0)=>objects.push({kind,x:(x&248)+((x>>roomBit)&1)*256,y,address,detail});
 for(let i=0;i<4;i++){const address=cursor,y=read(cursor++);if(y===255)continue;const x=read(cursor++),destination=read(cursor++);coord('Door',y,x,address,destination);}
 const list=(kind:string,size:number,position:number,roomBit=0)=>{const count=read(cursor++);if(count>32)throw Error('Invalid object count: '+kind);for(let i=0;i<count;i++){const a=cursor,bytes=Array.from({length:size},()=>read(cursor++));coord(kind,bytes[position],bytes[position+1],a,bytes[size===3?position===0?2:0:0],roomBit);}};
 list('Mummy',3,0);list('Gem',3,1);list('Knife',2,0);list('Pickaxe',2,0);list('Rotating door',3,1,2);list('Trap',2,0);list('Stairs',2,0,1);
 const occupied=cells.map(row=>row.map(c=>c.wall));
 const stairs=objects.filter(o=>o.kind==='Stairs').map(o=>{
  const direction=read(o.address+1)&1; o.direction=direction;
  let x=o.x/8,y=o.y/8;const steps:{x:number;y:number;landing:boolean}[]=[];
  // putPeldanoMap writes two cells and advances HL by one. The following
  // -62h / -60h offset therefore moves one row up and one column sideways.
  for(let i=0;i<22&&y>=0&&y<22&&x>=0&&x+1<width;i++){
   const landing=occupied[y][x];steps.push({x:x*8,y:y*8,landing});
   occupied[y][x]=occupied[y][x+1]=true;if(landing)break;
   x+=direction?1:-1;y--;
  }
  return {address:o.address,direction,steps};
 });
 return {width,height:22,cells,objects,stairs,end:cursor-config.romBase};
}

export function paintLevelCell(rom:number[],map:ReturnType<typeof decodeLevel>,config:ScreenBlock,x:number,y:number,wall:boolean){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!map.cells[y]?.[x])throw Error('Клетка за пределами уровня');
 const offset=map.cells[y][x].address-config.romBase,mask=128>>(x%8);
 return [{offset,before:rom[offset],value:wall?rom[offset]|mask:rom[offset]&~mask}];
}
export function moveLevelObject(rom:number[],map:ReturnType<typeof decodeLevel>,config:ScreenBlock,address:number,x:number,y:number){
 const o=map.objects.find(o=>o.address===address);if(!o)throw Error('Объект не найден');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=map.width||y<0||y>=map.height)throw Error('Клетка за пределами уровня');
 const pos=['Gem','Rotating door'].includes(o.kind)?1:0,bit=o.kind==='Stairs'?1:o.kind==='Rotating door'?2:0,offset=o.address-config.romBase+pos;
 const encoded=((x*8)&248)|(rom[offset+1]&7&~(1<<bit))|((x>=32?1:0)<<bit);
 return [{offset,before:rom[offset],value:y*8},{offset:offset+1,before:rom[offset+1],value:encoded}];
}

export function turnLevelStair(rom:number[],map:ReturnType<typeof decodeLevel>,config:ScreenBlock,address:number){
 const stair=map.objects.find(o=>o.address===address&&o.kind==='Stairs');
 if(!stair)throw Error('Выберите существующую лестницу');
 const offset=address-config.romBase+1;
 return {offset,before:rom[offset],value:rom[offset]^1};
}
