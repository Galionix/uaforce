import {World,createPlayerBody,type Enemy,type Box} from './world.ts';
import {HEROES,MISSIONS,type HeroId} from './content.ts';
import {addInfantry,type InfantryKind} from './infantry.ts';
import {addVehicle} from './enemies.ts';
import {addMount} from './mounts.ts';
import {resetWeapon,WEAPONS} from './weapons.ts';
export type SurvivalState={wave:number;cleared:number;phase:'break'|'combat'|'ended';timer:number;elapsed:number;pending:number;spawnIn:number;spawned:number;pressure:number;rank:{id:string;guestToken:string}|null;endReason?:'defeat'|'disconnect'|'quit'};
export const SURVIVAL={width:44,soloCap:16,duoCap:22,firstTankWave:5};
export function waveBudget(wave:number,players:number){return (6+wave*3)*(players===2?2:1);}
export function waveRole(wave:number,index:number):InfantryKind|'tank'|'plane'|'shahed'{
 if(wave>=7&&index%13===12)return 'plane';
 if(wave>=5&&index%11===10)return 'tank';
 if(wave>=3&&index%5===4)return 'shahed';
 const mixes:InfantryKind[][]=[['rifle','assault','scout'],['shield','rifle','demolition','assault'],['sniper','scout','rifle','gunner']];
 const mix=mixes[(wave-1)%mixes.length];return mix[index%mix.length];
}
export function survivalWorld(hero:HeroId='shevchenko',partner?:HeroId){
 const w=new World(0,HEROES.map(h=>h.id),hero);
 w.survival={wave:0,cleared:0,phase:'break',timer:8,elapsed:0,pending:0,spawnIn:0,spawned:0,pressure:0,rank:null};
 w.mission={...MISSIONS[0],name:'Нескінченна оборона',region:'Арена виживання',length:SURVIVAL.width,exit:1000,radio:1,layout:undefined,boss:undefined,forts:[[4,16],[28,40]],floorPlans:[[4],[4]],floors:[4],checkpoints:[],allies:[],ammo:[],medkits:[],mounts:[],vehicles:[],enemies:[],districts:[{...MISSIONS[0].districts[0],start:0,end:44,name:'Останній рубіж'}]};
 w.boxes=[];w.enemies=[];w.allies=[];w.medkits=[];w.ammoCrates=[];w.mounts=[];w.boss=null;w.story=null;w.events=[];w.ceiling=22;
 const box=(x:number,y:number,width:number,height:number,hp:number,kind:Box['kind'])=>w.boxes.push({id:w.nextId(),x,y,w:width,h:height,hp,maxHp:hp,kind});
 for(let x=0;x<44;x++){box(x+.5,-2,1,1,Infinity,'earth');box(x+.5,-1,1,1,60,'earth');}
 for(const [left,right,y] of [[4,16,4],[28,40,4],[15,29,8]]){box((left+right)/2,y-.3,right-left,.3,Infinity,'platform');for(let x=left;x<right;x++)box(x+.5,y-.8,1,.5,65,'stone');}
 w.ladders=[{x:7,bottom:-1,top:4},{x:37,bottom:-1,top:4},{x:16,bottom:-1,top:8},{x:28,bottom:-1,top:8}];
 for(const [x,y] of [[9,0],[35,0],[6,4],[38,4]])box(x,y,1,1,25,'barrel');
 for(const [x,y] of [[12,0],[32,0],[20,8],[24,8]])box(x,y,1,1,40,'crate');
 box(1,0,1.6,2.2,150,'radio');
 box(22,-.25,14,.25,Infinity,'platform');
 w.player.x=20;w.player.y=0;w.checkpoint=20;w.lives=1;
 if(partner){const p=w.addPlayer(partner);p.lives=1;p.body.x=24;}
 w.mode='playing';return w;
}
export function endSurvival(w:World,reason:SurvivalState['endReason']='defeat'){
 if(!w.survival||w.survival.phase==='ended')return;
 w.survival.phase='ended';w.survival.endReason=reason;w.mode='lost';w.emit('lost',w.player.x,w.player.y);
}
export function survivalDrop(w:World,e:Enemy){
 if(!w.survival)return;
 const x=Math.max(2,Math.min(42,e.x));
 const y=Math.max(-1,...w.boxes.filter(b=>b.hp>0&&Math.abs(b.x-x)<b.w/2&&b.y+b.h<=e.y+.2).map(b=>b.y+b.h));
 w.ammoCrates=w.ammoCrates.filter(c=>!c.used);w.medkits=w.medkits.filter(c=>!c.used);
 if(w.kills%7===0&&w.ammoCrates.length<3)w.ammoCrates.push({x,y,used:false});
 if(w.kills%5===0&&w.medkits.length<3)w.medkits.push({x,y,used:false});
}
function clearWave(w:World){
 const s=w.survival!;s.cleared=s.wave;s.phase='break';s.timer=6;w.bullets=[];w.enemies=[];
 // A survivor earns the partner's return. No campaign life/progression changes.
 for(const a of w.players)if(a.body.hp<=0){Object.assign(a.body,createPlayerBody(),{x:20+a.id*4,y:0,hp:65,energy:0,invulnerable:3});a.lives=1;a.move=0;a.mounted=null;a.interactHeld=false;resetWeapon(a.body,WEAPONS[a.heroId]);w.withPlayer(a.id,()=>w.emit('respawn',a.body.x,a.body.y));}
 w.medkits=w.medkits.filter(c=>!c.used).slice(-2);w.ammoCrates=w.ammoCrates.filter(c=>!c.used).slice(-2);
 for(const a of w.players)w.medkits.push({x:18+a.id*8,y:0,used:false});
 w.ammoCrates.push({x:22,y:8,used:false});
 // Keep rewards finite in memory, and never replace/refill a surviving tank.
 w.mounts=w.mounts.filter(t=>t.armor>0);
 if(s.wave%SURVIVAL.firstTankWave===0&&!w.mounts.length){const t=addMount(w,22);t.armor=t.maxArmor=180;t.rounds=t.maxRounds=5;w.emit('mountEnter',22,1);}
 w.emit('checkpoint',22,8);
}
export function stepSurvival(w:World,dt:number){
 const s=w.survival;if(!s||s.phase==='ended')return;
 if(w.players.every(a=>a.body.hp<=0)){endSurvival(w);return;}
 w.enemies=w.enemies.filter(e=>e.hp>0);
 if(s.phase==='break'){
  s.timer=Math.max(0,s.timer-dt);if(s.timer>0)return;
  s.wave++;s.phase='combat';s.pending=waveBudget(s.wave,w.players.length);s.spawned=0;s.spawnIn=.5;s.pressure=0;w.emit('enemyAlert',22,8);return;
 }
 s.elapsed+=dt;
 for(const e of w.enemies)if(e.infantry&&!e.panic){const p=w.nearestPlayer(e.x,e.y).body;if(p.cloak<=0){e.infantry.memory=3;e.infantry.lastX=p.x;e.infantry.lastY=p.y;}}
 if(!s.pending&&!w.enemies.length){clearWave(w);return;}
 // Camping cannot farm time safely: sustained waves acquire aerial pressure.
 s.pressure+=dt;if(s.pressure>=30){s.pressure=0;s.pending+=2;}
 s.spawnIn-=dt;
 const cap=w.players.length===2?SURVIVAL.duoCap:SURVIVAL.soloCap;
 if(s.pending&&s.spawnIn<=0&&w.enemies.length<cap){
  const role=s.spawned>=waveBudget(s.wave,w.players.length)?'shahed':waveRole(s.wave,s.spawned);
  const spots=role==='tank'?[{x:3,y:-1},{x:41,y:-1}]:role==='plane'?[{x:46,y:13}]:role==='shahed'?[{x:3,y:13},{x:41,y:13}]:[{x:2,y:0},{x:42,y:0},{x:5,y:4},{x:39,y:4},{x:16,y:8},{x:28,y:8}];
  const live=w.players.filter(a=>a.body.hp>0);
  const safe=spots.filter(s=>live.every(p=>Math.hypot(p.body.x-s.x,p.body.y-s.y)>=7));
  const candidates=safe.length?safe:spots;const spot=candidates[s.spawned%candidates.length];
  const e=role==='tank'||role==='plane'||role==='shahed'?addVehicle(w,role,spot.x,spot.y,-100):addInfantry(w,role,spot.x,spot.y);
  e.hp=e.maxHp=Math.round(e.hp*Math.min(1.8,1+(s.wave-1)*.025));
  if(e.infantry){e.cooldown=1.4;e.infantry.cooldown=1.4;e.infantry.reaction=1.1;e.infantry.alert=1.1;w.emit('enemySuspect',e.x,e.y+1);}
  s.pending--;s.spawned++;s.spawnIn=Math.max(.4,1.6-s.wave*.05);
 }
}
