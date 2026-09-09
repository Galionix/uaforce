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
  c.clearRect(0,0,960,540);
  if(this.reduced){c.fillStyle=`rgba(10,33,40,${1-this.time/.18})`;c.fillRect(0,0,960,540);return;}
  const t=this.time/.72,p=Math.max(0,(t-.13)/.87),x=-220+Math.pow(p,.8)*1510;
  c.save();if(this.reverse){c.translate(960,0);c.scale(-1,1);}
  c.translate(Math.round(x),0);c.transform(1,0,-.28,1,0,0);
  c.fillStyle='#064268';c.fillRect(-20,0,1480,540);
  c.fillStyle='#1488bd';c.fillRect(0,0,1440,270);
  c.fillStyle='#ffda62';c.fillRect(0,270,1440,270);
  c.fillStyle='#63c9ed';c.fillRect(10,0,12,270);
  c.fillStyle='#fff0a1';c.fillRect(10,270,12,270);
  c.fillStyle='#ffffff25';for(let i=0;i<8;i++)c.fillRect(70+i*177-this.time*300,0,24,540);
  for(let i=0;i<32;i++){c.fillStyle=i%2?'#ffd765':'#72d7f4';const y=(i*79)%540;const tail=(i%5)*9;c.fillRect(-25-tail-p*30,y,5+i%7,3+i%4);}
  c.restore();
 }
}
