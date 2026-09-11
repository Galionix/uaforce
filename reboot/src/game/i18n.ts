import {EN} from './en.ts';
export type Locale='uk'|'en';
export const LANGUAGE_KEY='uaforce.language';
let locale:Locale='uk';
try{if(typeof window!=='undefined'&&window.localStorage.getItem(LANGUAGE_KEY)==='en')locale='en';}catch{}
const listeners=new Set<()=>void>();
export const getLocale=()=>locale;
export function setLocale(value:string){
 if(value!=='uk'&&value!=='en')return;
 try{if(typeof window!=='undefined')window.localStorage.setItem(LANGUAGE_KEY,value);}catch{}
 if(value===locale)return;locale=value;for(const listener of listeners)listener();
}
export function onLocaleChange(listener:()=>void){listeners.add(listener);return ()=>listeners.delete(listener);}
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// One pass, longest phrase first. Word boundaries prevent a short unit or name
// from matching inside a different word. Values are never translated again.
const phrases=new RegExp(Object.keys(EN).sort((a,b)=>b.length-a.length).map(escape).join('|'),'gu');
const cache=new Map<string,string>();
export function translate(source:string,language:Locale=locale):string{
 if(language==='uk'||!/[а-яіїєґ]/i.test(source))return source;
 const saved=cache.get(source);if(saved!==undefined)return saved;
 const result=source.replace(phrases,(key,offset:number,full:string)=>{
  // Avoid lookbehind so older mobile Safari can load the game too.
  const before=full[offset-1]??'',after=full[offset+key.length]??'';
  return /\p{L}/u.test(before)||/\p{L}/u.test(after)?key:EN[key];
 });
 if(cache.size>=1024)cache.clear();cache.set(source,result);return result;
}
