import {tilePixel,MSX1_PALETTE,modeName} from './graphics';
export interface TitleSource {name:string;address:number;end:number;role:string;encoding:string}
export interface TitleScreen {vram:number[];registers:number[];origins:number[];sources:TitleSource[];name:string;explanation:string;generatedMap:boolean}
export function isKingsValleyROM(rom:readonly number[]){return rom.length===16384&&[2,226,14,127,7,118,3,228].every((b,i)=>rom[0x5c0+i]===b)&&rom[0x4cf]===0x11&&rom[0x4d0]===0x7d&&rom[0x4d1]===0x46;}
export function decodeTitleScreen(rom:readonly number[],kind:'konami'|'title'):TitleScreen{
 if(!isKingsValleyROM(rom))throw Error('Эта версия ROM не соответствует проверенному формату заставок King’s Valley.');
 const vram=Array(16384).fill(0),origins=Array(16384).fill(-1),sources:TitleSource[]=[];
 const byte=(a:number)=>{if(a<0x4000||a>=0x8000)throw Error('Данные заставки выходят за пределы ROM');return rom[a-0x4000];};
 const word=(a:number)=>byte(a)|(byte(a+1)<<8);
 const write=(address:number,value:number,origin=-1)=>{vram[address&16383]=value;origins[address&16383]=origin;};
 function unpack(start:number,destination:number){let p=start,dest=destination,operations=0;while(operations++<32768){const command=byte(p++),count=command&127;if(!count){if(command===0)return p-1;dest=word(p);p+=2;continue;}if(command&128){for(let i=0;i<count;i++){write(dest++,byte(p),p);p++;}}else{const value=byte(p);for(let i=0;i<count;i++)write(dest++,value,p);p++;}}throw Error('Некорректный поток сжатой графики');}
 function banks(start:number,dest:number,name:string,role:string){let end=start;for(let i=0;i<3;i++)end=unpack(start,dest+i*2048);if(!sources.some(s=>s.address===start))sources.push({name,address:start,end,role,encoding:'RLE: повтор / буквальная последовательность; 00 — конец, 80 — новый адрес'});}
 function fillBanks(dest:number,count:number,value:number){for(let b=0;b<3;b++)for(let i=0;i<count;i++)write(dest+b*2048+i,value);}
 banks(0x467d,0x2080,'GFX_FONT','Изображения букв и цифр');fillBanks(0x80,0x180,0xf0);banks(0x47a7,8,'GFX_SPACE','Пустой символ');
 if(kind==='konami'){
  banks(0x4874,0x2300,'GFX_KONAMI_LOGO','Изображения символов логотипа Konami');fillBanks(0x300,0xd8,0xf0);
  // Fourteen upward moves from $3AAA; the three rows contain 3, 11 and 12 tiles.
  let code=0x60;for(let row=0;row<3;row++)for(let col=0;col<([3,11,12][row]);col++)write(0x38ea+row*32+col,code++);
  const end=unpack(0x4800,word(0x47fe));sources.push({name:'TXT_SOFWARE',address:0x47fe,end,role:'Надпись SOFTWARE и её размещение',encoding:'Адрес VRAM + RLE'});
  sources.push({name:'MOV.KONAMI.UP',address:0x4842,end:0x4873,role:'Размещение трёх рядов логотипа',encoding:'Код сборки: последовательные номера символов, 14 шагов вверх'});
 }else{
  banks(0x490b,0x2480,'GFX_MENU','Графика заголовка и пирамиды');banks(0x4a97,0x480,'ATTRIB_MENU','Цвета символов меню');
  for(let col=0;col<22;col++)banks(0x4aab,0x4d8+col*16,'COLORES_LOGO','Цветные полосы заголовка');fillBanks(0x4d8+22*16,16,0x40);
  for(let col=0;col<22;col++){let dest=(col<9?0x38a7:0x3904)+col;write(dest,0x9b+col*2);dest+=32;write(dest,0x9c+col*2);dest+=32;const tail=(dest&255)-0xec;if(tail>=0&&tail<2)write(dest,0xc7+tail);}
  let p=0x47c1,dest=word(p);p+=2;for(let n=0;n<2048;n++){const value=byte(p++);if(value===255)break;if(value===254){dest=word(p);p+=2;}else write(dest++,value,p-1);if(n===2047)throw Error('Некорректная таблица текста');}
  sources.push({name:'TXT_MAIN_MENU',address:0x47c1,end:p-1,role:'Надписи KONAMI и PUSH SPACE KEY',encoding:'Номера символов; FE — новый адрес, FF — конец'});
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){const a=0x4abc+row*6+col;write(0x3892+row*32+col,byte(a),a);}
  sources.push({name:'GFX_PIRAMID_LOGO',address:0x4abc,end:0x4acd,role:'Карта символов пирамиды: 6 × 3',encoding:'18 несжатых номеров символов'});
  sources.push({name:'DRAW_GAME_LOGO',address:0x43b8,end:0x43ef,role:'Размещение букв заголовка',encoding:'Код сборки: 22 столбца по два символа и два нижних фрагмента'});
 }
 return {vram,origins,sources,registers:[2,226,14,127,7,118,3,kind==='konami'?228:224],name:kind==='konami'?'Konami · завершённая заставка':'King’s Valley · титульный экран',generatedMap:true,explanation:'Восстановлено из ROM: распаковка символов и цветов, затем размещение по алгоритму игры. Это завершённая картинка без анимации.'};
}
export function titleTileInfo(screen:TitleScreen,x:number,y:number){const p=tilePixel(screen.vram,screen.registers,x,y),r=screen.registers,mode=modeName(r),ty=y>>3,section=(ty>>3)*2048;const colorAddress=mode==='SCREEN 2'?(((r[3]&128)<<6)|((section+p.tile*8+(y&7))&(((r[3]&127)<<6)|63))):mode==='SCREEN 1'?((r[3]<<6)+(p.tile>>3))&16383:null;return {...p,colorAddress,mapOrigin:screen.origins[p.address]??-1,patternOrigin:screen.origins[p.patternAddress&16383]??-1,colorOrigin:colorAddress===null?-1:screen.origins[colorAddress]??-1};}
export function renderTitlePixels(screen:TitleScreen){const pixels=new Uint8ClampedArray(256*192*4);const rgb=MSX1_PALETTE.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);for(let y=0;y<192;y++)for(let x=0;x<256;x++){const p=tilePixel(screen.vram,screen.registers,x,y),color=rgb[p.color||screen.registers[7]&15],i=(y*256+x)*4;pixels.set([...color,255],i);}return pixels;}

export function titleSymbolAddresses(screen:TitleScreen,section:number,code:number,row=0){
 const r=screen.registers,offset=section*2048+code*8+row;
 return modeName(r)==='SCREEN 2'?{pattern:(((r[4]&4)<<11)|(offset&(((r[4]&3)<<11)|2047)))&16383,color:(((r[3]&128)<<6)|(offset&(((r[3]&127)<<6)|63)))&16383}:{pattern:(((r[4]&7)<<11)+code*8+row)&16383,color:((r[3]<<6)+(code>>3))&16383};
}
