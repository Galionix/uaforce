import {drawFlagWipe} from './flag-wipe.ts';
import {reducedPresentation} from './motion-settings.ts';

/** The blue/yellow diagonal wipe from the trailer, without introducing another audio cue. */
export class FlagTransition {
 readonly canvas=document.createElement('canvas');
 private time=1;private reduced=false;private reverse=false;
 constructor(parent:HTMLElement=document.body){
  this.canvas.className='flag-transition';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.width=960;this.canvas.height=540;this.canvas.hidden=true;parent.append(this.canvas);
 }
 get active(){return this.time<(this.reduced ? .18 : .72);}
 play(reverse=false){this.reduced=reducedPresentation();this.reverse=reverse;this.time=0;this.canvas.hidden=false;this.draw();}
 stop(){this.time=1;this.canvas.hidden=true;}
 step(dt:number){if(!this.active)return;this.time+=Math.min(.1,Math.max(0,dt));if(!this.active){this.stop();return;}this.draw();}
 private draw(){
  const c=this.canvas.getContext('2d');if(!c)return;
  c.clearRect(0,0,960,540);drawFlagWipe(c,960,540,this.time,this.reverse,this.reduced);
 }
}
