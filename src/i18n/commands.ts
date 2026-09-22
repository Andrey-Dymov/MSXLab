import {t} from './index';
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Recognize the localized examples; labels and addresses are passed through verbatim. */
export function normalizeCommand(input:string){
 for(const [key,canonical] of [['Покажи {p0} как текст','Покажи {p0} как текст'],['Покажи {p0}','Покажи {p0}'],['Перейти к адресу {p0}','Перейти к адресу {p0}']]){
  const parts=t(key).split('{p0}');if(parts.length!==2)continue;
  const match=new RegExp('^'+escape(parts[0])+'(.+?)'+escape(parts[1])+'$','iu').exec(input);
  if(match)return canonical.replace('{p0}',match[1]);
 }
 return input;
}
