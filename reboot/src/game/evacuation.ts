import type {PlayerActor} from './world.ts';

/** World-space cabin contact, inside the visible 112×76 helicopter at 16px/unit.
 * Test the fighter's chest, not a radius around the flag or the hanging rope. */
export function canBoardHelicopter(actor:PlayerActor,helicopter:{x:number;y:number}){
 const p=actor.body,chest=p.y+.9;
 return actor.lives>0&&p.hp>0&&!actor.mounted&&!p.grounded&&p.ladder<0
  &&p.x>=helicopter.x-.8&&p.x<=helicopter.x+1.6
  &&chest>=helicopter.y-.5&&chest<=helicopter.y+.5;
}
