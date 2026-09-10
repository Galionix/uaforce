import type {Actions} from './world.ts';
/** Retain one-shot input between render frames and the slower network tick. */
export class PendingActions {
 private jump=false;private special=false;private ultimate=false;private interact=false;private fire=false;
 add(a:Actions){this.jump||=a.jump;this.special||=a.special;this.ultimate||=!!a.ultimate;this.interact||=a.interact;this.fire||=a.fire;}
 clear(){this.jump=this.special=this.ultimate=this.interact=this.fire=false;}
 take(a:Actions):Actions{const value={...a,jump:this.jump,special:this.special,ultimate:this.ultimate,interact:this.interact,fire:this.fire};this.clear();return value;}
}
