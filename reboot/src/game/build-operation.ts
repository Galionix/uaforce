import type {World,Box} from './world.ts';
import {addInfantry} from './infantry.ts';
import {missionVehicles} from './enemies.ts';
import {missionMounts} from './mounts.ts';
/** Authored layout shares the ordinary physics, AI, destruction and snapshot pipeline. */
export function buildOperation(w:World){
 const l=w.mission.layout!;
 w.ceiling=Math.max(l.exitY,...l.surfaces.map(s=>s.top),...w.mission.vehicles.map(v=>v[2]))+16;
 const box=(x:number,y:number,width:number,height:number,hp:number,kind:Box['kind'])=>w.boxes.push({id:w.nextId(),x,y,w:width,h:height,hp,maxHp:hp,kind});
 w.player.x=l.spawn.x;w.player.y=l.spawn.y;w.checkpoint=l.spawn.x;w.actor.checkpointY=l.spawn.y;
 w.allies=l.allies.map(p=>({...p,rescued:false}));w.medkits=l.medkits.map(p=>({...p,used:false}));w.ammoCrates=l.ammo.map(p=>({...p,used:false}));w.ladders=l.ladders.map(p=>({...p}));
 w.evac.x=w.mission.exit+22;w.evac.y=l.exitY+8;
 for(let x=0;x<w.mission.length;x++)for(let y=-3;y<0;y++)box(x+.5,y,1,1,y===-3?Infinity:40,'earth');
 for(const s of l.surfaces){
  const depth=s.depth??.5;
  if(s.permanent)box((s.left+s.right)/2,s.top-depth,s.right-s.left,depth,Infinity,s.kind);
  else {
   for(let x=s.left;x<s.right;x++)box(x+.5,s.top-depth,1,depth,65,s.kind);
   // A maintenance catwalk below each floor remains reachable after a collapse.
   box((s.left+s.right)/2,s.top-3.25,s.right-s.left,.25,Infinity,'platform');
   // Short supports leave visible holes in the destroyed main floor.
   for(let x=s.left;x<s.right;x+=5)box(x+1.5,s.top-.25,Math.min(3,s.right-x),.25,Infinity,'platform');
  }
 }
 // Ladder exits and objective platforms survive an ability destroying the surrounding floor.
 for(const a of l.ladders){box(a.x,a.top-.25,3,.25,Infinity,'platform');box(a.x,a.bottom-.25,3,.25,Infinity,'platform');}
 for(const a of [...l.route,...l.checkpoints,...l.allies,...l.ammo,...l.medkits,{x:w.mission.exit,y:l.exitY}])box(a.x,a.y-.25,3,.25,Infinity,'platform');
 for(const p of l.props)box(p.x,p.y,p.kind==='wall'?1.4:1,p.kind==='wall'?1.6:1,p.kind==='barrel'?25:50,p.kind);
 box(w.mission.radio,l.radioY,1.6,2.2,150,'radio');
 for(const g of l.guards){const e=addInfantry(w,g.role,g.x,g.y);if(g.commander){e.heavy=true;e.hp=e.maxHp=240;}}
 missionVehicles(w);missionMounts(w);
}
