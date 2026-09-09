import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../src/game/audio.ts';
import {World,IDLE} from '../src/game/world.ts';
import {HEROES} from '../src/game/content.ts';
import {SFX_ASSETS,type SfxId} from '../src/game/sfx-assets.ts';

test('recorded combat routes all heroes, exact phases, lifetimes, pause and distance without oscillators',async()=>{
 const starts:{source:any;args:number[]}[]=[],stops:any[]=[],outputs:unknown[]=[];let context:any;
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{
  state='running';currentTime=0;sampleRate=24000;destination={};constructor(){context=this;}
  createGain(){return{gain:param(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:param(),ratio:param(),connect(target:unknown){outputs.push(target);}};}
  decodeAudioData(){return Promise.resolve({duration:500});}resume(){return Promise.resolve();}close(){}
  createOscillator(){throw new Error('Combat must not fall back to electronic oscillators');}
  createBufferSource(){const source={buffer:null,loop:false,connect(){},disconnect(){},onended:null,start(...args:number[]){starts.push({source,args});},stop(){stops.push(source);}};return source;}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),originalFetch=globalThis.fetch;
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});const urls:string[]=[];
 globalThis.fetch=(async(url:string)=>{urls.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};})as any;
 const expectClip=(key:string)=>{const clip=SFX_ASSETS[key as SfxId];assert.equal(starts.at(-1)!.args[1],clip.offset,key);assert.equal(starts.at(-1)!.args[2],clip.seconds,key);};
 try{
  const sound=new Sound();sound.music=false;await sound.enable();sound.step(.01,false,true);
  assert.equal(urls.filter(u=>u.includes('combat-bank')).length,1,'one bank request instead of hundreds');
  for(const {id:hero}of HEROES){
   for(const type of ['special','ultimate'] as const){sound.event({type,hero,x:0,y:0});expectClip(hero+'-'+type);}
   for(let i=0;i<3;i++)sound.event({type:'shot',hero,x:0,y:0});
   for(const kind of ['step','climb','jump','land','hurt','ready'] as const){context.currentTime++;const type=({step:'footstep',climb:'climbContact',jump:'jump',land:'land',hurt:'hurt',ready:'abilityReady'}as const)[kind];sound.event({type,hero,x:0,y:0});assert.ok(starts.at(-1)!.args[2]<=.3);}
  }
  sound.event({type:'shot',hero:'mamai',variant:'melee',x:0,y:0});assert.ok([0,1,2].some(v=>starts.at(-1)!.args[1]===SFX_ASSETS[`mamai-melee-weapon-${v}` as SfxId].offset));
  for(const {id:hero,magazine}of HEROES)if(magazine){sound.event({type:'reloadStart',hero,x:0,y:0});expectClip(hero+'-reload');const reloadSource=starts.at(-1)!.source;sound.event({type:'reloadEnd',hero,x:0,y:0});expectClip(hero+'-reload-end');assert.ok(stops.includes(reloadSource));}
  const idle=starts.length;sound.step(10,false,true);assert.equal(starts.length,idle,'idle cannot invent a reload');
  for(const type of ['tankEngine','planeEngine','droneEngine','mountShot','enemyAlert','enemyFuse','burst']as const){context.currentTime++;sound.event({type,x:0,y:0});}
  const distant=starts.length;sound.event({type:'shot',hero:'bilozerska',x:100,y:0},0);assert.equal(starts.length,distant);
  context.currentTime++;const alerts=starts.length;sound.event({type:'enemyAlert',x:0,y:0});sound.event({type:'enemyAlert',x:1,y:0});assert.equal(starts.length,alerts+1);
  sound.stopAll();sound.step(.01,false,true);
  const w=new World(0,HEROES.map(h=>h.id),'lesya');w.mode='playing';w.enemies=[];w.step(1/60,{...IDLE,special:true});
  sound.syncWorld(w);const loop=starts.at(-1)!;assert.equal(loop.source.loop,true);assert.equal(loop.args[1],SFX_ASSETS['lesya-special-loop'].offset);
  const count=starts.length;for(let i=0;i<20;i++)sound.syncWorld(w);assert.equal(starts.length,count,'loop not restarted every frame');
  w.effects=[];sound.syncWorld(w);assert.ok(stops.includes(loop.source),'effect removal stops its own loop');
  w.step(1/60,{...IDLE,ultimate:true});sound.syncWorld(w);const second=starts.at(-1)!.source;
  w.mode='paused';sound.syncWorld(w);sound.step(.01,false,false);assert.ok(stops.includes(second),'pause stops sustained ability');
  const paused=starts.length;context.currentTime+=10;sound.syncWorld(w);assert.equal(starts.length,paused);
  w.mode='playing';sound.syncWorld(w);assert.equal(starts.at(-1)!.source.loop,true,'live effect resumes without replaying activation');
  const source=starts.at(-1)!.source;sound.event({type:'heroChanged',hero:'franko',x:0,y:0});assert.ok(stops.includes(source),'hero change cancels active sound');
  sound.event({type:'sfx',sfx:'bandera-reload',soundOwner:123,hero:'zelensky',x:0,y:0});const followerReload=starts.at(-1)!.source;
  sound.event({type:'followerDown',soundOwner:123,hero:'zelensky',x:0,y:0});assert.ok(stops.includes(followerReload),'dead follower cannot finish a reload');
  sound.stopAll();sound.dispose();
  assert.equal(outputs[0],context.destination,'normal gameplay uses the speaker output');
  const captureOutput={} as AudioNode;const capture=new Sound(false,()=>captureOutput);await capture.enable();
  assert.deepEqual(outputs.slice(1),[captureOutput],'recording connects only to capture, never also to speakers');capture.dispose();
 }finally{globalThis.fetch=originalFetch;if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});

test('silent QA mode never creates audio, including announcements and previews',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('QA must never create AudioContext');}}});
 try{const sound=new Sound(true);await sound.enable();sound.announce('missionStart','zelensky');sound.preview('shevchenko');sound.event({type:'heroChanged',hero:'it-army',x:0,y:0});sound.event({type:'supportShot',x:0,y:0});sound.event({type:'planeAlert',x:0,y:0});sound.event({type:'droneEngine',x:0,y:0});sound.event({type:'mountEngine',x:0,y:0});sound.event({type:'mountShot',x:0,y:0});sound.event({type:'mountBroken',x:0,y:0});for(const type of ['footstep','climbContact','jump','land','abilityReady','hurt'] as const)sound.event({type,hero:'shevchenko',x:0,y:0});for(const type of ['enemyAlert','enemyFuse','enemyReload','enemySniperShot','enemyShieldHit'] as const)sound.event({type,x:0,y:0});sound.step(1,true,true);await Promise.resolve();assert.equal(sound.announcing,false);sound.dispose();}
 finally{if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');}
});
