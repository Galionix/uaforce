import type {Enemy,World} from './world';
import {BOSSES} from './bosses';
const S=16;
export type BossArt={image:HTMLImageElement;bounds:[number,number,number,number]};
export function drawBoss(c:CanvasRenderingContext2D,e:Enemy,x:number,y:number,art?:BossArt,time=0){
 const b=e.boss!;const rect=(a:number,d:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x+a*2/3),Math.round(y+d*2/3),Math.round(w*2/3),Math.round(h*2/3));};
 if(art){
  const spec=BOSSES[b.id],width=Math.round(spec.w*S),height=Math.round(spec.h*S);
  c.save();c.translate(Math.round(x+(b.phase==='attack'?Math.sin(time*55):0)),Math.round(y));c.scale(e.dir>0?-1:1,1);
  c.imageSmoothingEnabled=false;c.drawImage(art.image,...art.bounds,-Math.round(width/2),-height,width,height);c.restore();
  if(b.phase==='windup'){rect(-30,-height*1.5-12,60,5,'#341c27');rect(-30,-height*1.5-12,60*Math.min(1,b.timer/1.1),5,'#ff6944');}
  return;
 }
 if(b.id==='iron-warden'||b.id==='putin'){
  rect(-53,-25,106,24,'#11191e');rect(-49,-23,98,19,'#465155');
  for(let i=-43;i<47;i+=15){rect(i,-20,11,12,'#101c22');rect(i+3,-17,5,6,'#76827d');}
  rect(-40,-49,80,25,'#27393d');rect(-36,-46,72,6,'#68726b');rect(-31,-37,25,9,'#14232b');
  rect(-17,-67,34,35,'#202b30');rect(-12,-64,24,8,'#788078');rect(-10,-57,20,19,'#b29c7a');
  rect(-11,-57,22,7,'#17262f');rect(-8,-55,8,3,'#ff493e');rect(4,-55,6,3,'#e93435');
  rect(-7,-37,14,9,'#f36930');rect(-4,-36,8,6,'#ffdf73');
  const side=e.dir>0?1:-1;rect(side>0?15:-57,-47,42,12,'#1a292f');rect(side>0?20:-52,-47,32,3,'#93927a');
  rect(-43,-32,8,5,'#e85137');rect(35,-32,8,5,'#e85137');
 }else{
  rect(-24,-12,17,12,'#142330');rect(7,-12,17,12,'#142330');rect(-26,-48,52,38,'#202c40');
  rect(-21,-47,42,6,'#527284');rect(-13,-69,26,28,'#19222f');rect(-9,-64,18,17,'#777d7b');
  rect(-11,-63,22,10,'#10171f');rect(-8,-60,7,3,'#f2614b');rect(3,-60,6,3,'#f2614b');
  rect(-6,-39,12,18,'#a6463c');rect(-4,-36,8,9,'#d3684d');
  for(const a of [-1,1]){rect(a*25-4,-66,8,35,'#536779');rect(a*25-15,-71,30,4,'#9caeac');rect(a*25-4,-74,8,10,'#253646');rect(a*25-2,-72,4,3,'#e96147');}
 }
 // Individual faces remain readable at gameplay scale; no masks or generic commander heads.
 if(b.id==='iron-warden'){
  rect(-20,-74,40,37,'#bfa486');rect(-21,-80,42,13,'#707168');rect(-16,-78,31,5,'#929082');
  rect(-18,-68,36,23,'#ccb18f');rect(-17,-62,13,4,'#493f37');rect(5,-62,13,4,'#493f37');
  rect(-13,-57,7,2,'#181e21');rect(7,-57,7,2,'#181e21');rect(-2,-59,6,13,'#dfbd97');rect(-9,-45,19,3,'#755747');
  rect(-21,-38,42,15,'#364431');rect(-21,-36,12,4,'#b9a563');rect(10,-36,12,4,'#b9a563');
 }else if(b.id==='swarm-master'){
  rect(-17,-81,34,6,'#b19477');rect(-22,-75,44,32,'#c4a17e');rect(-16,-43,32,9,'#a38166');
  rect(-17,-72,31,4,'#dcbb92');rect(-17,-62,14,5,'#604336');rect(4,-62,14,5,'#604336');
  rect(-14,-57,9,3,'#151e20');rect(6,-57,9,3,'#151e20');rect(-2,-57,6,12,'#e0b68b');rect(-10,-44,20,3,'#70503e');
  rect(-23,-36,46,17,'#374232');rect(-15,-31,30,9,'#142025');rect(-8,-28,5,3,'#f65e39');
 }else{
  for(const side of [-1,1]){rect(side*34-10,-76,20,40,'#263229');for(let i=0;i<3;i++){rect(side*34-7,-72+i*11,14,8,'#101919');rect(side*34-4,-70+i*11,8,3,b.phase==='windup'?'#ff683a':'#81352e');}}
  rect(-18,-77,36,39,'#c5a689');rect(-14,-84,28,10,'#d4baa0');rect(-21,-72,6,17,'#828174');rect(16,-72,6,17,'#828174');
  rect(-13,-64,10,3,'#55463f');rect(-9,-61,7,3,'#534239');rect(4,-64,10,3,'#55463f');rect(2,-61,7,3,'#534239');
  rect(-11,-59,7,2,'#a9c5c8');rect(5,-59,7,2,'#a9c5c8');rect(-6,-59,2,2,'#17222c');rect(5,-59,2,2,'#17222c');
  rect(-1,-59,4,13,'#e5c7a4');rect(-8,-43,16,3,'#734737');rect(-5,-45,10,2,'#87604a');
  rect(-23,-38,46,16,'#151e2a');rect(-7,-37,14,8,'#bfc2bc');rect(-3,-36,6,15,'#902b2c');
 }
 rect(-33,-31,12,3,'#e0ded4');rect(-33,-28,12,3,'#426791');rect(-33,-25,12,3,'#a1493c');
 if(b.phase==='windup'){rect(-30,-83,60,5,'#341c27');rect(-30,-83,60*Math.min(1,b.timer/1.1),5,'#ffbf68');}
}
export function drawArena(c:CanvasRenderingContext2D,w:World,cameraX:number,cameraY:number){
 const e=w.boss,b=e?.boss;if(!e||!b||!b.active||e.hp<=0)return;
 const spec=BOSSES[b.id];c.fillStyle='#663e38';
 for(const gate of [spec.left,spec.right]){const x=gate*S-cameraX;for(let y=0;y<124;y+=12){c.fillRect(Math.round(x-3),Math.round(266-y+cameraY),6,8);}}
 if(b.phase==='windup'){
  const x=b.aimX*S-cameraX,y=266-(b.aimY-1)*S+cameraY;
  c.strokeStyle='#ff684e';c.lineWidth=2;c.strokeRect(Math.round(x-24),Math.round(y-5),48,5);c.fillStyle='#ffe08c';c.fillRect(Math.round(x-2),Math.round(y-18),4,8);
  if((b.id==='iron-warden'&&b.turn%3===1||b.id==='putin'&&b.turn%3===2)&&b.stage>=2)c.strokeRect(Math.round(x+(b.id==='putin'?6:5)*S-24),Math.round(y-5),48,5);
 }
}

