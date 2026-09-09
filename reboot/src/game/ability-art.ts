import {importAbilityPixels} from './ability-palette.ts';
import {assetUrl} from './assets.ts';
export const ABILITY_ATLASES={
 weapons:{url:'/assets/abilities/weapons.png',cols:4,rows:2},
 lightning:{url:'/assets/abilities/lightning.png',cols:4,rows:2},
 jet:{url:'/assets/abilities/jet.png',cols:2,rows:2},
 props:{url:'/assets/abilities/props.png',cols:4,rows:4},
 ordnance:{url:'/assets/abilities/ordnance.png',cols:4,rows:2},
 nature:{url:'/assets/abilities/nature.png',cols:4,rows:2},
 summons:{url:'/assets/abilities/summons.png',cols:4,rows:4},
 auras:{url:'/assets/abilities/auras.png',cols:4,rows:4},
 blast:{url:'/assets/abilities/blast.png',cols:4,rows:2},
} as const;
type Atlas=keyof typeof ABILITY_ATLASES;
/** Generated pixels stay in source atlases; tight per-cell bounds never sample a neighbour. */
export class AbilityArt {
 private images=new Map<Atlas,HTMLCanvasElement>();
 private bounds=new Map<Atlas,number[][]>();
 async load(){await Promise.all(Object.entries(ABILITY_ATLASES).map(async([key,spec])=>{
  const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('Не завантажилися ефекти: '+spec.url));image.src=assetUrl(spec.url);});
  // Import every generated sheet onto an explicit pixel grid. Never smooth at runtime.
  // Chroma key is an atlas import option, not a painted backdrop in the game.
  const cellW=key==='jet'?96:48,cellH=key==='jet'?40:key==='lightning'?96:48;
  const canvas=document.createElement('canvas');canvas.width=spec.cols*cellW;canvas.height=spec.rows*cellH;const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(image,0,0,canvas.width,canvas.height);
  const data=c.getImageData(0,0,canvas.width,canvas.height),pixels=data.data;
  importAbilityPixels(pixels);
  c.putImageData(data,0,0);
  const frames:number[][]=[];
  for(let row=0;row<spec.rows;row++)for(let col=0;col<spec.cols;col++){
   const x0=Math.round(col*canvas.width/spec.cols),x1=Math.round((col+1)*canvas.width/spec.cols),y0=Math.round(row*canvas.height/spec.rows),y1=Math.round((row+1)*canvas.height/spec.rows);
   let l=x1,r=x0,t=y1,b=y0;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*canvas.width+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   // Animation uses a stable cell pivot. Props alone may be tightly cropped.
   frames.push((key==='props'||key==='weapons'||(key==='ordnance'&&row===1))&&r>=l?[l,t,r-l+1,b-t+1]:[x0,y0,x1-x0,y1-y0]);
  }
  this.images.set(key as Atlas,canvas);this.bounds.set(key as Atlas,frames);
 }));}
 draw(c:CanvasRenderingContext2D,atlas:Atlas,frame:number,x:number,y:number,width:number,height=width,dir=1,angle=0,alpha=1){
  const image=this.images.get(atlas),frames=this.bounds.get(atlas);if(!image||!frames)return;
  const box=frames[Math.max(0,Math.min(frames.length-1,Math.floor(frame)))];
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir,1);if(angle)c.rotate(angle);c.globalAlpha*=alpha;c.imageSmoothingEnabled=false;
  c.drawImage(image,...box as [number,number,number,number],Math.round(-width/2),Math.round(-height/2),Math.round(width),Math.round(height));c.restore();
 }
}
