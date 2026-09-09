import {assetUrl} from './assets.ts';
import {enemyActive} from './enemies.ts';import type {World} from './world.ts';
export const SCORE_THEMES=['river','city','coast','mountain','rail','marsh'] as const;
export type ScoreTheme=typeof SCORE_THEMES[number];
/** Danger is local and must be active; an unopened boss arena is not combat. */
export function musicDanger(w:World,firing=false){const p=w.player;return firing||w.enemies.some(e=>enemyActive(e)&&Math.abs(e.x-p.x)<13&&Math.abs(e.y-p.y)<9)||w.bullets.some(b=>!b.friendly&&Math.abs(b.x-p.x)<12);}
export class MusicMood {
 private hold=0;
 step(dt:number,danger:boolean,boss:boolean){if(danger)this.hold=12;else this.hold=Math.max(0,this.hold-dt);return boss?'boss':this.hold>0?'combat':'explore';}
 reset(){this.hold=0;}
}
/** Three-second crossfades between local, fully composed loops. No live synthesis or external service. */
export class ScorePlayer {
 private cache=new Map<string,Promise<AudioBuffer|null>>();private revision=0;private desired='';private retryAt=0;
 private sources=new Map<AudioBufferSourceNode,GainNode>();private current:AudioBufferSourceNode|null=null;
 private positions=new Map<string,number>();private activeId="";private started=0;private offset=0;
 private remember(){if(this.current?.buffer)this.positions.set(this.activeId,(this.offset+this.ctx.currentTime-this.started)%this.current.buffer.duration);}
 private bus:GainNode;private ctx:AudioContext;
 constructor(ctx:AudioContext,destination:GainNode){this.ctx=ctx;this.bus=ctx.createGain();this.bus.connect(destination);}
 duck(active:boolean){this.bus.gain.setTargetAtTime(active?.25:1,this.ctx.currentTime,.2);}
 get track(){return this.desired;}
 stop(){this.remember();this.revision++;this.desired='';this.current=null;for(const [source,gain]of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();}this.sources.clear();}
 private load(id:string){
  const prior=this.cache.get(id);if(prior)return prior;
  const promise=fetch(assetUrl(`/assets/audio/music/${id}.wav`)).then(r=>{if(!r.ok)throw Error('score missing');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).catch(()=>null);
  this.cache.set(id,promise);if(this.cache.size>5)this.cache.delete(this.cache.keys().next().value!);return promise;
 }
 async play(id:string){
  if(this.ctx.state!=='running'||id===this.desired||this.ctx.currentTime<this.retryAt)return;
  this.desired=id;const token=++this.revision;const buffer=await this.load(id);
  if(token!==this.revision)return;
  if(!buffer){this.cache.delete(id);this.desired='';this.retryAt=this.ctx.currentTime+5;return;}
  if(this.ctx.state!=='running'){this.stop();return;}
  const now=this.ctx.currentTime,source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.bus);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(id==='menu'?.55:.7,now+3);
  this.remember();
  if(this.current){const old=this.current,amp=this.sources.get(old)!;amp.gain.cancelScheduledValues(now);amp.gain.setValueAtTime(amp.gain.value,now);amp.gain.linearRampToValueAtTime(0,now+3);try{old.stop(now+3.05);}catch{}}
  source.onended=()=>{source.disconnect();gain.disconnect();this.sources.delete(source);};this.sources.set(source,gain);this.current=source;this.activeId=id;this.started=now;this.offset=(this.positions.get(id)??0)%buffer.duration;source.start(now,this.offset);
 }
}
