import {useSyncExternalStore} from 'react';
import ru from './ru.json';
import messagePatterns from './messages.json';
import en from './en.json';
import ja from './ja.json';
import pt from './pt.json';
import nl from './nl.json';
import es from './es.json';
import zh from './zh.json';
export const languages={ru:'Русский',en:'English',ja:'日本語',pt:'Português',nl:'Nederlands',es:'Español',zh:'简体中文'} as const;
export type Language=keyof typeof languages;
const packs:Record<Language,Record<string,string>>={ru,en,ja,pt,nl,es,zh};
const listeners=new Set<()=>void>();
let current:Language='ru',initialized=false;
function getLanguage(){if(!initialized){initialized=true;const saved=localStorage.getItem('msxlab.language');if(saved&&Object.hasOwn(languages,saved))current=saved as Language;document.documentElement.lang=current;}return current;}
export function t(key:string,values?:Record<string,string|number|boolean|null|undefined>){const pack=packs[getLanguage()];const text=Object.hasOwn(pack,key)?pack[key]:Object.hasOwn(packs.en,key)?packs.en[key]:key;return values?text.replace(/\{(p\d+)\}/g,(match,name)=>Object.hasOwn(values,name)?String(values[name]??''):match):text;}
export function setLanguage(next:Language){if(!Object.hasOwn(languages,next))return;current=next;initialized=true;document.documentElement.lang=next;localStorage.setItem('msxlab.language',next);for(const update of listeners)update();void window.desktop?.savePreference('msxlab.language',next).catch(()=>{});}
export function useLanguage(){const language=useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},getLanguage,getLanguage);return [language,setLanguage] as const;}

// Translate only application-owned messages at the UI boundary. API payloads stay unchanged.
const dynamicMessages=messagePatterns.filter(key=>/\{p\d+\}/.test(key)).sort((a,b)=>b.replace(/\{p\d+\}/g,'').length-a.replace(/\{p\d+\}/g,'').length).map(key=>{
 const names:string[]=[];let pattern='',last=0;
 for(const match of key.matchAll(/\{(p\d+)\}/g)){pattern+=key.slice(last,match.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([\\s\\S]*?)';names.push(match[1]);last=match.index!+match[0].length;}
 pattern+=key.slice(last).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return {key,names,pattern:new RegExp('^'+pattern+'$')};
});
export function message(value:string|null|undefined):string{
 if(!value)return value??'';
 if(Object.hasOwn(packs.en,value))return t(value);
 const remote=/^Error invoking remote method '[^']+': (?:Error: )?([\s\S]*)$/.exec(value);
 if(remote)return message(remote[1]);
 if(value.startsWith('Error: '))return message(value.slice(7));
 for(const {key,names,pattern} of dynamicMessages){const match=pattern.exec(value);if(match)return t(key,Object.fromEntries(names.map((name,i)=>[name,match[i+1]])));}
 return value;
}

export function locale(){return getLanguage()==='zh'?'zh-Hans':getLanguage();}
