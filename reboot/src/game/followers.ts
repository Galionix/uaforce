import {enemyActive} from './enemies.ts';
import {segmentHit, type World, type Enemy} from './world.ts';
import {cycleWeapon, resetWeapon, type WeaponState, type WeaponSpec} from './weapons.ts';
import type {HeroId} from './content.ts';
export type Follower = WeaponState & {
 id:number; playerId?:number; kind:'infantry'|'turret'; owner:HeroId; source?:number; slot:number;
 x:number;y:number;vy:number;dir:number;hp:number;maxHp:number;
 hold?:{x:number;y:number};state:'follow'|'approach'|'attack'|'return';target?:number;grounded:boolean;
 ladder:number;moving:boolean;attack:number;hurt:number;contactCooldown:number;stepSound?:number;
};
export const FOLLOWER_WEAPONS:Record<Follower['kind'],WeaponSpec>={
 infantry:{mode:'burst',magazine:12,reloadTime:2.2,cooldown:.16,damage:12,projectileSpeed:36,range:11,burst:3,burstPause:.65},
 turret:{mode:'burst',magazine:15,reloadTime:2.8,cooldown:.13,damage:16,projectileSpeed:38,range:12,burst:5,burstPause:.85},
};
const width=.34,height=1.5;
const solid=(w:World,x:number,y:number)=>w.boxes.find(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(x-b.x)<b.w/2+width&&y+height>b.y+.05&&y<b.y+b.h-.05);
export function summonFollowers(w:World,kind:Follower['kind'],source?:number){
 const cap=kind==='infantry'?2:1;
 for(let slot=0;slot<cap;slot++){
  if(w.followers.some(f=>f.hp>0&&(f.playerId??0)===w.actor.id&&f.kind===kind&&f.slot===slot))continue;
  const node=w.boxes.find(b=>b.id===source),base=node??w.player;
  // Find free footing beside the summoner / hacked node, never inside cover.
  let x=base.x,y=base.y,found=false;
  for(const distance of [2+slot*1.6,3+slot*1.6,1,5,6])for(const side of [-w.player.facing,w.player.facing]){
   const candidate=base.x+side*distance;
   if(!found&&candidate>=1&&candidate<=w.mission.length-2&&!solid(w,candidate,y)){x=candidate;found=true;}
  }
  if(!found)continue;
  const hp=kind==='infantry'?60:110;
  const f:Follower={id:w.nextId(),playerId:w.actor.id,kind,source,slot,owner:w.heroId,x,y,vy:0,dir:w.player.facing,hp,maxHp:hp,state:'follow',grounded:false,ladder:-1,moving:false,attack:0,hurt:0,contactCooldown:0,ammo:0,reloading:0,cooldown:0,burstShots:0,weaponTrigger:false};
  resetWeapon(f,FOLLOWER_WEAPONS[kind]);w.followers.push(f);
 }
}
export function clearShot(w:World,f: {x:number;y:number},e: {x:number;y:number}){
 return !w.boxes.some(b=>b.hp>0&&segmentHit(f.x,f.y+1,e.x,e.y+1,b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h)!==null);
}
export type GroundActor={x:number;y:number;vy:number;dir:number;ladder:number;grounded:boolean;moving:boolean};
export function navigateGround(w:World,f:GroundActor,tx:number,ty:number,dt:number,speed:number){
 let dx=tx-f.x;
 // Ladders are explicit routes between elevations. Walk to one, climb, then dismount.
 const needLevel=Math.abs(ty-f.y)>.65;
 if(f.ladder<0&&needLevel){
  const routes=w.ladders.map((l,i)=>({l,i})).filter(({l})=>Math.min(ty,f.y)>=l.bottom-.2&&Math.max(ty,f.y)<=l.top+.2);
  routes.sort((a,b)=>(Math.abs(a.l.x-f.x)+Math.abs(a.l.x-tx))-(Math.abs(b.l.x-f.x)+Math.abs(b.l.x-tx)));
  const route=routes[0];
  if(route){dx=route.l.x-f.x;if(Math.abs(dx)<.2)f.ladder=route.i;}
 }
 if(f.ladder>=0){
  const l=w.ladders[f.ladder];
  if(!l){f.ladder=-1;return;}
  f.x=l.x;f.y+=Math.sign(ty-f.y)*Math.min(Math.abs(ty-f.y),4.8*dt);f.vy=0;f.grounded=false;f.moving=true;
  if(Math.abs(f.y-ty)<.08){f.ladder=-1;f.grounded=true;}
  return;
 }
 const step=Math.abs(dx)>.12?Math.sign(dx)*Math.min(Math.abs(dx),speed*dt):0;
 if(step)f.dir=Math.sign(step);
 const obstacle=solid(w,f.x+step,f.y);
 const ahead=f.x+Math.sign(dx)*.9;
 const gap=!w.boxes.some(b=>b.hp>0&&Math.abs(ahead-b.x)<b.w/2&&Math.abs(b.y+b.h-f.y)<.15);
 if(f.grounded&&Math.abs(dx)>.5&&(obstacle||(gap&&ty>=f.y-.5))){f.vy=11.5;f.grounded=false;}
 const oldX=f.x; if(!obstacle)f.x=Math.max(1,Math.min(w.mission.length-2,f.x+step));f.moving=Math.abs(f.x-oldX)>.001;
 const oldY=f.y;f.vy-=27*dt;f.y+=f.vy*dt;f.grounded=false;
 for(const b of w.boxes){
  if(b.hp<=0||Math.abs(f.x-b.x)>b.w/2+.25)continue;
  const top=b.y+b.h;
  if(f.vy<=0&&oldY>=top-.03&&f.y<=top){f.y=top;f.vy=0;f.grounded=true;}
  else if(f.vy>0&&b.kind!=='platform'&&oldY+height<=b.y+.03&&f.y+height>b.y){f.y=b.y-height;f.vy=0;}
 }
 if(f.y<=-2){f.y=-2;f.vy=0;f.grounded=true;}
}
export function stepFollowers(w:World,dt:number){
 for(const f of w.followers){
  const p=w.players[f.playerId??0]?.body??w.player;
  if(f.hp<=0)continue;
  f.attack=Math.max(0,f.attack-dt);f.hurt=Math.max(0,f.hurt-dt);f.contactCooldown=Math.max(0,f.contactCooldown-dt);
  const ownerDistance=Math.hypot(f.x-p.x,f.y-p.y);
  if(ownerDistance>20)f.state='return';
  if(f.state==='return'&&ownerDistance<5)f.state='follow';
  const eligible=(e:Enemy)=>enemyActive(e)&&Math.hypot(e.x-f.x,e.y-f.y)<15&&Math.hypot(e.x-p.x,e.y-p.y)<20;
  let target=f.state==='return'?undefined:w.enemies.find(e=>e.id===f.target&&eligible(e));
  if(!target&&f.state!=='return')target=w.enemies.filter(eligible).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0];
  f.target=target?.id;
  let tx=f.hold?.x??p.x-p.facing*(2.4+f.slot*1.8),ty=f.hold?.y??p.y;
  if(f.hold&&ownerDistance>16)f.hold=undefined;
  if(target){
   const distance=Math.abs(target.x-f.x),aligned=Math.abs(target.y-f.y)<.55,clear=clearShot(w,f,target);
   f.state=distance<=8&&aligned&&clear?'attack':'approach';
   tx=f.state==='attack'?f.x:target.x-Math.sign(target.x-f.x)*6;ty=target.y;
   // Cover between the pair requires moving around it instead of firing through it.
   if(!clear)tx=target.x;
  }else if(f.state!=='return')f.state='follow';
  if(f.hold){tx=f.hold.x;ty=f.hold.y;}
  tx=Math.max(1,Math.min(w.mission.length-2,tx));
  if(!target&&Math.abs(tx-f.x)<.4&&Math.abs(ty-f.y)<.6)tx=f.x;
  // Move out of the owner's space when holding a firing position; crossing paths stays possible.
  if(f.state==='attack'&&Math.abs(p.y-f.y)<1.2&&Math.abs(p.x-f.x)<1.4)tx=p.x+(Math.sign(f.x-p.x)||-p.facing)*1.5;
  if(f.state==='attack'){const neighbor=w.followers.find(a=>a!==f&&a.hp>0&&Math.abs(a.y-f.y)<1&&Math.abs(a.x-f.x)<.9);if(neighbor)tx=f.x+(Math.sign(f.x-neighbor.x)||(f.slot>neighbor.slot?-1:1))*1.1;}
  const speed=(f.state==='follow'||f.state==='return')&&ownerDistance>6?9.2:f.kind==='turret'?6.2:7.8;
  navigateGround(w,f,tx,ty,dt,speed);
  const canFire=!!target&&f.ladder<0&&Math.abs(target.y-f.y)<.55&&Math.abs(target.x-f.x)<=8&&clearShot(w,f,target);
  if(target)f.dir=Math.sign(target.x-f.x)||f.dir;
  const spec=FOLLOWER_WEAPONS[f.kind],cycle=cycleWeapon(f,spec,dt,canFire);
  if(cycle.reloadStarted)w.emitSfx(f.kind==='turret'?'bayraktar-reload':'bandera-reload',f.x,f.y,f.owner,f.id);
  if(cycle.reloadFinished)w.emitSfx(f.kind==='turret'?'bayraktar-reload-end':'bandera-reload-end',f.x,f.y,f.owner,f.id);
  f.stepSound=Math.max(0,(f.stepSound??0)-dt);
  if(f.kind==='turret'&&f.moving&&f.stepSound===0){f.stepSound=.35;w.emitSfx('turret-step',f.x,f.y,f.owner,f.id);}
  if(cycle.fired){
   const x=f.x+f.dir*.45,y=f.y+1;
   w.bullets.push({id:w.nextId(),x,y,vx:f.dir*spec.projectileSpeed,vy:0,life:spec.range/spec.projectileSpeed,friendly:true,damage:spec.damage});
   f.attack=.12;w.events.push({type:'supportShot',hero:f.owner,variant:f.kind,x,y});
  }
 }
 w.followers=w.followers.filter(f=>f.hp>0);
}
