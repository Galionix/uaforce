/** Cloudflare Pages advanced-mode credential endpoint. The TURN API token stays in encrypted bindings. */
const allowed=new Set(['https://uaforce.thedimas.com','https://uaforce.pages.dev','http://127.0.0.1:5178','http://127.0.0.1:5179','http://localhost:5178']);
const recent=new Map();
const eventNames=new Set(['landing_view','play_click','link_copy','load_ready','load_error','mission_start','mission_win','mission_loss','mission_leave','coop_attempt','coop_connected','coop_error','coop_leave','feedback_open','playtest_open']);
function cleanEvent(v){
 if(!v||typeof v!=='object'||!eventNames.has(v.event)||!['site','single','practice','host','guest','survival','survival-host','survival-guest'].includes(v.mode)||!['direct','tiktok','youtube','reddit','threads','friend','playtest','qa'].includes(v.source)||!/^[0-9a-f-]{36}$/.test(v.session)||v.build!=='growth-20260910'||typeof v.qa!=='boolean'||!Number.isInteger(v.mission)||v.mission< -1||v.mission>11||!Number.isFinite(v.seconds)||v.seconds<0||v.seconds>86400)return null;
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
  if(url.pathname.startsWith('/api/survival/'))return survivalRequest(request,env);
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

// Public endless leaderboard. Parameterized SQL; opaque per-seat credentials never leave private responses.
export function cleanSurvivalName(value){
 if(typeof value!=='string')return null;
 const name=value.normalize('NFKC').trim().replace(/ +/g,' ');
 return [...name].length>=2&&[...name].length<=20&&/^[\p{Script=Latin}\p{Script=Cyrillic}0-9 _'’ʼ-]+$/u.test(name)&&/[\p{L}0-9]/u.test(name)?name:null;
}
async function tokenHash(value){
 if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))return '';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function survivalRequest(request,env){
 const url=new URL(request.url),headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 if(!env.SURVIVAL_DB)return reply(503,{error:'leaderboard-unavailable'});
 const db=env.SURVIVAL_DB,now=Date.now();
 try{
  if(request.method==='GET'&&url.pathname==='/api/survival/leaderboard'){
   const players=url.searchParams.get('players')==='2'?2:1;
   const data=await db.prepare('SELECT id,players,name1,name2,seconds,wave,kills,updated FROM survival_runs WHERE players=? AND finished=1 AND qa=0 AND name1 IS NOT NULL AND (players=1 OR name2 IS NOT NULL) ORDER BY seconds DESC,wave DESC,kills DESC,updated ASC LIMIT 50').bind(players).all();
   return reply(200,{rows:data.results.map(r=>({id:r.id,names:r.players===2?[r.name1,r.name2]:[r.name1],seconds:r.seconds,wave:r.wave,kills:r.kills,date:r.updated}))});
  }
  if(request.method!=='POST')return reply(405,{error:'method'});
  if(request.headers.get('Origin')!==url.origin)return reply(403,{error:'origin'});
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'type'});
  if(Number(request.headers.get('Content-Length'))>2048)return reply(413,{error:'size'});
  const key='survival:'+(request.headers.get('CF-Connecting-IP')||'unknown');
  if(recent.size>10000)for(const [k,item] of recent)if(now-item.start>60000)recent.delete(k);
  const limit=recent.get(key);if(limit&&now-limit.start<60000){if(++limit.count>30)return reply(429,{error:'rate'});}else recent.set(key,{start:now,count:1});
  const reader=request.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return reply(413,{error:'size'});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'json'});}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'body'});
  if(url.pathname==='/api/survival/run'){
   if(body.players!==1&&body.players!==2)return reply(400,{error:'players'});
   const id=crypto.randomUUID(),hostToken=crypto.randomUUID(),guestToken=crypto.randomUUID();
   // Abandoned, unpublished runs expire; public records remain. At most one cleanup per new run.
   await db.prepare('DELETE FROM survival_runs WHERE updated<? AND (qa=1 OR finished=0 OR name1 IS NULL OR (players=2 AND name2 IS NULL))').bind(now-7*86400000).run();
   await db.prepare('INSERT INTO survival_runs(id,players,host_token,guest_token,started,updated,qa) VALUES(?,?,?,?,?,?,?)').bind(id,body.players,await tokenHash(hostToken),await tokenHash(guestToken),now,now,body.qa===true?1:0).run();
   return reply(201,{id,hostToken,guestToken});
  }
  const match=url.pathname.match(/^\/api\/survival\/run\/([0-9a-f-]{36})\/(progress|name)$/);
  if(!match)return reply(404,{error:'route'});
  const row=await db.prepare('SELECT * FROM survival_runs WHERE id=?').bind(match[1]).first();
  if(!row)return reply(404,{error:'run'});
  const hash=await tokenHash(body.token),host=hash===row.host_token,guest=row.players===2&&hash===row.guest_token;
  if(!host&&!guest)return reply(403,{error:'token'});
  if(match[2]==='name'){
   const name=cleanSurvivalName(body.name);if(!name)return reply(400,{error:'name'});
   const column=host?'name1':'name2';
   // Each seat can set only its own display name. No identifiers come from request text.
   await db.prepare(`UPDATE survival_runs SET ${column}=?,updated=? WHERE id=?`).bind(name,now,row.id).run();
   return reply(200,{saved:true,published:!!(row.finished&&(host?(row.players===1||row.name2):row.name1))});
  }
  if(!host)return reply(403,{error:'authority'});
  const {seconds,wave,kills,finished}=body;
  if(![seconds,wave,kills].every(v=>Number.isSafeInteger(v)&&v>=0)||typeof finished!=='boolean'||seconds>Math.floor((now-row.started)/1000)+3||seconds<row.seconds||wave<row.wave||kills<row.kills||wave>seconds+1||kills>(seconds+8)*60)return reply(400,{error:'score'});
  if(row.finished)return reply(200,{saved:true,finished:true});
  // Guard monotonic updates in SQL as well: concurrent/retried requests cannot roll scores back.
  await db.prepare('UPDATE survival_runs SET seconds=?,wave=?,kills=?,finished=?,updated=? WHERE id=? AND finished=0 AND seconds<=? AND wave<=? AND kills<=?').bind(seconds,wave,kills,finished?1:0,now,row.id,seconds,wave,kills).run();
  return reply(200,{saved:true,finished});
 }catch{return reply(503,{error:'leaderboard-unavailable'});}
}
