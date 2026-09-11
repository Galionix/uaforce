import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {MusicMood,ScorePlayer,musicDanger,SCORE_THEMES} from '../src/game/music.ts';import {World,IDLE} from '../src/game/world.ts';import {MISSIONS} from '../src/game/content.ts';import {parseProgress} from '../src/game/storage.ts';import {Sound} from '../src/game/audio.ts';
test('music defaults on; danger transitions hold for twelve seconds, with boss precedence',()=>{assert.equal(new Sound(true).music,true);const m=new MusicMood();assert.equal(m.step(1,false,false),'explore');assert.equal(m.step(.1,true,false),'combat');assert.equal(m.step(11,false,false),'combat');assert.equal(m.step(1.1,false,false),'explore');assert.equal(m.step(.1,false,true),'boss');m.reset();assert.equal(m.step(0,false,false),'explore');});
test('dormant vehicles and far enemies do not hijack exploration; real local attacks do',()=>{const w=new World(1);w.player.x=250;w.enemies=w.enemies.filter(e=>e.boss);assert.equal(musicDanger(w),false);w.enemies[0].boss!.active=true;w.player.x=270;assert.equal(musicDanger(w),true);w.enemies=[];assert.equal(musicDanger(w,true),true);w.bullets.push({id:999,x:275,y:1,vx:-12,vy:0,life:1,damage:10,friendly:false});assert.equal(musicDanger(w),true);});
function fixture(){
 const nodes:any[]=[],ramps:any[]=[];const ctx={state:'running',currentTime:0,createGain:()=>({gain:{value:.7,setValueAtTime(v:number,t:number){ramps.push([v,t]);},setTargetAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(v:number,t:number){ramps.push([v,t]);}},connect(){},disconnect(){}}),decodeAudioData:async()=>({duration:16}),createBufferSource(){const n={loop:false,buffer:null,stops:[] as number[],onended:null,connect(){},disconnect(){},starts:[] as number[][],start(...args:number[]){this.starts.push(args);},stop(t=0){this.stops.push(t);}};nodes.push(n);return n;}};
 return{ctx,nodes,ramps,score:new ScorePlayer(ctx as any,{} as any)};
}
const ok=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})as any;
test('score loops once per mood, crossfades and stops all sources on pause',async()=>{const old=fetch;globalThis.fetch=ok;try{const{ctx,nodes,score,ramps}=fixture();await score.play('river-explore');assert.equal(nodes.length,1);assert.equal(nodes[0].loop,true);await score.play('river-explore');assert.equal(nodes.length,1);ctx.currentTime=4;await score.play('river-combat');assert.equal(nodes.length,2);assert.equal(nodes[0].stops[0],7.05);assert.ok(ramps.some(([v,t])=>v===0&&t===7));score.stop();assert.ok(nodes.every(n=>n.stops.includes(0)));assert.equal(score.track,'');}finally{globalThis.fetch=old;}});
test('pending file loads cannot start music after pause or supersede a newer theme',async()=>{const old=fetch;let release!:()=>void;const gate=new Promise<void>(r=>release=r);globalThis.fetch=(async()=>{await gate;return ok();})as any;try{const{score,nodes}=fixture();const pending=score.play('river-explore');score.stop();release();await pending;assert.equal(nodes.length,0);globalThis.fetch=ok;await score.play('rail-combat');assert.equal(score.track,'rail-combat');assert.equal(nodes.length,1);score.stop();}finally{globalThis.fetch=old;}});
test('missing music retries at a bounded rate, keeping gameplay independent',async()=>{const old=fetch;let calls=0;globalThis.fetch=(async()=>{calls++;return{ok:false};})as any;try{const{score,ctx}=fixture();await score.play('marsh-explore');for(let i=0;i<50;i++)await score.play('marsh-explore');assert.equal(calls,1);ctx.currentTime=6;globalThis.fetch=ok;await score.play('marsh-explore');assert.equal(score.track,'marsh-explore');score.stop();}finally{globalThis.fetch=old;}});
test('all 14 background tracks are independent Flow Music edits with verified asset hashes',()=>{
 const m=JSON.parse(readFileSync(new URL('../docs/BACKGROUND_MUSIC.json',import.meta.url),'utf8'));
 assert.equal(m.playbackDuringGeneration,false);assert.equal(m.origin,'Google Flow Music');
 assert.equal(m.clips.length,14);assert.equal(new Set(m.clips.map((c:any)=>c.sha256)).size,14);
 for(const id of [...SCORE_THEMES.flatMap(t=>[t+'-explore',t+'-combat']),'boss','menu']){
  const c=m.clips.find((c:any)=>c.id===id);assert.ok(c,id);
  const b=readFileSync(new URL('../'+c.file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);
  assert.equal(createHash('sha256').update(b).digest('hex'),c.sha256);
  assert.ok(c.seconds>=50&&c.seconds<=100);assert.ok(c.rms>.055&&c.peak<.9);
  assert.ok(c.seamStep<.04);assert.match(c.origin,/Google Flow Music/);
  assert.match(c.songUrl,/^https:\/\/www\.flowmusic\.app\/song\//);
 }
});
test('campaign adds distinct missions without replacing original operations and migrates old completion',()=>{assert.ok(MISSIONS.length>=6);assert.deepEqual(MISSIONS.slice(0,3).map(m=>m.name),['Тихий берег','Останній рубіж','Острів свободи']);assert.equal(new Set(MISSIONS.slice(0,6).map(m=>JSON.stringify(m.forts))).size,6);assert.equal(new Set(MISSIONS.map(m=>m.score)).size,6);const p=parseProgress(JSON.stringify({mission:2,completed:true,unlocked:['shevchenko','lesya'],hero:'lesya'}));assert.equal(p.mission,9);assert.equal(p.completed,false);assert.equal(p.hero,'lesya');const end=parseProgress(JSON.stringify({mission:5,completed:true,campaignSize:6}));assert.equal(end.completed,false);assert.equal(end.mission,9);});

test('new missions use three distinct local pixel backgrounds, with exact generation prompts',()=>{const m=JSON.parse(readFileSync(new URL('../docs/NEW_MISSION_ART.json',import.meta.url),'utf8'));const hashes=new Set();for(const mission of MISSIONS.slice(3,6)){const b=readFileSync(new URL('../public'+mission.background,import.meta.url));assert.equal(b.toString('ascii',1,4),'PNG');assert.ok(m.assets.some((a:any)=>a.file==='public'+mission.background&&a.prompt.length>100));hashes.add(createHash('sha256').update(b).digest('hex'));}assert.equal(hashes.size,3);});

test('menu score starts only with an unlocked audio context, respects music off, and stops when unfocused',()=>{const s=new Sound(true) as any;const tracks:string[]=[];let stopped=0;s.score={play:(id:string)=>tracks.push(id),stop:()=>stopped++};s.context={state:'suspended'};s.step(.1,false,false,false,true);assert.deepEqual(tracks,[]);s.context.state='running';s.step(.1,false,false,false,true);assert.deepEqual(tracks,['menu']);s.music=false;s.step(.1,false,false,false,true);assert.equal(tracks.length,1);s.music=true;s.step(.1,false,false,false,false);assert.ok(stopped>=3);});
test('the complete score replaces every old music file and never uses the menu master in gameplay',()=>{
 const m=JSON.parse(readFileSync(new URL('../docs/FLOW_MUSIC_REPLACEMENT.json',import.meta.url),'utf8'));
 assert.equal(m.previous_assets.length,23);assert.equal(m.installed_files.length,23);
 for(const previous of m.previous_assets){
  const current=m.installed_files.find((c:any)=>c.file===previous.file);assert.ok(current,previous.file);
  assert.notEqual(current.sha256,previous.sha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+current.file,import.meta.url))).digest('hex'),current.sha256);
 }
 const menu=m.generated.find((c:any)=>c.id==='menu');assert.ok(menu.prepared.rms<.1);
 for(const c of m.generated.filter((c:any)=>c.id!=='menu')){
  assert.notEqual(c.source,menu.source);assert.notEqual(c.sourceSha256,menu.sourceSha256);
 }
 const policy=JSON.parse(readFileSync(new URL('../docs/LEITMOTIF.json',import.meta.url),'utf8'));
 assert.equal(policy.inAllBackgroundTracks,false);assert.deepEqual(policy.recurrenceSeconds,[]);
});
test('pause and returning moods resume their own positions instead of repeating opening notes',async()=>{
 const old=fetch;globalThis.fetch=ok;
 try{const {ctx,nodes,score}=fixture();await score.play('menu');ctx.currentTime=5;score.stop();
 await score.play('river-explore');ctx.currentTime=12;await score.play('river-combat');ctx.currentTime=17;score.stop();
 ctx.currentTime=40;await score.play('river-combat');assert.equal(nodes.at(-1).starts[0][1],5);
 ctx.currentTime=42;await score.play('river-explore');assert.equal(nodes.at(-1).starts[0][1],7);
 ctx.currentTime=44;score.stop();await score.play('menu');assert.equal(nodes.at(-1).starts[0][1],5);
 score.stop();}finally{globalThis.fetch=old;}
});
