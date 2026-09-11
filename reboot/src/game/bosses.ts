import {addVehicle,hostileBlast,launchHostile} from './enemies.ts';
import type {World,Enemy} from './world.ts';
export const BOSSES={
 'putin':{sprite:'/assets/bosses/putin.png',name:'Хуйло',subtitle:'Кремлівський агресор · фінальний бій',objective:'Ціль — Хуйло',defeat:'Хуйло переможено',attacks:['РАКЕТНИЙ ЗАЛП','ВИКЛИК ДРОНІВ','ОБСТРІЛ'],hp:1800,w:5.2,h:3.8,left:234,right:270,x:260},
 'iron-warden':{sprite:'/assets/bosses/iron-warden.png',name:'Валерій Герасімов',subtitle:'Російський генерал · броньований штаб',objective:'Здолайте Герасімова',defeat:'Герасімова переможено',attacks:['ГАРМАТНИЙ ЗАЛП','ОБСТРІЛ','ТАРАН'],hp:1100,w:4.4,h:3.1,left:250,right:284,x:274},
 'swarm-master':{sprite:'/assets/bosses/swarm-master.png',name:'Сергій Суровікін',subtitle:'Російський генерал · повітряний удар',objective:'Здолайте Суровікіна',defeat:'Суровікіна переможено',attacks:['ВИКЛИК ДРОНІВ','РАКЕТНИЙ ЗАЛП','ВОГНЕВИЙ ВАЛ'],hp:850,w:4,h:3,left:234,right:268,x:258},
} as const;
export type BossId=keyof typeof BOSSES;
export const ARENA_RESTOCK_SECONDS=18;
export type BossActor={id:BossId;active:boolean;introduced:boolean;stage:number;phase:'windup'|'attack'|'recover';timer:number;turn:number;aimX:number;aimY:number;shots:number;minions:number[];defeatedAt?:number};
export function attachBoss(w:World){
 const id=w.mission.boss;if(!id)return;
 const spec=BOSSES[id];
 const e:Enemy={id:w.nextId(),x:spec.x,y:0,hp:spec.hp,maxHp:spec.hp,dir:-1,cooldown:0,windup:0,anchor:spec.x,heavy:true,boss:{id,active:false,introduced:false,stage:1,phase:'recover',timer:1,turn:0,aimX:spec.left+3,aimY:1,shots:0,minions:[]}};
 w.enemies.push(e);w.boss=e;
 // A readable open end arena, separate from the preceding buildings.
 w.boxes=w.boxes.filter(b=>b.y<0||b.x<spec.left||b.x>spec.right);
 for(const x of [spec.left+8,spec.right-7])w.boxes.push({id:w.nextId(),x,y:3.1,w:5,h:.35,hp:Infinity,maxHp:Infinity,kind:'platform'});
 w.ladders.push({x:spec.left+6,bottom:0,top:3.45},{x:spec.right-5,bottom:0,top:3.45});
 // Both supplies remain reachable after the arena locks. Only arena loot renews.
 w.ammoCrates.push(...[spec.left+4,spec.right-4].map(x=>({x,y:0,used:false,arena:id,restock:0})));
 w.medkits.push({x:spec.left+6,used:false,arena:id});
}
export function triggerBoss(w:World){
 const e=w.boss,b=e?.boss;if(!e||!b||!w.enemies.includes(e)||e.hp<=0||b.active)return false;
 const spec=BOSSES[b.id];if(w.player.x<spec.left)return false;
 if(w.mission.layout&&(w.nextPost||w.boxes.some(a=>a.required&&a.hp>0)))return false;
 b.active=true;for(const a of w.players){a.checkpoint=spec.left+1;a.checkpointY=0;}w.checkpoint=spec.left+1;w.player.x=Math.max(spec.left+1,Math.min(spec.right-2,w.player.x));
 // Old projectiles cannot ambush the player at the end of the title card.
 w.bullets=[];
 if(!b.introduced){b.introduced=true;w.beginCinematic('boss',b.id);w.events.push({type:'bossEncounter',boss:b.id,x:e.x,y:e.y});return true;}
 return false;
}
export function resetBoss(w:World){
 const e=w.boss,b=e?.boss;if(!e||!b||!b.active||e.hp<=0)return;
 e.hp=e.maxHp;e.x=BOSSES[b.id].x;e.y=0;e.rooted=0;e.poison=0;
 for(const id of b.minions){const m=w.enemies.find(a=>a.id===id);if(m)m.hp=0;}
 Object.assign(b,{phase:'recover',timer:1.5,stage:1,turn:0,shots:0,minions:[]});
 for(const c of w.ammoCrates)if(c.arena===b.id){c.used=false;c.restock=0;}
 for(const k of w.medkits)if(k.arena===b.id)k.used=false;
}
export function bossDefeated(w:World,e:Enemy){
 if(e.boss!.id==='putin')w.finale=3.6;
 const b=e.boss!;b.defeatedAt=w.time;b.active=false;w.bullets=w.bullets.filter(p=>p.friendly);
 for(const id of b.minions){const m=w.enemies.find(a=>a.id===id);if(m)m.hp=0;}
 w.events.push({type:'bossDefeated',boss:b.id,x:e.x,y:e.y+1});
}
export function stepBoss(w:World,e:Enemy,dt:number){
 const b=e.boss!;if(!b.active||e.hp<=0)return;
 const spec=BOSSES[b.id];
 // Stuns buy time, then restore a full telegraph instead of firing instantly.
 e.rooted=Math.max(0,(e.rooted??0)-dt);if(e.rooted>0){b.phase='recover';b.timer=.9;return;}
 b.stage=e.hp/e.maxHp<.3?3:e.hp/e.maxHp<.65?2:1;
 const floor=Math.max(-2,...w.boxes.filter(a=>a.hp>0&&Math.abs(a.x-e.x)<a.w/2+.8&&a.y+a.h<=e.y+.1).map(a=>a.y+a.h));e.y=Math.max(floor,e.y-8*dt);
 b.timer-=dt;e.dir=Math.sign(w.player.x-e.x)||-1;
 if(b.phase==='recover'){
  if(b.timer>0)return;
  b.phase='windup';b.timer=b.id==='iron-warden'?1.1:.95;b.aimX=w.player.x;b.aimY=w.player.y+1;b.shots=0;w.emit('bossWindup',e.x,e.y+1);return;
 }
 if(b.phase==='windup'){
  if(b.timer>0)return;b.phase='attack';b.timer=0;
 }
 const pattern=b.turn%3;
 if(b.id==='putin'){
  if(pattern===0){if(b.timer<=0){launchHostile(w,{...e,y:e.y+2},'rocket',b.aimX+(b.shots-1)*3,b.aimY);b.shots++;b.timer=.32;}if(b.shots<2+b.stage)return;}
  else if(pattern===1){const alive=b.minions.filter(id=>w.enemies.some(m=>m.id===id&&m.hp>0));for(let i=alive.length;i<Math.min(3,b.stage);i++){const m=addVehicle(w,'shahed',spec.left+6+i*9,8,0);m.vehicle!.active=true;m.vehicle!.phase='warning';b.minions.push(m.id);}}
  else {hostileBlast(w,b.aimX,e.y+.3,3,25);if(b.stage>=2)hostileBlast(w,b.aimX+6,e.y+.3,2.5,18);}
 }else if(b.id==='iron-warden'){
  if(pattern===0){
   if(b.timer<=0){launchHostile(w,e,'shell',b.aimX+(b.shots-1)*.6,b.aimY);b.shots++;b.timer=.3;}
   if(b.shots<b.stage)return;
  }else if(pattern===1){
   if(b.timer<=0){hostileBlast(w,b.aimX,e.y+.3,2.7,22);if(b.stage>=2)hostileBlast(w,b.aimX+5,e.y+.3,2.4,18);b.shots=1;}
  }else{
   const dir=Math.sign(b.aimX-e.x);e.x=Math.max(spec.left+2,Math.min(spec.right-2,e.x+dir*(b.stage===3?10:7)*dt));
   if(Math.abs(w.player.x-e.x)<2.5&&Math.abs(w.player.y-e.y)<1.6)w.damagePlayer(20,true);
   for(const f of w.followers)if(f.hp>0&&Math.abs(f.x-e.x)<2.5&&Math.abs(f.y-e.y)<1.6&&f.contactCooldown<=0){w.damageFollower(f,20);f.contactCooldown=.7;}
   if(Math.abs(e.x-b.aimX)>.3&&b.timer>-.9)return;
  }
 }else{
  if(pattern===0){
   const alive=b.minions.filter(id=>w.enemies.some(m=>m.id===id&&m.hp>0));
   for(let i=alive.length;i<Math.min(3,b.stage+1);i++){const m=addVehicle(w,'shahed',spec.left+7+i*8,7,0);m.vehicle!.active=true;m.vehicle!.phase='warning';b.minions.push(m.id);}
   w.emit('droneDive',e.x,e.y+2);
  }else if(pattern===1){
   if(b.timer<=0){launchHostile(w,{...e,y:e.y+4},'rocket',b.aimX+(b.shots-1)*4,b.aimY);b.shots++;b.timer=.4;}
   if(b.shots<2+b.stage)return;
  }else{
   for(let i=-b.stage;i<=b.stage;i++)w.projectile(e.x,e.y+1.2,e.dir,i*.16,false,true);
  }
 }
 b.turn++;b.phase='recover';b.timer=b.stage===3?1.4:2.1;
}
