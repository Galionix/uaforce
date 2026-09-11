/** Presentation-only crop: never changes simulation, network state or the team tether. */
export type ScreenActor={x:number;y:number;facing:number;mounted?:boolean};
/** Time-based damping: equal response at 30/60/120 Hz; dt=0 freezes presentation. */
export function cameraFollow(current:number,target:number,dt:number,rate=10){
 return current+(target-current)*(-Math.expm1(-rate*Math.max(0,dt)));
}
/** Smooth facing look-ahead and zoom-in; zoom-out still fits the entire team immediately. */
export class MobileFraming {
 private facing:number|null=null;private facingVelocity=0;private zoom=1;
 reset(){this.facing=null;this.facingVelocity=0;this.zoom=1;}
 step(requested:number,actors:ScreenActor[],dt:number,width=640,height=360){
  if(requested<=1||!actors.length){this.reset();return mobileViewCrop(1,actors,width,height);}
  const direction=actors.length===1?actors[0].facing:0;
  if(this.facing===null){this.facing=direction;this.zoom=requested;}
  else {
   // Critically damped spring: preserve velocity on reversal, without a first-frame kick.
   const t=Math.max(0,dt),omega=18,offset=this.facing-direction;
   const velocity=this.facingVelocity+omega*offset,decay=Math.exp(-omega*t);
   this.facing=direction+(offset+velocity*t)*decay;
   this.facingVelocity=(this.facingVelocity-omega*velocity*t)*decay;
  }
  const aimed=actors.length===1?[{...actors[0],facing:this.facing}]:actors;
  const target=mobileViewCrop(requested,aimed,width,height);
  this.zoom=target.zoom<this.zoom?target.zoom:cameraFollow(this.zoom,target.zoom,dt,8);
  return mobileViewCrop(this.zoom,aimed,width,height);
 }
}
/** Keep a spawn near a map edge out from under the left thumb pad. */
export function mobileCameraShift(xs:number[],width=640){
 if(!xs.length)return 0;
 const min=Math.min(...xs),max=Math.max(...xs);
 return Math.max(32-min,Math.min(width-32-max,width*.42-(min+max)/2));
}
export function mobileViewCrop(requested:number,actors:ScreenActor[],width=640,height=360){
 const full={x:0,y:0,width,height,zoom:1};
 if(!actors.length||!Number.isFinite(requested)||requested<=1)return full;
 const left=Math.max(0,Math.min(...actors.map(a=>a.x-(a.mounted?48:32))));
 const right=Math.min(width,Math.max(...actors.map(a=>a.x+(a.mounted?48:32))));
 const top=Math.max(0,Math.min(...actors.map(a=>a.y-(a.mounted?66:60))));
 const bottom=Math.min(height,Math.max(...actors.map(a=>a.y+30)));
 const zoom=Math.max(1,Math.min(1.5,requested,width/Math.max(1,right-left),height/Math.max(1,bottom-top)));
 const cropWidth=width/zoom,cropHeight=height/zoom;
 const centerX=actors.length===1?actors[0].x+actors[0].facing*64:(left+right)/2;
 const centerY=(top+bottom)/2;
 // Clamp the preferred look-ahead to the interval that contains every actor.
 const x=Math.max(0,Math.min(width-cropWidth,Math.max(right-cropWidth,Math.min(left,centerX-cropWidth/2))));
 const y=Math.max(0,Math.min(height-cropHeight,Math.max(bottom-cropHeight,Math.min(top,centerY-cropHeight/2))));
 return {x,y,width:cropWidth,height:cropHeight,zoom};
}

/** Safari fallback; touch-action remains the primary gesture policy. */
export function guardGameGestures(surface:EventTarget,active:()=>boolean){
 const prevent=(event:Event)=>{if(active()&&event.cancelable)event.preventDefault();};
 for(const type of ['touchstart','touchmove','touchend','gesturestart','dblclick'])surface.addEventListener(type,prevent,{passive:false});
 return ()=>{for(const type of ['touchstart','touchmove','touchend','gesturestart','dblclick'])surface.removeEventListener(type,prevent);};
}
