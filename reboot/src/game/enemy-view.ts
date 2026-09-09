import type {AbilityArt} from './ability-art';
import {INFANTRY} from './infantry.ts';
import {enemySize,VEHICLES} from './enemies.ts';
import type {Enemy} from './world.ts';
/** Vehicles use the same integer pixel grid as the terrain and existing ability VFX. */
export function drawVehicle(c:CanvasRenderingContext2D,e:Enemy,x:number,y:number,time:number,art?:AbilityArt){
 const v=e.vehicle!,r=(a:number,b:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h));};
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(e.dir,1);
 if(v.kind==='tank'){
  r(-31,-16,62,14,'#18221e');r(-28,-15,56,11,'#626553');
  for(let i=-24;i<=24;i+=12){r(i-4,-13,9,8,'#222d28');r(i-2,-11,5,4,'#9a9876');}
  const tread=Math.floor(time*8)%4;for(let i=-30;i<30;i+=6){r(i+tread,-3,4,2,'#9b9978');r(i+tread,-17,4,2,'#383e2e');}
  r(-29,-26,56,11,'#414d36');r(-24,-29,43,5,'#8d936b');r(-25,-25,5,7,'#74805b');
  r(-13,-35,27,11,'#46543c');r(-10,-37,21,4,'#999e72');r(9,-32,30,4,'#a2a281');r(35,-33,6,6,'#343f32');
  r(-2,-40,8,3,'#26372e');r(-22,-22,5,3,'#d17b49');r(20,-22,4,3,'#f4b168');
  if(v.phase==='aim'){r(39,-34,3,7,'#fff0a0');r(42,-32,4,3,'#ef8747');}
 }else if(v.kind==='plane'){
  art?.draw(c,'weapons',4,0,-12,88,38);
 }else{
  // Delta wing and rear propeller distinguish this from the friendly quadcopter.
  for(let i=0;i<7;i++)r(-14+i*3,-7-i,3,3+i*2,'#70755c');
  r(-8,-8,24,4,'#c0b89a');r(13,-7,6,2,'#e0ccb0');r(-15,-7,4,5,'#282e28');
  r(-17,-9-(Math.floor(time*22)%2)*3,2,8+(Math.floor(time*22)%2)*6,'#c9c7a4');
  r(4,-9,3,2,v.phase==='aim'||v.phase==='dive'?'#ff6546':'#d8af67');
 }
 const markY=v.kind==='tank'?-25:v.kind==='plane'?-13:-9;for(const [i,color]of ['#d5d8d0','#4b6c96','#a5483a'].entries())r(-12,markY+i*2,7,2,color);
 c.restore();
 const size=enemySize(e),bar=v.kind==='tank'?46:28,top=y-Math.max(size.h*16, v.kind==='tank'?43:32);
 r(x-bar/2,top,bar,3,'#202c26');r(x-bar/2+1,top+1,(bar-2)*e.hp/e.maxHp,1,'#e09068');
 if(v.phase==='warning'){
  // Small local alert, no text panel over the play field.
  r(x-4,top-15,8,10,'#332d23');r(x-1,top-14,2,5,'#ffda83');r(x-1,top-7,2,2,'#ffda83');
  const progress=Math.min(1,v.age/VEHICLES[v.kind].warning);r(x-12,top-2,24*progress,1,'#ffda83');
 }
 if(v.phase==='aim'){
  const tx=x+(v.aimX-e.x)*16,ty=y-(v.aimY-e.y)*16;
  for(let i=1;i<9;i++){const t=i/9;if(i%2)r(x+(tx-x)*t,y-16+(ty-y+16)*t,2,2,'#d99a64');}
  for(const d of [-1,1]){r(tx+d*6-2,ty,4,1,'#ff8056');r(tx,ty+d*6-2,1,4,'#ff8056');}
 }
}

