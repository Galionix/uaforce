import { HEROES, MISSIONS, type HeroId } from './content.ts';
export type RecordResult={seconds:number;rescued:number;kills:number;shots:number;hits:number};
export type Progress={mission:number;unlocked:HeroId[];hero:HeroId;completed:boolean};
export const freshProgress=():Progress=>({mission:0,unlocked:['shevchenko'],hero:'shevchenko',completed:false});
export function parseProgress(raw:string|null):Progress{
 try{const r=JSON.parse(raw??'null');if(!r)return freshProgress();const legacy:Record<string,string>={kozak:'shevchenko',kharakternyk:'lesya',scout:'franko'};r.hero=legacy[r.hero]??r.hero;r.unlocked=Array.isArray(r.unlocked)?r.unlocked.map((id:string)=>legacy[id]??id):[];const unlocked=HEROES.filter(h=>r.unlocked?.includes(h.id)).map(h=>h.id);if(!unlocked.includes('shevchenko'))unlocked.unshift('shevchenko');const previousSize=Number.isInteger(r.campaignSize)?r.campaignSize:r.mission===2?3:0;const expanded=r.completed===true&&previousSize>0&&previousSize<MISSIONS.length&&r.mission===previousSize-1;return{mission:expanded?previousSize:Number.isInteger(r.mission)?Math.max(0,Math.min(MISSIONS.length-1,r.mission)):0,unlocked,hero:unlocked.includes(r.hero)?r.hero:'shevchenko',completed:!expanded&&r.completed===true};}catch{return freshProgress();}
}
export function readProgress():Progress{try{return parseProgress(localStorage.getItem('uaforce.campaign.v1'));}catch{return freshProgress();}}
export function saveProgress(p:Progress){try{localStorage.setItem('uaforce.campaign.v1',JSON.stringify({...p,campaignSize:MISSIONS.length}));}catch{}}
export function readRecord(mission=0):RecordResult|null{try{const r=JSON.parse(localStorage.getItem('uaforce.record.v3.'+mission)??'null');return r&&Number.isFinite(r.seconds)&&r.seconds>0?r:null;}catch{return null;}}
export function saveRecord(r:RecordResult,mission=0){try{const old=readRecord(mission);if(!old||r.seconds<old.seconds)localStorage.setItem('uaforce.record.v3.'+mission,JSON.stringify(r));}catch{}}
