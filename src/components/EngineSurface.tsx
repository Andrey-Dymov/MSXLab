import {t as tr} from '../i18n';
import {MockDebuggerBackend} from '../backend/MockDebuggerBackend';
import {useEffect,useRef,useState} from 'react';
import {WebMSXBackend} from '../backend/WebMSXBackend';
import {useDebugger,connect,disconnect,store,fail} from '../state/debugger';
let screenAnchor:HTMLElement|null=null;
export function registerScreen(el:HTMLElement|null){screenAnchor=el;}
export function EngineSurface(){
 const {project,session}=useDebugger();const frame=useRef<HTMLIFrameElement>(null);const [box,setBox]=useState({left:-2000,top:0,width:600,height:450,visible:false,floating:false});
 useEffect(()=>{let id=0;const track=()=>{const rect=screenAnchor?.getBoundingClientRect();const visible=screenAnchor?.dataset.inspecting!=='true'&&!!rect&&rect.width>0&&rect.height>0&&!!screenAnchor?.checkVisibility()&&getComputedStyle(screenAnchor!).visibility==='visible';setBox(old=>{const b=visible?{left:rect!.left,top:rect!.top,width:rect!.width,height:rect!.height,visible,floating:!!screenAnchor?.closest('.panel-popup-window')}: {...old,left:-2000,visible:false};return JSON.stringify(old)===JSON.stringify(b)?old:b;});id=requestAnimationFrame(track);};track();return()=>cancelAnimationFrame(id);},[]);
 useEffect(()=>{if(project?.kind==='mock'){const mock=new MockDebuggerBackend();connect(mock);void mock.command('breakpoints',project.breakpoints);return()=>disconnect(mock);}if(!frame.current||!project)return;const adapter=new WebMSXBackend(frame.current,()=>{void adapter.command('breakpoints',store.get().project?.breakpoints||[]).catch(fail);void adapter.command('watchpoints',store.get().project?.watchpoints||[]).catch(fail);store.set({loading:false,notice:'Engine ready · Z80 1×'});},message=>fail(Error(message)));connect(adapter);return()=>disconnect(adapter);},[project?.id,session]);
 if(!project||project.kind==='mock')return null;
 return <iframe key={`${project.id}-${session}`} ref={frame} className="engine-surface" title={tr("MSX emulator")} src={`/engine/index.html?project=${encodeURIComponent(project.id)}&session=${session}`} style={{position:'fixed',left:box.left,top:box.top,width:box.width,height:box.height,visibility:box.visible?'visible':'hidden',border:0,zIndex:box.floating?91:3}} allow="autoplay"/>;
}
