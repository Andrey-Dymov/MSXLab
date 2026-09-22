import {message as localizeMessage} from '../i18n';
import {t as tr} from '../i18n';
import {TitleSectionAtlas,TitleSourceCard} from './TitleMemoryDetails';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,Grid3X3,Palette,FileCode,ArrowUpRight,Camera} from 'lucide-react';
import {useDebugger,select,store,fail} from '../state/debugger';
import {usePanelSetting} from '../state/panelSettings';
import {decodeTitleScreen,isKingsValleyROM,renderTitlePixels,titleTileInfo,type TitleScreen} from '../backend/titleScreens';
import {hex} from '../backend/disassemble';
import {tilePixel,MSX1_PALETTE,modeName} from '../backend/graphics';
export function TitleScreensPanel(){
 const s=useDebugger(),canvas=useRef<HTMLCanvasElement>(null),tileCanvas=useRef<HTMLCanvasElement>(null),maskCanvas=useRef<HTMLCanvasElement>(null),inkCanvas=useRef<HTMLCanvasElement>(null),paperCanvas=useRef<HTMLCanvasElement>(null);
 const [kind,setKind]=usePanelSetting<'title'|'konami'|'live'>('titleKind','title'),[view,setView]=usePanelSetting('titleView','image'),[grid,setGrid]=usePanelSetting('titleGridSections',true),[zoom,setZoom]=usePanelSetting('titleZoom',2);
 const [picked,setPicked]=useState({x:0,y:0}),[frozen,setFrozen]=useState<TitleScreen|null>(null);
 const rom=s.snapshot?.rom||[],supported=isKingsValleyROM(rom);
 const decoded=useMemo(()=>{try{return {screen:supported?decodeTitleScreen(rom,kind==='konami'?'konami':'title'):null,error:''};}catch(e){return {screen:null,error:e instanceof Error?e.message:String(e)};}},[s.session,supported,kind,rom.length]);
 useEffect(()=>{setFrozen(null);},[s.session]);
 const live:TitleScreen={vram:s.snapshot?.vram||[],registers:s.snapshot?.vdpRegisters||[],origins:[],sources:[],name:'Текущая карта символов VDP',explanation:'Изображение из текущих таблиц видеопамяти. Адреса исходных данных ROM для этого режима не установлены. Спрайты не включены.',generatedMap:false};
 const screen=(kind==='live'||!supported)?frozen||live:decoded.screen;
 const unsupportedMode=!!screen&&(((screen.registers[0]||0)&12)!==0||!['SCREEN 1','SCREEN 2'].includes(modeName(screen.registers)));
 const info=screen?titleTileInfo(screen,picked.x,picked.y):null;
 const symbolCode=info?.tile??0;
 const asciiControls=['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','HT','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US'];
 const asciiSymbol=symbolCode<32?asciiControls[symbolCode]:symbolCode===32?tr("Пробел"):symbolCode<127?String.fromCharCode(symbolCode):symbolCode===127?'DEL':tr("Вне ASCII (0–127)");
 useEffect(()=>{const c=canvas.current;if(!c||!screen||unsupportedMode)return;const ctx=c.getContext('2d')!;if(view==='codes'){
   // Render text at display resolution instead of enlarging a 3-pixel font.
   const cell=Math.max(24,8*zoom),ratio=window.devicePixelRatio||1;
   c.width=32*cell*ratio;c.height=24*cell*ratio;ctx.scale(ratio,ratio);
   ctx.font=`600 ${Math.round(cell*.43)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
   for(let y=0;y<24;y++)for(let x=0;x<32;x++){
    const selected=x===(picked.x>>3)&&y===(picked.y>>3);
    ctx.fillStyle=selected?'#51451b':Math.floor(y/8)%2?'#172536':'#101b28';ctx.fillRect(x*cell,y*cell,cell,cell);
    if(grid){ctx.strokeStyle='#344557';ctx.lineWidth=1;ctx.strokeRect(x*cell+.5,y*cell+.5,cell,cell);}
    ctx.fillStyle=selected?'#ffe68a':'#e3edf7';ctx.fillText(hex(tilePixel(screen.vram,screen.registers,x*8,y*8).tile,2),(x+.5)*cell,(y+.5)*cell);
   }
   if(modeName(screen.registers)==='SCREEN 2'){ctx.strokeStyle='#65c8ff';ctx.lineWidth=2;for(const y of [8,16]){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(32*cell,y*cell);ctx.stroke();}}
   ctx.strokeStyle='#ffcf32';ctx.lineWidth=2;ctx.strokeRect((picked.x>>3)*cell+1,(picked.y>>3)*cell+1,cell-2,cell-2);return;
  }c.width=256;c.height=192;ctx.putImageData(new ImageData(renderTitlePixels(screen),256,192),0,0);if(view==='colors'){for(let y=0;y<192;y++)for(let x=0;x<256;x++){const v=titleTileInfo(screen,x,y),color=v.colorAddress===null?screen.registers[7]:screen.vram[v.colorAddress]||0;ctx.fillStyle=MSX1_PALETTE[(x&7)<4?color>>4:color&15];ctx.fillRect(x,y,1,1);}}if(view==='patterns'){for(let y=0;y<192;y++)for(let x=0;x<256;x++){const p=tilePixel(screen.vram,screen.registers,x,y),value=screen.vram[p.patternAddress&16383]||0;ctx.fillStyle=value&(128>>(x&7))?'#eef4ff':'#192335';ctx.fillRect(x,y,1,1);}}if(grid){ctx.strokeStyle='#ffffff50';ctx.lineWidth=.3;for(let x=0;x<=256;x+=8){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,192);ctx.stroke();}for(let y=0;y<=192;y+=8){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(256,y+.5);ctx.stroke();}}if(modeName(screen.registers)==='SCREEN 2'){ctx.strokeStyle='#65c8ff';ctx.lineWidth=1;for(const y of [64,128]){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(256,y+.5);ctx.stroke();}}ctx.strokeStyle='#ffcf32';ctx.lineWidth=1;ctx.strokeRect((picked.x>>3)*8+.5,(picked.y>>3)*8+.5,7,7);},[screen?.vram,screen?.registers,view,grid,picked,unsupportedMode,zoom]);
 useEffect(()=>{
  if(!screen||!info)return;
  const refs=[tileCanvas,maskCanvas,inkCanvas,paperCanvas];
  const contexts=refs.map(ref=>{const c=ref.current;if(!c)return null;c.width=8;c.height=8;return c.getContext('2d');});
  const color=(index:number)=>MSX1_PALETTE[index||(screen.registers[7]&15)];
  for(let y=0;y<8;y++){
   const row=titleTileInfo(screen,picked.x&~7,(picked.y&~7)+y),pattern=screen.vram[row.patternAddress&16383]||0;
   const attribute=row.colorAddress===null?screen.registers[7]:screen.vram[row.colorAddress]||0;
   const ink=color((attribute>>4)&15),paper=color(attribute&15);
   for(let x=0;x<8;x++){
    const on=!!(pattern&(128>>x)),colors=[on?ink:paper,on?'#ffffff':'#000000',ink,paper];
    contexts.forEach((ctx,i)=>{if(ctx){ctx.fillStyle=colors[i];ctx.fillRect(x,y,1,1);}});
   }
  }
 },[screen?.vram,screen?.registers,picked,info?.tile]);

 function link(address:number,space:'cpu'|'vram',label:string){if(space==='vram'&&screen?.generatedMap)return <span className="title-vram-address">{label} ${hex(address)}</span>;const targetSpace=space==='cpu'?'rom':space,targetAddress=space==='cpu'?address-0x4000:address;return <button onClick={()=>select(targetAddress,targetSpace)}><ArrowUpRight size={13}/>{label} {space==='cpu'?tr("ROM +"):'$'}{hex(targetAddress)}</button>;}
 return <div className="title-screen-view"><div className="panel-tools"><Image size={19}/><select aria-label={tr("Заставка")} value={supported?kind:'live'} onChange={e=>{setKind(e.target.value as typeof kind);setFrozen(null);}}>{supported&&<><option value="title">{tr("King’s Valley · титульный экран")}</option><option value="konami">{tr("Konami · заставка")}</option></>}<option value="live">{tr("Текущая видеопамять")}</option></select><label>{tr("Масштаб")}{" "}<select aria-label={tr("Масштаб заставки")} value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[1,2,3,4].map(z=><option key={z} value={z}>{z}×</option>)}</select></label><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>{tr("Сетка")}</label>{(kind==='live'||!supported)&&<button onClick={()=>setFrozen(frozen?null:{...live,vram:[...live.vram],registers:[...live.registers]})}>{frozen?tr("Продолжить обновление"):tr("Зафиксировать")}</button>}<button disabled={!screen||unsupportedMode} onClick={async()=>{try{if(canvas.current&&s.project){const result=await window.desktop!.capture(s.project.id,canvas.current.toDataURL());store.set({notice:'Изображение сохранено: '+result.name});}}catch(e){fail(e);}}}><Camera size={15}/>PNG</button></div>
 <div className="title-tabs">{[['image','Картинка',Image],['codes','Коды символов',Grid3X3],['patterns','Форма символов',FileCode],['colors','Цвета',Palette]].map(([id,name,I])=>{const Icon=I as typeof Image;return <button key={String(id)} aria-pressed={view===id} onClick={()=>setView(String(id))}><Icon size={16}/>{tr(String(name))}</button>;})}</div>
 {decoded.error&&<p role="alert" className="panel-message">{localizeMessage(decoded.error)}</p>}{unsupportedMode?<p className="panel-message">{tr("Для текущей видеопамяти поддерживаются символьные режимы SCREEN 1 и SCREEN 2. Выберите заставку из ROM или переключите видеорежим игры.")}</p>:screen&&<><p className="panel-message">{tr(screen.explanation)}</p>{modeName(screen.registers)==='SCREEN 2'&&<TitleSectionAtlas screen={screen}/>}<div className="title-workspace"><div className="title-canvas-scroll"><canvas ref={canvas} className="title-canvas" aria-label={tr("Изображение заставки")} style={{width:32*(view==='codes'?Math.max(24,8*zoom):8*zoom),height:24*(view==='codes'?Math.max(24,8*zoom):8*zoom),imageRendering:view==='codes'?'auto':'pixelated'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPicked({x:Math.min(255,Math.floor((e.clientX-r.left)*256/r.width)),y:Math.min(191,Math.floor((e.clientY-r.top)*192/r.height))});}}/></div><aside className="title-inspector"><h3>{tr("Символ $")}{hex(symbolCode,2)} · {symbolCode}</h3><p className="title-ascii">ASCII: <strong>{symbolCode===32||symbolCode>127?tr(asciiSymbol):asciiSymbol}</strong>{symbolCode<32||symbolCode===127?<small>{tr("Управляющий код, без печатного знака.")}</small>:symbolCode>=128?<small>{tr("Номер в наборе графики игры, не стандартный знак ASCII.")}</small>:<small>{tr("Знак стандартного ASCII; рисунок в наборе игры может быть другим.")}</small>}</p><div className="title-tile-breakdown" aria-label={tr("Как собирается цветной символ")}>
 <figure><figcaption>{tr("Результат")}</figcaption><canvas ref={tileCanvas} className="title-tile" aria-label={tr("Цветной символ")}/></figure>
 <figure><figcaption>{tr("Маска 1 / 0")}</figcaption><canvas ref={maskCanvas} className="title-tile" aria-label={tr("Чёрно-белая маска пикселей")}/></figure>
 <figure><figcaption>{tr("Цвет 1")}</figcaption><canvas ref={inkCanvas} className="title-tile" aria-label={tr("Цвет включённых пикселей по строкам")}/></figure>
 <figure><figcaption>{tr("Цвет 0")}</figcaption><canvas ref={paperCanvas} className="title-tile" aria-label={tr("Цвет выключенных пикселей по строкам")}/></figure>
 </div><small className="title-tile-explanation">{tr("Белый пиксель маски (1) берёт цвет 1 своей строки, чёрный (0) — цвет 0.")}</small><p>{tr("Столбец")}{" "}{(picked.x>>3)+1}{" "}{tr("· строка")}{" "}{(picked.y>>3)+1}</p><small>{modeName(screen.registers)}{" "}{tr("· символ 8 × 8")}{modeName(screen.registers)==='SCREEN 2'?tr(" · секция {p0}",{p0:(Math.floor(picked.y/64)+1)}):''}</small>{info&&<><div>{link(info.address,'vram',tr("Карта VRAM"))}{link(info.patternAddress&16383,'vram',tr("Графика VRAM"))}{info.colorAddress!==null&&link(info.colorAddress,'vram',tr("Цвет VRAM"))}</div>{screen.generatedMap&&<small>{tr("Адреса VRAM — размещение при показе этой заставки, а не текущее содержимое игры.")}</small>}<h4>{tr("Откуда в ROM")}</h4>{info.mapOrigin>=0?link(info.mapOrigin,'cpu',tr("Код символа")): <p>{screen.generatedMap?tr("Положение и номер символа заданы алгоритмом сборки."):tr("Источник карты в ROM не установлен.")}</p>}{info.patternOrigin>=0&&link(info.patternOrigin,'cpu',tr("Байт графики"))}{info.colorOrigin>=0?link(info.colorOrigin,'cpu',tr("Байт цвета")):screen.generatedMap&&<small>{tr("Цвет может задаваться заливкой из кода.")}</small>}<h4>{tr("Байты изображения · HEX")}</h4><code>{Array.from({length:8},(_,y)=>hex(screen.vram[titleTileInfo(screen,picked.x,(picked.y&~7)+y).patternAddress&16383]||0,2)).join(' ')}</code></>}</aside></div>
 <section className="title-sources"><h3>{tr("Из чего собрана заставка")}</h3>{screen.sources.length?<div className="title-source-grid">{screen.sources.map(source=><TitleSourceCard key={source.name} screen={screen} source={source} rom={rom}/>)}</div>:<p>{tr("Просмотр таблиц VDP доступен для других игр; автоматическое определение исходных блоков ROM пока реализовано только для проверенной версии King’s Valley.")}</p>}</section></>}
 </div>;
}
