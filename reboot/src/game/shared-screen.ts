import type {World} from './world.ts';
/** Fixed 640×360 art viewport, letterboxed at every display size. */
export const SHARED_SCREEN={width:40,height:22.5,maxX:30,maxY:12,marginX:4} as const;
export type Position={x:number;y:number};
export function teamCamera(w:World,desired?:Position){
 const living=w.players.filter(a=>a.body.hp>0),actors=living.length?living:w.players;
 const xs=actors.map(a=>a.body.x),ys=actors.map(a=>a.body.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const center=desired??{x:(minX+maxX)/2,y:(minY+maxY)/2};
 return {x:Math.max(20,Math.min(w.mission.length-20,Math.max(maxX-16,Math.min(minX+16,center.x)))),y:Math.max(5,Math.max(maxY-(w.story?7.625:8.875),Math.min(minY+(w.story?7.125:8.75),center.y)))};
}
/** Remove only movement that spreads the pair: a stationary friend is never dragged. */
export function constrainTeam(w:World,before:Position[]){
 if(w.players.length<2||w.players.some(a=>a.body.hp<=0))return;
 for(const axis of ['x','y'] as const){
  const limit=axis==='x'?SHARED_SCREEN.maxX:SHARED_SCREEN.maxY;
  const [lo,hi]=w.players[0].body[axis]<=w.players[1].body[axis]?[0,1]:[1,0];
  const low=w.players[lo],high=w.players[hi],excess=high.body[axis]-low.body[axis]-limit;if(excess<=0)continue;
  const outLow=Math.max(0,before[lo][axis]-low.body[axis]),outHigh=Math.max(0,high.body[axis]-before[hi][axis]),total=outLow+outHigh;
  if(total>0){low.body[axis]+=excess*outLow/total;high.body[axis]-=excess*outHigh/total;}
  else { // Recovery for an externally relocated pair, e.g. a scripted checkpoint.
   high.body[axis]=low.body[axis]+limit;
  }
  for(const a of [low,high])if(Math.abs(a.body[axis]-before[a.id][axis])<.002){
   if(axis==='x'){a.move=0;a.body.detachVx=0;a.body.wallVx=0;}else a.body.vy=0;
  }
  if(axis==='y'){low.body.vy=0;high.body.vy=0;}
  for(const a of [low,high])if(a.mounted){a.mounted[axis]=a.body[axis];if(axis==='x')a.mounted.moving=Math.abs(a.body.x-before[a.id].x)>.001;else a.mounted.vy=0;}
 }
}
/** A far checkpoint cannot strand a respawned co-op actor outside the common view. */
export function sharedRespawn(w:World){
 if(w.players.length<2||w.players.some(a=>a.body.hp<=0))return;
 const p=w.player,other=w.players.find(a=>a.id!==w.actor.id)!.body;
 if(Math.abs(p.x-other.x)<=SHARED_SCREEN.maxX&&Math.abs(p.y-other.y)<=SHARED_SCREEN.maxY)return;
 const candidates=w.boxes.filter(b=>b.hp>0&&Math.abs(b.x-other.x)<10&&Math.abs(b.y+b.h-other.y)<7)
  .map(b=>({x:Math.max(b.x-b.w/2+.4,Math.min(b.x+b.w/2-.4,other.x+1.2)),y:b.y+b.h}))
  .filter(c=>!w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(c.x-b.x)<b.w/2+.34&&c.y+1.6>b.y+.05&&c.y<b.y+b.h-.05))
  .sort((a,b)=>Math.hypot(a.x-other.x,a.y-other.y)-Math.hypot(b.x-other.x,b.y-other.y));
 const spot=candidates[0]??other;p.x=spot.x;p.y=spot.y;p.vy=0;p.grounded=false;
}
