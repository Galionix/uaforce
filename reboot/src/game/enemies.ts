import {damageMount,TANK} from './mounts.ts';
import {BOSSES} from './bosses.ts';
import {segmentHit,type World,type Enemy} from './world.ts';
export type VehicleKind='tank'|'plane'|'shahed';
export type Vehicle={kind:VehicleKind;trigger:number;active:boolean;phase:'warning'|'hunt'|'aim'|'dive'|'leaving';age:number;aimX:number;aimY:number;vx:number;vy:number;shots:number;engine:number};
export const VEHICLES={
 tank:{name:'Танк',hp:320,w:3.8,h:2.1,warning:1.2},
 plane:{name:'Ракетоносець',hp:160,w:4.8,h:1.3,warning:1.8},
 shahed:{name:'Шахед',hp:32,w:1.8,h:.8,warning:1.3},
} as const;
export const enemyActive=(e:Enemy)=>e.hp>0&&(!e.vehicle||e.vehicle.active)&&(!e.boss||e.boss.active);
export const enemySize=(e:Enemy)=>e.boss?BOSSES[e.boss.id]:e.vehicle?VEHICLES[e.vehicle.kind]:{w:e.heavy||e.infantry?.kind==='gunner'?1:.7,h:e.heavy||e.infantry?.kind==='gunner'?2:1.6};
export function addVehicle(w:World,kind:VehicleKind,x:number,y:number,trigger=x-18){
 const e:Enemy={id:w.nextId(),x,y,hp:VEHICLES[kind].hp,maxHp:VEHICLES[kind].hp,dir:-1,cooldown:0,windup:0,anchor:x,heavy:false,vehicle:{kind,trigger,active:false,phase:'warning',age:0,aimX:x,aimY:y,vx:0,vy:0,shots:0,engine:0}};
 w.enemies.push(e);return e;
}
export function missionVehicles(w:World){
 for(const [kind,x,y,trigger] of w.mission.vehicles)addVehicle(w,kind,x,y,trigger);
}
/** Hostile blasts do not reward kills or hurt their own faction. Cover takes the impact. */
export function hostileBlast(w:World,x:number,y:number,radius:number,damage:number){
 w.emit('hostileBlast',x,y);
 const exposed=(t:{x:number;y:number})=>!w.boxes.some(b=>b.hp>0&&segmentHit(x,y,t.x,t.y+.8,b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h)!==null);
 // Determine shielding before damaging the wall, so one explosion cannot erase it then hit through it.
 const playersHit=w.players.filter(a=>!a.mounted&&Math.hypot(a.body.x-x,a.body.y+.8-y)<radius&&exposed(a.body));
 const tanks=w.mounts.filter(t=>{if(t.armor<=0)return false;const point={x:Math.max(t.x-TANK.w/2,Math.min(t.x+TANK.w/2,x)),y:Math.max(t.y,Math.min(t.y+TANK.h,y))};return Math.hypot(point.x-x,point.y-y)<radius&&exposed({x:point.x,y:point.y-.8});});
 const followers=w.followers.filter(f=>f.hp>0&&Math.hypot(f.x-x,f.y+.8-y)<radius&&exposed(f));
 for(const b of w.boxes)if(b.hp>0&&Math.hypot(b.x-x,b.y+b.h/2-y)<radius)w.damageBox(b,damage*2);
 for(const t of tanks)damageMount(w,t,damage);
 for(const f of followers)w.damageFollower(f,damage);
 for(const a of playersHit)w.withPlayer(a.id,()=>w.damagePlayer(damage));
}
export function launchHostile(w:World,e:Enemy,kind:'shell'|'rocket',tx:number,ty:number){
 const x=e.x+(kind==='shell'?e.dir*2.6:0),y=e.y+(kind==='shell'?1.95:0),speed=kind==='shell'?14:9;
 const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy)||1;
 w.bullets.push({id:w.nextId(),x,y,vx:dx/length*speed,vy:dy/length*speed,life:Math.min(kind==='shell'?19/speed:26/speed,length/speed+.08),friendly:false,damage:kind==='shell'?28:24,ordnance:kind,blastRadius:kind==='shell'?2.6:2.8});
 w.emit(kind==='shell'?'tankShot':'rocketLaunch',x,y);
}
export function stepVehicle(w:World,e:Enemy,dt:number){
 const v=e.vehicle!;if(e.hp<=0)return;
 if(!v.active){
  if(w.player.x<v.trigger||w.evac.phase!=='waiting'||w.mission.layout&&Math.abs(w.player.y-e.y)>10)return;
  v.active=true;v.phase='warning';v.age=0;w.emit(v.kind==='tank'?'tankAlert':v.kind==='plane'?'planeAlert':'droneAlert',w.player.x,w.player.y+2);
 }
 v.engine-=dt;if(v.engine<=0){w.emit(v.kind==='tank'?'tankEngine':v.kind==='plane'?'planeEngine':'droneEngine',e.x,e.y);v.engine=.65;}
 e.rooted=Math.max(0,(e.rooted??0)-dt);if(e.rooted){e.windup=0;if(v.phase==='aim')v.phase='hunt';return;}
 v.age+=dt;
 if(v.phase==='warning'){if(v.age<VEHICLES[v.kind].warning)return;v.phase='hunt';v.age=0;}
 const decoy=e.distracted?w.effects.find(f=>f.hero==='lesya'&&f.kind==='special'):undefined;
 const target=decoy??[...w.players.filter(a=>a.body.cloak<=0).map(a=>a.body),...w.followers.filter(f=>f.hp>0)].sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
 if(v.kind==='tank'){
  const floor=Math.max(-2,...w.boxes.filter(b=>b.hp>0&&Math.abs(b.x-e.x)<b.w/2+1.2&&b.y+b.h<=e.y+.1).map(b=>b.y+b.h));e.y=Math.max(floor,e.y-8*dt);
  e.cooldown=Math.max(0,e.cooldown-dt);
  if(!target){v.phase='hunt';e.windup=0;return;}
  e.dir=Math.sign(target.x-e.x)||e.dir;
  if(v.phase==='aim'){
   e.windup-=dt;
   if(e.windup<=0){launchHostile(w,e,'shell',v.aimX,v.aimY);e.cooldown=3.2;v.phase='hunt';}
  }else if(Math.abs(target.x-e.x)<19&&e.cooldown===0){
   // Lock the point now. The player gets a full second to jump or leave it.
   v.phase='aim';e.windup=1;v.aimX=target.x;v.aimY=target.y+1;w.emit('tankAim',e.x,e.y+1);
  }else if(Math.abs(target.x-e.x)>9){
   const x=e.x+e.dir*1.5*dt;
   const blocked=w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(b.x-x)<b.w/2+1.9&&e.y<b.y+b.h-.1&&e.y+1.7>b.y+.1);
   const supported=w.boxes.some(b=>b.hp>0&&Math.abs(b.x-(x+e.dir*1.8))<b.w/2&&Math.abs(b.y+b.h-e.y)<.15);
   if(!blocked&&supported)e.x=x;
  }
 }else if(v.kind==='plane'){
  e.x-=4*dt;e.dir=-1;e.cooldown=Math.max(0,e.cooldown-dt);
  if(target&&v.shots<3&&e.cooldown===0&&Math.abs(target.x-e.x)<20){launchHostile(w,e,'rocket',target.x,target.y+.8);v.shots++;e.cooldown=1.1;}
  if(v.shots>=3)v.phase='leaving';
  if(e.x<-8||v.age>20){e.hp=0;v.active=false;}
 }else{
  const oldX=e.x,oldY=e.y;
  if(v.phase==='dive'){
   e.x+=v.vx*dt;e.y+=v.vy*dt;
  }else if(target){
   e.dir=Math.sign(target.x-e.x)||e.dir;
   if(v.phase==='aim'){
    e.windup-=dt;if(e.windup<=0){const dx=v.aimX-e.x,dy=v.aimY-e.y,d=Math.hypot(dx,dy)||1;v.vx=dx/d*10;v.vy=dy/d*10;v.phase='dive';v.age=0;w.emit('droneDive',e.x,e.y);}
   }else if(Math.abs(target.x-e.x)<9){v.phase='aim';e.windup=.8;v.aimX=target.x;v.aimY=target.y+.8;}
   else{e.x+=e.dir*3.8*dt;e.y+=(target.y+4-e.y)*Math.min(1,dt*1.5);}
  }
  // Swept collisions catch roofs and bodies, even at low frame rates.
  let hit=2;
  const test=(x:number,y:number,width:number,height:number)=>{const t=segmentHit(oldX,oldY+.4,e.x,e.y+.4,x-width/2-.4,y-.3,x+width/2+.4,y+height);if(t!==null)hit=Math.min(hit,t);};
  for(const b of w.boxes)if(b.hp>0)test(b.x,b.y,b.w,b.h);
  for(const a of w.players)if(!a.mounted)test(a.body.x,a.body.y,.65,1.6);for(const t of w.mounts)if(t.armor>0)test(t.x,t.y,TANK.w,TANK.h);for(const f of w.followers)if(f.hp>0)test(f.x,f.y,.7,1.5);
  if(hit<=1||e.y<-2||v.age>12){e.hp=0;v.active=false;const t=Math.min(1,hit);hostileBlast(w,oldX+(e.x-oldX)*t,oldY+(e.y-oldY)*t+.4,2.8,32);}
 }
}
