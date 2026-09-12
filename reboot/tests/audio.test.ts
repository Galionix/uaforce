import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../src/game/audio.ts';
import {World,IDLE} from '../src/game/world.ts';
import {HEROES} from '../src/game/content.ts';
import {SFX_ASSETS,type SfxId} from '../src/game/sfx-assets.ts';
import {addMount} from '../src/game/mounts.ts';
import {addVehicle} from '../src/game/enemies.ts';

test('recorded combat routes all heroes, exact phases, lifetimes, pause and distance without oscillators',async()=>{
 const starts:{source:any;args:number[]}[]=[],stops:any[]=[],outputs:unknown[]=[];let context:any;
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{
  state='running';currentTime=0;sampleRate=24000;destination={};constructor(){context=this;}
  createGain(){return{gain:param(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:param(),ratio:param(),connect(target:unknown){outputs.push(target);}};}
  decodeAudioData(){return Promise.resolve({duration:500});}resume(){return Promise.resolve();}close(){}
  createOscillator(){throw new Error('Combat must not fall back to electronic oscillators');}
  createBufferSource(){const source={buffer:null,playbackRate:{value:1},loop:false,connect(){},disconnect(){},onended:null,start(...args:number[]){starts.push({source,args});},stop(){stops.push(source);}};return source;}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),originalFetch=globalThis.fetch;
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});const urls:string[]=[];
 globalThis.fetch=(async(url:string)=>{urls.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};})as any;
 const expectClip=(key:string)=>{const clip=SFX_ASSETS[key as SfxId];assert.equal(starts.at(-1)!.args[1],clip.offset,key);assert.equal(starts.at(-1)!.args[2],clip.seconds,key);};
 try{
  const sound=new Sound();sound.music=false;await sound.enable();sound.step(.01,false,true);
  assert.equal(urls.filter(u=>u.includes('combat-bank')).length,1,'one bank request instead of hundreds');
  context.currentTime=4;const beforeShout=starts.length;sound.event({type:'voiceWave',x:0,y:0});
  assert.equal(starts[beforeShout].args[2],starts[beforeShout].source.buffer.duration,'microphone voice plays its complete recording, without a two-second cutoff');
  const beforeFive=starts.length;sound.event({type:'highFive',x:0,y:0});
  assert.deepEqual(starts.slice(beforeFive).map(s=>s.args[1]),[SFX_ASSETS['team-hand-clap'].offset,SFX_ASSETS['team-time-slow'].offset],'confirmed high five plays one clap and one generated air transition');
  for(const key of ['team-hand-raise','team-hand-lower']){const before=starts.length;sound.event({type:'sfx',sfx:key,x:0,y:0});assert.equal(starts.length,before+1);expectClip(key);}
  assert.equal(urls.some(u=>['/audio/rifle.wav','/audio/pain1.wav','/audio/reload.wav','/audio/Menu Selection Click.wav'].some(old=>u.includes(old))),false,'legacy effects no longer bypass the generated bank');
  for(const role of ['rifle','assault','gunner','sniper','scout','shield','demolition'] as const){
   let previous=-1;
   for(let i=0;i<4;i++){
    context.currentTime+=.5;const before=starts.length;
    sound.event({type:'enemyDeath',deathRole:role,deathCause:'combat',x:0,y:0});
    const voice=starts[before];
    const variant=[0,1,2,3].find(v=>voice.args[1]===SFX_ASSETS[`enemy-panic-${v}` as SfxId]?.offset);
    assert.notEqual(variant,undefined,role+' plays a generated scream at death');assert.notEqual(variant,previous,'no immediate death voice repeat');previous=variant!;
    assert.ok(starts.length>=before+2,'voice plus wet impact');
    const gated=starts.length;sound.event({type:'enemyDeath',deathRole:role,x:0,y:0});assert.equal(starts.length,gated,'mass casualties do not stack every voice');
   }
  }
  let previousPanic=-1;
  for(let i=0;i<8;i++){
   context.currentTime+=2;const before=starts.length;sound.event({type:'enemyPanic',x:0,y:0});
   assert.equal(starts.length,before+1);const offset=starts.at(-1)!.args[1];
   assert.ok([0,1,2,3].some(v=>SFX_ASSETS[`enemy-panic-${v}` as SfxId].offset===offset));
   assert.notEqual(offset,previousPanic);previousPanic=offset;
   sound.event({type:'enemyPanic',x:1,y:0});assert.equal(starts.length,before+1,'frightened squad cannot stack a scream per enemy');
  }
  context.currentTime+=2;const farPanic=starts.length;sound.event({type:'enemyPanic',x:100,y:0},0);assert.equal(starts.length,farPanic);
  context.currentTime++;
  const landings=starts.length;sound.event({type:'goreLand',x:0,y:0});sound.event({type:'goreLand',x:1,y:0});
  assert.equal(starts.length,landings+1,'one quiet landing in a dense fragment shower');
  assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`gore-gib-land-${v}` as SfxId]?.offset));
  context.currentTime++;const distantDeath=starts.length;
  sound.event({type:'enemyDeath',deathRole:'gunner',x:100,y:0},0);sound.event({type:'goreLand',x:100,y:0},0);
  assert.equal(starts.length,distantDeath,'deaths and landings have finite audible range');
  context.currentTime++;sound.event({type:'sfx',sfx:'klychko-gather-v5',soundOwner:0,x:0,y:0});expectClip('klychko-gather-v5');const gathering=starts.at(-1)!.source;sound.event({type:'sfx',sfx:'klychko-charge-stop',soundOwner:0,x:0,y:0});assert.ok(stops.includes(gathering),'release cancels the charging whoosh');
  for(const {id:hero}of HEROES){
   for(const type of ['special','ultimate'] as const){sound.event({type,hero,x:0,y:0});expectClip(hero==='klychko'?(type==='special'?'klychko-uppercut-v2':'klychko-charge-v3'):hero==='taira'&&type==='special'?'taira-field-v2':hero+'-'+type);}
   for(let i=0;i<3;i++)sound.event({type:'shot',hero,x:0,y:0});
   for(const kind of ['step','climb','jump','land','hurt','ready'] as const){context.currentTime++;const type=({step:'footstep',climb:'climbContact',jump:'jump',land:'land',hurt:'hurt',ready:'abilityReady'}as const)[kind];sound.event({type,hero,x:0,y:0});assert.ok(starts.at(-1)!.args[2]<=.3);}
  }
  sound.event({type:'sfx',sfx:'klychko-slam-v2',hero:'klychko',x:0,y:0});expectClip('klychko-slam-v2');
  sound.event({type:'shot',hero:'mamai',variant:'melee',x:0,y:0});assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`mamai-melee-weapon-${v}` as SfxId].offset));
  for(const {id:hero,magazine}of HEROES)if(magazine){sound.event({type:'reloadStart',hero,x:0,y:0});expectClip(hero+'-reload');const reloadSource=starts.at(-1)!.source;sound.event({type:'reloadEnd',hero,x:0,y:0});expectClip(hero+'-reload-end');assert.ok(stops.includes(reloadSource));}
  const idle=starts.length;sound.step(10,false,true);assert.equal(starts.length,idle,'idle cannot invent a reload');
  for(const type of ['tankEngine','planeEngine','droneEngine','mountShot','enemyAlert','enemyFuse','burst']as const){context.currentTime++;sound.event({type,x:0,y:0});}
  const distant=starts.length;sound.event({type:'shot',hero:'bilozerska',x:100,y:0},0);assert.equal(starts.length,distant);
  sound.stopAll();context.currentTime+=2;const alerts=starts.length;sound.event({type:'enemyAlert',x:0,y:0});sound.event({type:'enemyAlert',x:1,y:0});assert.equal(starts.length,alerts+1);
  sound.stopAll();context.currentTime+=2;
  let reactionStart=starts.length;sound.event({type:'enemySuspect',x:0,y:0});
  assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`enemy-suspect-${v}` as SfxId].offset));
  let question=starts.at(-1)!.source;
  for(let i=0;i<8;i++)sound.event({type:'enemySuspect',x:0,y:0});
  assert.equal(starts.length,reactionStart+1,'one questioning vocal for a whole squad');
  context.currentTime+=.1;sound.event({type:'enemyAlert',x:0,y:0});
  assert.ok(stops.includes(question),'confirmed contact immediately overrides a questioning reaction');
  assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`enemy-aggro-${v}` as SfxId].offset));
  question=starts.at(-1)!.source;
  context.currentTime+=.1;sound.event({type:'enemyDeath',deathRole:'rifle',x:0,y:0});
  assert.ok(stops.includes(question),'a death scream interrupts lower priority muttering');
  reactionStart=starts.length;context.currentTime+=2;sound.event({type:'enemyAlert',x:0,y:0});
  assert.equal(starts.length,reactionStart,'muttering cannot interrupt an active death vocal');
  sound.stopAll();context.currentTime+=2;sound.event({type:'enemyAlert',x:0,y:0});
  assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`enemy-aggro-${v}` as SfxId].offset));
  sound.stopAll();sound.step(.01,false,true);
  const w=new World(0,HEROES.map(h=>h.id),'lesya');w.mode='playing';w.enemies=[];w.step(1/60,{...IDLE,special:true});
  sound.syncWorld(w);const loop=starts.at(-1)!;assert.equal(loop.source.loop,true);assert.equal(loop.args[1],SFX_ASSETS['lesya-special-loop'].offset);
  const count=starts.length;for(let i=0;i<20;i++)sound.syncWorld(w);assert.equal(starts.length,count,'loop not restarted every frame');
  w.effects=w.effects.map(f=>({...f,hit:new Set(f.hit)}));sound.syncWorld(w);
  assert.equal(starts.length,count,'co-op snapshot object replacement cannot restart the loop');
  w.effects=[];sound.syncWorld(w);assert.ok(stops.includes(loop.source),'effect removal stops its own loop');
  w.step(1/60,{...IDLE,ultimate:true});sound.syncWorld(w);const second=starts.at(-1)!.source;
  w.mode='paused';sound.syncWorld(w);sound.step(.01,false,false);assert.ok(stops.includes(second),'pause stops sustained ability');
  const paused=starts.length;context.currentTime+=10;sound.syncWorld(w);assert.equal(starts.length,paused);
  w.mode='playing';sound.syncWorld(w);assert.equal(starts.at(-1)!.source.loop,true,'live effect resumes without replaying activation');
  const source=starts.at(-1)!.source;sound.event({type:'heroChanged',hero:'franko',x:0,y:0});assert.ok(stops.includes(source),'hero change cancels active sound');
  sound.event({type:'sfx',sfx:'bandera-reload',soundOwner:123,hero:'zelensky',x:0,y:0});const followerReload=starts.at(-1)!.source;
  sound.event({type:'followerDown',soundOwner:123,hero:'zelensky',x:0,y:0});assert.ok(stops.includes(followerReload),'dead follower cannot finish a reload');
  sound.stopAll();w.effects=[];w.enemies=[];w.mounts=[];w.mode='playing';
  const tank=addMount(w,w.player.x);w.mounted=tank;tank.moving=true;sound.syncWorld(w);
  assert.equal(starts.at(-1)!.args[1],SFX_ASSETS['tank-engine'].offset);const engine=starts.at(-1)!.source;assert.equal(engine.loop,true);
  const running=starts.length;for(let i=0;i<10;i++){sound.event({type:'mountEngine',x:tank.x,y:tank.y});sound.syncWorld(w);}
  assert.equal(starts.length,running,'engine events cannot layer repeated long engine samples');
  tank.armor=0;sound.syncWorld(w);assert.ok(stops.includes(engine),'destroyed tank stops the engine');
  const plane=addVehicle(w,'plane',w.player.x+3,4);plane.vehicle!.active=true;sound.syncWorld(w);const flight=starts.at(-1)!.source;
  assert.equal(flight.loop,true);w.enemies=w.enemies.map(e=>({...e,vehicle:{...e.vehicle!}}));const beforeSnapshot=starts.length;sound.syncWorld(w);
  assert.equal(starts.length,beforeSnapshot,'vehicle loop survives snapshot replacement');
  w.mode='paused';sound.syncWorld(w);assert.ok(stops.includes(flight),'pause cancels vehicle loops');
  sound.stopAll();sound.dispose();
  assert.equal(outputs[0],context.destination,'normal gameplay uses the speaker output');
  const captureOutput={} as AudioNode;const capture=new Sound(false,()=>captureOutput);await capture.enable();
  for(const boss of ['iron-warden','swarm-master','putin'] as const){
   context.currentTime++;capture.event({type:'bossDefeated',boss,x:0,y:0});expectClip('death-boss-'+boss);
   capture.stopAll();
  }
  assert.deepEqual(outputs.slice(1),[captureOutput],'recording connects only to capture, never also to speakers');capture.dispose();
 }finally{globalThis.fetch=originalFetch;if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});

