import {drawTankBody} from './mount-view.ts';
import {translate} from './i18n.ts';
import type {Effect} from './world';
import type {AbilityArt} from './ability-art';
/** Bounded, screen-pixel particles flow into the glove; simulation charge owns readiness. */
export function drawCharge(c:CanvasRenderingContext2D,x:number,y:number,dir:number,hold:number,time:number){
 const q=Math.min(1,hold/.9),cx=x+dir*9,cy=y-20;c.save();
 for(let i=0;i<30;i++){const phase=(time*(1.2+q)+i*.137)%1,a=i*2.399,r=(1-phase)*(18+q*24);c.globalAlpha=(.35+phase*.65)*(.4+q*.6);c.fillStyle=i%3?'#eab75b':'#fff1b5';const px=Math.round((cx+Math.cos(a)*r)/2)*2,py=Math.round((cy+Math.sin(a)*r*.8)/2)*2;c.fillRect(px,py,2,2);}
 c.globalAlpha=1;c.fillStyle=q>=1?'#fff1b5':'#df9850';const z=q>=1?6:2;c.fillRect(Math.round(cx)-z/2,Math.round(cy)-z/2,z,z);
 if(q>=1){c.globalAlpha=.5+Math.sin(time*18)*.25;for(const [dx,dy]of [[-6,0],[6,0],[0,-6],[0,6]])c.fillRect(Math.round(cx+dx),Math.round(cy+dy),2,2);}
 c.restore();
}
/** Animation follows simulation age: pausing or replaying a co-op snapshot freezes the same pose. */
export function drawHeroEffect(c:CanvasRenderingContext2D,f:Effect,x:number,y:number,_time:number,art:AbilityArt){
 const t=f.age,d=f.dir,fade=Math.min(1,f.life*5),pulse=1+Math.sin(t*9)*.045,frame=Math.floor(t*10)%4;
 const prop=(n:number,xx=x,yy=y-18,w=38,h=w,angle=0,alpha=1)=>art.draw(c,'props',n,xx,yy,w,h,d,angle,alpha*fade);
 const ring=(xx:number,yy:number,r:number,color:string,a=1)=>{if(r<=0||a<=0)return;c.save();c.globalAlpha*=Math.min(1,a)*fade;c.fillStyle=color;const steps=Math.max(24,Math.ceil(r*3));for(let i=0;i<steps;i++){const angle=i*Math.PI*2/steps;c.fillRect(Math.round((xx+Math.cos(angle)*r)/2)*2,Math.round((yy+Math.sin(angle)*r*.38)/2)*2,2,2);}c.restore();};
 const sparks=(xx:number,yy:number,count:number,color:string,spread=65)=>{c.save();c.fillStyle=color;for(let i=0;i<count;i++){const a=i*2.399,phase=(t*.7+i*.113)%1,r=phase*spread;c.globalAlpha=(1-phase)*fade;c.fillRect(Math.round(xx+Math.cos(a)*r),Math.round(yy+Math.sin(a)*r*.7-phase*20),2,2);}c.restore();};
 const blast=(xx:number,yy:number,age:number,size=80)=>{if(age>=0&&age<.65)art.draw(c,'blast',Math.min(7,Math.floor(age/.65*8)),xx,yy,size,size);};
 const newHero=['usyk','almaziv','klychko','taira','prytula'].includes(f.hero);
 const reinforcement=(cell:number,xx=x,yy=y-20,size=48)=>art.draw(c,'reinforcements',cell,xx,yy,size,size,d,0,fade);
 const arcs=()=>{for(const l of f.links??[]){const sx=x+(l.x-f.x)*16,sy=y-(l.y-f.y)*16,ex=x+(l.toX-f.x)*16,ey=y-(l.toY-f.y)*16;art.draw(c,'lightning',2+Math.min(5,Math.floor(t*25)%6),(sx+ex)/2,(sy+ey)/2,22,Math.hypot(ex-sx,ey-sy),1,Math.atan2(ey-sy,ex-sx)-Math.PI/2,fade);}};
 if(f.hero==='taira'&&f.kind==='weapon'){
  if(f.power===2){blast(x,y-12,t,72);ring(x,y,16+t*90,'#9de8ef',1-t/.6);sparks(x,y-12,12,'#c3f4ff',45);}else arcs();return;
 }
 if(newHero){
  // Contact sparks are small, short-lived and follow real strikes, never giant glove icons.
  if(f.kind==='weapon'){if(f.power)sparks(x+d*22,y-19,12,'#ffe3a0',32);reinforcement(Math.min(3,Math.floor(t/.22*4)),x+d*22,y-19,f.power?48:f.hero==='taira'?28:24);return;}
  if(f.hero==='usyk'){
   // Dash dust at the feet; the ultimate accelerates actual punches rather than faking extra hits.
   if(f.kind==='special'&&t<.3)reinforcement(7,x-d*14,y-3,24);
   if(f.kind==='ultimate')sparks(x-d*7,y-12,5,'#ffe078',18);
  }
  if(f.hero==='klychko'){
   if(f.kind==='special'&&t<.25)reinforcement(7,x-d*6,y+Math.floor(t*65),28);
   if(f.kind==='ultimate'&&f.impactAge!==undefined){
    const a=t-f.impactAge;reinforcement(7,x,y-4,48+Math.min(1,a*4)*48);
    for(const side of [-1,1]){ring(x+side*a*100,y-2,9+a*15,'#ddbd85',1-a/.65);sparks(x+side*a*85,y-3,8,'#bdad89',35);}
   }else if(f.kind==='ultimate'&&t>.35){sparks(x,y-5,8,'#d9b16d',22);}
  }
  if(f.hero==='taira'){
   if(f.kind==='special'){
    reinforcement(4,x,y-9,20);ring(x,y-1,64,'#6fcca3',.55);ring(x,y-1,64*((t*2)%1),'#bbf3cc',.45);
    for(let i=0;i<5;i++){const xx=x+(i-2)*23,yy=y-7-((t*14+i*7)%24);c.save();c.globalAlpha=.6*fade;c.fillStyle='#9fefbd';c.fillRect(Math.round(xx)-1,Math.round(yy)-3,2,6);c.fillRect(Math.round(xx)-3,Math.round(yy)-1,6,2);c.restore();}
   }else if(f.impactAge===undefined){
    ring(x,y-2,Math.max(4,42-t*100),'#9de8ef',.8);sparks(x,y-19,18,'#c3f4ff',24);
   }else{const a=t-f.impactAge;blast(x,y-18,a,112);ring(x,y-3,18+a*145,'#c3f4ff',1-a/.75);sparks(x,y-18,30,'#9de8ef',105);if(a<.24)arcs();}
  }
  if(f.hero==='almaziv'){
   if(f.kind==='special'&&t<.2)reinforcement(Math.min(3,Math.floor(t*20)),x+d*21,y-17,28);
   // Grenades and explosions are rendered at their simulated positions, not painted ahead.
  }
  if(f.hero==='prytula'&&f.kind==='ultimate'){
   if(t<1){const yy=y-Math.round((1-t)*90);reinforcement(6,x,yy-66,72);drawTankBody(c,{dir:d,landing:0,armor:200,moving:false,recoil:0,hurt:0},x,yy,t,false);}
   else if(t<1.35)reinforcement(7,x,y-3,48);
  }
  return;
 }
 if(f.kind==='weapon'){
  if(f.hero==='franko'){prop(2,x+d*20,y-20,40,48,-1+t*8);blast(x+d*22,y-5,t,48);return;}
  if(f.hero==='shevchenko'&&f.target!==undefined){art.draw(c,'lightning',Math.min(7,2+Math.floor(t*9)),x,y-90,94,194);return;}
  if(f.hero==='lesya'){for(let i=0;i<4;i++)art.draw(c,'nature',4+Math.min(3,Math.floor(t*10)),x+d*i*22,y-28-i*8,42,60,d);return;}

  if(f.hero==='skovoroda')prop(15,x+d*22,y-16,36,36,-1+t*12);
  else {art.draw(c,f.hero==='zelensky'?'auras':'ordnance',f.hero==='zelensky'?12+Math.min(3,Math.floor(t*12)):6,x+d*22,y-16,38,40,d,t*2);sparks(x+d*20,y-15,8,'#ffe9ac',30);}return;
 }
 if(f.kind==='special'){
  switch(f.hero){
   case 'shevchenko':prop(0,x,y-30,32,40,-.3);for(let i=0;i<3;i++)ring(x,y-16,Math.max(0,t*210-i*24),'#ffe6a1',1-t/.8);sparks(x,y-20,20,'#ffe092',100);break;
   case 'lesya':for(let i=0;i<7;i++){const a=t*2+i*.9;art.draw(c,'nature',(Math.floor(t*12)+i)%4,x+Math.sin(a)*76,y-44+Math.cos(t*3+i)*19,35,35,Math.cos(a)>0?1:-1,.15*Math.sin(a),fade);}sparks(x,y-25,9,'#9cbbe2');break;
   case 'franko':{const rise=Math.min(1,t*5);prop(3,x,y-17.6*rise,30,35.2*rise);if(t<.5)blast(x,y-4,t,48);break;}
   case 'bandera':if(t<.65)prop(4,x,y-10,22,30,t*5);else for(let i=-2;i<=2;i++)art.draw(c,'blast',2+Math.floor((t*8+i+20)%3),x+i*18,y-17,35,44,1,0,.85);break;
   case 'mamai':prop(5,x,y,34,40,t*8);sparks(x,y,7,'#ffe49f',28);break;
   case 'skovoroda':prop(6,x,y,38,31,Math.sin(t*5)*.4);sparks(x,y,8,'#f7e4a2',35);break;
   case 'bayraktar':art.draw(c,'ordnance',frame,x,y-4,45,38,d,Math.sin(t*18)*.06);sparks(x-d*14,y,8,'#ffd691',30);break;
   case 'ghost':art.draw(c,'auras',4+frame,x,y-21,41,53,d,0,.6*fade);sparks(x-d*12,y-18,7,'#6ddcff',27);break;
   case 'bilozerska':prop(11,x,y-5,23,12);if(t<.6)ring(x,y-4,20*t/.6,'#ffc87d');break;
   case 'it-army':art.draw(c,'summons',12+frame,x,y-18,32,37,d);art.draw(c,'auras',8+frame,x,y-22,50,50);break;
   case 'zelensky':art.draw(c,'auras',frame,x,y-20,56,56,d,0,Math.max(0,1-t));break;
  }return;
 }
 switch(f.hero){
  case 'shevchenko':{
   const pen=x+d*(25+Math.min(1,t/.6)*115);if(t<.7)prop(0,pen,y-115,35,52,-.3,1-t*.6);
   if(t<.9){c.save();c.font='bold 13px monospace';c.textAlign='center';c.fillStyle='#ffe39c';c.fillText(translate('ВОЛЯ').slice(0,Math.min(translate('ВОЛЯ').length,Math.floor(t*12)+1)),Math.round(x+d*80),Math.round(y-99));c.restore();}
   for(let i=0;i<3;i++){const age=t-(.65+i*.22),xx=x+d*(2+i*4)*16;
    if(age<0&&age>-.55){ring(xx,y-2,14*(1+age/.55),'#dcb264',.7);sparks(xx,y-6,7,'#a5eaff',27);if(age>-.16)art.draw(c,'lightning',age<-.08?0:1,xx,y-91,94,194,1,0,.5);}
    if(age>=0&&age<.64){art.draw(c,'lightning',Math.min(7,2+Math.floor(age/.64*6)),xx,y-91,94,194);ring(xx,y-2,18+age*150,'#c3f4ff',1-age/.64);}
   }break;
  }
  case 'lesya':for(let i=-5;i<=5;i++){const grow=Math.min(1,Math.max(0,(t-Math.abs(i)*.04)*5)),xx=x+i*16;art.draw(c,'nature',4+Math.min(3,Math.floor(grow*3.9)),xx,y-22,37,48,1,Math.sin(t*3+i)*.05,fade);sparks(xx,y-30,4,'#94ffd3',40);}ring(x,y-3,85*pulse,'#74dbae',.4);break;
  case 'franko':{const radius=Math.min(9,t*20)*16;for(const side of [-1,1])for(let i=0;i<4;i++){const a=t-i*.045;prop(3,x+side*(radius-i*15),y-13-Math.sin(Math.min(1,a)*Math.PI)*12,22,35+i*3,side*.35,1-i*.16);}blast(x,y-15,t,105);ring(x,y-2,radius,'#ffdda3');break;}
  case 'bandera':art.draw(c,'summons',frame,x,y-25+Math.sin(t*30),99,76,d);for(let i=1;i<6;i++)blast(x-d*(30+i*13),y-7,(t+i*.09)%.6,35+i*3);break;
  case 'mamai':for(let i=3;i>=0;i--){const hop=Math.sin(t*16-i)*3;art.draw(c,'summons',4+(frame+i)%4,x-d*i*40,y-34+hop,74,79,d,Math.sin(t*12-i)*.025,.9*fade);sparks(x-d*i*40,y-12,8,'#a1ffe0',32);}break;
  case 'bayraktar':for(let i=0;i<7;i++){const age=t-(.8+i*.26),xx=x+d*(3+i*3)*16;if(age<0&&age>-.8){ring(xx,y-2,13,'#ffaf68');art.draw(c,'weapons',3,xx,y-165+(age+.8)/.8*150,28,9,1,Math.PI/2);sparks(xx,y-100+(age+.8)/.8*100,4,'#ffd68a',17);}blast(xx,y-12,age,88);}break;
  case 'ghost':for(let i=1;i<5;i++)art.draw(c,'blast',5+i%3,x-d*(55+i*18),y,30+i*6,20+i*4,1,0,.2);art.draw(c,'jet',Math.floor(t*14)%4,x,y,154,64,d);break;
  case 'zelensky':art.draw(c,'summons',8+frame,x,y,112,83,d,Math.sin(t*5)*.025);sparks(x,y+20,14,'#ffdd87',44);break;
  case 'bilozerska':{
   if(t<.5){ring(x+d*14,y-17,(1-t/.5)*38,'#fff0c1');sparks(x+d*14,y-17,18,'#cbefff',40);c.save();c.globalAlpha=.65;c.fillStyle='#fd8f72';c.fillRect(x,y-17,d*880,1);c.restore();}
   else{const a=Math.max(0,1-(t-.5)/.6);c.save();c.globalAlpha=a;c.fillStyle='#6dbfff';c.fillRect(x,y-23,d*880,13);c.fillStyle='#d4faff';c.fillRect(x,y-20,d*880,6);c.fillStyle='#fffbea';c.fillRect(x,y-18,d*880,2);c.restore();blast(x+d*14,y-17,t-.5,65);}break;
  }
  case 'it-army':for(let i=-3;i<=3;i++)art.draw(c,'auras',8+(frame+i+4)%4,x+i*78,y-40+Math.sin(t*3+i)*17,66,66,1,0,.75*fade);for(let i=0;i<3;i++)ring(x,y-10,70+((t*55+i*50)%140),'#65edc8',.65);sparks(x,y-50,40,'#96ffdc',210);break;
  case 'skovoroda':art.draw(c,'auras',frame,x,y-27,96,96,1,0,.7*fade);prop(6,x,y-42,33,27,Math.sin(t*3)*.1);ring(x,y-5,80*pulse,'#f2e2ad');ring(x,y-5,73/pulse,'#a9e1f2',.6);for(let i=0;i<7;i++){const a=t+i*Math.PI*2/7;prop(0,x+Math.cos(a)*74,y-22+Math.sin(a)*31,12,22,a,.6);}sparks(x,y-20,22,'#fff1c3',75);break;
 }
}
