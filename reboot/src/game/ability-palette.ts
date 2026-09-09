/** Shared import palette for generated ability art; backgrounds keep their atmosphere. */
export const ABILITY_PALETTE = [
 '#101923','#152638','#293b3b','#42566c','#64768c','#99abb5','#d5ded1','#fff1c3',
 '#402c26','#6c4730','#936539','#c28f52','#efb34c','#ffe078',
 '#34442d','#4e5c36','#687344','#96a657',
 '#642b31','#a64032','#dc5835','#ff883f',
 '#163861','#256298','#3796ce','#59b9ec','#a1e1ee',
 '#174d4b','#237d72','#36b8a4','#79dbc0',
 '#604863',
].map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
/** Binary alpha and one common palette remove chroma backdrops and soft generated fringe. */
export function importAbilityPixels(pixels:Uint8ClampedArray){
 const cache=new Map<number,number[]>();
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(pixels[i+3]<170||(r>175&&b>140&&g<110)){pixels.fill(0,i,i+4);continue;}
  const key=(r<<16)|(g<<8)|b;let color=cache.get(key);
  if(!color){let distance=Infinity;color=ABILITY_PALETTE[0];for(const candidate of ABILITY_PALETTE){const d=(r-candidate[0])**2+(g-candidate[1])**2+(b-candidate[2])**2;if(d<distance){distance=d;color=candidate;}}cache.set(key,color);}
  pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];pixels[i+3]=255;
 }
}
