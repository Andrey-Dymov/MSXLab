// MSX1 V9918 interpretation; later VDP modes must use a different decoder.
export const MSX1_PALETTE=['#000000','#000000','#3eb849','#74d07d','#5955e0','#8076f1','#b95e51','#65dbef','#db6559','#ff897d','#ccc35e','#ded087','#3aa241','#b766b5','#cccccc','#ffffff'];
export function modeName(r:number[]){return (r[1]&16)?'SCREEN 0':(r[1]&8)?'SCREEN 3':(r[0]&2)?'SCREEN 2':'SCREEN 1';}
export function tilePixel(v:number[],r:number[],x:number,y:number){const m=modeName(r),columns=m==='SCREEN 0'?40:32,charWidth=m==='SCREEN 0'?6:8;const tx=Math.floor(x/charWidth),ty=y>>3,row=y&7,col=x%charWidth;const nameBase=(r[2]&15)<<10;const tile=v[(nameBase+ty*columns+tx)&16383]||0;let patternAddress=((r[4]&7)<<11)+tile*8+row;let color=r[7]||0;
 if(m==='SCREEN 2'){const section=(ty>>3)*2048;patternAddress=((r[4]&4)<<11)|((section+tile*8+row)&(((r[4]&3)<<11)|2047));const colorAddress=((r[3]&128)<<6)|((section+tile*8+row)&(((r[3]&127)<<6)|63));color=v[colorAddress&16383]||0;}
 else if(m==='SCREEN 1')color=v[(((r[3]||0)<<6)+(tile>>3))&16383]||0;
 else if(m==='SCREEN 3'){const b=v[(((r[4]&7)<<11)+tile*8+((ty&3)*2)+(row>>2))&16383]||0;return {color:col<4?b>>4:b&15,address:(nameBase+ty*columns+tx)&16383,tile,patternAddress};}
 const bits=v[patternAddress&16383]||0;return {color:bits&(128>>col)?color>>4:color&15,address:(nameBase+ty*columns+tx)&16383,tile,patternAddress};}
export function spriteAttributes(v:number[],r:number[]){const base=(r[5]&127)<<7;const result=[];for(let i=0;i<32;i++){const address=(base+i*4)&16383;const y=v[address]||0;if(y===208)break;const flags=v[address+3]||0;result.push({index:i,address,y:(y>208?y-256:y)+1,x:(v[address+1]||0)-(flags&128?32:0),pattern:v[address+2]||0,color:flags&15});}return result;}
export function spritePixel(v:number[],r:number[],pattern:number,x:number,y:number){const size=r[1]&2?16:8;const base=(r[6]&7)<<11;const index=size===16?pattern&252:pattern;const address=(base+index*8+y+(x>=8?16:0))&16383;return !!((v[address]||0)&(128>>(x&7)));}

export function spriteRanges(registers:number[],sprite:{address:number;pattern:number}){
 const size=registers[1]&2?16:8,pattern=((registers[6]&7)<<11)+(size===16?sprite.pattern&252:sprite.pattern)*8;
 return {attributes:{address:sprite.address,end:sprite.address+3},pattern:{address:pattern,end:pattern+(size===16?32:8)-1}};
}
// Diagnostic composition: colour 0 is transparent; lower SAT index wins.
// Does not enforce the four-sprites-per-scanline hardware limit.
export function composedSpritePixel(v:number[],r:number[],sprites:ReturnType<typeof spriteAttributes>,x:number,y:number){const scale=r[1]&1?2:1,size=r[1]&2?16:8;for(const sp of sprites){const sx=Math.floor((x-sp.x)/scale),sy=Math.floor((y-sp.y)/scale);if(sp.color&&sx>=0&&sy>=0&&sx<size&&sy<size&&spritePixel(v,r,sp.pattern,sx,sy))return sp;}return null;}
