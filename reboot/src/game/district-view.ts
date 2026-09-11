import type {World} from './world.ts';
/** Muted background landmarks give each district an identity without masquerading as platforms. */
export function drawDistrictScenery(c:CanvasRenderingContext2D,w:World,cameraX:number,cameraY:number,time:number){
 const r=(x:number,y:number,width:number,height:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));};
 const ground=266+cameraY;
 for(const d of w.mission.districts)for(let wx=d.start+7;wx<d.end;wx+=14){
  const x=wx*16-cameraX;if(x<-170||x>800)continue;
  const y=ground-(w.mission.layout?Math.max(0,...w.mission.layout.surfaces.filter(s=>wx>=s.left&&wx<=s.right).map(s=>s.top))*16:0);
  switch(d.look){
   case 'kremlin': break; // Generated Kremlin architecture stays on the shared pixel grid.
   case 'pines':
    for(let k=0;k<3;k++){const xx=x+k*35;r(xx,y-88,5,88,'#455956');for(let j=0;j<6;j++)r(xx-8-j*3,y-104+j*13,20+j*6,14,'#3c625d');r(xx-7,y-103,19,3,'#9bb6ad');}break;
   case 'ridge':
    for(let i=0;i<8;i++){r(x-45+i*12,y-20-(i%3)*11,16,30+(i%3)*11,'#617a82');r(x-45+i*12,y-22-(i%3)*11,16,3,'#b8ceca');}r(x-20,y-94,4,75,'#70888d');r(x-24,y-97,14,5,'#adbbb0');break;
   case 'cableway':
    r(x,y-137,7,137,'#718184');r(x-20,y-143,58,7,'#a4b2a7');r(x-70,y-145,170,2,'#4f6876');r(x+22,y-135,2,25,'#4b626c');r(x+10,y-111,31,25,'#647b6c');r(x+14,y-107,23,10,'#b8cbb9');break;
   case 'station':
    r(x-39,y-72,90,72,'#79665a');r(x-45,y-80,103,8,'#9e8a70');for(let j=0;j<4;j++){r(x-31+j*22,y-61,12,27,'#304850');r(x-30+j*22,y-60,10,3,'#bbaf8b');}r(x+2,y-95,8,12,'#c5bc9b');break;
   case 'wagons':
    r(x-52,y-43,103,34,'#78664f');r(x-54,y-46,107,4,'#a19372');for(let j=0;j<12;j++)r(x-49+j*8,y-41,2,27,'#9d8965');for(const a of [-37,31]){r(x+a,y-10,12,9,'#283840');r(x+a+3,y-7,6,3,'#8c917f');}r(x-65,y-1,142,2,'#acaa90');break;
   case 'signals':
    r(x,y-105,5,105,'#7f8b7c');r(x-4,y-109,13,34,'#354a4d');r(x,y-103,5,5,'#bf6e51');r(x,y-92,5,5,'#c9b877');r(x,y-81,5,5,'#83a89a');r(x+26,y-30,23,30,'#566d70');for(let j=0;j<4;j++)r(x+29,y-24+j*5,17,2,'#879489');break;
   case 'wetland':
    for(let i=0;i<13;i++){r(x-40+i*7,y-12-(i%4)*4,2,18+(i%4)*4,'#3b6261');r(x-40+i*7,y-15-(i%4)*4,3,4,'#67796a');}r(x-50,y-5,109,3,'#527b7a');break;
   case 'watchtowers':
    r(x-14,y-118,38,22,'#3c5c63');r(x-18,y-122,47,5,'#788a82');r(x-10,y-111,28,8,'#b2a97a');for(const a of [-9,16])r(x+a,y-96,4,96,'#45646a');for(let j=0;j<7;j++)r(x-7+j%2*6,y-90+j*13,21,2,'#789084');break;
   case 'radar':
    r(x,y-83,5,83,'#617b7e');r(x-19,y-96,41,9,'#60777d');r(x-13,y-106,29,10,'#8da19e');r(x-4,y-112,10,9,'#a2b1a5');r(x+30,y-43,38,43,'#354e59');r(x+36,y-35,14,8,'#93c8ac');r(x+31,y-10,37,3,'#68817e');break;
   case 'reeds':
    r(x-40,y-10,115,8,'#478480');for(let i=0;i<15;i++){const h=16+(i*7)%20;r(x-35+i*6,y-h,1,h,'#647e4a');r(x-35+i*6,y-h-5,2,7,'#8b9163');}break;
   case 'village':
    r(x-35,y-60,72,60,'#637459');r(x-41,y-65,84,6,'#7c795b');for(let i=0;i<6;i++)r(x-35+i*6,y-70-i*3,72-i*12,4,'#77785a');
    r(x-24,y-48,15,18,'#354f4b');r(x+12,y-48,15,18,'#354f4b');r(x-2,y-31,14,31,'#4a5d49');for(const dx of [-17,19]){r(x+dx,y-48,2,18,'#9ba482');r(x+dx-7,y-40,15,2,'#9ba482');}break;
   case 'depot':
    for(let j=0;j<2;j++){r(x-45+j*48,y-38,45,38,j?'#66775d':'#7c7156');for(let i=0;i<6;i++)r(x-40+j*48+i*7,y-35,2,32,'#929477');r(x-45+j*48,y-39,45,3,'#a4a080');}r(x-50,y-69,2,69,'#6f7965');r(x-50,y-69,80,2,'#6f7965');break;
   case 'boulevard':
    r(x,y-112,3,112,'#60797b');r(x-16,y-114,35,3,'#829893');r(x-19,y-111,8,4,'#c9c49b');r(x+13,y-111,8,4,'#c9c49b');
    r(x+28,y-45,38,3,'#6c8985');r(x+30,y-42,2,42,'#7b928a');r(x+61,y-42,2,42,'#7b928a');r(x+34,y-39,24,22,'#567775');r(x+34,y-12,25,3,'#869381');break;
   case 'factory':
    r(x-29,y-96,54,96,'#666b63');r(x-32,y-101,60,6,'#919080');for(let i=0;i<6;i++)r(x-25,y-88+i*14,45,2,'#7c8273');
    r(x+30,y-148,13,148,'#736e63');for(let i=0;i<6;i++)r(x+30,y-135+i*22,13,3,'#90917f');for(let i=0;i<5;i++)r(x+27+i*7+Math.sin(time*.3)*3,y-160-i*8,20,12,'#78908a');break;
   case 'rooftops':
    r(x-40,y-100,80,100,'#596f71');for(let row=0;row<4;row++)for(let col=0;col<4;col++)r(x-32+col*19,y-90+row*22,9,13,(row+col)%3?'#3b575e':'#999a7d');
    r(x-43,y-105,86,5,'#91a196');r(x+5,y-143,25,28,'#687e78');r(x+2,y-146,31,4,'#a7ad96');r(x+7,y-116,3,11,'#82958b');r(x+24,y-116,3,11,'#82958b');break;
   case 'shore':
    for(let i=0;i<5;i++){r(x-30+i*16,y-7-(i%2)*3,14,9,'#9d9e83');r(x-28+i*16,y-9-(i%2)*3,9,3,'#b7b398');}
    r(x+28,y-18,45,7,'#788a81');r(x+34,y-22,34,5,'#9ca99a');r(x+42,y-30,3,10,'#838a6e');break;
   case 'bunkers':
    r(x-36,y-47,74,47,'#6b7870');r(x-29,y-56,60,10,'#8a9380');r(x-33,y-37,67,6,'#929b87');r(x-20,y-33,40,7,'#364e4c');
    for(let i=0;i<5;i++){r(x-38+i*17,y-5,8,5,'#89947d');r(x-35+i*17,y-12,2,9,'#89947d');}break;
   case 'harbor':
    r(x-6,y-140,7,140,'#7b8977');r(x-12,y-148,100,8,'#a39e7a');r(x+38,y-143,3,84,'#94977e');r(x+34,y-60,11,3,'#747e6c');
    for(let i=0;i<6;i++){r(x-4,y-132+i*20,3,10,'#adb093');r(x+5+i*12,y-145,4,8,'#677c72');}
    r(x-47,y-39,33,39,'#638481');for(let i=0;i<5;i++)r(x-44+i*6,y-36,2,32,'#91a498');break;
  }
 }
}
