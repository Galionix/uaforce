/** Explicit ICE settings: PeerJS 1.5.5's bundled TURN hosts no longer resolve. */
export const STUN_SERVERS:RTCIceServer[]=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
export function cleanIceServers(value:unknown):RTCIceServer[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,8).flatMap(server=>{
  if(!server||typeof server!=='object')return [];
  const s=server as Record<string,unknown>;
  const urls=(Array.isArray(s.urls)?s.urls:[s.urls]).filter((u):u is string=>typeof u==='string'&&/^(stun|turn|turns):[a-z0-9.-]+:\d+(\?transport=(udp|tcp))?$/i.test(u)&&!/:53(?:\?|$)/.test(u));
  if(!urls.length)return [];
  if(urls.some(u=>/^turns?:/.test(u))&&(typeof s.username!=='string'||typeof s.credential!=='string'))return [];
  return [{urls,...(typeof s.username==='string'?{username:s.username,credential:s.credential as string}:{})}];
 });
}
export async function connectionConfig(forceRelay=false):Promise<RTCConfiguration>{
 const endpoint=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'https://uaforce.thedimas.com/api/ice':'/api/ice';
 const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('relay-unavailable');
 const data=await response.json();const iceServers=cleanIceServers(data.iceServers);
 if(!iceServers.some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(u=>/^turns?:/.test(u))))throw new Error('relay-unavailable');
 return {iceServers:[...STUN_SERVERS,...iceServers],iceTransportPolicy:forceRelay?'relay':'all'};
}
