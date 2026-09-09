import type {World} from './world.ts';
import {nearbyBarrel} from './barrels.ts';
import {nearbyMount} from './mounts.ts';
import {segmentHit} from './world.ts';
export const TEAM_BOOST={seconds:5,enemyRate:.3,cooldown:20,range:1.8};
export type Interaction={kind:'barrel'|'throw'|'tank'|'exit'|'rescue'|'highFive';x:number;y:number};
/** One priority list for both input and the nearby world-space button. */
export function objectInteraction(w:World):Interaction|undefined{
 const p=w.player;
 if(w.mounted)return {kind:'exit',x:w.mounted.x,y:w.mounted.y+3.8};
 if(w.heldBarrel!==null)return {kind:'throw',x:p.x,y:p.y+4.2};
 const captive=w.allies.find(a=>!a.rescued&&Math.abs(a.x-p.x)<2.2&&p.y<2);
 if(captive)return {kind:'rescue',x:captive.x,y:2.5};
 const tank=nearbyMount(w);if(tank)return {kind:'tank',x:tank.x,y:tank.y+3.8};
 const barrel=nearbyBarrel(w);if(barrel)return {kind:'barrel',x:barrel.x,y:barrel.y+barrel.h+.9};
}
export function highFivePartner(w:World){
 if(w.players.length!==2||w.highFive.cooldown>0||w.story||w.cinematic||w.mode!=='playing')return;
 if(w.players.some(a=>a.body.hp<=0||!a.body.grounded||a.body.ladder>=0||a.mounted||a.heldBarrel!==null||w.withPlayer(a.id,()=>!!objectInteraction(w))))return;
 const [a,b]=w.players.map(a=>a.body);
 if(Math.abs(a.x-b.x)>TEAM_BOOST.range||Math.abs(a.y-b.y)>.45)return;
 if(w.boxes.some(box=>box.hp>0&&box.kind!=='platform'&&segmentHit(a.x,a.y+1,b.x,b.y+1,box.x-box.w/2,box.y,box.x+box.w/2,box.y+box.h)!==null))return;
 return w.players.find(a=>a.id!==w.actor.id);
}
export function interactionTarget(w:World){
 if(w.mode!=='playing'||w.story||w.evac.phase==='departing')return;
 return objectInteraction(w)??(highFivePartner(w)?{kind:'highFive' as const,x:(w.players[0].body.x+w.players[1].body.x)/2,y:Math.max(...w.players.map(a=>a.body.y))+4.2}:undefined);
}
export function doHighFive(w:World){
 const partner=highFivePartner(w);if(!partner)return false;
 const a=w.player,b=partner.body;
 a.facing=b.x>=a.x?1:-1;b.facing=-a.facing;
 Object.assign(w.highFive,{left:TEAM_BOOST.seconds,cooldown:TEAM_BOOST.cooldown,age:0,x:(a.x+b.x)/2,y:Math.max(a.y,b.y)+1.4});
 w.emit('highFive',w.highFive.x,w.highFive.y);return true;
}
