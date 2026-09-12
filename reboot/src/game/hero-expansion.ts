import {BOSSES} from './bosses.ts';
import {heroById} from './content.ts';
import {enemyActive} from './enemies.ts';
import {clearShot,summonFollowers} from './followers.ts';
import {addMount,TANK} from './mounts.ts';
import {type World,type Effect,type Enemy} from './world.ts';

export const NEW_HEROES=['usyk','almaziv','klychko','taira','prytula'] as const;
export function knockback(w:World,e:Enemy,dir:number,distance:number){
 if(e.boss||e.vehicle)return;
 // Resolve each short step against terrain so a punch never pushes a target through a wall.
 for(let moved=0;moved<distance;moved+=.2){const x=e.x+dir*.2;if(x<1||x>w.mission.length-2||w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(x-b.x)<b.w/2+.35&&e.y+1.5>b.y+.05&&e.y<b.y+b.h-.05))break;e.x=x;}
}
export function meleeStrike(w:World,damage:number,range:number,push=0){
 const p=w.player;let contacts=0;
 const contact=(x:number,y:number)=>{if(contacts++<3)w.effects.push({playerId:w.actor.id,kind:'weapon',hero:w.heroId,x:x-p.facing*22/16,y,dir:p.facing,life:.22,age:0,hit:new Set()});};
 for(const e of w.enemies)if(enemyActive(e)&&(e.x-p.x)*p.facing>=-.2&&(e.x-p.x)*p.facing<range&&Math.abs(e.y-p.y)<2&&clearShot(w,p,e)){
  contact(e.x,e.y);w.damageEnemy(e,damage);knockback(w,e,p.facing,push);w.emitSfx(w.heroId+'-hit',e.x,e.y,w.heroId);
 }
 for(const b of w.boxes)if(b.hp>0&&b.y+b.h>p.y+.2&&b.y<p.y+2&&(b.x-p.x)*p.facing>=-.2&&(b.x-p.x)*p.facing<range+b.w/2){if(Number.isFinite(b.hp))contact(b.x,Math.max(p.y,b.y));w.damageBox(b,damage);}
}
export function grenade(w:World,damage=80,vx=13,vy=9,life=1.6){
 const p=w.player;w.bullets.push({id:w.nextId(),playerId:w.actor.id,x:p.x+p.facing*.5,y:p.y+1.1,vx:p.facing*vx,vy,life,friendly:true,hero:'almaziv',damage,ordnance:'shell',blastRadius:2.8,gravity:16,bounces:1});
}
export function healTarget(w:World){
 const p=w.player;
 return [...w.players.filter(a=>a.id!==w.actor.id&&a.body.hp>0&&a.body.hp<100&&Math.hypot(a.body.x-p.x,a.body.y-p.y)<9).map(a=>a.body),
 ...w.followers.filter(f=>f.hp>0&&f.hp<f.maxHp&&Math.hypot(f.x-p.x,f.y-p.y)<9),...(p.hp<100?[p]:[])][0];
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
  case 'usyk':p.dashTime=.22;p.dashDir=p.facing;p.invulnerable=Math.max(p.invulnerable,.26);p.ladder=-1;break;
  case 'almaziv':for(const a of [-.3,-.15,0,.15,.3])w.bullets.push({id:w.nextId(),x:p.x+p.facing*.45,y:p.y+1,vx:p.facing*32,vy:a*32,life:.2,friendly:true,damage:28,hero:f.hero,playerId:w.actor.id});break;
  case 'taira':{const target=healTarget(w);if(target){target.hp=Math.min('maxHp' in target?target.maxHp:100,target.hp+25);f.x=target.x;f.y=target.y;}break;}
  case 'prytula':summonFollowers(w,'turret');for(const other of w.players)if(other.body.hp>0&&Math.hypot(other.body.x-p.x,other.body.y-p.y)<9){other.body.ammo=heroById(other.heroId).magazine;other.body.reloading=0;}break;
 }else if(f.kind==='ultimate'&&f.hero==='prytula'){
  const site=deliverySite(w);if(site){f.x=site.x;f.y=site.y;}
 }else if(f.kind==='ultimate'&&f.hero==='taira'){
  const fallen=w.survival?w.players.find(a=>a.id!==w.actor.id&&a.body.hp<=0):undefined;
  if(fallen){Object.assign(fallen.body,{hp:35,x:p.x-p.facing,y:p.y,vy:0,invulnerable:2});fallen.lives=1;}
  else for(const a of w.players)if(a.body.hp>0&&Math.hypot(a.body.x-p.x,a.body.y-p.y)<10){a.body.hp=Math.min(100,a.body.hp+40);a.body.invulnerable=Math.max(a.body.invulnerable,2);}
 }
}
export function stepExpansion(w:World,f:Effect,dt:number){
 const p=w.player;
 if(f.kind==='special'&&f.hero==='klychko'){
  f.x=p.x;f.y=p.y;
  for(const b of w.bullets)if(!b.friendly&&b.life>0&&!b.ordnance&&(b.x-p.x)*p.facing>0&&(b.x-p.x)*p.facing<2.2&&Math.abs(b.y-p.y-1)<1.2){b.life=0;if(!f.hit.has(-1)){f.hit.add(-1);meleeStrike(w,145,4,4);w.emitSfx('klychko-special',p.x,p.y);}}
 }
 if(f.kind==='ultimate'&&f.hero==='almaziv')for(let i=0;i<3;i++)if(f.age>=.15+i*.5&&!f.hit.has(-i-1)){f.hit.add(-i-1);grenade(w,145,10+i*4,15,2);w.emitSfx('almaziv-weapon-0',p.x,p.y);}
 if(f.kind==='ultimate'&&f.hero==='prytula'&&f.age>=1&&!f.hit.has(-1)){
  f.hit.add(-1);const site=deliverySite(w,f,[0]);if(site){const t=addMount(w,site.x);Object.assign(t,{y:site.y,armor:200,maxArmor:200,summoner:w.actor.id,rounds:8});w.emitSfx('prytula-ultimate-end',site.x,site.y);}
  else p.energy=100;
 }
 if(f.kind==='ultimate'&&['usyk','klychko','taira'].includes(f.hero)){f.x=p.x;f.y=p.y;}
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
