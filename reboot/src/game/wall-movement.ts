import type {Box} from './world.ts';
export const WALL={climbSpeed:5.8,slideSpeed:2.6,jumpSpeed:12.8,kickSpeed:7,lock:.22};
/** Platforms are one-way: never turn their sides into infinitely climbable walls. */
export function wallAt(boxes:Box[],x:number,y:number,side:number){
 if(!side)return null;
 return boxes.find(b=>b.hp>0&&b.kind!=='platform'&&y+1.5>b.y+.05&&y<b.y+b.h-.04&&Math.abs((b.x-side*b.w/2)-(x+side*.32))<.13)??null;
}
export function clearBody(boxes:Box[],x:number,y:number){return !boxes.some(b=>b.hp>0&&b.kind!=='platform'&&Math.abs(x-b.x)<b.w/2+.3&&y+1.55>b.y+.02&&y<b.y+b.h-.02);}
/** Ledge destination is validated against all solids; no vaulting through ceilings. */
export function ledgeAt(boxes:Box[],x:number,y:number,side:number){
 const wall=wallAt(boxes,x,y,side);if(!wall)return null;
 const top=wall.y+wall.h;if(top-y<.05||top-y>1.2)return null;
 const destination=wall.x-side*wall.w/2+side*.37;
 return clearBody(boxes,destination,top)?{x:destination,y:top}:null;
}