/** Role equipment uses the same pixel grid over the preserved infantry art. */
export function drawInfantryGear(c:CanvasRenderingContext2D,e:Enemy,x:number,y:number,time:number){
 const a=e.infantry;if(!a)return;
 const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(e.dir,1);
 const bob=a.moving?Math.floor(time*12)%2:0;c.translate(0,-bob);
 if(a.kind==='demolition'){
  const leg=a.moving?Math.sin(time*19)*4:0;
  r(-5,-10,5,8,'#454839');r(1,-10,5,8,'#6d6a48');r(-7+leg,-3,6,3,'#171f1e');r(1-leg,-3,6,3,'#171f1e');
  r(-7,-21,14,13,'#554735');r(-5,-21,10,12,'#8e734e');r(-6,-29,12,9,'#232e26');r(-5,-28,11,4,'#7b7352');r(1,-25,6,3,'#cfa075');r(5,-24,3,1,'#171d1e');
  r(-10,-19,4,10,'#ad8d61');r(7,-19,4,8,'#ba9671');
  for(let i=0;i<3;i++){r(-5+i*4,-18,3,7,'#a33f2b');r(-5+i*4,-18,3,2,'#dfb668');}r(-6,-12,13,2,'#272c25');
  r(1,-17,2,2,a.fuse>=0&&Math.floor(time*18)%2?'#fff4ae':'#f35831');
 }else{
  const top=e.heavy?-33:-26;
  if(a.kind==='rifle'){r(-4,top,9,3,'#69744e');r(-2,top,3,1,'#a3a47c');}
  if(a.kind==='assault'){r(-5,top-1,11,3,'#4483a4');r(2,top,3,2,'#b3b7a3');for(let j=0;j<3;j++)r(-1,-18+j*3,5,1,'#a4b4bd');}
  if(a.kind==='gunner'){for(let j=0;j<5;j++)r(-4+j,-24+j*2,3,2,'#c5a85c');r(8,-20,15,3,'#70766c');r(18,-17,2,9,'#414c40');}
  if(a.kind==='sniper'){r(-9,-24,5,19,'#425d43');for(let j=0;j<5;j++)r(-11+j%2,-23+j*4,4,2,'#7d8960');r(9,-18,17,2,'#869380');r(10,-22,7,3,'#222d2c');r(15,-21,2,1,'#e87359');}
  if(a.kind==='scout'){r(-12,-21,6,12,'#4c644c');r(-11,-36,1,17,'#a1bdb1');r(-13,-33,5,1,'#9cae97');r(-5,-25,2,7,'#93b6b1');r(-4,-20,6,1,'#7daaaa');}
  if(a.kind==='shield'&&a.shield>0){r(5,-25,11,24,'#16242c');r(6,-24,8,21,'#576b77');r(7,-21,6,4,'#16232b');r(8,-20,4,1,'#a7c6cb');r(7,-14,6,1,'#8095a0');r(7,-5,6,1,'#273b46');}
 }
 r(-5,-17,5,1,'#e5dfd4');r(-5,-16,5,1,'#4476ad');r(-5,-15,5,1,'#af4942');c.restore();
 const top=y-(e.heavy?44:38);
 if(a.alert>0){const rise=Math.min(4,(1.1-a.alert)*14);r(x-4,top-rise,9,13,'#17232c');r(x-1,top+1-rise,3,7,'#ffda64');r(x-1,top+10-rise,3,2,'#ffda64');}
 if(a.reloading>0){r(x-7,top+8,14,2,'#263639');r(x-7,top+8,14*(1-a.reloading/INFANTRY[a.kind].weapon.reloadTime),2,'#d9b46b');}
 if(a.fuse>=0){const radius=2.8*16;c.strokeStyle=Math.floor(time*12)%2?'#ffae58':'#e65335';c.lineWidth=1;c.beginPath();c.ellipse(Math.round(x),Math.round(y-8),radius,12,0,0,Math.PI*2);c.stroke();r(x-6,top+5,12*(a.fuse/.75),3,'#ff7648');}
 if(a.kind==='sniper'&&e.windup>0){c.globalAlpha=.5;for(let i=2;i<INFANTRY.sniper.range*16;i+=8)r(x+e.dir*i,y-16,4,1,'#e56142');c.globalAlpha=1;}
}
