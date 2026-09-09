import {World,IDLE,type Actions,type Event,type Box} from './world.ts';
import type {HeroId} from './content.ts';
/** Versioned wire format. Only the host runs World.stepPlayers. No guest world edits. */
export const COOP_VERSION='uaforce-coop-2';
export function cleanActions(value:unknown):Actions|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.move!=='number'||!Number.isFinite(v.move)||typeof v.climb!=='number'&&v.climb!==undefined||typeof v.climb==='number'&&!Number.isFinite(v.climb))return null;
 for(const k of ['jump','fire','special','interact'])if(typeof v[k]!=='boolean')return null;
 return {move:Math.max(-1,Math.min(1,v.move)),climb:Math.max(-1,Math.min(1,(v.climb as number)??0)),jump:v.jump===true,jumpHeld:v.jumpHeld===true,fire:v.fire===true,special:v.special===true,ultimate:v.ultimate===true,interact:v.interact===true};
}
/** Edge actions survive network arrival between simulation ticks; stale held fire expires. */
export class RemoteInput {
 private action:Actions={...IDLE};private last=-Infinity;private seq=-1;
 receive(seq:number,value:unknown,now:number){const a=cleanActions(value);if(!Number.isSafeInteger(seq)||seq<=this.seq||!a)return false;this.seq=seq;this.last=now;this.action={...a,jump:a.jump||this.action.jump,special:a.special||this.action.special,ultimate:a.ultimate||this.action.ultimate};return true;}
 take(now:number){if(now-this.last>.35){this.action={...IDLE};return {...IDLE};}const a={...this.action};this.action.jump=this.action.special=this.action.ultimate=false;return a;}
}
const fields=['mode','story','storyDone','cinematic','evac','enemies','bullets','followers','allies','ammoCrates','medkits','mounts','time','kills','shots','hits','destroyed','unlocked'] as const;
type MutableBox=Pick<Box,'id'|'x'|'y'|'hp'|'vx'|'vy'>;
export class SnapshotWriter {
 private base=new Map<number,string>();
 readonly epoch=crypto.randomUUID();
 private world:World;
 constructor(world:World){this.world=world;for(const b of world.boxes)this.base.set(b.id,JSON.stringify(this.box(b)));}
 private box(b:Box):MutableBox{return {id:b.id,x:b.x,y:b.y,hp:Number.isFinite(b.hp)?b.hp:1e30,vx:b.vx,vy:b.vy};}
 snapshot(sequence:number,events:Event[]=[]){const w=this.world;return {version:COOP_VERSION,epoch:this.epoch,sequence,mission:w.missionIndex,players:w.players.map(a=>({id:a.id,body:{...a.body},heroId:a.heroId,lives:a.lives,checkpoint:a.checkpoint,heldBarrel:a.heldBarrel,mounted:a.mounted?.id??null,move:a.move})),state:Object.fromEntries(fields.map(k=>[k,w[k]])),boxes:w.boxes.map(b=>this.box(b)).filter(b=>JSON.stringify(b)!==this.base.get(b.id)),effects:w.effects.map(f=>({...f,hit:[...f.hit],audioMarks:[...(f.audioMarks??[])]})),events};}
}
export type Snapshot=ReturnType<SnapshotWriter['snapshot']>;
export function applySnapshot(w:World,s:Snapshot){
 for(const k of fields)(w as unknown as Record<string,unknown>)[k]=s.state[k];
 while(w.players.length<s.players.length)w.addPlayer(s.players[w.players.length].heroId);
 for(const a of s.players){const target=w.players[a.id];Object.assign(target.body,a.body);target.heroId=a.heroId as HeroId;target.lives=a.lives;target.checkpoint=a.checkpoint;target.heldBarrel=a.heldBarrel;target.mounted=w.mounts.find(t=>t.id===a.mounted)??null;target.move=a.move;}
 const boxes=new Map(w.boxes.map(b=>[b.id,b]));for(const b of s.boxes){const target=boxes.get(b.id);if(target)Object.assign(target,b);}
 w.effects=s.effects.map(f=>({...f,hit:new Set(f.hit),audioMarks:new Set(f.audioMarks)}));
 w.boss=w.enemies.find(e=>e.boss)??null;w.events.push(...s.events);w.selectPlayer(1);
}
