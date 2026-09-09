import {reducedPresentation} from './motion-settings';
/** Runtime pixel effects, independent of paused game time. No generated explosion frames. */
export class PresentationFx {
 private c:CanvasRenderingContext2D;private get reduced(){return reducedPresentation();}
 constructor(private canvas:HTMLCanvasElement){canvas.width=480;canvas.height=270;this.c=canvas.getContext('2d')!;this.c.imageSmoothingEnabled=false;}
 draw(elapsed:number,kind:'menu'|'hero'|'boss'){
  if(kind!=='menu'){this.reveal(elapsed,kind==='boss');return;}
  const c=this.c,t=this.reduced?4:elapsed,boss=false,menu=true;c.clearRect(0,0,480,270);
  const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  // A physically waving two-colour banner, composed from narrow pixel strips.
  for(let x=0;x<480;x+=4){const y=83+Math.sin(x*.027-t*1.7)*11;const a=menu?.14:.25;c.globalAlpha=a;r(x,y,4,37,boss?'#69372b':'#1876c3');r(x,y+37,4,37,boss?'#932c25':'#ffcd42');}c.globalAlpha=1;
  // Embroidered geometric border: diamonds, crosses, blue/gold running stitch.
  for(let x=0;x<480;x+=20){for(const y of [8,265]){const color=boss?'#b64a37':(x%40?'#e5bc52':'#438db2');for(let d=-3;d<=3;d++)r(x+8-(3-Math.abs(d))*2,y+d*2,2+(3-Math.abs(d))*4,2,color);r(x+16,y,2,2,color);}}
  // Large pixel trident behind the subject, revealed by the blast.
  c.globalAlpha=boss?0:menu?.07:.22;const tx=menu?338:365,ty=62;
  for(const [x,y,w,h] of [[19,0,5,52],[3,8,4,39],[36,8,4,39],[3,43,37,5],[9,25,4,18],[30,25,4,18],[12,39,8,4],[24,39,8,4],[18,48,7,14]] as number[][])r(tx+x,ty+y,w,h,boss?'#e46840':'#ffda65');c.globalAlpha=1;
  // Persistent smoke and embers; deterministic motion, no particle accumulation.
  for(let i=0;i<45;i++){const life=(t*(menu?10:24)+i*17)%245,x=(i*83+Math.sin(t+i)*10)%480,y=267-life;c.globalAlpha=(1-life/270)*(menu?.4:.8);r(x,y,i%3===0?3:1,i%3===0?3:2,i%4===0?'#438abb':boss?'#fb643b':'#ffd66b');}c.globalAlpha=1;
  if(!menu&&!this.reduced){const flash=Math.max(0,1-Math.abs(t-.14)/.12)*.36;if(flash){c.globalAlpha=flash;r(0,0,480,270,'#fff1bc');c.globalAlpha=1;}}
 }
 private reveal(elapsed:number,boss:boolean){
  const c=this.c,t=this.reduced?5:elapsed; c.clearRect(0,0,480,270);
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const gold=boss?'#f25935':'#ffce4e',blue=boss?'#6e272b':'#258ec8';
  // The opaque curtain physically tears away in stepped pixel columns, exposing moving art.
  if(t<1.85){
   const radius=Math.max(0,(t-.46))*490;
   for(let x=0;x<480;x+=8){
    const dx=x-346,edge=Math.max(0,radius-Math.abs(dx)*.53+(Math.sin(x*4)*12));
    const top=Math.max(0,142-edge),bottom=Math.min(270,142+edge);
    rect(x,0,8,top,'#070d17');rect(x,bottom,8,270-bottom,'#070d17');
    if(edge>0&&edge<270){rect(x,top,8,4,gold);rect(x,bottom-4,8,4,blue);}
   }
  }
  // Compression streaks converge before the first explosion, then fly outward.
  if(t<1.65)for(let i=0;i<30;i++){
   const angle=i*2.399,travel=t<.48?210*(1-t/.48):30+(t-.48)*340;
   c.globalAlpha=t<.48?.5:Math.max(0,1-(t-.48)/1.15);
   const x=346+Math.cos(angle)*travel,y=142+Math.sin(angle)*travel*.7;
   rect(x,y,10+i%4*5,2,i%2?gold:'#b8e9ef');
  }c.globalAlpha=1;
  for(const start of [.48,1.8]){
   const age=t-start;if(age<0||age>2.1)continue;
   const origin=start<1?346:300,oy=start<1?142:208;
   // Expanding fire lobes, cooling to smoke; each piece has its own velocity and gravity.
   for(let i=0;i<38;i++){
    const angle=i*2.399,speed=30+i%7*18,dist=age*speed;
    const x=origin+Math.cos(angle)*dist,y=oy+Math.sin(angle)*dist*.75+age*age*26;
    const size=Math.max(1,(24+i%4*5)*(1-age/2.1));
    c.globalAlpha=Math.max(0,1-age/2.1);
    rect(x-size/2,y-size/2,size,size,age<.17?'#fff1bc':age<.43?gold:age<.85?'#e66c28':boss?'#443138':'#38464b');
    if(age<.65)rect(x-size/4,y-size/4,size/2,size/2,age<.25?'#fff8db':'#ffe08b');
   }
   c.globalAlpha=1;
   for(let i=0;i<26;i++){
    const angle=i*2.399,dist=age*(80+i%6*25),x=origin+Math.cos(angle)*dist,y=oy+Math.sin(angle)*dist+age*age*40;
    c.save();c.translate(Math.round(x),Math.round(y));c.rotate(Math.round(age*(i%2?8:-8))*Math.PI/4);c.globalAlpha=Math.max(0,1-age/2.1);rect(-2,-2,i%3+2,3,i%2?gold:'#688992');c.restore();
   }
  }
  // A blue/gold embroidered pennant sweeps underneath the title, then remains quiet.
  const sweep=Math.max(0,Math.min(1,(t-1.05)/.9));
  const width=230*sweep;
  rect(0,226,width,5,blue);rect(0,232,width,5,gold);
  for(let x=8;x<width-8;x+=14){rect(x,240,4,4,gold);rect(x+4,244,4,4,blue);}
  if(t>2.5)for(let i=0;i<15;i++){const age=(t*.18+i*.137)%1;c.globalAlpha=(1-age)*.55;rect((i*97)%480,270-age*240,2,2,i%3?gold:blue);}c.globalAlpha=1;
 }

}
