import {createContext,useContext,useRef,useState} from 'react';
interface Settings {values:Record<string,unknown>;save:(key:string,value:unknown)=>void}
const Context=createContext<Settings>({values:{},save:()=>{}});
export function PanelSettings({values,save,children}:{values:Record<string,unknown>;save:(values:Record<string,unknown>)=>void;children:React.ReactNode}){const ref=useRef(values);ref.current=values;return <Context.Provider value={{values,save:(key,value)=>{ref.current={...ref.current,[key]:value};save(ref.current);}}}>{children}</Context.Provider>;}
export function usePanelSetting<T>(key:string,initial:T):[T,(value:T)=>void]{const context=useContext(Context);const [value,setValue]=useState<T>(()=>(context.values[key] as T)??initial);return [value,(next:T)=>{setValue(next);context.save(key,next);}];}
