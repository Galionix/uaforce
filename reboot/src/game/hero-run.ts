import type {HeroId} from './content.ts';
/** Source-space leg masks in the existing 40×32, feet-at-32 actor canvas.
 * These isolate boots/trousers, never the weapon, coat or face. */
type Rect=readonly [number,number,number,number];
export type RunRig={mask:Rect;hip:number;center:number;back:Rect;front:Rect;width:number};
export const RUN_RIGS:Record<HeroId,RunRig>={
 shevchenko:{mask:[11,29,14,3],hip:27,center:18,back:[12,29,5,3],front:[20,29,5,3],width:4},
 lesya:{mask:[12,30,13,2],hip:28,center:18,back:[13,30,4,2],front:[20,30,5,2],width:4},
 franko:{mask:[10,26,13,6],hip:24,center:17,back:[10,27,7,5],front:[18,27,5,5],width:5},
 bandera:{mask:[13,28,14,4],hip:26,center:19,back:[13,28,5,4],front:[20,28,7,4],width:4},
 mamai:{mask:[12,27,14,5],hip:25,center:19,back:[12,27,6,5],front:[20,27,6,5],width:5},
 bayraktar:{mask:[15,26,14,6],hip:24,center:22,back:[15,27,7,5],front:[23,27,6,5],width:4},
 ghost:{mask:[13,25,15,7],hip:23,center:20,back:[13,26,7,6],front:[21,26,7,6],width:4},
 zelensky:{mask:[13,24,14,8],hip:22,center:20,back:[13,24,6,8],front:[20,24,7,8],width:4},
 bilozerska:{mask:[10,25,14,7],hip:23,center:17,back:[10,26,7,6],front:[18,26,6,6],width:4},
 'it-army':{mask:[12,29,14,3],hip:27,center:18,back:[12,29,6,3],front:[20,29,6,3],width:4},
 skovoroda:{mask:[12,29,14,3],hip:27,center:18,back:[12,29,6,3],front:[20,29,6,3],width:4},
 usyk:{mask:[12,25,15,7],hip:23,center:19,back:[12,26,6,6],front:[21,26,6,6],width:4},
 almaziv:{mask:[12,25,15,7],hip:23,center:19,back:[12,26,6,6],front:[21,26,6,6],width:4},
 klychko:{mask:[12,25,15,7],hip:23,center:19,back:[12,26,6,6],front:[21,26,6,6],width:4},
 taira:{mask:[12,25,15,7],hip:23,center:19,back:[12,26,6,6],front:[21,26,6,6],width:4},
 prytula:{mask:[12,25,15,7],hip:23,center:19,back:[12,26,6,6],front:[21,26,6,6],width:4},
};
export const MAVKA_RUN_RIG:RunRig={mask:[14,29,12,3],hip:27,center:20,back:[14,29,6,3],front:[21,29,5,3],width:4};
// Contact → support → toe-off → recovery → opposite contact, never idle inserts.
const FEET=[[5,0],[2,0],[-2,0],[-5,1],[-4,3],[0,4],[4,3],[6,1]] as const;
export function runPose(frame:number){
 const i=((frame%8)+8)%8;
 return {front:FEET[i],back:FEET[(i+4)%8],bob:[0,1,0,-1,0,1,0,-1][i]};
}
/** Articulates existing sprite texels on an integer pixel grid. No new raster art,
 * mirroring individual boots, smooth rotations or per-frame content recropping. */
export function buildHeroRunFrames(image:CanvasImageSource,bounds:number[],rig:RunRig){
 const canvas=()=>{const c=document.createElement('canvas');c.width=40;c.height=34;return c;};
 const source=canvas(),s=source.getContext('2d')!;s.imageSmoothingEnabled=false;
 const scale=27/bounds[3],width=Math.round(bounds[2]*scale);
 s.drawImage(image,...bounds as [number,number,number,number],20-Math.round(width*.47),5,width,27);
 const torso=canvas(),t=torso.getContext('2d')!;t.drawImage(source,0,0);t.clearRect(...rig.mask);
 return Array.from({length:8},(_,frame)=>{
  const cv=canvas(),c=cv.getContext('2d')!;c.imageSmoothingEnabled=false;
  const pose=runPose(frame);
  const leg=(part:Rect,foot:readonly [number,number],rear:boolean)=>{
   const hip=rig.hip+pose.bob,ankle=31-foot[1],knee=hip+(ankle-hip)*.48;
   const hipX=rig.center+(rear?-1:1),ankleX=rig.center+foot[0];
   const kneeX=hipX+foot[0]*.45+(foot[1]>1?1:0);
   // Scanline deformation keeps every textured row crisp while independently
   // moving each knee and foot. Recovered feet can disappear behind long coats.
   for(let y=Math.round(hip);y<=ankle;y++){
    const u=(y-hip)/Math.max(1,ankle-hip),center=y<knee?hipX+(kneeX-hipX)*(y-hip)/Math.max(1,knee-hip):kneeX+(ankleX-kneeX)*(y-knee)/Math.max(1,ankle-knee);
    const sy=part[1]+Math.min(part[3]-1,Math.max(0,Math.floor(u*part[3])));
    c.drawImage(source,part[0],sy,part[2],1,Math.round(center-rig.width/2),y,rig.width+(y===ankle?1:0),1);
   }
  };
  leg(rig.back,pose.back,true);leg(rig.front,pose.front,false);
  c.drawImage(torso,0,pose.bob);
  return cv;
 });
}
