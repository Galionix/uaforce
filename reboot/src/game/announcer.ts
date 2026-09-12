import {assetUrl} from './assets.ts';
/** Offline voice clips: no TTS service or credentials are used at runtime. */
export const ANNOUNCER_NAMES = [
  {id:'shevchenko',name:'Тарас Шевченко'}, {id:'lesya',name:'Леся Українка'}, {id:'franko',name:'Іван Франко'},
  {id:'bandera',name:'Степан Бандера'}, {id:'bandera-bro',name:'Бандер-Бро'}, {id:'mamai',name:'Козак Мамай'},
  {id:'bayraktar',name:'Байрактарчик'}, {id:'ghost',name:'Привид Києва'},
  {id:'zelensky',name:'Володимир Зеленський'}, {id:'bilozerska',name:'Олена Білозерська'}, {id:'it-army',name:'Айті-армія'}, {id:'skovoroda',name:'Григорій Сковорода'},
] as const;
export type Announcement = {key:string;voices:string[];riff?:'hero'|'short'|'victory'|'defeat'|'checkpoint'|'evac'|'boss-iron'|'boss-swarm'|'boss-putin';priority:number};
export function announcement(event:string,hero='shevchenko',unlocked=false):Announcement|null{
  const named=ANNOUNCER_NAMES.some(n=>n.id===hero);
  switch(event){
    case 'bossEncounter':return{key:`boss:${hero}`,voices:[hero],riff:hero==='putin'?'boss-putin':hero==='iron-warden'?'boss-iron':'boss-swarm',priority:3};
    case 'bossDefeated':return{key:event,voices:hero==='putin'?['putin-defeated']:[],riff:'victory',priority:3};
    case 'tankAlert':return{key:event,voices:['tank-alert'],priority:1};
    case 'planeAlert':return{key:event,voices:['plane-alert'],priority:1};
    case 'droneAlert':return{key:event,voices:['drone-alert'],priority:1};
    case 'missionStart':return{key:'start',voices:named?[hero,'mission-start']:['mission-start'],priority:2};
    case 'heroChanged':return{key:`hero:${hero}`,voices:unlocked?(named?['new-hero',hero]:['new-hero']):(named?[hero]:[]),riff:unlocked?'hero':undefined,priority:2};
    case 'checkpoint':return{key:event,voices:['checkpoint'],riff:'checkpoint',priority:0};
    case 'evacCalled':return{key:event,voices:['evac-called'],riff:'evac',priority:2};
    case 'boarded':return{key:event,voices:['boarded'],priority:2};
    case 'won':return{key:event,voices:['victory'],riff:'victory',priority:3};
    case 'lost':return{key:event,voices:['defeat'],riff:'defeat',priority:3};
    case 'respawn':return{key:event,voices:['respawn'],priority:1};
    default:return null;
  }
}
export class Announcer {
  private cache=new Map<string,Promise<AudioBuffer|null>>();
  private sources=new Set<AudioBufferSourceNode>();private envelopes=new Set<GainNode>();
  private revision=0;private until=0;private active:Announcement|null=null;private pending=false;
  enabled=true;onLine:(line:string)=>void=()=>{};
  private ctx:AudioContext;private voiceBus:GainNode;private musicBus:GainNode;private duck:(active:boolean)=>void;
  constructor(ctx:AudioContext,voiceBus:GainNode,musicBus:GainNode,duck:(active:boolean)=>void){this.ctx=ctx;this.voiceBus=voiceBus;this.musicBus=musicBus;this.duck=duck;}
  get busy(){return this.pending||this.ctx.currentTime<this.until;}
  private load(path:string){
    const previous=this.cache.get(path);if(previous)return previous;
    const promise=fetch(assetUrl(path)).then(r=>{if(!r.ok)throw Error('Missing audio');return r.arrayBuffer();}).then(data=>this.ctx.decodeAudioData(data)).catch(()=>null);
    this.cache.set(path,promise);void promise.then(buffer=>{if(!buffer)this.cache.delete(path);});return promise;
  }
  preload(){return Promise.all(['shevchenko','lesya','franko','mission-start','new-hero','victory','defeat','evac-called','boarded','checkpoint','respawn'].map(id=>this.load(`/assets/audio/announcer/${id}.wav`)));}
  stop(){this.revision++;for(const source of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();}this.sources.clear();for(const amp of this.envelopes)amp.disconnect();this.envelopes.clear();this.pending=false;this.until=0;this.active=null;this.duck(false);}
  async say(cue:Announcement){
    if(!this.enabled||this.ctx.state!=='running')return;
    if(this.busy&&this.active&&(cue.key===this.active.key||cue.priority<this.active.priority))return;
    this.stop();const token=this.revision;this.active=cue;this.pending=true;
    const [riff,...voices]=await Promise.all([cue.riff?this.load(`/assets/audio/cues/${cue.riff}.wav`):Promise.resolve(null),...cue.voices.map(id=>this.load(`/assets/audio/announcer/${id}.wav`))]);
    if(token!==this.revision)return;
    if(!this.enabled||this.ctx.state!=='running'){this.stop();return;}
    this.pending=false;
    const now=this.ctx.currentTime;let start=now+.02;let end=start;
    const schedule=(buffer:AudioBuffer,bus:GainNode,time:number,underVoice?:{start:number;end:number})=>{const source=this.ctx.createBufferSource();source.buffer=buffer;let amp:GainNode|null=null;if(underVoice!==undefined){amp=this.ctx.createGain();amp.gain.setValueAtTime(1,time);amp.gain.setValueAtTime(1,underVoice.start-.05);amp.gain.linearRampToValueAtTime(.32,underVoice.start+.05);amp.gain.setValueAtTime(.32,underVoice.end);amp.gain.linearRampToValueAtTime(1,underVoice.end+.2);source.connect(amp);amp.connect(bus);this.envelopes.add(amp);}else source.connect(bus);this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();if(amp){amp.disconnect();this.envelopes.delete(amp);}if(!this.sources.size&&token===this.revision){this.until=0;this.active=null;this.duck(false);}};source.start(time);end=Math.max(end,time+buffer.duration);};
    if(riff){const lead=cue.riff==='hero'?1.1:cue.riff==='victory'?.75:.35;const speechStart=start+lead;const speechEnd=speechStart+voices.reduce((seconds,v)=>seconds+(v?v.duration+.12:0),0)-.12;schedule(riff,this.musicBus,start,voices.some(Boolean)?{start:speechStart,end:speechEnd}:undefined);start=speechStart;}
    for(const voice of voices)if(voice){schedule(voice,this.voiceBus,start);start+=voice.duration+.12;}
    if(this.sources.size){this.until=end;this.duck(voices.some(Boolean));this.onLine(cue.voices.join(' / '));}else{this.active=null;this.duck(false);}
  }
}
