import {type FoleyKind} from './hero-foley.ts';
import {assetUrl} from './assets.ts';
import {ScorePlayer,MusicMood,type ScoreTheme} from './music.ts';
import {Announcer,announcement,type Announcement} from './announcer.ts';
import type { Event, World } from './world';
import {SFX_ASSETS,type SfxId} from './sfx-assets.ts';
import type {HeroId} from './content';
export class Sound {
  private readonly silent:boolean;
  private readonly output?: (context:AudioContext)=>AudioNode;
  constructor(silent=false,output?:(context:AudioContext)=>AudioNode){this.silent=silent;this.output=output;}
  volume=.35;music=true;bossBattle=false;scoreTheme:ScoreTheme='river';private score:ScorePlayer|null=null;private mood=new MusicMood();effectsVolume=1;musicVolume=.7;voiceVolume=1;
  private cryBus:GainNode|null=null;private cryUntil=0;private cries=new Set<AudioBufferSourceNode>();private lastCry=-100;
  private effectsBus:GainNode|null=null;private musicBus:GainNode|null=null;private voiceBus:GainNode|null=null;private director:Announcer|null=null;private ducked=false;private lifecycle=0;
  get audioReady(){return this.context?.state==='running';}
  get announcing(){return this.director?.busy??false;}
  private context:AudioContext|null=null;private gain:GainNode|null=null;
  private buffers=new Map<string,AudioBuffer>();private loading:Promise<void>|null=null;
  private voices=new Map<AudioBufferSourceNode,string>();
  private loops=new Map<string,{source:AudioBufferSourceNode;amp:GainNode;key:SfxId}>();
  private sampleSerial=0;private sampleLast=new Map<string,number>();
  private foleySerial=0;private foleyLast=new Map<string,number>();private lastCombat=-100;
  private lastPanic=-100;private lastReaction=-100;private lastReactionKind:Event['type']|undefined;
  private deathVariants=new Map<string,number>();private lastGore=-100;private variationState=0x51f15e;
  private lastVoice=-100;private wasPlaying=false;
  async enable(){
    if(this.silent)return;
    if(!this.context){
      this.context=new AudioContext();this.gain=this.context.createGain();this.gain.gain.value=this.volume;
      const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;this.gain.connect(limiter);limiter.connect(this.output?this.output(this.context):this.context.destination);
      this.cryBus=this.context.createGain();this.effectsBus=this.context.createGain();this.musicBus=this.context.createGain();this.voiceBus=this.context.createGain();
      for(const bus of [this.effectsBus,this.musicBus,this.voiceBus,this.cryBus])bus.connect(this.gain);
      this.score=new ScorePlayer(this.context,this.musicBus);
      this.director=new Announcer(this.context,this.voiceBus,this.musicBus,active=>{this.ducked=active;this.updateMix();});
      void this.director.preload();this.updateMix();
      this.loading=Promise.all([['voiceWave','announcer/zelensky-shout.wav'],['combatBank','sfx/combat-bank.wav']].map(async([name,file])=>{
        try{const r=await fetch(assetUrl('/assets/audio/'+file));if(!r.ok)return;this.buffers.set(name,await this.context!.decodeAudioData(await r.arrayBuffer()));}catch{/* Sound failure must not stop a mission. */}
      })).then(()=>{});

    }
    try{await this.context.resume();await this.loading;}catch{/* A browser may require a key gesture to enable sound. */}
  }
  setVolume(v:number){this.volume=v;if(this.gain)this.gain.gain.value=v;}
  setMix(channel:'effects'|'music'|'voice',value:number){const v=Number.isFinite(value)?Math.max(0,Math.min(1,value)):1;if(channel==='effects')this.effectsVolume=v;else if(channel==='music')this.musicVolume=v;else this.voiceVolume=v;this.updateMix();}
  private updateMix(){
    this.score?.duck(this.ducked&&this.voiceVolume>0);
    const t=this.context?.currentTime??0,cry=this.cryUntil>t,announcer=this.ducked&&this.voiceVolume>0;
    for(const [bus,base,underCry] of [[this.effectsBus,this.effectsVolume*(announcer?.3:1),.42],[this.musicBus,this.musicVolume,.72],[this.voiceBus,this.voiceVolume,1],[this.cryBus,this.effectsVolume*(announcer?.55:1),1]] as const)if(bus){
      bus.gain.cancelScheduledValues(t);bus.gain.setTargetAtTime(base*(cry?underCry:1),t,.015);
      if(cry&&underCry<1)bus.gain.setTargetAtTime(base,this.cryUntil,.12);
    }
  }
  private async deliver(cue:Announcement){const token=this.lifecycle;await this.enable();if(token===this.lifecycle)await this.director?.say(cue);}
  announce(event:string,hero='shevchenko',unlocked=false){if(event==='missionStart')this.mood.reset();const cue=announcement(event,hero,unlocked);if(cue)void this.deliver(cue);}
  preview(id:string){
    this.stopAll();
    const stages:Record<string,string>={'mission-start':'missionStart','checkpoint':'checkpoint','evac-called':'evacCalled','boarded':'boarded','victory':'won','defeat':'lost','respawn':'respawn'};
    const stage=announcement(stages[id]??'');
    void this.deliver(stage?{...stage,key:'preview:'+id,voices:[id],priority:3}:{key:'preview:'+id,voices:[id],riff:'hero',priority:3});
  }
  stopAll(){this.score?.stop();this.lifecycle++;this.director?.stop();this.stopEffects();}
  private stopEffects(){this.cries.clear();this.cryUntil=0;this.lastCry=-100;this.updateMix();this.foleyLast.clear();this.lastCombat=-100;this.lastPanic=-100;this.lastReaction=-100;this.lastReactionKind=undefined;this.lastGore=-100;this.sampleLast.clear();for(const {source,amp} of this.loops.values()){try{source.stop();}catch{}source.disconnect();amp.disconnect();}this.loops.clear();for(const s of this.voices.keys())try{s.stop();}catch{}this.voices.clear();}
  private stopKind(kind:string){for(const [s,k]of this.voices)if(k===kind){try{s.stop();}catch{}this.voices.delete(s);this.cries.delete(s);}}
  private play(kind:string,volume:number,duration:number,offset=0,scope=kind,cry=false,rate=1){
    const clip=SFX_ASSETS[kind as SfxId],ctx=this.context,buffer=this.buffers.get(clip?'combatBank':kind);
    if(!ctx||!this.gain||!buffer||ctx.state!=='running')return;
    // A burst of weapon/debris sounds must never steal a vocal source.
    const pool=[...this.voices].filter(([source])=>this.cries.has(source)===cry);
    const same=pool.filter(([,k])=>k===scope),victim=same.length>=3?same[0]:pool.length>=(cry?3:25)?pool[0]:undefined;
    if(victim){try{victim[0].stop();}catch{}this.voices.delete(victim[0]);this.cries.delete(victim[0]);}
    const position=(clip?.offset??0)+offset,length=Math.min(duration,clip?.seconds??buffer.duration-position);
    if(length<=0)return;
    const source=ctx.createBufferSource(),amp=ctx.createGain(),t=ctx.currentTime;
    source.buffer=buffer;source.playbackRate.value=rate;source.connect(amp);amp.connect((cry?this.cryBus:this.effectsBus)??this.gain);
    amp.gain.setValueAtTime(volume,t);amp.gain.setValueAtTime(volume,t+Math.max(0,length/rate-.025));amp.gain.linearRampToValueAtTime(0,t+length/rate);
    if(cry){this.cries.add(source);this.cryUntil=Math.max(this.cryUntil,t+length/rate+.08);this.updateMix();}
    this.voices.set(source,scope);source.onended=()=>{this.cries.delete(source);this.voices.delete(source);source.disconnect();amp.disconnect();};source.start(t,position,length);
  }
  private sample(key:string,volume=.45,gate=0,scope=key){
    const clip=SFX_ASSETS[key as SfxId];if(!clip)return;
    const now=this.context?.currentTime??0;if(gate&&now-(this.sampleLast.get(key)??-100)<gate)return;
    this.sampleLast.set(key,now);this.play(key,volume,clip.seconds,0,scope);
  }
  /** Cosmetic randomness never advances the authoritative world's RNG. */
  private deathVariant(group:string,count=3){
    const previous=this.deathVariants.get(group);
    let state=this.variationState;state^=state<<13;state^=state>>>17;state^=state<<5;this.variationState=state;
    const random=(state>>>0)/4294967296;
    const next=previous===undefined?Math.floor(random*count):(previous+1+Math.floor(random*(count-1)))%count;
    this.deathVariants.set(group,next);return `${group}-${next}`;
  }
  /** Snapshot-owned loops cannot outlive their effect, follower, hero or pause. */
  syncWorld(world:World){
    const ctx=this.context,buffer=this.buffers.get('combatBank');
    if(world.mode!=='playing'||!ctx||ctx.state!=='running'||!buffer){this.stopLoops();return;}
    const living=new Set(world.followers.filter(f=>f.hp>0).map(f=>'follower:'+f.id));
    for(const [,scope]of this.voices)if(scope.startsWith('follower:')&&!living.has(scope))this.stopKind(scope);
    const wanted=new Map<string,{key:SfxId;x:number;level:number}>(),ordinals=new Map<string,number>();
    for(const f of world.effects){
      const key=`${f.hero}-${f.kind}-loop` as SfxId;
      const group=`effect:${f.playerId??0}:${f.hero}:${f.kind}`,ordinal=ordinals.get(group)??0;ordinals.set(group,ordinal+1);
      // Co-op snapshots replace JS objects. A stable presentation slot keeps
      // sustained audio running instead of restarting on every network packet.
      if(f.life>0&&key in SFX_ASSETS&&!(f.hero==='bandera'&&f.kind==='special'&&f.age<.65))wanted.set(`${group}:${ordinal}`,{key,x:f.x,level:.15});
    }
    for(const t of world.mounts)if(t.armor>0&&world.players.some(a=>a.mounted?.id===t.id))
      wanted.set('mount:'+t.id,{key:'tank-engine',x:t.x,level:t.moving?.11:.035});
    for(const e of world.enemies)if(e.hp>0&&e.vehicle?.active)
      wanted.set('vehicle:'+e.id,{key:e.vehicle.kind==='tank'?'tank-engine':e.vehicle.kind==='plane'?'plane-engine':'drone-engine',x:e.x,level:e.vehicle.kind==='tank'?.09:.11});
    for(const [object,loop]of this.loops)if(!wanted.has(object)){try{loop.source.stop();}catch{}loop.source.disconnect();loop.amp.disconnect();this.loops.delete(object);}
    for(const [object,{key,x,level}]of wanted){
      const distance=Math.abs(x-world.player.x),volume=level*Math.max(0,1-distance/20);
      let active=this.loops.get(object);
      if(!active&&volume>0){
        const clip=SFX_ASSETS[key],source=ctx.createBufferSource(),amp=ctx.createGain();
        source.buffer=buffer;source.loop=true;source.loopStart=clip.offset;source.loopEnd=clip.offset+clip.seconds;
        source.connect(amp);amp.connect(this.effectsBus??this.gain!);amp.gain.setValueAtTime(0,ctx.currentTime);
        source.start(ctx.currentTime,clip.offset);active={source,amp,key};this.loops.set(object,active);
      }
      active?.amp.gain.setTargetAtTime(volume,ctx.currentTime,.06);
    }
  }
  private stopLoops(){for(const {source,amp}of this.loops.values()){try{source.stop();}catch{}source.disconnect();amp.disconnect();}this.loops.clear();}
  private foley(hero:HeroId,kind:FoleyKind){
    const ctx=this.context;if(!ctx||ctx.state!=='running')return;
    const now=ctx.currentTime,movement=['step','climb','jump'].includes(kind);if(movement&&this.announcing)return;
    const gate=kind==='step'||kind==='climb'?'contact':kind;
    if(now-(this.foleyLast.get(gate)??-100)<(gate==='contact'?.18:kind==='ready'?.5:.1))return;
    this.foleyLast.set(gate,now);
    const level=kind==='hurt'?.48:kind==='land'?.3:kind==='ready'?.2:.16;
    this.sample(`foley-${hero}-${kind}-${this.foleySerial++%3}`,level*(movement&&now-this.lastCombat<.4?.3:1));
  }
  event(e:Event,listenerX=e.x){
    if(this.silent)return;
    // The finale sound accompanies the victory announcement; it must not be
    // swallowed by the announcer's early return or replace its approved voice.
    if(e.type==='bossDefeated'&&e.boss&&Math.abs(e.x-listenerX)<=20)
      this.sample('death-boss-'+e.boss,.7*Math.max(.12,1-Math.abs(e.x-listenerX)/24),.5);
    const cue=announcement(e.type,e.boss??e.hero,e.unlocked);
    if(cue){
      if(['won','lost','respawn','boarded'].includes(e.type))this.stopAll();
      else if(e.type==='heroChanged'){this.lifecycle++;this.director?.stop();this.stopEffects();}
      void this.deliver(cue);return;
    }
    const distance=Math.abs(e.x-listenerX);if(distance>20)return;
    if(['mountEngine','tankEngine','planeEngine','droneEngine'].includes(e.type))return; // persistent state-owned loops
    const level=Math.max(.12,1-distance/24),sample=(key:string,v=.45,gate=0)=>this.sample(key,v*level,gate,e.soundOwner!==undefined?'follower:'+e.soundOwner:key);
    if(['shot','enemyShot','special','ultimate','hostileBlast','mountShot','tankShot'].includes(e.type))this.lastCombat=this.context?.currentTime??-100;
    if(e.type==='followerDown'&&e.soundOwner!==undefined)this.stopKind('follower:'+e.soundOwner);
    if(e.sfx){sample(e.sfx,e.sfx.includes('hit')?.3:.4,e.sfx.includes('hit')||['roots','ricochet'].includes(e.sfx)?.09:0);return;}
    const foleyKind=({footstep:'step',climbContact:'climb',jump:'jump',land:'land',abilityReady:'ready',wallJump:'jump',wallVault:'land'} as Partial<Record<Event['type'],FoleyKind>>)[e.type];
    if(foleyKind&&e.hero){this.foley(e.hero,foleyKind);return;}
    if(e.type==='enemyAlert'||e.type==='enemySuspect'){
      const now=this.context?.currentTime??0;
      const escalates=e.type==='enemyAlert'&&this.lastReactionKind==='enemySuspect';
      if(now-this.lastReaction<1.25&&!escalates||this.announcing)return;
      if(escalates)this.stopKind('enemy-reaction');
      if(this.cries.size>0)return;
      this.lastReaction=now;this.lastReactionKind=e.type;
      const key=this.deathVariant(e.type==='enemyAlert'?'enemy-aggro':'enemy-suspect'),clip=SFX_ASSETS[key as SfxId];
      this.play(key,(e.type==='enemyAlert'?.64:.5)*level,clip.seconds,0,'enemy-reaction',true);return;
    }
    if(e.type==='enemyPanic'||e.type==='enemyDeath'){
      const now=this.context?.currentTime??0,panic=e.type==='enemyPanic';
      if(now-this.lastCry<.4||panic&&now-this.lastPanic<.7)return;
      this.stopKind('enemy-reaction');this.lastCry=now;if(panic)this.lastPanic=now;
      // These are the generated human screams, not the old short defeat grunts.
      // Role-specific pitch keeps heavy voices lower and scouts more shrill.
      const rate=panic?1:({rifle:1,assault:1.04,gunner:.9,sniper:.96,scout:1.1,shield:.93,demolition:1.07}[e.deathRole??'rifle']);
      const key=this.deathVariant('enemy-panic',4),clip=SFX_ASSETS[key as SfxId];
      this.play(key,(panic?.78:.82)*level,clip.seconds,0,'enemy-cry',true,rate);
      if(!panic){
        sample(this.deathVariant(e.deathCause==='combat'?'gore-splat':'gore-blood-burst'),.23);
        if(e.deathRole==='demolition')sample(this.deathVariant('gore-croak'),.16);
      }
      return;
    }
    if(e.type==='goreLand'){
      const now=this.context?.currentTime??0;if(now-this.lastGore<.09||this.announcing)return;this.lastGore=now;
      sample(this.deathVariant('gore-gib-land'),.11);return;
    }
    if(e.type==='shot'){
      if(e.hero)sample(`${e.hero}${e.variant==='melee'&&e.hero==='mamai'?'-melee':''}-weapon-${this.sampleSerial++%3}`,e.hero==='bilozerska'?.6:.4);
      else sample('legacy-shot',.25);
    }else if((e.type==='special'||e.type==='ultimate')&&e.hero){
      if(e.type==='ultimate')for(const h of ['lesya','bandera','mamai','bayraktar','ghost','zelensky','bilozerska','it-army'])this.stopKind(h+'-reload');
      sample(`${e.hero}-${e.type}`,e.type==='ultimate'?.65:.5);
    }else if(e.type==='reloadStart'&&e.hero){this.stopKind(e.hero+'-reload');sample(e.hero+'-reload',.28);}
    else if(e.type==='reloadEnd'&&e.hero){this.stopKind(e.hero+'-reload');sample(e.hero+'-reload-end',.25);}
    else if(e.type==='voiceWave'){const now=this.context?.currentTime??0;if(now-this.lastVoice>3){this.lastVoice=now;this.play('voiceWave',.55*level,2);}sample('zelensky-hit',.3);}
    else if(e.type==='hurt'){if(e.hero)this.foley(e.hero,'hurt');else sample('legacy-hurt',.4);}
    else if(e.type==='enemyShot')sample('support-infantry',.18,.055);
    else if(e.type==='enemySniperShot')sample('bilozerska-weapon-0',.27,.2);
    else if(e.type==='enemyReload')sample('legacy-reload',.08);
    else if(e.type==='supportShot')sample(e.variant==='turret'?'support-turret':'support-infantry',.24);
    else if(e.type==='rescue')sample('legacy-rescue',.4);
    else {
      const map:Partial<Record<Event['type'],[string,number,number?]>>={
        ammoPickup:['pickup',.4],barrelLift:['barrel-lift',.35],barrelThrow:['barrel-throw',.35],
        mountJump:['tank-jump',.35],mountLand:['tank-land',.5],mountShot:['tank-shot',.65],tankShot:['tank-shot',.6],armorHit:['armor-hit',.4,.1],
        mountBroken:['explosion',.65],mountEnter:['hatch',.4],mountExit:['hatch',.4],tankAim:['turret-step',.25],bossWindup:['tank-jump',.4],
        rocketLaunch:['rocket',.4],droneDive:['drone-dive',.4],hostileBlast:['explosion',.65,.09],
        enemyFuse:['enemy-fuse',.35,.3],enemyShieldHit:['armor-hit',.3,.1],
        followerDown:['follower-down',.3],followerHurt:['follower-hurt',.22,.12],
        railShot:['rail-shot',.7],thunder:[e.hero==='bayraktar'?'rocket':'thunder',.65],burst:['explosion',.55,.09],debris:['debris',.3,.12],
      };const entry=map[e.type];if(entry)sample(...entry);
    }
  }
  step(dt:number,combat:boolean,playing:boolean,_firing=false,menu=false){
    if(!playing){if(this.wasPlaying)this.stopEffects();this.wasPlaying=false;if(menu&&this.music&&this.context?.state==='running')void this.score?.play('menu');else this.score?.stop();return;}this.wasPlaying=true;
    if(!this.music){this.score?.stop();return;}
    if(this.context?.state!=='running')return;
    const mood=this.mood.step(dt,combat,this.bossBattle);
    void this.score?.play(mood==='boss'?'boss':`${this.scoreTheme}-${mood}`);
  }

  dispose(){this.stopAll();void this.context?.close();}
}
