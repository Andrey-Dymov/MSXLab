// WebMSX 6.0.8: inspect slot objects without changing the bus selection.
export function createMemorySlots(bus, cartridgeSlots=()=>[]) {
 const metadata=new WeakMap();
 function describe(slot){
  const format=slot?.format?.name||'Empty',bytes=slot?.bytes;
  if(format==='Empty')return {format,kind:'empty',size:0,start:0,end:-1};
  if(format==='RAMMapper')return {format,kind:'ram',size:bytes?.length||0,start:0,end:65535,bankCount:(bytes?.length||0)/16384,banks:[0,1,2,3].map(page=>slot.inputAll(252+page)&((bytes.length/16384)-1))};
  if(format==='RAMNormal')return {format,kind:'ram',size:bytes?.length||0,start:65536-(bytes?.length||0),end:65535};
  if(format==='BIOS'||format==='MSX2BIOSExt')return {format,kind:'rom',size:bytes?.length||0,start:0,end:(bytes?.length||0)-1};
  if(format==='MSXMUSIC')return {format,kind:'rom',size:bytes?.length||0,start:16384,end:32767};
  if(['Normal','Mirrored','NotMirrored','PlainROM','DiskPatch'].includes(format)){
   let value=metadata.get(slot);if(!value||value.bytes!==bytes){const state=slot.saveState();value={bytes,start:state.ba||0,mirrored:!!state.m};metadata.set(slot,value);}
   return {format,kind:'rom',size:bytes?.length||0,start:value.mirrored?0:value.start,end:value.mirrored?65535:Math.min(65535,value.start+(bytes?.length||0)-1),mirrored:value.mirrored};
  }
  return {format,kind:'device',size:bytes?.length||0,start:null,end:null};
 }
 function slots(){const primaryConfig=bus.getPrimarySlotConfig(),columns=[];for(let primary=0;primary<4;primary++){const parent=bus.getSlot(primary),expanded=!!parent?.isExpanded?.();for(let sub=0;sub<(expanded?4:1);sub++){const slot=expanded?parent.getSubSlot(sub):parent,secondary=expanded?sub:null;columns.push({id:primary+(expanded?'.'+sub:''),primary,secondary,expanded,connector:cartridgeSlots().flatMap((path,i)=>Array.isArray(path)&&path[0]===primary&&(path.length<2||path[1]===secondary)?[String.fromCharCode(65+i)]:[]).join(' / ')||null,...describe(slot),activePages:[0,1,2,3].filter(page=>((primaryConfig>>(page*2))&3)===primary&&(!expanded||((parent.getSecondarySlotConfig()>>(page*2))&3)===sub))});}}return {primaryConfig,columns};}
 function read({primary,secondary=null,page=0,bank,length=64,offset=0}){
  if(!Number.isInteger(primary)||primary<0||primary>3||!Number.isInteger(page)||page<0||page>3||!Number.isInteger(length)||length<1||length>16384||!Number.isInteger(offset)||offset<0||offset>16383||offset+length>16384)throw Error('Invalid slot memory range');
  const parent=bus.getSlot(primary);let slot=parent;if(parent.isExpanded()){if(!Number.isInteger(secondary)||secondary<0||secondary>3)throw Error('Select a subslot');slot=parent.getSubSlot(secondary);}else if(secondary!==null)throw Error('This slot is not expanded');
  const d=describe(slot);if(d.kind==='empty'||d.start===null)throw Error('Просмотр байтов этого устройства пока не поддерживается');
  if(d.bankCount){if(!Number.isInteger(bank)||bank<0||bank>=d.bankCount)throw Error('Invalid RAM bank');return {bytes:Array.from(slot.bytes.slice(bank*16384+offset,bank*16384+offset+length)),address:page*16384+offset,bank};}
  const address=Math.max(page*16384+offset,d.start);if(address>Math.min(page*16384+16383,d.end))return {bytes:[],address};
  return {bytes:Array.from({length:Math.min(length,d.end-address+1,page*16384+16384-address)},(_,i)=>slot.read(address+i)),address};
 }
 function matches(scope,address){if(!scope)return true;const page=address>>>14,primary=(bus.getPrimarySlotConfig()>>(page*2))&3;if(primary!==scope.primary)return false;let slot=bus.getSlot(primary);if(slot.isExpanded()){const sub=(slot.getSecondarySlotConfig()>>(page*2))&3;if(sub!==scope.secondary)return false;slot=slot.getSubSlot(sub);}else if(scope.secondary!==null)return false;if(scope.bank===undefined)return true;return slot.format?.name==='RAMMapper'&&(slot.inputAll(252+page)&((slot.bytes.length/16384)-1))===scope.bank;}
 return {snapshot:slots,read,matches};
}
