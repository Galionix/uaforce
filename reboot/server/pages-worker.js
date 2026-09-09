/** Cloudflare Pages advanced-mode credential endpoint. The TURN API token stays in encrypted bindings. */
const allowed=new Set(['https://uaforce.thedimas.com','https://uaforce.pages.dev','http://127.0.0.1:5178','http://127.0.0.1:5179','http://localhost:5178']);
const recent=new Map();
export default {
 async fetch(request,env){
  const url=new URL(request.url);
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
