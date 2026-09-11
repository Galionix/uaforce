import type {World,Event} from './world.ts';

export type Atmosphere='sunlit'|'drizzle'|'storm'|'snow'|'industrial'|'night'|'ash'|'firestorm';
export const ATMOSPHERES:Record<Atmosphere,{precip:'rain'|'snow'|'ash'|'motes';count:number;wind:number;tint:string;night:number;fog:number;storm:boolean}>={
 sunlit:{precip:'motes',count:34,wind:5,tint:'#a77d38',night:0,fog:.025,storm:false},
 drizzle:{precip:'rain',count:125,wind:28,tint:'#254b65',night:.1,fog:.035,storm:false},
 storm:{precip:'rain',count:230,wind:56,tint:'#193653',night:.32,fog:.055,storm:true},
 snow:{precip:'snow',count:120,wind:16,tint:'#7ea2b6',night:.04,fog:.045,storm:false},
 industrial:{precip:'ash',count:55,wind:12,tint:'#785d42',night:.08,fog:.04,storm:false},
 night:{precip:'motes',count:48,wind:7,tint:'#142d59',night:.33,fog:.06,storm:false},
 ash:{precip:'ash',count:100,wind:24,tint:'#8a4931',night:.17,fog:.055,storm:false},
 firestorm:{precip:'ash',count:130,wind:32,tint:'#3f263c',night:.31,fog:.055,storm:true},
};
export const FX_PARTICLE_LIMIT=900;
type Kind='smoke'|'ember'|'chip'|'dust';
type Bit={x:number;y:number;vx:number;vy:number;age:number;life:number;size:number;kind:Kind;variant:number};
type Ring={x:number;y:number;age:number;life:number;size:number};
const wrap=(n:number,max:number)=>(n%max+max)%max;
/** Low-rate, bounded atmospheric lightning. A pause freezes its phase. */
export function stormLight(time:number){const phase=wrap(time-5,18);return Math.max(0,1-phase/.20,phase>.29?1-(phase-.29)/.13:0)*(phase<.43?1:0);}
/** Presentation-only: its random stream and particles never touch simulation state. */
export class SceneFx {
 readonly bits:Bit[]=[];readonly rings:Ring[]=[];time=0;level=1;
 private seed=9173;private trail=0;private roofs=new Float32Array(80).fill(360);private roofAge=1;
 private smoke:HTMLCanvasElement[]=[];private vignette:HTMLCanvasElement|null=null;
 private random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){this.bits.length=0;this.rings.length=0;this.time=0;this.seed=9173;this.trail=0;this.roofAge=1;}
 private add(x:number,y:number,kind:Kind,speed:number){
  if(this.bits.length>=Math.floor(FX_PARTICLE_LIMIT*this.level))return;
  const a=this.random()*Math.PI*2,smoke=kind==='smoke';
  this.bits.push({x,y,vx:Math.cos(a)*speed,vy:smoke?1+this.random()*2:Math.sin(a)*speed+2,
   age:0,life:smoke?1.4+this.random()*1.5:kind==='ember'?.4+this.random()*1.1:.3+this.random()*.6,
   size:smoke?10+this.random()*15:1+this.random()*2,kind,variant:Math.floor(this.random()*3)});
 }
 emit(e:Event,cameraX:number,cameraY:number){
  if(this.level<=0||e.x*16-cameraX < -100||e.x*16-cameraX>740||266-e.y*16+cameraY < -120||266-e.y*16+cameraY>480)return;
  const blast=['burst','hostileBlast','bossDefeated'].includes(e.type),ult=e.type==='ultimate'||e.type==='thunder';
  if(blast||ult){
   const count=Math.round((e.type==='bossDefeated'?150:blast?90:42)*this.level);
   for(let i=0;i<count;i++)this.add(e.x,e.y,i%6===0||i%6===1?'smoke':i%3===0?'chip':'ember',i%6<2?2:6+this.random()*12);
   this.rings.push({x:e.x,y:e.y,age:0,life:.48,size:e.type==='bossDefeated'?125:ult?93:72});
   if(this.rings.length>18)this.rings.shift();
  }else if(['shot','enemyShot','enemySniperShot','supportShot','mountShot','tankShot','rocketLaunch'].includes(e.type)){
   this.add(e.x,e.y,'smoke',.45);for(let i=0;i<(e.type==='mountShot'?7:2);i++)this.add(e.x,e.y,'ember',4);
  }else if(e.type==='debris'){for(let i=0;i<Math.round(8*this.level);i++)this.add(e.x,e.y,i%2?'dust':'chip',5);}
 }
 step(w:World,dt:number,cameraX:number,cameraY:number){
  if(w.mode!=='playing')return;
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
  const profile=ATMOSPHERES[w.mission.atmosphere??'sunlit'];
  let write=0;for(const p of this.bits){p.age+=dt;if(p.age>=p.life)continue;
   p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.kind==='smoke'){p.vx+=(profile.wind*.012-p.vx)*dt;p.vy+=dt*.4;}else p.vy-=dt*(p.kind==='ember'?7:20);
   this.bits[write++]=p;
  }this.bits.length=write;
  write=0;for(const r of this.rings){r.age+=dt;if(r.age<r.life)this.rings[write++]=r;}this.rings.length=write;
  this.trail+=dt;if(this.trail>=.055){this.trail=0;let budget=24;
   for(const b of w.bullets){if(!b.ordnance||budget--<=0)continue;if(b.x*16-cameraX<0||b.x*16-cameraX>640)continue;this.add(b.x,b.y,'smoke',.15);this.add(b.x,b.y,'ember',.5);}
  }
  // Roof mask uses the current destructible surfaces, not the original map.
  this.roofAge+=dt;if(this.roofAge>.12){this.roofAge=0;this.roofs.fill(360);
   for(const b of w.boxes){if(b.hp<=0)continue;const left=(b.x-b.w/2)*16-cameraX,right=left+b.w*16,top=266-(b.y+b.h)*16+cameraY;
    if(right<0||left>640)continue;for(let i=Math.max(0,Math.floor(left/8));i<Math.min(80,Math.ceil(right/8));i++)this.roofs[i]=Math.min(this.roofs[i],Math.max(0,top));
   }
  }
 }
 private cache(){
  if(this.vignette)return;
  for(let k=0;k<3;k++){const cv=document.createElement('canvas');cv.width=cv.height=24;const c=cv.getContext('2d')!;
   for(let y=0;y<24;y++)for(let x=0;x<24;x++){const dx=x-11.5,dy=y-11.5,edge=dx*dx+dy*dy;
    if(edge>110+((x*7+y*11+k*13)%19))continue;
    const n=(x*13+y*7+k*3)%7;c.fillStyle= n<2?'#394149':n<5?'#51545a':'#696765';c.fillRect(x,y,1,1);
   }this.smoke.push(cv);
  }
  this.vignette=document.createElement('canvas');this.vignette.width=640;this.vignette.height=360;const c=this.vignette.getContext('2d')!;
  c.fillStyle='#081321';for(let i=0;i<10;i++){c.globalAlpha=.012;c.fillRect(i*4,i*3,640-i*8,3);c.fillRect(i*4,357-i*3,640-i*8,3);c.fillRect(i*4,i*3,4,360-i*6);c.fillRect(636-i*4,i*3,4,360-i*6);}
 }
 sky(c:CanvasRenderingContext2D,w:World,reduced:boolean){
  if(this.level<=0)return;const p=ATMOSPHERES[w.mission.atmosphere??'sunlit'];c.save();
  c.fillStyle=p.tint;c.globalAlpha=p.night;c.fillRect(0,0,640,360);
  if(w.mission.atmosphere==='night'){c.fillStyle='#aacbd2';for(let i=0;i<32;i++){c.globalAlpha=.15+(Math.sin(this.time*.5+i)*.5+.5)*.18;c.fillRect((i*97)%640,(i*37)%140,1,1);}}
  const flash=p.storm&&!reduced?stormLight(this.time):0;
  if(flash>0){c.globalAlpha=flash*.24;c.fillStyle='#bad6e6';c.fillRect(0,0,640,360);const x=80+(Math.floor((this.time-5)/18)*137+440)%480;c.globalAlpha=flash*.85;c.fillStyle='#d9eeed';let prev=x;
   const bolt=(ax:number,ay:number,bx:number,by:number)=>{const steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));for(let j=0;j<=steps;j+=2)c.fillRect(Math.round((ax+(bx-ax)*j/steps)/2)*2,Math.round((ay+(by-ay)*j/steps)/2)*2,2,2);};
   for(let i=0;i<12;i++){const nx=prev+(i%4===0?12:-7)+Math.round(Math.sin(i*17.7+Math.floor(this.time/18))*9);bolt(prev,i*12,nx,(i+1)*12);if(i===4||i===8){const dir=i===4?1:-1;bolt(nx,(i+1)*12,nx+dir*17,(i+1)*12+10);bolt(nx+dir*17,(i+1)*12+10,nx+dir*32,(i+1)*12+28);}prev=nx;}
  }c.restore();
 }
 draw(c:CanvasRenderingContext2D,w:World,cameraX:number,cameraY:number,reduced:boolean){
  if(this.level<=0)return;this.cache();const p=ATMOSPHERES[w.mission.atmosphere??'sunlit'];c.save();c.imageSmoothingEnabled=false;
  // Slowly expanding cached pixel smoke sprites. No blur, per-frame canvases or readback.
  for(const b of this.bits){const x=Math.round(b.x*16-cameraX),y=Math.round(266-b.y*16+cameraY),age=b.age/b.life;if(x< -70||x>710||y< -70||y>430)continue;
   if(b.kind==='smoke'){const size=Math.round(b.size*(.7+age*1.6));c.globalAlpha=(1-age)*.33;c.drawImage(this.smoke[b.variant],x-size/2|0,y-size/2|0,size,size);}
   else {c.globalAlpha=Math.min(1,(1-age)*2);c.fillStyle=b.kind==='ember'?(age<.25?'#fff2b0':age<.6?'#ffa63e':'#c35b36'):b.kind==='dust'?'#a09173':['#918773','#615c55','#bcab88'][b.variant];const size=Math.ceil(b.size);c.fillRect(x,y,size,b.kind==='ember'?Math.max(1,Math.ceil(size+b.vy*.16)):size);}
  }
  for(const r of this.rings){const age=r.age/r.life;c.globalAlpha=(1-age)*.55;c.fillStyle=age<.35?'#fff2bd':'#b9b5a4';const radius=r.size*Math.sqrt(age);
   for(let i=0;i<44;i++){const a=i*Math.PI/22;c.fillRect(Math.round((r.x*16-cameraX+Math.cos(a)*radius)/2)*2,Math.round((266-r.y*16+cameraY+Math.sin(a)*radius*.6)/2)*2,4,2);}
  }
  // Screen-space precipitation, stopped at the first surviving roof/surface.
  const count=Math.round(p.count*this.level),t=this.time;
  for(let i=0;i<count;i++){const near=i%3===0,speed=p.precip==='rain'?(near?260:175):p.precip==='snow'?20:12;
   const x=Math.floor(wrap(i*97.43-t*p.wind*(near?1:.6)-cameraX*.13,640));const roof=this.roofs[Math.min(79,x>>3)];
   const y=Math.floor(wrap(i*53.71+t*speed-cameraY*.18,390)-20);if(y>=roof||y<0)continue;
   c.globalAlpha=p.precip==='rain'?(near?.33:.19):p.precip==='snow'?.55:.3+Math.sin(t+i)*.15;
   c.fillStyle=p.precip==='rain'?'#a5c9d9':p.precip==='snow'?'#d8e9e6':p.precip==='ash'?(i%7===0?'#f6b36c':'#a49990'):w.mission.atmosphere==='night'?'#96d7a1':'#e7d78e';
   if(p.precip==='rain'){c.fillRect(x,y,1,near?7:4);if(near)c.fillRect(x-1,y+4,1,5);if(roof-y<12&&roof<358){c.fillRect(x-3,Math.floor(roof)-1,2,1);c.fillRect(x+2,Math.floor(roof)-2,2,1);}}
   else {const sway=Math.round(Math.sin(i+t*.8)*3);c.fillRect(x+sway,y,near?2:1,near?2:1);}
  }
  // Low, drifting bands; retain silhouettes and UI contrast rather than hiding combat.
  c.globalAlpha=p.fog;for(let i=0;i<7;i++){const x=Math.round(wrap(i*119+t*p.wind*.3-cameraX*.2,820)-130),y=Math.round(245+Math.sin(i+t*.25)*22+cameraY*.1);c.drawImage(this.smoke[i%3],x,y,155,36);}
  c.globalAlpha=.055;c.fillStyle=p.tint;c.fillRect(0,0,640,360);c.globalAlpha=1;c.drawImage(this.vignette!,0,0);
  const flash=p.storm&&!reduced?stormLight(this.time):0;if(flash){c.globalAlpha=flash*.095;c.fillStyle='#cde5ec';c.fillRect(0,0,640,360);}
  c.restore();
 }
}
