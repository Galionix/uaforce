import type {Actions} from './world.ts';
export type TouchAction='jump'|'fire'|'special'|'ultimate'|'interact';
export const touchActions:TouchAction[]=['jump','fire','special','ultimate','interact'];
/** A pointer owns one control; released taps survive until the next input poll. */
export class TouchState {
 private buttons=new Map<number,TouchAction>();private taps=new Set<TouchAction>();
 private stick:number|null=null;private x=0;private y=0;
 press(id:number,action:TouchAction){if(this.buttons.has(id)||this.stick===id)return;this.buttons.set(id,action);this.taps.add(action);}
 startStick(id:number){if(this.stick!==null||this.buttons.has(id))return false;this.stick=id;return true;}
 moveStick(id:number,x:number,y:number){if(this.stick!==id)return;const length=Math.max(1,Math.hypot(x,y));this.x=x/length;this.y=y/length;}
 release(id:number,cancel=false){const action=this.buttons.get(id);this.buttons.delete(id);if(cancel&&action)this.taps.delete(action);if(this.stick===id){this.stick=null;this.x=this.y=0;}}
 clear(){this.buttons.clear();this.taps.clear();this.stick=null;this.x=this.y=0;}
 sample():Actions{
  const down=(a:TouchAction)=>this.taps.has(a)||[...this.buttons.values()].includes(a);
  const held=(a:TouchAction)=>[...this.buttons.values()].includes(a);
  const axis=(v:number)=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.65);
  // Deliberate vertical movement avoids catching ladders during almost-horizontal runs.
  const value={move:axis(this.x),climb:Math.abs(this.y)>.4?axis(-this.y):0,jump:down('jump'),jumpHeld:held('jump'),fire:down('fire'),special:down('special'),ultimate:down('ultimate'),interact:down('interact')};
  this.taps.clear();return value;
 }
}
export function touchDevice(coarse:boolean,points:number,userAgent:string,platform:string){
 return coarse||(points>0&&/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent))||(points>1&&platform==='MacIntel');
}