test('silent QA mode never creates audio, including announcements and previews',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('QA must never create AudioContext');}}});
 try{const sound=new Sound(true);await sound.enable();sound.announce('missionStart','zelensky');sound.preview('shevchenko');sound.event({type:'heroChanged',hero:'it-army',x:0,y:0});sound.event({type:'supportShot',x:0,y:0});sound.event({type:'planeAlert',x:0,y:0});sound.event({type:'droneEngine',x:0,y:0});sound.event({type:'mountEngine',x:0,y:0});sound.event({type:'mountShot',x:0,y:0});sound.event({type:'mountBroken',x:0,y:0});for(const type of ['footstep','climbContact','jump','land','abilityReady','hurt'] as const)sound.event({type,hero:'shevchenko',x:0,y:0});for(const type of ['enemyAlert','enemyFuse','enemyReload','enemySniperShot','enemyShieldHit'] as const)sound.event({type,x:0,y:0});sound.step(1,true,true);await Promise.resolve();assert.equal(sound.announcing,false);sound.dispose();}
 finally{if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});

test('a real infantry kill plays a foreground scream that survives a saturated combat mix',async()=>{
 const starts:any[]=[],stopped:any[]=[];let ctx:any;
 const param=()=>({value:0,targets:[] as number[][],cancelScheduledValues(){},setTargetAtTime(...v:number[]){this.targets.push(v);},setValueAtTime(v:number){this.value=v;},linearRampToValueAtTime(){}});
 class Context{
  state='running';currentTime=10;destination={};constructor(){ctx=this;}
  createGain(){return{gain:param(),target:null as any,connect(t:any){this.target=t;},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:param(),ratio:param(),connect(){}};}
  decodeAudioData(){return Promise.resolve({duration:1000});}resume(){return Promise.resolve();}close(){}
  createBufferSource(){const source={buffer:null,playbackRate:{value:1},target:null as any,connect(t:any){this.target=t;},disconnect(){},onended:null,start(...args:number[]){starts.push({source,args});},stop(){stopped.push(source);}};return source;}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),fetchBefore=globalThis.fetch;
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});globalThis.fetch=(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})) as any;
 try{
  const sound=new Sound();sound.music=false;await sound.enable();sound.step(.01,false,true);
  const world=new World();world.mode='playing';const enemy=world.enemies.find(e=>!e.vehicle&&!e.boss)!;
  world.events=[];world.damageEnemy(enemy,enemy.hp,'combat');
  const death=world.events.find(e=>e.type==='enemyDeath')!;assert.ok(death,'actual combat publishes the death event');
  sound.event(death,death.x);const cry=starts[0].source,cryGain=cry.target,cryBus=cryGain.target;
  assert.ok([0,1,2,3].some(v=>SFX_ASSETS[`enemy-panic-${v}` as SfxId].offset===starts[0].args[1]));
  assert.ok(cryGain.gain.value>=.8,'death vocal is foreground, not the old .3 grunt');
  assert.ok(starts[0].args[2]/cry.playbackRate.value>=1,'retain the complete vocal, not a tiny grunt');
  for(let i=0;i<60;i++){sound.event({type:'shot',hero:'bandera',x:death.x,y:0});sound.event({type:'hostileBlast',x:death.x,y:0});}
  assert.equal(stopped.includes(cry),false,'shots, debris and explosions cannot steal the scream');
  const effectsBus=starts.at(-1).source.target.target;
  assert.notEqual(effectsBus,cryBus,'vocal bypasses combat ducking');
  assert.ok(effectsBus.gain.targets.some(([v,t])=>v===.42&&t===ctx.currentTime));
  assert.ok(effectsBus.gain.targets.some(([v,t])=>v===1&&t>ctx.currentTime),'combat level restores after vocal without a timer');
  sound.setMix('effects',.5);
  assert.equal(cryBus.gain.targets.at(-1)[0],.5,'cry respects the existing effects volume');
  assert.ok(effectsBus.gain.targets.some(([v])=>v===.21));
  sound.setMix('effects',0);assert.equal(cryBus.gain.targets.at(-1)[0],0,'mute also mutes cries');
  sound.stopAll();assert.ok(stopped.includes(cry),'pause/stop cancels vocal');
  assert.equal(effectsBus.gain.targets.at(-1)[0],0,'stop keeps user mute, no stale duck');
  sound.setMix('effects',1);assert.equal(effectsBus.gain.targets.at(-1)[0],1,'full mix restored');
  sound.dispose();
 }finally{globalThis.fetch=fetchBefore;if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});
