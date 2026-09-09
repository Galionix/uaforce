import type {Effect} from './world';
/** Code-native pixel effects: all drawing resolves to the game's integer pixel grid. */
export function drawHeroEffect(c:CanvasRenderingContext2D,f:Effect,x:number,y:number,time:number){
 const r=(a:number,b:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h));};
 const ring=(cx:number,cy:number,rad:number,col:string)=>{for(let i=0;i<32;i++){const a=i*Math.PI/16;r(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.55,3,3,col);}};
 const rotor=(cx:number,cy:number,large=false)=>{const n=large?2:1;r(cx-9*n,cy,18*n,5*n,'#263e4e');r(cx-4*n,cy-3*n,8*n,8*n,'#9ab5a8');for(const d of [-1,1]){r(cx+d*13*n-6*n,cy-3*n,(Math.floor(time*24)%2?12:4)*n,n,'#c7deca');r(cx+d*13*n,cy-2*n,n,5*n,'#2d4345');}r(cx-2*n,cy+5*n,4*n,3*n,'#ffd478');};
 const fighter=(cx:number,cy:number,col:string)=>{r(cx-6,cy-25,12,11,'#183634');r(cx-5,cy-24,10,4,col);r(cx-4,cy-20,9,5,'#e8d6a1');r(cx+2*f.dir,cy-19,2,2,'#233e3d');r(cx-5,cy-15,10,11,'#203e3b');r(cx-4,cy-14,8,8,col);r(cx-3,cy-13,2,6,'#b7eed1');r(cx-5,cy-5,4,5,'#213b3a');r(cx+2,cy-5,4,5,'#213b3a');r(cx+3*f.dir,cy-13,11*f.dir,3,'#def7d8');};

 if(f.kind==='weapon'){
  if(f.hero==='zelensky')for(let i=0;i<3;i++)ring(x+f.dir*f.age*120,y-18,8+i*7,'#d9f096');
  else for(let i=0;i<9;i++){const a=-1.2+i*.3;r(x+f.dir*Math.cos(a)*28,y-17+Math.sin(a)*22,5,3,f.hero==='mamai'?'#fff3cb':'#bed0e8');}return;
 }
 if(f.kind==='special')switch(f.hero){
  case 'bandera': if(f.age<.65){r(x-3,y-10,6,10,'#a55d31');r(x-1,y-13,2,4,'#f7d9a3');r(x+2,y-15,3,5,'#ffb73b');}else for(let i=-5;i<=5;i++){const h=8+(Math.floor(time*13+i*7)%4)*4;r(x+i*7,y-h,6,h,'#d84e29');r(x+i*7+2,y-h+4,3,h-4,'#ffd74c');}break;
  case 'mamai':case 'skovoroda':{
   c.save();c.translate(Math.round(x),Math.round(y));c.rotate(Math.floor(time*12)%4*Math.PI/2);
   if(f.hero==='mamai'){r(-9,-6,15,13,'#a96e35');r(-6,-8,11,15,'#f1c473');r(3,-15,4,10,'#c9924b');for(let i=0;i<4;i++)r(-5+i*3,-6,1,12,'#fff0b1');}else{r(-9,-7,18,14,'#795740');r(-7,-6,6,12,'#e9dfb4');r(1,-6,6,12,'#fff0ca');r(-1,-7,2,14,'#293757');}c.restore();break;
  }
  case 'bayraktar':rotor(x,y-6);r(x-2,y+4,4,5,'#fa8252');break;
  case 'ghost':for(let i=1;i<=4;i++){const xx=x-f.dir*i*11;r(xx,y-24,3,18,'#64b3ce');r(xx-f.dir*5,y-7,6,2,'#bceffe');}break;
  case 'zelensky':fighter(x-f.dir*32,y,'#5e996c');fighter(x-f.dir*56,y,'#708b47');break;
  case 'bilozerska':r(x-7,y-4,14,4,'#52726d');r(x-4,y-6,8,3,'#b6c2a1');r(x-1,y-7,2,2,f.age>.45&&Math.floor(time*3)%2?'#ff6e52':'#f3e388');if(f.age<.45)ring(x,y-3,12*f.age/.45,'#e5d6a0');break;
  case 'it-army':ring(x,y-17,23,'#67efc7');r(x+14,y-27,11,9,'#113b3a');r(x+16,y-24,2,3,'#8ffad8');r(x+18,y-22,5,2,'#8ffad8');break;
 }else switch(f.hero){
  case 'bandera':{
   c.save();c.translate(Math.round(x),Math.round(y));c.scale(f.dir,1);
   r(-31,-21,61,19,'#172724');r(-18,-34,33,17,'#172724');r(-16,-32,29,15,'#77815b');r(-27,-19,54,12,'#596240');r(-28,-19,55,2,'#a3a577');r(-27,-7,56,3,'#313d2c');r(-2,-18,2,13,'#343f2c');r(-13,-30,11,11,'#244751');r(2,-30,9,11,'#244751');r(-12,-29,8,8,'#8fc0be');r(3,-29,6,8,'#a1cdce');r(-11,-28,5,2,'#d4e2c1');r(4,-28,4,2,'#e4eccf');r(-12,-16,5,1,'#c1bf91');r(3,-16,4,1,'#c1bf91');r(16,-16,10,6,'#2b3c2e');for(let grille=0;grille<3;grille++)r(18+grille*3,-15,1,4,'#afaf83');
   for(const wheel of [-19,17]){r(wheel-5,-8,10,13,'#111d1c');r(wheel-7,-6,14,9,'#111d1c');r(wheel-4,-5,8,8,'#687367');r(wheel-2,-3,4,4,'#cbd1ac');r(wheel-4,-5,3,2,Math.floor(time*16)%2?'#bbc1a1':'#3b4c42');}
   r(27,-17,4,4,'#ffe6a0');r(27,-8,5,2,'#a2b09b');r(-32,-10,3,3,'#f79658');r(-15,-35,18,2,'#bcc099');r(-2,-38,2,4,'#475847');r(-11,-37,11,1,'#687d68');c.restore();break;
  }
  case 'mamai':for(let i=0;i<4;i++){
   const xx=x-f.dir*i*37,hop=Math.floor(time*10+i)%2*2;
   c.save();c.translate(Math.round(xx),Math.round(y-hop));c.scale(f.dir,1);
   r(-15,-17,28,12,'#204943');r(-12,-19,21,14,'#71b5a0');r(-9,-17,15,3,'#b5efc8');r(8,-27,7,17,'#376f68');r(10,-26,8,9,'#93d8bb');r(12,-30,3,5,'#bbe9cf');r(15,-25,8,6,'#9bdebd');r(20,-23,3,3,'#d6fbe0');r(16,-25,2,2,'#173a39');r(8,-28,3,10,'#244e4d');r(7,-17,3,7,'#d4eed0');r(-16,-18,3,13,'#528f81');r(-19,-16,4,9,'#a3d7b3');
   const stride=Math.floor(time*12+i)%2?3:-2;
   for(const foot of [-10,7]){r(foot,-7,3,7,'#4b8f7f');r(foot+stride,-2,3,5,'#9cd2b7');r(foot+stride-1,2,5,2,'#285954');}
   r(-5,-21,10,7,'#304e50');r(-4,-20,8,3,'#d7dcac');c.restore();fighter(xx-2*f.dir,y-18-hop,'#73b6b5');r(xx+f.dir*11,y-52-hop,2,24,'#e1ffeb');r(xx+f.dir*11,y-53-hop,6*f.dir,2,'#b5efcf');
  }break;
  case 'bayraktar':for(let i=0;i<7;i++){const age=f.age-(.8+i*.26),xx=x+f.dir*(3+i*3)*16;if(age<0&&age>-.8){r(xx-11,y-2,22,2,'#f9b16b');r(xx,y-13,2,14,'#df664d');r(xx-2,y-170+(age+.8)/.8*150,4,13,'#e6dfb0');r(xx-1,y-184+(age+.8)/.8*150,2,12,'#ff8050');}}break;
  case 'ghost':c.save();c.translate(Math.round(x),Math.round(y));c.scale(f.dir,1);r(-32,-3,64,7,'#adc3d1');r(-8,-14,18,29,'#6e8eab');r(13,-5,15,4,'#dff2ec');r(-30,-10,8,9,'#a9bdc1');r(-40,-2,9,5,'#ffb56d');c.restore();break;
  case 'zelensky':rotor(x,y,true);r(x-1,y+8,1,23,'#d9c59a');r(x,y+10,24,7,'#4097d4');r(x,y+17,24,7,'#ffda5e');r(x-1,y+30+(time*50)%30,3,7,'#ffce68');break;
  case 'bilozerska':if(f.age<.5){r(x,y-17,f.dir*55*16,1,'#e7654f');ring(x+f.dir*30,y-17,(1-f.age/.5)*16,'#ffe7bb');}else{r(x,y-20,f.dir*55*16,5,'#ccedff');r(x,y-18,f.dir*55*16,2,'#ffffff');}break;
  case 'it-army':for(let i=-10;i<=10;i++){const xx=x+i*29,yy=y-30-((i+11)*17+Math.floor(time*20)*5)%110;r(xx,yy,17,3,'#58dbb1');r(xx+9,yy+5,9,2,'#80aff2');if(i%2===0)r(xx+2,yy-7,2,5,'#e8ffcd');}break;
  case 'skovoroda':ring(x,y-17,80,'#c1c8ff');for(let i=0;i<5;i++){const a=time+i*Math.PI*.4;r(x+Math.cos(a)*76,y-20+Math.sin(a)*38,6,3,'#fff1c1');}break;
 }
}
