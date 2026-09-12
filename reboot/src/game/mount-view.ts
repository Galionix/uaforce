import type {AbilityArt} from './ability-art';
import type {Mount} from './mounts';import {TANK} from './mounts';
/** Original tank on the same 16 px/world-unit grid, with a blue/yellow friendly marking. */
export function drawMount(c:CanvasRenderingContext2D,t:Mount,x:number,y:number,time:number,occupied:boolean,art?:AbilityArt){
 const r=(a:number,b:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(a),Math.round(b),w,h);};
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(t.dir,1);if(t.landing>0)c.scale(1,1-.1*t.landing/.18);
 const broken=t.armor<=0;
 if(t.summoner!==undefined&&art){art.draw(c,'reinforcements',15,-2,-22+(t.moving?Math.floor(time*15)%2:0),83,62,1,0,broken?.5:1);if(t.recoil>0){r(34,-25,8,3,'#ffe09a');}}else{
 r(-32,-13,64,12,'#15262c');r(-29,-12,58,10,broken?'#4b4841':'#67776d');
 for(let i=-25;i<30;i+=11){r(i,-11,8,8,'#1b2e31');r(i+2,-9,4,4,'#a4a591');}
 const tread=t.moving?Math.floor(time*15)%5:0;for(let i=-30;i<29;i+=6)r(i+tread,-2,4,2,broken?'#726a5c':'#b4b49b');
 r(-28,-23,55,11,broken?'#42453e':'#466353');r(-25,-25,45,4,broken?'#676455':'#95aa83');
 r(-14,-32,29,10,broken?'#45423b':'#4e705d');r(-10,-34,21,3,broken?'#6e6452':'#b0bd92');
 const kick=t.recoil>0?3:0;r(10-kick,-26,28,4,broken?'#46463d':'#c0c5a6');r(35-kick,-27,5,6,'#263d3f');
 if(broken){
  r(-5,-29,4,13,'#151e23');r(-9,-20,12,3,'#111c22');r(-23,-17,8,5,'#242c2a');r(10,-12,5,6,'#111d20');
  for(let i=0;i<3;i++){const lift=(time*11+i*9)%27;r(-4+i*6,-35-Math.floor(lift),5,5,'#505751');}
 }else{
  r(-23,-21,11,4,'#4ba9d0');r(-23,-17,11,4,'#f3d564');r(22,-21,4,3,'#ffe2a0');
  if(!occupied){r(-4,-38,12,3,'#192d33');r(-4,-35,12,5,'#111e25');}
  else{r(-3,-37,10,3,'#bcc8a2');r(3,-35,3,3,'#1b393e');}
  if(t.hurt>0){r(-18,-26,7,3,'#fff2bb');r(-21,-28,3,3,'#ffc778');}
 }
 }
 c.restore();
 if(!broken){
  r(x-24,y-46,48,4,'#192b30');r(x-23,y-45,Math.round(46*t.armor/t.maxArmor),2,t.armor<100?'#ee8f65':'#80dab6');
  if(occupied&&t.cooldown>0)r(x-23,y-40,Math.round(46*Math.max(0,1-t.cooldown/(t.summoner!==undefined?3.2:TANK.reload))),2,'#ffe392');
  if(!occupied){r(x-4,y-58,8,2,'#ffe09a');r(x-2,y-56,4,2,'#ffe09a');r(x-1,y-54,2,2,'#ffe09a');}
 }
}