/** A defeated boss leaves a disabled machine; the portrait never becomes an allied actor. */
export function drawBossWreck(c:CanvasRenderingContext2D,e:Enemy,x:number,y:number,time:number){
 const b=e.boss;if(!b||b.defeatedAt===undefined)return;
 const age=time-b.defeatedAt,width=b.id==='swarm-master'?40:74;
 const r=(a:number,d:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x+a),Math.round(y+d),w,h);};
 r(-width/2,-14,width,14,'#17201f');r(-width/2+3,-18,width-8,7,'#3a3d31');
 for(let i=0;i<5;i++)r(-width/2+4+i*(width-9)/5,-9,7,7,'#0c1114');
 r(-16,-27,27,11,'#303930');r(8,-23,27,5,'#4e4940');
 for(let i=0;i<7;i++){const phase=(age*.35+i*.17)%1;c.globalAlpha=(1-phase)*.55;const size=8+Math.floor(phase*13);r(-23+i*7+Math.sin(age+i)*4,-22-phase*52,size,size,'#56544c');}c.globalAlpha=1;
 if(age<8)for(let i=0;i<5;i++){const h=6+Math.floor((1+Math.sin(age*8+i*2))*4);r(-25+i*11,-15-h,5,h,'#b34a25');r(-24+i*11,-12-h,2,h,'#f5b742');}
}
