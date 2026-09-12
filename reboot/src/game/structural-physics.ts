import type {World,Box} from './world.ts';
import {enemyActive,enemySize} from './enemies.ts';

/** Only breakable construction participates. Terrain and authored route platforms are anchors. */
const movable=(b:Box)=>Number.isFinite(b.hp)&&!b.required&&!b.sabotage&&['stone','wall','crate'].includes(b.kind);
const live=(b:Box)=>b.hp>0&&!b.falling&&b.collapseDelay===undefined;
const cache=new WeakMap<World,{destroyed:number;boxes:Box[];supported:Set<number>}>();
const CELL=4;
class BoxGrid{
 cells=new Map<string,Box[]>();
 constructor(boxes:Box[]){for(const b of boxes)if(live(b))this.visit(b.x-b.w/2,b.y,b.x+b.w/2,b.y+b.h,key=>{const cell=this.cells.get(key);if(cell)cell.push(b);else this.cells.set(key,[b]);});}
 private visit(l:number,b:number,r:number,t:number,fn:(key:string)=>void){for(let x=Math.floor(l/CELL);x<=Math.floor(r/CELL);x++)for(let y=Math.floor(b/CELL);y<=Math.floor(t/CELL);y++)fn(x+':'+y);}
 near(l:number,b:number,r:number,t:number){const found=new Set<Box>();this.visit(l,b,r,t,key=>{for(const box of this.cells.get(key)??[])found.add(box);});return found;}
}
function touching(a:Box,b:Box){
 const ox=(a.w+b.w)/2-Math.abs(a.x-b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 // A corner alone cannot carry a roof.
 return ox> .03&&oy>=-.025||oy>.03&&ox>=-.025;
}
function supported(boxes:Box[]){
 const grid=new BoxGrid(boxes),links=new Map<number,number[]>(),roots:number[]=[];
 for(const b of boxes)if(live(b)&&movable(b)){
  let rooted=b.y<=-2;const adjacent:number[]=[];
  for(const a of grid.near(b.x-b.w/2-.03,b.y-.03,b.x+b.w/2+.03,b.y+b.h+.03)){
   if(a===b||a.kind==='barrel'||!touching(a,b))continue;
   if(movable(a))adjacent.push(a.id);else rooted=true;
  }
  links.set(b.id,adjacent);if(rooted)roots.push(b.id);
 }
 const result=new Set(roots);
 for(let i=0;i<roots.length;i++)for(const next of links.get(roots[i])??[])if(!result.has(next)){result.add(next);roots.push(next);}
 return result;
}
/** Capture before the first hit so old authored floating scenery is not retroactively demolished. */
export function rememberStructures(w:World){
 const prior=cache.get(w);if(!prior||prior.boxes!==w.boxes)cache.set(w,{destroyed:w.destroyed,boxes:w.boxes,supported:supported(w.boxes)});
}
export function stepStructures(w:World,dt:number){
 const state=cache.get(w);if(!state||state.boxes!==w.boxes)return;
 if(state.destroyed!==w.destroyed){
  const next=supported(w.boxes);
  for(const b of w.boxes)if(live(b)&&movable(b)&&state.supported.has(b.id)&&!next.has(b.id)){
   b.collapseDelay=.3;b.vy=0;w.emit('debris',b.x,b.y+b.h);
  }
  state.supported=next;state.destroyed=w.destroyed;
 }
 const falling=w.boxes.filter(b=>b.hp>0&&(b.falling||b.collapseDelay!==undefined));if(!falling.length)return;
 const grid=new BoxGrid(w.boxes),hitEnemies=new Set<number>(),hitPlayers=new Set<number>();
 for(const b of falling){
  if(b.collapseDelay!==undefined){b.collapseDelay=Math.max(0,b.collapseDelay-dt);if(b.collapseDelay>0)continue;b.collapseDelay=undefined;b.falling=true;}
  const old=b.y;b.vy=(b.vy??0)-24*dt;b.y+=b.vy*dt;
  let floor=-2,landing:Box|undefined;
  for(const a of grid.near(b.x-b.w/2,b.y,b.x+b.w/2,old))if(a!==b&&a.hp>0&&Math.abs(a.x-b.x)<(a.w+b.w)/2-.02&&old>=a.y+a.h-.025&&b.y<=a.y+a.h){if(a.y+a.h>floor){floor=a.y+a.h;landing=a;}}
  b.y=Math.max(b.y,floor);
  let crush=false;
  if(b.vy<-5){
   for(const e of w.enemies)if(enemyActive(e)&&!hitEnemies.has(e.id)){
    const size=enemySize(e);
    if(Math.abs(e.x-b.x)<(b.w+size.w)/2&&old>=e.y&&b.y<e.y+size.h&&old+b.h>e.y){hitEnemies.add(e.id);w.damageEnemy(e,80);crush=true;}
   }
   for(const a of w.players)if(a.body.hp>0&&!hitPlayers.has(a.id)&&Math.abs(a.body.x-b.x)<b.w/2+.4&&old>=a.body.y&&b.y<a.body.y+1.6&&old+b.h>a.body.y){hitPlayers.add(a.id);w.withPlayer(a.id,()=>w.damagePlayer(18));crush=true;}
  }
  if(b.y<=floor||crush){if(b.y<=floor&&landing&&(landing.kind==='barrel'||landing.sabotage)&&b.vy<-5)w.damageBox(landing,100);b.y=Math.max(b.y,floor);w.damageBox(b,b.hp);b.vy=0;b.falling=false;}
 }
}
