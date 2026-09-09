const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const out=(x:number)=>1-(1-clamp(x))**3;
/** Seconds since art decoding, not since its network request. Shared by both reveal kinds. */
export function revealTimeline(t:number,reduced=false){
 if(reduced)return{x:0,scale:1,crop:0,titleX:0,titleOpacity:1,shakeX:0,shakeY:0,band:1};
 const entry=out((t-.48)/1.35),title=out((t-1.05)/.85),impact=Math.max(0,1-(t-1.8)/.55)*(t>=1.8?1:0);
 return{x:(1-entry)*85,scale:1+(1-entry)*.35,crop:(1-entry)*100,titleX:-(1-title)*110||0,titleOpacity:clamp((t-1.05)/.16),shakeX:Math.round(Math.sin(t*91)*impact*9)||0,shakeY:Math.round(Math.cos(t*73)*impact*5)||0,band:out((t-.8)/1.1)};
}
