import {createContext,useContext} from 'react';
export type ViewKind='levels'|'music'|'disassembler'|'memory'|'numbers'|'text'|'bitmap';
export type OpenView=(kind:ViewKind,preferences:Record<string,unknown>)=>void;
export const PanelActions=createContext<OpenView>(()=>{});
export const useOpenView=()=>useContext(PanelActions);
