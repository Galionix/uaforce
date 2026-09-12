import type {World,Actions} from './world.ts';
import {BOSSES} from './bosses.ts';
export type Mount={id:number;summoner?:number;rounds:number;maxRounds:number;kind:'tank';x:number;y:number;vy:number;grounded:boolean;jumpHeld:boolean;landing:number;dir:number;armor:number;maxArmor:number;cooldown:number;contactCooldown:number;moving:boolean;engine:number;hurt:number;recoil:number};
export const TANK={w:4,h:2.2,speed:4.2,jump:13,gravity:20,reload:2.5,armor:360,damage:105,range:26};
export function addMount(w:World,x:number){const t:Mount={id:w.nextId(),kind:'tank',rounds:8,maxRounds:8,x,y:0,vy:0,grounded:false,jumpHeld:false,landing:0,dir:1,armor:TANK.armor,maxArmor:TANK.armor,cooldown:0,contactCooldown:0,moving:false,engine:0,hurt:0,recoil:0};w.mounts.push(t);return t;}
export function missionMounts(w:World){for(const x of w.mission.mounts)addMount(w,x);}
export function nearbyMount(w:World){return w.mounts.filter(t=>t.armor>0&&!w.players.some(a=>a.mounted===t)&&Math.abs(t.x-w.player.x)<3&&Math.abs(t.y-w.player.y)<2.5).sort((a,b)=>Math.abs(a.x-w.player.x)-Math.abs(b.x-w.player.x))[0];}
export function exitMount(w:World,broken=false){
 const t=w.mounted;if(!t)return;w.mounted=null;t.moving=false;t.engine=0;
 const p=w.player;p.x=t.x;p.y=t.y+TANK.h+.25;p.vy=11;p.grounded=false;p.ladder=-1;p.coyote=0;p.detachVx=-t.dir*3;p.invulnerable=Math.max(p.invulnerable,broken?1.5:.8);
 w.emit(broken?'mountBroken':'mountExit',t.x,t.y+1);
}
export function damageMount(w:World,t:Mount,amount:number){
 if(w.mode!=='playing'||t.armor<=0)return;
 t.armor=Math.max(0,t.armor-amount);t.hurt=.12;w.emit('armorHit',t.x,t.y+1);
 if(t.armor===0){const rider=w.players.find(a=>a.mounted===t);if(rider)w.withPlayer(rider.id,()=>exitMount(w,true));else w.emit('mountBroken',t.x,t.y+1);t.moving=false;}
}
/** Returns true when vehicle controls consumed this frame, including entry/exit. */
export function stepMounts(w:World,dt:number,a:Actions,interactEdge:boolean){
 let consumed=!!w.mounted;
 if(w.mounted&&interactEdge){exitMount(w);return true;}
 if(!w.mounted&&interactEdge&&!w.allies.some(c=>!c.rescued&&Math.abs(c.x-w.player.x)<2.2&&w.player.y<2)){
  const t=nearbyMount(w);if(t){w.mounted=t;consumed=true;w.player.ladder=-1;w.player.cloak=0;w.player.form=0;w.player.attack=0;w.player.cast=0;w.player.detachVx=0;Object.assign(w.player,{klychkoHold:0,klychkoPower:0,mamaiHold:0,mamaiFired:false,dashTime:0,aimTime:0});w.emit('mountEnter',t.x,t.y+1);}
 }
 for(const t of w.mounts){
  const rider=w.players.find(a=>a.mounted===t);
  if(rider?rider.id!==w.actor.id:w.actor.id!==(w.players.find(a=>a.body.hp>0)?.id??0))continue;
  t.contactCooldown=Math.max(0,t.contactCooldown-dt);t.cooldown=Math.max(0,t.cooldown-dt);t.hurt=Math.max(0,t.hurt-dt);t.recoil=Math.max(0,t.recoil-dt);t.landing=Math.max(0,t.landing-dt);t.moving=false;
  // Recheck support after terrain destruction; a cached grounded flag permits air jumps.
  t.grounded=t.vy<=0&&(t.y<=-2||w.boxes.some(b=>b.hp>0&&Math.abs(b.x-t.x)<b.w/2+TANK.w/2-.3&&Math.abs(t.y-b.y-b.h)<.04));
  if(t===w.mounted){
   if(a.jump&&!t.jumpHeld&&t.grounded){t.vy=TANK.jump;t.grounded=false;w.emit('mountJump',t.x,t.y);}
   const move=Math.max(-1,Math.min(1,a.move));if(move)t.dir=Math.sign(move);
   const old=t.x,next=t.x+move*TANK.speed*dt;
   // Tracks crush light crates. Permanent floors and taller structures still block the hull.
   for(const b of w.boxes)if(b.hp>0&&['crate','barrel'].includes(b.kind)&&b.y<t.y+1.2&&b.y+b.h>t.y+.1&&Math.abs(next-b.x)<b.w/2+TANK.w/2)w.damageBox(b,60);
   const blocks=w.boxes.filter(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(next-b.x)<b.w/2+TANK.w/2&&b.y+b.h>t.y+.08&&b.y<t.y+TANK.h-.1);
   const rise=Math.max(t.y,...blocks.map(b=>b.y+b.h));
   if(!blocks.length)t.x=next;
   else if(rise-t.y<=.55&&!w.boxes.some(b=>b.hp>0&&Math.abs(next-b.x)<b.w/2+TANK.w/2&&b.y+b.h>rise+.05&&b.y<rise+TANK.h)) {t.y=rise;t.x=next;}
   const bounds=w.boss?.boss?.active?BOSSES[w.boss.boss.id]:{left:0,right:w.mission.length};t.x=Math.max(bounds.left+TANK.w/2,Math.min(bounds.right-TANK.w/2,t.x));t.moving=Math.abs(t.x-old)>.001;
   if(t.moving&&t.grounded){t.engine-=dt;if(t.engine<=0){w.emit('mountEngine',t.x,t.y);t.engine=.32;}}else t.engine=0;
   if(a.fire&&t.cooldown===0&&t.armor>0&&t.rounds>0){
    // Start at the front of the turret, inside hull width, so adjacent cover cannot be skipped.
    w.bullets.push({id:w.nextId(),x:t.x+t.dir*1.6,y:t.y+1.5,vx:t.dir*24,vy:0,life:TANK.range/24,friendly:true,damage:w.survival?65:TANK.damage,ordnance:'shell',blastRadius:3});
    t.rounds--;
    t.cooldown=t.summoner!==undefined?3.2:w.survival?3.2:TANK.reload;t.recoil=.22;w.shots++;w.emit('mountShot',t.x+t.dir*2,t.y+1.5);
   }
  }
  t.jumpHeld=t===w.mounted&&a.jump;
  const oldY=t.y;t.vy-=TANK.gravity*dt;const impact=t.vy;t.y+=t.vy*dt;t.grounded=false;
  if(t.vy>0){
   for(const b of w.boxes)if(b.hp>0&&b.kind!=='platform'&&Math.abs(b.x-t.x)<b.w/2+TANK.w/2-.1&&oldY+TANK.h<=b.y+.03&&t.y+TANK.h>=b.y){t.y=Math.min(t.y,b.y-TANK.h);t.vy=0;}
  }else{
   let floor=-2;
   for(const b of w.boxes)if(b.hp>0&&Math.abs(b.x-t.x)<b.w/2+TANK.w/2-.3&&oldY>=b.y+b.h-.03&&t.y<=b.y+b.h)floor=Math.max(floor,b.y+b.h);
   if(t.y<=floor){t.y=floor;t.vy=0;t.grounded=true;if(impact<-4&&t.armor>0){t.landing=.18;w.emit('mountLand',t.x,t.y);}}
  }
  if(w.mounted===t){Object.assign(w.player,{x:t.x,y:t.y,vy:0,facing:t.dir,grounded:t.grounded});}
 }
 return consumed;
}
