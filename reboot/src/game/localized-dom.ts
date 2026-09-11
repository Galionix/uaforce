import {getLocale,onLocaleChange,translate} from './i18n.ts';
type Copy={source:string;rendered:string};
const attributes=['aria-label','aria-description','aria-valuetext','title','alt','placeholder'];
const excluded='script,style,textarea,input,pre,code,[translate="no"],[data-no-localize]';
/** Localize the display boundary only: world messages, entity IDs, saves and
 * network snapshots stay canonical. Retain source copies for live switching. */
export function localizeDocument(root:HTMLElement){
 const texts=new WeakMap<Text,Copy>();
 const attrs=new WeakMap<Element,Map<string,Copy>>();
 function translated(value:string,previous?:Copy):Copy{
  const source=previous?.rendered===value?previous.source:value;
  return {source,rendered:translate(source)};
 }
 function text(node:Text){
  if(node.parentElement?.closest(excluded))return;
  const value=node.data,copy=translated(value,texts.get(node));texts.set(node,copy);
  if(value!==copy.rendered)node.data=copy.rendered;
 }
 function attribute(el:Element,name:string){
  if(el.closest('[translate="no"],[data-no-localize]'))return;
  const value=el.getAttribute(name);if(value===null){attrs.get(el)?.delete(name);return;}
  let map=attrs.get(el);if(!map){map=new Map();attrs.set(el,map);}
  const copy=translated(value,map.get(name));map.set(name,copy);
  if(value!==copy.rendered)el.setAttribute(name,copy.rendered);
 }
 function walk(node:Node){
  if(node.nodeType===Node.TEXT_NODE){text(node as Text);return;}
  if(node instanceof Element){if(node.matches(excluded))return;for(const name of attributes)attribute(node,name);}
  for(const child of Array.from(node.childNodes))walk(child);
 }
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')text(record.target as Text);
   else if(record.type==='attributes')attribute(record.target as Element,record.attributeName!);
   else for(const node of Array.from(record.addedNodes))walk(node);
  }
 });
 const refresh=()=>{document.documentElement.lang=getLocale();walk(root);};
 refresh();observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
 const off=onLocaleChange(refresh);
 return ()=>{observer.disconnect();off();};
}
