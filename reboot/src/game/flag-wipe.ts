/** Shared blue/yellow trailer wipe; time can be host-authoritative. */
export function drawFlagWipe(c:CanvasRenderingContext2D,width:number,height:number,time:number,reverse=false,reduced=false){
 c.save();c.scale(width/960,height/540);
  if(reduced){c.fillStyle=`rgba(10,33,40,${Math.max(0,1-time/.18)})`;c.fillRect(0,0,960,540);c.restore();return;}
  const t=time/.72,p=Math.max(0,(t-.13)/.87),x=-220+Math.pow(p,.8)*1510;
  c.save();if(reverse){c.translate(960,0);c.scale(-1,1);}
  c.translate(Math.round(x),0);c.transform(1,0,-.28,1,0,0);
  c.fillStyle='#064268';c.fillRect(-20,0,1480,540);
  c.fillStyle='#1488bd';c.fillRect(0,0,1440,270);
  c.fillStyle='#ffda62';c.fillRect(0,270,1440,270);
  c.fillStyle='#63c9ed';c.fillRect(10,0,12,270);
  c.fillStyle='#fff0a1';c.fillRect(10,270,12,270);
  c.fillStyle='#ffffff25';for(let i=0;i<8;i++)c.fillRect(70+i*177-time*300,0,24,540);
  for(let i=0;i<32;i++){c.fillStyle=i%2?'#ffd765':'#72d7f4';const y=(i*79)%540;const tail=(i%5)*9;c.fillRect(-25-tail-p*30,y,5+i%7,3+i%4);}
  c.restore();
 c.restore();
}
