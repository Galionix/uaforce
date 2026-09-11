/** Cloudflare Pages advanced-mode credential endpoint. The TURN API token stays in encrypted bindings. */
const allowed=new Set(['https://uaforce.thedimas.com','https://uaforce.pages.dev','http://127.0.0.1:5178','http://127.0.0.1:5179','http://localhost:5178']);
const recent=new Map();
const eventNames=new Set(['landing_view','play_click','link_copy','load_ready','load_error','mission_start','mission_win','mission_loss','mission_leave','coop_attempt','coop_connected','coop_error','coop_leave','feedback_open','playtest_open']);
function cleanEvent(v){
 if(!v||typeof v!=='object'||!eventNames.has(v.event)||!['site','single','practice','host','guest'].includes(v.mode)||!['direct','tiktok','youtube','reddit','threads','friend','playtest','qa'].includes(v.source)||!/^[0-9a-f-]{36}$/.test(v.session)||v.build!=='growth-20260910'||typeof v.qa!=='boolean'||!Number.isInteger(v.mission)||v.mission< -1||v.mission>8||!Number.isFinite(v.seconds)||v.seconds<0||v.seconds>86400)return null;
 return {blobs:[v.event,v.source,v.mode,v.build,v.session,v.qa?'qa':'public'],doubles:[v.mission,Math.round(v.seconds)],indexes:['uaforce']};
}
async function eventRequest(request,env){
 const origin=request.headers.get('Origin'),url=new URL(request.url);
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(status,error)=>new Response(error?JSON.stringify({error}):null,{status,headers});
 if(!origin||!(allowed.has(origin)||origin===url.origin))return reply(403,'origin');
 if(request.method!=='POST')return reply(405,'method');
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,'type');
 if(Number(request.headers.get('Content-Length'))>8192)return reply(413,'size');
 if(!env.GAME_EVENTS)return reply(503,'analytics-unavailable');
 const now=Date.now(),key='events:'+(request.headers.get('CF-Connecting-IP')||'unknown');
 if(recent.size>10000)for(const [key,item] of recent)if(now-item.start>60000)recent.delete(key);
 const item=recent.get(key);if(item&&now-item.start<60000){if(++item.count>24)return reply(429,'rate');}else recent.set(key,{start:now,count:1});
 try{
  const text=await request.text();if(text.length>8192)return reply(413,'size');
  const batch=JSON.parse(text);if(!Array.isArray(batch)||batch.length<1||batch.length>12)return reply(400,'batch');
  const points=batch.map(cleanEvent);if(points.some(p=>!p))return reply(400,'event');
  for(const point of points)env.GAME_EVENTS.writeDataPoint(point);
  return reply(204);
 }catch{return reply(400,'event');}
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/events')return eventRequest(request,env);
  if(url.pathname!=='/api/ice')return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin');
  const permitted=origin&&(allowed.has(origin)||origin===url.origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(permitted?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(!permitted)return reply(403,{error:'origin'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'method'});
  if(!env.TURN_KEY_ID||!env.TURN_API_TOKEN)return reply(503,{error:'relay-not-configured'});
  // Best-effort per-isolate throttle, not a billing cap or a substitute for account rate limits.
  const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(recent.size>10000)for(const [key,item] of recent)if(now-item.start>60000)recent.delete(key);
  const item=recent.get(ip);if(item&&now-item.start<60000){if(++item.count>12)return reply(429,{error:'retry-later'});}else recent.set(ip,{start:now,count:1});
  try{
   const upstream=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,{method:'POST',headers:{Authorization:`Bearer ${env.TURN_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({ttl:7200}),signal:AbortSignal.timeout(8000)});
   if(!upstream.ok)return reply(502,{error:'relay-provider'});
   const data=await upstream.json();if(!Array.isArray(data.iceServers))return reply(502,{error:'relay-response'});
   return reply(200,{iceServers:data.iceServers,expiresIn:7200});
  }catch{return reply(502,{error:'relay-timeout'});}
 }
};
