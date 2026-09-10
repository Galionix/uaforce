/** Small, best-effort counters. No persistent identity, room code, URL, IP or error text. */
export const EVENTS=['landing_view','play_click','link_copy','load_ready','load_error','mission_start','mission_win','mission_loss','mission_leave','coop_attempt','coop_connected','coop_error','coop_leave','feedback_open','playtest_open'] as const;
export type MetricEvent=typeof EVENTS[number];
export type MetricMode='site'|'single'|'practice'|'host'|'guest';
export const SOURCES=['direct','tiktok','youtube','reddit','threads','friend','playtest','qa'] as const;
export function trafficSource(search:string,referrer=''){
 const q=new URLSearchParams(search),value=q.get('utm_source');
 if(q.get('qa')==='1')return 'qa';
 if(SOURCES.includes(value as typeof SOURCES[number]))return value!;
 try{const host=new URL(referrer).hostname;for(const s of ['tiktok','youtube','reddit','threads'])if(host===`${s}.com`||host.endsWith(`.${s}.com`))return s;}catch{}
 return 'direct';
}
export class Telemetry {
 private queue:object[]=[];private sent=0;private session=crypto.randomUUID();
 private source=trafficSource(location.search,document.referrer)==='direct'&&location.pathname.startsWith('/tiktok')?'tiktok':trafficSource(location.search,document.referrer);
 private qa=new URLSearchParams(location.search).get('qa')==='1';
 private enabled=['uaforce.thedimas.com','uaforce.pages.dev'].includes(location.hostname)&&new URLSearchParams(location.search).get('analytics')!=='off'&&navigator.doNotTrack!=='1'&&(new URLSearchParams(location.search).get('silent')!=='1'||this.qa);
 constructor(){setInterval(()=>this.flush(),5000);document.addEventListener('visibilitychange',()=>{if(document.hidden)this.flush();});}
 event(event:MetricEvent,mode:MetricMode='site',mission=-1,seconds=0){
  if(!this.enabled||this.sent>=120)return;
  this.queue.push({event,mode,mission,seconds:Math.round(seconds),source:this.source,session:this.session,build:'growth-20260910',qa:this.qa});this.sent++;
  if(this.queue.length>=12)this.flush();
 }
 flush(){
  if(!this.queue.length)return;const body=JSON.stringify(this.queue.splice(0,12));
  try{if(navigator.sendBeacon('/api/events',new Blob([body],{type:'application/json'})))return;}catch{}
  void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'}).catch(()=>{});
 }
}
export class RunMetrics {
 private current:object|null=null;private ended=true;private mode:MetricMode='single';private mission=-1;private seconds=0;
 private emit:(event:MetricEvent,mode:MetricMode,mission:number,seconds:number)=>void;
 constructor(emit:(event:MetricEvent,mode:MetricMode,mission:number,seconds:number)=>void){this.emit=emit;}
 observe(world:object,state:string,mode:MetricMode,mission:number,seconds:number){
  if(world!==this.current){this.leave();this.current=world;this.ended=true;}
  this.seconds=seconds;
  if(this.ended&&(state==='playing'||state==='cinematic')){this.ended=false;this.mode=mode;this.mission=mission;this.emit('mission_start',mode,mission,0);}
  if(!this.ended&&(state==='won'||state==='lost')){this.ended=true;this.emit(state==='won'?'mission_win':'mission_loss',this.mode,this.mission,seconds);}
 }
 leave(){if(!this.ended){this.emit('mission_leave',this.mode,this.mission,this.seconds);this.ended=true;}}
}
