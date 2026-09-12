import {type Enemy,type World,type Effect} from './world.ts';
import {clearShot,navigateGround} from './followers.ts';
import {hostileBlast} from './enemies.ts';
import {cycleWeapon,resetWeapon,type WeaponSpec,type WeaponState} from './weapons.ts';
export type InfantryKind='rifle'|'assault'|'gunner'|'sniper'|'scout'|'shield'|'demolition';
export type Infantry=WeaponState & {kind:InfantryKind;state:'patrol'|'suspicious'|'idle'|'alert'|'pursue'|'attack'|'reload'|'search'|'fuse'|'panic';patrolDir:number;patrolWait:number;suspicion:number;suspectCooldown:number;alert:number;reaction:number;memory:number;lastX:number;lastY:number;vy:number;grounded:boolean;ladder:number;moving:boolean;fuse:number;shield:number;attack:number;knockup?:boolean};
const weapon=(range:number,magazine:number,burst:number,damage:number,pause:number,reload:number):WeaponSpec=>({mode:'burst',range,magazine,burst,damage,burstPause:pause,reloadTime:reload,cooldown:.19,projectileSpeed:24});
/** Arcade roles inspired by equipment; these are not real unit rosters or ballistics. */
export const INFANTRY={
 rifle:{name:'Мотострілець РФ',hp:96,speed:3.4,sight:14,range:9,aim:.6,weapon:weapon(9,6,2,7,1.3,2.4),color:'#67724d'},
 assault:{name:'Штурмовик ВДВ',hp:112,speed:4.8,sight:15,range:7,aim:.4,weapon:weapon(7,9,3,6,.95,2.5),color:'#526956'},
 gunner:{name:'Кулеметник РФ',hp:160,speed:2.5,sight:16,range:11,aim:.85,weapon:weapon(11,12,4,7,1.6,3.4),color:'#777047'},
 sniper:{name:'Снайпер РФ',hp:90,speed:3,sight:19,range:15,aim:1.35,weapon:weapon(15,1,1,22,1,3.8),color:'#4a6450'},
 scout:{name:'Розвідник-зв’язківець РФ',hp:90,speed:4.3,sight:18,range:8,aim:.55,weapon:weapon(8,4,1,6,1.1,2),color:'#50616a'},
 shield:{name:'Щитоносець Росгвардії',hp:130,speed:2.8,sight:13,range:5,aim:.65,weapon:weapon(5,5,1,8,1,2.6),color:'#38464e'},
 demolition:{name:'Підривник-штурмовик РФ',hp:90,speed:5.4,sight:15,range:1.6,aim:.55,weapon:weapon(0,0,0,0,0,0),color:'#806449'},
} as const;
export function equipInfantry(e:Enemy,kind:InfantryKind){
 const spec=INFANTRY[kind];e.hp=e.maxHp=e.heavy?240:spec.hp;
 const a:Infantry={kind,state:'patrol',patrolDir:e.id%2?1:-1,patrolWait:0,suspicion:0,suspectCooldown:0,alert:0,reaction:0,memory:0,lastX:e.x,lastY:e.y,vy:0,grounded:false,ladder:-1,moving:false,fuse:-1,shield:kind==='shield'?80:0,attack:0,ammo:0,reloading:0,burstShots:0,weaponTrigger:false,cooldown:0};resetWeapon(a,spec.weapon);a.cooldown=e.cooldown;e.infantry=a;return e;
}
export function addInfantry(w:World,kind:InfantryKind,x:number,y=0){const e:Enemy={id:w.nextId(),x,y,hp:0,maxHp:0,dir:-1,cooldown:0,windup:0,anchor:x,heavy:false};equipInfantry(e,kind);w.enemies.push(e);return e;}
export function missionInfantry(w:World){
 // Introduce roles gradually; elevated posts favor scouts and precision shooters.
 const roles:InfantryKind[]=['rifle','assault','rifle','scout','demolition','shield','gunner','assault','sniper','demolition'];
 let index=0;for(const e of w.enemies){if(e.boss||e.vehicle)continue;const n=index++;equipInfantry(e,e.heavy?'gunner':e.y>1?(n%2?'sniper':'scout'):e.x<35?'rifle':roles[(n+(w.missionIndex?2:0))%roles.length]);}
}
function alert(w:World,e:Enemy,x:number,y:number){const a=e.infantry!;a.state='alert';a.suspicion=0;a.alert=1.1;a.reaction=.55;a.memory=5;a.lastX=x;a.lastY=y;e.windup=0;w.emit('enemyAlert',e.x,e.y+2);}
/** Panic is host-owned, bound to its caster/effect, and cannot frighten machinery. */
export function frighten(w:World,e:Enemy,f:Effect){
 if(e.hp<=0||e.boss||e.vehicle||f.life<=0)return;
 if(!e.panic||f.life>e.panic.remaining){
  const voiceIn=e.panic?.voiceIn??0;
  e.panic={remaining:f.life,playerId:f.playerId??0,hero:f.hero,kind:f.kind,voiceIn};
 }
 e.rooted=0;e.distracted=0;e.windup=0;
}
export function stepInfantry(w:World,e:Enemy,dt:number){
 if(!e.infantry){const hp=e.hp,max=e.maxHp;equipInfantry(e,e.heavy?'gunner':'rifle');e.hp=hp;e.maxHp=max;}
 const a=e.infantry!;const spec=INFANTRY[a.kind];
 a.suspicion=Math.max(0,a.suspicion-dt);a.suspectCooldown=Math.max(0,a.suspectCooldown-dt);
 a.alert=Math.max(0,a.alert-dt);a.attack=Math.max(0,a.attack-dt);a.moving=false;
 const navigate=(tx:number,ty:number,speed:number)=>{const body={x:e.x,y:e.y,dir:e.dir,vy:a.vy,grounded:a.grounded,ladder:a.ladder,moving:false};navigateGround(w,body,tx,ty,dt,speed);e.x=body.x;e.y=body.y;e.dir=body.dir;a.vy=body.vy;a.grounded=body.grounded;a.ladder=body.ladder;a.moving=body.moving;};
 if(a.knockup){navigate(e.x,e.y,0);a.reaction=Math.max(a.reaction,.3);e.windup=0;if(a.grounded)a.knockup=false;return;}
 // Quiet guards walk on their current floor; do not leap off roofs or into craters.
 const safeWalk=(tx:number,speed:number)=>{
  const dir=Math.sign(tx-e.x),ahead=e.x+dir*1.05;
  const supported=w.boxes.some(b=>b.hp>0&&Math.abs(ahead-b.x)<b.w/2&&Math.abs(b.y+b.h-e.y)<.16);
  const blocked=w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(ahead-b.x)<b.w/2+.34&&e.y+1.5>b.y+.05&&e.y<b.y+b.h-.05);
  const safe=!!dir&&supported&&!blocked&&ahead>1&&ahead<w.mission.length-2;
  navigate(safe?tx:e.x,e.y,safe?speed:0);return safe;
 };
 const suspect=(x:number,y:number)=>{if(a.suspectCooldown>0)return;a.suspicion=2.2;a.suspectCooldown=5;a.lastX=x;a.lastY=y;w.emit('enemySuspect',e.x,e.y+2);};
 if(e.panic){
  const fear=e.panic,source=w.players[fear.playerId]?.body;
  const active=source&&source.hp>0&&w.effects.some(f=>f.life>0&&f.hero===fear.hero&&f.kind===fear.kind&&(f.playerId??0)===fear.playerId);
  fear.remaining=Math.max(0,fear.remaining-dt);
  if(active&&fear.remaining>0){
   a.state='panic';a.attack=0;a.fuse=-1;e.windup=0;e.rooted=0;
   cycleWeapon(a,spec.weapon,dt,false);
   const away=Math.sign(e.x-source.x)||e.dir||1;
   // Keep moving away as the caster moves; shared navigation respects solids and gaps.
   navigate(e.x+away*8,e.y,Math.max(5.5,spec.speed*1.35));
   a.memory=5;a.lastX=source.x;a.lastY=source.y;a.reaction=.45;
   fear.voiceIn-=dt;
   if(fear.voiceIn<=0){fear.voiceIn=1.4+(e.id%5)*.13;w.emit('enemyPanic',e.x,e.y+1);}
   return;
  }
  e.panic=undefined;a.state='alert';a.reaction=.45;
 }
 e.rooted=Math.max(0,(e.rooted??0)-dt);
 if(e.rooted>0){e.windup=0;a.reaction=Math.max(a.reaction,.3);return;}
 if(a.fuse>=0){a.state='fuse';navigate(e.x,e.y,0);a.fuse-=dt;if(a.fuse<=0){w.damageEnemy(e,e.hp);hostileBlast(w,e.x,e.y+.9,2.8,38);}return;}
 const cloud=e.distracted?w.effects.find(f=>f.hero==='lesya'&&f.kind==='special'):undefined;
 const decoy=cloud?{x:cloud.x,y:cloud.y+3}:undefined;
 const targets=decoy?[decoy]:[...w.players.filter(a=>a.body.hp>0&&a.body.cloak<=0).map(a=>a.body),...w.followers.filter(f=>f.hp>0),...w.enemies.filter(e=>e.hp>0&&e.hacked)];
 const visible=targets.filter(t=>Math.hypot(t.x-e.x,t.y-e.y)<=spec.sight&&clearShot(w,e,t)).sort((x,y)=>Math.hypot(x.x-e.x,x.y-e.y)-Math.hypot(y.x-e.x,y.y-e.y));
 const target=visible[0];
 if(target&&!decoy&&a.kind!=='demolition'&&Math.hypot(target.x-e.x,target.y-e.y)<1){const actor=w.players.find(a=>a.body===target);if(actor)w.withPlayer(actor.id,()=>w.damagePlayer(12,true));else{const follower=w.followers.find(f=>f===target);if(follower&&follower.contactCooldown<=0){w.damageFollower(follower,12);follower.contactCooldown=.65;}}}
 if(target){
  if(a.memory<=0){alert(w,e,target.x,target.y);
   if(a.kind==='scout')for(const other of w.enemies){if(other===e||other.hp<=0||!other.infantry||other.infantry.memory>0||Math.hypot(other.x-e.x,other.y-e.y)>9)continue;alert(w,other,target.x,target.y);}
  }
  a.memory=5;a.lastX=target.x;a.lastY=target.y;
 }else {
  if(a.memory>0&&['pursue','attack','reload'].includes(a.state))suspect(a.lastX,a.lastY);
  a.memory=Math.max(0,a.memory-dt);
 }
 if(a.reaction>0){a.reaction=Math.max(0,a.reaction-dt);a.state='alert';navigate(e.x,e.y,0);cycleWeapon(a,spec.weapon,dt,false);return;}
 if(a.memory<=0){
  e.windup=0;cycleWeapon(a,spec.weapon,dt,false);
  const noise=w.noises.slice().reverse().find(n=>Math.hypot(n.x-e.x,n.y-e.y)<10);
  if(noise)suspect(noise.x,noise.y);
  if(a.suspicion>0){a.state='suspicious';e.dir=Math.sign(a.lastX-e.x)||e.dir;if(a.suspicion<1.55)safeWalk(Math.max(e.anchor-4,Math.min(e.anchor+4,a.lastX)),spec.speed*.38);else navigate(e.x,e.y,0);return;}
  a.state='patrol';a.patrolWait=Math.max(0,a.patrolWait-dt);
  if(a.patrolWait>0){navigate(e.x,e.y,0);return;}
  const radius=a.kind==='sniper'?1.4:e.heavy?1.8:2.5+(e.id%3)*.5;
  const tx=Math.max(1.8,Math.min(w.mission.length-2.8,e.anchor+a.patrolDir*radius));
  if(Math.abs(tx-e.x)<.2||!safeWalk(tx,spec.speed*.42)){a.patrolDir=-a.patrolDir;e.dir=a.patrolDir;a.patrolWait=.55+(e.id%4)*.18;}
  return;
 }
 const distance=target?Math.abs(target.x-e.x):Infinity;
 const aligned=!!target&&(!!decoy||Math.abs(target.y-e.y)<.6);
 const supported=w.boxes.some(b=>b.hp>0&&Math.abs(b.x-e.x)<b.w/2+.25&&Math.abs(b.y+b.h-e.y)<.1);
 const inRange=aligned&&distance<=spec.range&&supported;
 if(a.kind==='demolition'){
  a.state='pursue';navigate(a.lastX,a.lastY,spec.speed);
  if(target&&Math.hypot(target.x-e.x,target.y-e.y)<1.65){a.fuse=.75;a.state='fuse';w.emit('enemyFuse',e.x,e.y+1);}
  return;
 }
 const tx=inRange?e.x:target?(!aligned||!supported?target.x:target.x-Math.sign(target.x-e.x)*spec.range*.7):a.lastX;
 a.state=target?'pursue':'search';navigate(tx,a.lastY,spec.speed);
 if(target)e.dir=Math.sign(target.x-e.x)||e.dir;
 // Recheck after movement, every frame of a burst: no tracking through cover or floors.
 const canFire=!!target&&a.ladder<0&&(!!decoy||Math.abs(target.y-e.y)<.6)&&Math.hypot(target.x-e.x,target.y-e.y)<=spec.range&&clearShot(w,e,target);
 if(!canFire){e.windup=0;cycleWeapon(a,spec.weapon,dt,false);return;}
 if(a.reloading>0){a.state='reload';cycleWeapon(a,spec.weapon,dt,false);e.windup=0;return;}
 a.state='attack';
 if(a.burstShots===0&&a.cooldown<=dt&&e.windup<=0){e.windup=spec.aim;w.emit('enemyAim',e.x,e.y+1);}
 if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup>0){cycleWeapon(a,spec.weapon,dt,false);return;}}
 const shot=cycleWeapon(a,spec.weapon,dt,true);
 if(shot.fired){a.attack=.14;const gun=spec.weapon;w.bullets.push({id:w.nextId(),x:e.x,y:e.y+1,vx:decoy?(decoy.x-e.x)/Math.hypot(decoy.x-e.x,decoy.y-e.y)*gun.projectileSpeed:e.dir*gun.projectileSpeed,vy:decoy?(decoy.y-e.y)/Math.hypot(decoy.x-e.x,decoy.y-e.y)*gun.projectileSpeed:0,life:gun.range/gun.projectileSpeed,friendly:false,damage:gun.damage});w.emit(a.kind==='sniper'?'enemySniperShot':'enemyShot',e.x,e.y+1);}
 if(shot.reloadStarted){a.state='reload';w.emit('enemyReload',e.x,e.y+1);}
}
