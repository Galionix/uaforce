import type {World,Box} from './world.ts';
import {enemyActive,enemySize} from './enemies.ts';
export const BARREL={gravity:24,throwSpeed:17,throwLift:7,impactSpeed:6.5};
const supports=new WeakMap<Box,Box>();
export function nearbyBarrel(w:World){return w.boxes.filter(b=>b.kind==='barrel'&&b.hp>0&&!w.players.some(a=>a.heldBarrel===b.id)&&Math.abs(b.x-w.player.x)<1.9&&Math.abs(b.y-w.player.y)<1.4).sort((a,b)=>Math.abs(a.x-w.player.x)-Math.abs(b.x-w.player.x))[0];}
export function dropBarrel(w:World){const b=w.boxes.find(b=>b.id===w.heldBarrel);w.heldBarrel=null;if(b){b.vx=0;b.vy=0;}}
export function interactBarrel(w:World,drop=false){
 const p=w.player,b=w.boxes.find(b=>b.id===w.heldBarrel&&b.hp>0);
 if(b){w.heldBarrel=null;b.vx=p.facing*(drop?1.5:BARREL.throwSpeed);b.vy=drop?-2:BARREL.throwLift;w.emit('barrelThrow',b.x,b.y);return true;}
 const next=nearbyBarrel(w);if(!next)return false;
 // Do not lift a barrel through a low ceiling.
 if(w.boxes.some(a=>a!==next&&a.hp>0&&a.kind!=='platform'&&Math.abs(a.x-p.x)<a.w/2+next.w/2&&a.y<p.y+1.7+next.h&&a.y+a.h>p.y+1.7))return false;
 w.heldBarrel=next.id;next.x=p.x;next.y=p.y+1.7;next.vx=0;next.vy=0;w.emit('barrelLift',next.x,next.y);return true;
}
/** Small collision steps prevent a fast falling barrel tunnelling through a head or thin floor. */
export function stepBarrels(w:World,dt:number){
 for(const b of w.boxes){
  if(b.kind!=='barrel'||b.hp<=0)continue;
  const holder=w.players.find(a=>a.heldBarrel===b.id);
  if(holder){
   const p=holder.body;
   for(const a of w.boxes)if(a!==b&&a.hp>0&&a.kind!=='platform'&&Math.abs(a.x-p.x)<(a.w+b.w)/2-.01&&p.y+1.7<a.y+a.h-.01&&p.y+1.7+b.h>a.y+.01){
    if(b.y+b.h<=a.y+.03){p.y=Math.min(p.y,a.y-b.h-1.7);p.vy=Math.min(0,p.vy);}else p.x=b.x;
   }
   b.x=p.x;b.y=p.y+1.7;b.vx=0;b.vy=0;continue;
  }
  const resting=supports.get(b);
  if(Math.abs(b.vx??0)<.015&&(b.vy??0)===0&&resting&&resting.hp>0&&Math.abs(b.x-resting.x)<(b.w+resting.w)/2-.01&&Math.abs(b.y-resting.y-resting.h)<.001){b.vx=0;continue;}
  const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
  for(let i=0;i<steps&&b.hp>0;i++){
   const oldX=b.x,oldY=b.y;b.vy=(b.vy??0)-BARREL.gravity*h;
   b.x+=(b.vx??0)*h;b.y+=b.vy*h;
   let contactSpeed=0,grounded=false;
   for(const a of w.boxes){
    if(a===b||a.hp<=0||w.players.some(p=>p.heldBarrel===a.id))continue;
    const overlapX=Math.abs(b.x-a.x)<(b.w+a.w)/2-.01,top=a.y+a.h;
    if(overlapX&&b.vy<=0&&oldY>=top-.025&&b.y<=top){contactSpeed=Math.max(contactSpeed,-b.vy);b.y=top;b.vy=0;grounded=true;supports.set(b,a);}
    else if(a.kind!=='platform'&&overlapX&&b.vy>0&&oldY+b.h<=a.y+.025&&b.y+b.h>=a.y){contactSpeed=Math.max(contactSpeed,b.vy);b.y=a.y-b.h;b.vy=0;}
    else if(a.kind!=='platform'&&overlapX&&b.y+b.h>a.y+.03&&b.y<top-.03&&Math.abs(oldX-a.x)>=(b.w+a.w)/2-.025){contactSpeed=Math.max(contactSpeed,Math.abs(b.vx??0));b.x=a.x+Math.sign(oldX-a.x)*(b.w+a.w)/2;b.vx=0;}
   }
   if(b.y<=-2){contactSpeed=Math.max(contactSpeed,-b.vy);b.y=-2;b.vy=0;grounded=true;}
   const speed=Math.hypot(b.vx??0,b.vy??0);
   for(const e of w.enemies)if(enemyActive(e)){
    const size=enemySize(e);
    if(speed>=BARREL.impactSpeed&&Math.abs(b.x-e.x)<(b.w+size.w)/2&&b.y<e.y+size.h&&b.y+b.h>e.y){w.damageEnemy(e,90,'barrel');contactSpeed=Math.max(contactSpeed,speed);break;}
   }
   if(contactSpeed>=BARREL.impactSpeed){w.damageBox(b,b.hp);break;}
   if(grounded)b.vx=(b.vx??0)*Math.max(0,1-h*5);
   if(b.x<.5||b.x>w.mission.length-.5){b.x=Math.max(.5,Math.min(w.mission.length-.5,b.x));b.vx=0;}
  }
 }
 for(const a of w.players)if(a.heldBarrel!==null&&!w.boxes.some(b=>b.id===a.heldBarrel&&b.hp>0))a.heldBarrel=null;
}
