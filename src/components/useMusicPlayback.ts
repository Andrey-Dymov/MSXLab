import {useEffect,useRef,useState} from 'react';
import {renderMusic} from '../backend/musicPlayback';
import type {MusicCapture} from '../backend/music';
export function useMusicPlayback(capture:MusicCapture|null,channels:boolean[]){const context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),buffer=useRef<AudioBuffer|null>(null),offset=useRef(0),started=useRef(0),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0);const duration=capture?capture.frames/capture.fps:0;
 function halt(){if(source.current){source.current.onended=null;source.current.stop();source.current.disconnect();source.current=null;}}
 function pause(){if(source.current&&context.current)offset.current=Math.min(duration,offset.current+context.current.currentTime-started.current);halt();setPlaying(false);setPosition(offset.current);}
 function stop(){halt();offset.current=0;setPosition(0);setPlaying(false);}
 async function play(){if(!capture||!duration)return;const ctx=context.current??(context.current=new AudioContext());await ctx.resume();halt();if(!buffer.current){const samples=renderMusic(capture,22050,channels);const b=ctx.createBuffer(1,samples.length,22050);b.copyToChannel(samples,0);buffer.current=b;}if(offset.current>=duration)offset.current=0;const node=ctx.createBufferSource();node.buffer=buffer.current;node.connect(ctx.destination);source.current=node;started.current=ctx.currentTime;node.onended=()=>{if(source.current===node){source.current=null;offset.current=duration;setPosition(duration);setPlaying(false);node.disconnect();}};node.start(0,offset.current);setPlaying(true);}
 function seek(seconds:number){const resume=!!source.current;halt();offset.current=Math.max(0,Math.min(duration,seconds));setPosition(offset.current);setPlaying(false);if(resume)void play();}
 useEffect(()=>{stop();buffer.current=null;},[capture]);
 useEffect(()=>{const resume=!!source.current;pause();buffer.current=null;if(resume)void play();},[channels.join()]);
 useEffect(()=>()=>{halt();void context.current?.close();},[]);
 useEffect(()=>{if(!playing)return;let id:number;const tick=()=>{if(context.current)setPosition(Math.min(duration,offset.current+context.current.currentTime-started.current));id=requestAnimationFrame(tick);};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);},[playing,duration]);
 return {play,pause,stop,seek,playing,position,duration};
}
