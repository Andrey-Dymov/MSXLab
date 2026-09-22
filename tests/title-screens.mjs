import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const v=await createServer({server:{middlewareMode:true}});
try {
 const {decodeTitleScreen,isKingsValleyROM,renderTitlePixels,titleTileInfo,titleSymbolAddresses}=await v.ssrLoadModule('/src/backend/titleScreens.ts');
 const rom=Array.from(await fs.readFile('projects/kings-valley/program/kvalley.rom'));
 // Reference pixel hashes from live WebMSX VRAM after each screen has finished
 // drawing, captured independently of the decoder on 2026-09-21.
 const references={title:'f1a97b909fb3ef851147fe01932fe7f37364c3d429018effc502b7ad83568576',konami:'df9c43ea9c9b34ea72ea5425e146caea617ccd77ab4af770eb39ec3d5cec486c'};
 assert(isKingsValleyROM(rom));assert(!isKingsValleyROM([]));assert.throws(()=>decodeTitleScreen(rom.slice(0,100),'title'));
 for(const kind of ['title','konami']) {
  const screen=decodeTitleScreen(rom,kind);
  assert.equal(createHash('sha256').update(renderTitlePixels(screen)).digest('hex'),references[kind]);
  assert(screen.sources.every(s=>s.address>=0x4000&&s.end<0x8000&&s.end>=s.address));
  for(let address=0;address<screen.origins.length;address++)if(screen.origins[address]>=0)assert.equal(screen.vram[address],rom[screen.origins[address]-0x4000]);
 }
 const title=decodeTitleScreen(rom,'title'),tile=titleTileInfo(title,7*8,5*8);
 assert.equal(tile.tile,0x9b);assert.equal(tile.mapOrigin,-1);assert(tile.patternOrigin>=0x490b);assert(tile.colorOrigin>=0x4aab);
 for(let section=0;section<3;section++){const a=titleSymbolAddresses(title,section,0xc4);assert.equal(a.pattern,0x2620+section*2048);assert.equal(a.color,0x0620+section*2048);}
 const aliased={...title,registers:[...title.registers]};aliased.registers[4]=4;assert.equal(titleSymbolAddresses(aliased,2,0xc4).pattern,0x2620);
 const altered=rom.slice();altered[0x5c0]=0;assert(!isKingsValleyROM(altered));
 console.log('PASS title screens match live emulator pixels, ROM provenance and unsupported format rejection');
} finally {await v.close();}
