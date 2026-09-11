/** Presentation-only crop: never changes simulation, network state or the team tether. */
export type ScreenActor={x:number;y:number;facing:number;mounted?:boolean};
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
