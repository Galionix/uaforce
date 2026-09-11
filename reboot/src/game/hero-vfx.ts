import {translate} from './i18n.ts';
import type {Effect} from './world';
import type {AbilityArt} from './ability-art';
/** Animation follows simulation age: pausing or replaying a co-op snapshot freezes the same pose. */
export function drawHeroEffect(c:CanvasRenderingContext2D,f:Effect,x:number,y:number,_time:number,art:AbilityArt){
 const t=f.age,d=f.dir,fade=Math.min(1,f.life*5),pulse=1+Math.sin(t*9)*.045,frame=Math.floor(t*10)%4;
 const prop=(n:number,xx=x,yy=y-18,w=38,h=w,angle=0,alpha=1)=>art.draw(c,'props',n,xx,yy,w,h,d,angle,alpha*fade);
 const ring=(xx:number,yy:number,r:number,color:string,a=1)=>{if(r<=0||a<=0)return;c.save();c.globalAlpha*=Math.min(1,a)*fade;c.fillStyle=color;const steps=Math.max(24,Math.ceil(r*3));for(let i=0;i<steps;i++){const angle=i*Math.PI*2/steps;c.fillRect(Math.round((xx+Math.cos(angle)*r)/2)*2,Math.round((yy+Math.sin(angle)*r*.38)/2)*2,2,2);}c.restore();};
 const sparks=(xx:number,yy:number,count:number,color:string,spread=65)=>{c.save();c.fillStyle=color;for(let i=0;i<count;i++){const a=i*2.399,phase=(t*.7+i*.113)%1,r=phase*spread;c.globalAlpha=(1-phase)*fade;c.fillRect(Math.round(xx+Math.cos(a)*r),Math.round(yy+Math.sin(a)*r*.7-phase*20),2,2);}c.restore();};
 const blast=(xx:number,yy:number,age:number,size=80)=>{if(age>=0&&age<.65)art.draw(c,'blast',Math.min(7,Math.floor(age/.65*8)),xx,yy,size,size);};
 if(f.kind==='weapon'){
  if(f.hero==='skovoroda')prop(15,x+d*22,y-16,36,36,-1+t*12);
  else {art.draw(c,f.hero==='zelensky'?'auras':'ordnance',f.hero==='zelensky'?12+Math.min(3,Math.floor(t*12)):6,x+d*22,y-16,38,40,d,t*2);sparks(x+d*20,y-15,8,'#ffe9ac',30);}return;
 }
 if(f.kind==='special'){
  switch(f.hero){
   case 'shevchenko':prop(0,x,y-30,32,40,-.3);for(let i=0;i<3;i++)ring(x,y-16,Math.max(0,t*210-i*24),'#ffe6a1',1-t/.8);sparks(x,y-20,20,'#ffe092',100);break;
   case 'lesya':for(let i=0;i<7;i++){const a=t*2+i*.9;art.draw(c,'nature',(Math.floor(t*12)+i)%4,x+Math.sin(a)*76,y-44+Math.cos(t*3+i)*19,35,35,Math.cos(a)>0?1:-1,.15*Math.sin(a),fade);}sparks(x,y-25,9,'#9cbbe2');break;
   case 'franko':{const rise=Math.min(1,t*5);prop(3,x,y-32*rise,30,64*rise);if(t<.5)blast(x,y-4,t,48);break;}
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
