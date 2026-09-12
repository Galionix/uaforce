import {BOSSES} from './bosses.ts';
import {heroById} from './content.ts';
import {enemyActive,enemySize} from './enemies.ts';
import {clearShot,summonFollowers} from './followers.ts';
import {addMount,TANK} from './mounts.ts';
import {segmentHit,type World,type Effect,type Enemy} from './world.ts';

export const NEW_HEROES=['usyk','almaziv','klychko','taira','prytula'] as const;
export function knockback(w:World,e:Enemy,dir:number,distance:number){
 if(e.boss||e.vehicle)return;
 // Resolve each short step against terrain so a punch never pushes a target through a wall.
 for(let moved=0;moved<distance;moved+=.2){const x=e.x+dir*.2;if(x<1||x>w.mission.length-2||w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(x-b.x)<b.w/2+.35&&e.y+1.5>b.y+.05&&e.y<b.y+b.h-.05))break;e.x=x;}
}
/** Aim at an exposed part of the hurtbox, not the feet-relative center of a sunken target. */
export function meleeContact(w:World,e:Enemy,range:number,dir=w.player.facing){
 const p=w.player,size=enemySize(e),front=(e.x-p.x)*dir;
 if(front+size.w/2<-.2||front-size.w/2>range)return null;
 const x=p.x+dir*Math.max(.1,front-size.w/2+.06);
 const low=Math.max(p.y+.15,e.y+.08),high=Math.min(p.y+2.2,e.y+size.h-.08);
 if(high<low)return null;
 for(const y of [Math.max(low,Math.min(high,p.y+1.05)),high,low]){
  if(!w.boxes.some(b=>b.hp>0&&segmentHit(p.x,p.y+1.1,x,y,b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h)!==null))return{x,y};
 }
 return null;
}
export function meleeStrike(w:World,damage:number,range:number,push=0,heavy=false){
 const p=w.player,hits:Enemy[]=[];let contacts=0;
 const contact=(x:number,y:number)=>{if(contacts++<3)w.effects.push({playerId:w.actor.id,kind:'weapon',hero:w.heroId,x:x-p.facing*22/16,y:y-19/16,dir:p.facing,power:heavy?1:0,life:.22,age:0,hit:new Set()});};
 for(const e of w.enemies)if(enemyActive(e)){
  const point=meleeContact(w,e,range);if(!point)continue;
  contact(point.x,point.y);
  if(['klychko','taira'].includes(w.heroId)&&e.infantry?.shield&&p.facing*e.dir<0){e.infantry.shield=heavy?0:Math.max(0,e.infantry.shield-damage);w.emit('enemyShieldHit',e.x,e.y+1);if(!heavy)continue;}
  w.damageEnemy(e,damage,'combat',false,heavy?p.facing:undefined);hits.push(e);knockback(w,e,p.facing,push);if(heavy)lift(e,10);w.emitSfx(w.heroId+'-hit',point.x,point.y,w.heroId);
 }
 for(const b of w.boxes)if(b.hp>0&&b.y+b.h>p.y+.2&&b.y<p.y+2&&(b.x-p.x)*p.facing>=-.2&&(b.x-p.x)*p.facing<range+b.w/2){if(Number.isFinite(b.hp))contact(b.x,Math.max(p.y+1,b.y));w.damageBox(b,damage);}
 return hits;
}
function lift(e:Enemy,velocity:number){if(!e.boss&&!e.vehicle&&e.infantry){e.infantry.knockup=true;e.infantry.vy=velocity;e.infantry.grounded=false;e.infantry.ladder=-1;e.infantry.reaction=.45;e.windup=0;}}
function slam(w:World,f:Effect){
 const p=w.player;f.hit.add(-1);f.originX=p.x;f.originY=p.y;f.impactAge=f.age;f.life=.65;
 // Actual landing drives damage and audio. Nearby cover breaks, then loses structural support.
 for(const e of w.enemies)if(enemyActive(e)&&Math.abs(e.x-p.x)<7&&Math.abs(e.y-p.y)<2.6&&meleeContact(w,e,7,Math.sign(e.x-p.x)||p.facing)){w.damageEnemy(e,220);knockback(w,e,Math.sign(e.x-p.x)||p.facing,3);lift(e,10);}
 for(const b of w.boxes)if(b.hp>0&&Number.isFinite(b.hp)&&Math.abs(b.x-p.x)<5&&b.y+b.h>p.y-1.1&&b.y<p.y+1.5)w.damageBox(b,240);
 p.invulnerable=Math.max(p.invulnerable,.4);w.emitSfx('klychko-slam-v2',p.x,p.y,'klychko');
}
export function grenade(w:World,damage=80,vx=13,vy=9,life=1.6){
 const p=w.player;w.bullets.push({id:w.nextId(),playerId:w.actor.id,x:p.x+p.facing*.5,y:p.y+1.1,vx:p.facing*vx,vy,life,friendly:true,hero:'almaziv',damage,ordnance:'shell',blastRadius:2.8,gravity:16,bounces:1});
}
export function healTarget(w:World){
 const p=w.player;
 return [...w.players.filter(a=>a.id!==w.actor.id&&a.body.hp>0&&a.body.hp<100&&Math.hypot(a.body.x-p.x,a.body.y-p.y)<9).map(a=>a.body),
 ...w.followers.filter(f=>f.hp>0&&f.hp<f.maxHp&&Math.hypot(f.x-p.x,f.y-p.y)<9),...(p.hp<100?[p]:[])][0];
}
/** A placed aid station restores every living friendly body inside its small, unobstructed radius. */
function healField(w:World,f:Effect,amount:number){
 const targets=[...w.players.map(a=>a.body),...w.followers];
 for(const t of targets){const max='maxHp' in t?t.maxHp:100;if(t.hp<=0||t.hp>=max||Math.hypot(t.x-f.x,t.y-f.y)>4)continue;
  if(w.boxes.some(b=>b.hp>0&&segmentHit(f.x,f.y+.7,t.x,t.y+.7,b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h)!==null))continue;
  t.hp=Math.min(max,t.hp+amount);w.events.push({type:'healed',hero:'taira',x:t.x,y:t.y+1});
 }
}
export function deliverySite(w:World,p:{x:number;y:number}=w.player,offsets=[5,-5,8,-8,0]){
 for(const d of offsets){
  const x=p.x+d;if(x<TANK.w||x>w.mission.length-TANK.w)continue;
  if(w.boss?.boss?.active){const arena=BOSSES[w.boss.boss.id];if(x<arena.left+TANK.w/2||x>arena.right-TANK.w/2)continue;}
  if(w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(b.x-x)<b.w/2+2&&b.y+b.h>p.y+.1&&b.y<p.y+2.3))continue;
  if(!w.boxes.some(b=>b.hp>0&&Math.abs(b.x-x)<=b.w/2+.001&&Math.abs(b.y+b.h-p.y)<.2))continue;
  return{x,y:p.y};
 }
}
export function canExpansionUltimate(w:World){return w.heroId!=='prytula'||!w.mounts.some(t=>t.summoner===w.actor.id&&t.armor>0&&t.rounds>0)&&!!deliverySite(w);}
export function startExpansion(w:World,f:Effect){
 const p=w.player;
 if(f.kind==='special')switch(f.hero){
  case 'klychko':{p.klychkoHold=0;p.ladder=-1;p.ladderLock=.8;p.vy=12;p.grounded=false;p.invulnerable=Math.max(p.invulnerable,.35);for(const e of meleeStrike(w,110,3.4,1))lift(e,14);break;}
  case 'usyk':p.dashTime=.22;p.dashDir=p.facing;p.invulnerable=Math.max(p.invulnerable,.26);p.ladder=-1;break;
  case 'almaziv':for(const a of [-.3,-.15,0,.15,.3])w.bullets.push({id:w.nextId(),x:p.x+p.facing*.45,y:p.y+1,vx:p.facing*32,vy:a*32,life:.2,friendly:true,damage:28,hero:f.hero,playerId:w.actor.id});break;
  case 'taira':{const target=healTarget(w)??p;f.x=target.x;f.y=target.y;healField(w,f,20);break;}
  case 'prytula':summonFollowers(w,'turret');for(const other of w.players)if(other.body.hp>0&&Math.hypot(other.body.x-p.x,other.body.y-p.y)<9){other.body.ammo=heroById(other.heroId).magazine;other.body.reloading=0;}break;
 }else if(f.kind==='ultimate'&&f.hero==='klychko'){p.klychkoHold=0;p.ladder=-1;p.ladderLock=.8;p.vy=14;p.grounded=false;p.invulnerable=Math.max(p.invulnerable,1.2);
 }else if(f.kind==='ultimate'&&f.hero==='prytula'){
  const site=deliverySite(w);if(site){f.x=site.x;f.y=site.y;}
 }else if(f.kind==='ultimate'&&f.hero==='taira'){
  const fallen=w.survival?w.players.find(a=>a.id!==w.actor.id&&a.body.hp<=0):undefined;
  if(fallen){Object.assign(fallen.body,{hp:35,x:p.x-p.facing,y:p.y,vy:0,invulnerable:2});fallen.lives=1;w.events.push({type:'healed',hero:'taira',x:fallen.body.x,y:fallen.body.y+1});}
  else for(const a of w.players)if(a.body.hp>0&&Math.hypot(a.body.x-p.x,a.body.y-p.y)<10){a.body.hp=Math.min(100,a.body.hp+40);a.body.invulnerable=Math.max(a.body.invulnerable,2);w.events.push({type:'healed',hero:'taira',x:a.body.x,y:a.body.y+1});}
 }
}
export function stepExpansion(w:World,f:Effect,dt:number){
 const p=w.player;
 if(f.hero==='taira'&&f.kind==='special'){for(let i=1;i<=5;i++)if(f.age>=i*.5&&!f.hit.has(-100-i)){f.hit.add(-100-i);healField(w,f,3);}}
 if(f.hero==='klychko'){
  if(f.kind==='special'){f.x=p.x;f.y=p.y;}
  if(f.kind==='ultimate'&&!f.hit.has(-1)){
   f.x=p.x;f.y=p.y;
   if(f.age>.2&&p.grounded)slam(w,f);
   else if(f.age>.35){p.ladder=-1;p.vy=Math.min(p.vy,-22);}
  }
 }
 if(f.kind==='ultimate'&&f.hero==='almaziv')for(let i=0;i<3;i++)if(f.age>=.15+i*.5&&!f.hit.has(-i-1)){f.hit.add(-i-1);grenade(w,145,10+i*4,15,2);w.emitSfx('almaziv-weapon-0',p.x,p.y);}
 if(f.kind==='ultimate'&&f.hero==='prytula'&&f.age>=1&&!f.hit.has(-1)){
  f.hit.add(-1);const site=deliverySite(w,f,[0]);if(site){const t=addMount(w,site.x);Object.assign(t,{y:site.y,armor:200,maxArmor:200,summoner:w.actor.id,rounds:8});w.emitSfx('prytula-ultimate-end',site.x,site.y);}
  else p.energy=100;
 }
 if(f.kind==='ultimate'&&['usyk','taira'].includes(f.hero)){f.x=p.x;f.y=p.y;}
}
export function stepHacked(w:World,e:Enemy,dt:number){
 const hack=e.hacked!;hack.left-=dt;
 const owner=w.players[hack.playerId];
 if(hack.left<=0||!owner||owner.body.hp<=0||owner.heroId!=='it-army'){e.hacked=undefined;e.cooldown=1.5;e.windup=0;w.emitSfx('it-army-special-end',e.x,e.y,'it-army');return;}
 const floor=Math.max(-2,...w.boxes.filter(b=>b.hp>0&&Math.abs(b.x-e.x)<b.w/2+1.2&&b.y+b.h<=e.y+.1).map(b=>b.y+b.h));e.y=Math.max(floor,e.y-8*dt);
 const p=owner.body,target=w.enemies.filter(t=>t!==e&&enemyActive(t)&&Math.hypot(t.x-e.x,t.y-e.y)<16&&Math.abs(t.y-e.y)<2&&clearShot(w,e,t)).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];
 e.dir=Math.sign((target?.x??p.x)-e.x)||e.dir;e.cooldown=Math.max(0,e.cooldown-dt);
 if(target&&e.cooldown===0){const dx=target.x-e.x,dy=target.y+1-e.y-1.5,d=Math.hypot(dx,dy)||1;w.bullets.push({id:w.nextId(),x:e.x+e.dir*1.8,y:e.y+1.5,vx:dx/d*22,vy:dy/d*22,life:16/22,friendly:true,damage:70,ordnance:'shell',blastRadius:2.2});e.cooldown=2.8;w.emitSfx('tank-shot',e.x,e.y,'it-army');}
 if(!target&&Math.abs(p.x-e.x)>5){const x=e.x+e.dir*2.5*dt;if(!w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(x-b.x)<b.w/2+2&&e.y<b.y+b.h-.1&&e.y+2>b.y+.1))e.x=x;}
}
