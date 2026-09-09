import type {HeroId} from './content.ts';

export type FoleyKind='step'|'climb'|'jump'|'land'|'hurt'|'ready';
// Recorded material assets and source provenance: COMBAT_SFX_ASSETS.json.
type Motion={x:number;y:number;grounded:boolean;ladder:number;wallClimbing:boolean;hero:HeroId};
/** Contacts follow distance travelled, so a held stick against an obstacle stays quiet. */
export class MotionFoley{
  private previous:Motion|null=null;
  private distance=0;
  private travel:'step'|'climb'|null=null;
  reset(){this.previous=null;this.distance=0;this.travel=null;}
  step(current:Motion):('footstep'|'climbContact'|'land')[]{
    const before=this.previous;this.previous={...current};
    if(!before||before.hero!==current.hero){this.distance=0;this.travel=null;return [];}
    const dx=Math.abs(current.x-before.x),dy=Math.abs(current.y-before.y);
    if(dx>1||dy>1){this.distance=0;this.travel=null;return [];}
    const climbing=current.ladder>=0||current.wallClimbing;
    if(current.grounded&&!before.grounded&&before.ladder<0&&!before.wallClimbing){this.distance=0;this.travel=null;return ['land'];}
    const travel=climbing?'climb':current.grounded&&before.grounded?'step':null;
    if(travel!==this.travel){this.distance=0;this.travel=travel;}
    if(!travel)return [];
    this.distance+=travel==='step'?dx:dy;
    const stride=travel==='step'?1.9:1.4;
    if(this.distance<stride)return [];
    this.distance%=stride;
    return [travel==='step'?'footstep':'climbContact'];
  }
}
