import {segmentHit,type World,type Effect,type Enemy} from './world.ts';
import {enemyActive} from './enemies.ts';
import {meleeContact} from './hero-expansion.ts';
const clear=(w:World,a:{x:number;y:number},b:{x:number;y:number})=>!w.boxes.some(t=>t.hp>0&&segmentHit(a.x,a.y,b.x,b.y,t.x-t.w/2,t.y,t.x+t.w/2,t.y+t.h)!==null);
const point=(e:Enemy)=>({x:e.x,y:e.y+.85});
function arc(w:World,links:NonNullable<Effect['links']>){const p=w.player;w.effects.push({playerId:w.actor.id,kind:'weapon',hero:'taira',x:p.x,y:p.y,dir:p.facing,life:.24,age:0,hit:new Set(),links});}
/** Three contacts at most; every hop is local, unobstructed and inside the overall range cap. */
export function tairaAttack(w:World){
 const p=w.player,start={x:p.x,y:p.y+1.1};
 const first=w.enemies.filter(enemyActive).map(e=>({e,at:meleeContact(w,e,6)})).filter(a=>a.at).sort((a,b)=>Math.abs(a.at!.x-p.x)-Math.abs(b.at!.x-p.x))[0];
 const links:NonNullable<Effect['links']>=[];
 if(!first){
  const end={x:p.x+p.facing*6,y:start.y};let limit=1,box;
  for(const b of w.boxes)if(b.hp>0){const t=segmentHit(start.x,start.y,end.x,end.y,b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h);if(t!==null&&t<limit){limit=t;box=b;}}
  links.push({...start,toX:start.x+(end.x-start.x)*limit,toY:end.y});if(box)w.damageBox(box,52);
 }else{
  let e:Enemy|undefined=first.e,at=first.at!,from=start;const used=new Set<number>();
  for(let i=0;i<3&&e;i++){
   used.add(e.id);links.push({...from,toX:at.x,toY:at.y});const damage=[52,36,24][i];
   if(e.infantry?.shield){e.infantry.shield=Math.max(0,e.infantry.shield-damage);w.emit('enemyShieldHit',e.x,e.y+1);}
   e.ionized=4;w.damageEnemy(e,damage);from=at;
   e=w.enemies.filter(a=>enemyActive(a)&&!used.has(a.id)&&Math.hypot(a.x-p.x,a.y-p.y)<=9&&Math.hypot(point(a).x-from.x,point(a).y-from.y)<=2.8&&clear(w,from,point(a))).sort((a,b)=>Math.hypot(a.x-from.x,a.y+.85-from.y)-Math.hypot(b.x-from.x,b.y+.85-from.y))[0];
   if(e)at=point(e);
  }
 }
 arc(w,links);w.events.push({type:'shot',hero:'taira',x:p.x,y:p.y+1});
}
/** Delayed local blast; marks create secondary explosions, with a strict per-target damage cap. */
export function tairaOverload(w:World,f:Effect){
 if(f.age<.35||f.hit.has(-1))return;f.hit.add(-1);f.impactAge=f.age;
 const origin={x:f.x,y:f.y+1};
 const marks=w.enemies.filter(e=>enemyActive(e)&&(e.ionized??0)>0&&Math.hypot(e.x-f.x,e.y-f.y)<=9&&clear(w,origin,point(e))).slice(0,8);
 const sources=marks.map(point),damage=new Map<Enemy,number>();
 for(const e of w.enemies.filter(enemyActive)){
  const at=point(e),base=Math.hypot(at.x-origin.x,at.y-origin.y)<=6.5&&clear(w,origin,at)?150:0;
  const secondary=sources.some(s=>Math.hypot(s.x-at.x,s.y-at.y)<=2.5&&clear(w,s,at))?100:0;
  if(base||secondary)damage.set(e,base+secondary);
 }
 for(const e of marks)e.ionized=0;
 for(const [e,n]of damage){if(e.infantry)e.infantry.shield=0;w.damageEnemy(e,n,'explosion');}
 // Hit enemies before breaking cover: walls cannot disappear retroactively for this pulse.
 for(const b of w.boxes)if(b.hp>0&&Number.isFinite(b.hp)&&(Math.hypot(b.x-origin.x,b.y+b.h/2-origin.y)<4||sources.some(s=>Math.hypot(b.x-s.x,b.y+b.h/2-s.y)<2.5)))w.damageBox(b,180);
 for(const s of sources)w.effects.push({playerId:f.playerId,kind:'weapon',hero:'taira',x:s.x,y:s.y,dir:1,power:2,life:.6,age:0,hit:new Set()});
 f.links=sources.map(s=>({...origin,toX:s.x,toY:s.y}));
 w.events.push({type:'burst',hero:'taira',sfx:'taira-overload-v1',x:f.x,y:f.y+1});
}
