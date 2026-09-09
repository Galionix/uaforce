import test from 'node:test';
import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';
import {beginStory,skipStory,STORY_SCENES} from '../src/game/story-scenes.ts';
import {constrainTeam,teamCamera,SHARED_SCREEN} from '../src/game/shared-screen.ts';
import {addMount} from '../src/game/mounts.ts';
import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
function pair(){const w=new World(0);w.mode='playing';w.addPlayer();w.enemies=[];w.allies=[];w.mounts=[];w.ladders=[];w.boxes=w.boxes.filter(b=>b.y<0);return w;}
const tick=(w:World,n:number,actions=[IDLE,IDLE])=>{for(let i=0;i<n;i++)w.stepPlayers(1/60,actions);};
test('forward and backward movement stop at a shared edge without dragging the stationary partner',()=>{
 for(const dir of [-1,1]){const w=pair();w.players[0].body.x=60;w.players[1].body.x=60+dir*29.9;
  tick(w,180,[IDLE,{...IDLE,move:dir}]);assert.equal(w.players[0].body.x,60);assert.ok(Math.abs(w.players[1].body.x-60)<=SHARED_SCREEN.maxX+1e-8);assert.equal(w.players[1].move,0);
  const old=w.players[1].body.x;tick(w,30,[{...IDLE,move:dir},{...IDLE,move:dir}]);assert.ok((w.players[1].body.x-old)*dir>1,'catching up releases the leader');
 }
});
test('simultaneous opposite movement shares the remaining space; tank and vertical bounds use the same rule',()=>{
 const w=pair();w.players[0].body.x=40;w.players[1].body.x=69.9;const before=w.players.map(a=>({...a.body}));
 w.players[0].body.x-=1;w.players[1].body.x+=1;constrainTeam(w,before);
 assert.ok(Math.abs(w.players[0].body.x-39.95)<1e-8);assert.ok(Math.abs(w.players[1].body.x-69.95)<1e-8);
 const t=addMount(w,70);w.players[1].mounted=t;Object.assign(w.players[0].body,{x:40,y:0});Object.assign(w.players[1].body,{x:70,y:11.9});
 const b=w.players.map(a=>({...a.body}));w.players[1].body.x+=.1;w.players[1].body.y=13;constrainTeam(w,b);
 assert.equal(w.players[1].body.x,70);assert.equal(t.x,70);assert.equal(w.players[1].body.y,12);assert.equal(t.y,12);assert.equal(w.players[0].body.y,0);
});
test('both clients share the same camera, including when the story camera pans away',()=>{
 const w=pair();Object.assign(w.players[0].body,{x:60,y:0});Object.assign(w.players[1].body,{x:90,y:12});
 for(const desired of [undefined,{x:150,y:40},{x:2,y:0}]){
  w.selectPlayer(0);const c=teamCamera(w,desired);w.selectPlayer(1);assert.deepEqual(teamCamera(w,desired),c);
  for(const a of w.players){const x=a.body.x*16-(c.x*16-320),feet=266-a.body.y*16+Math.max(0,c.y*16-80);assert.ok(x>=32&&x<=608);assert.ok(feet-32>=10&&feet<=330);}
 }
});
test('a distant co-op checkpoint respawns beside the living partner on safe ground',()=>{
 const w=pair();w.players[0].body.x=70;w.players[1].body.x=72;w.players[1].checkpoint=3;
 w.withPlayer(1,()=>w.damagePlayer(100));assert.ok(Math.abs(w.players[1].body.x-70)<10);assert.equal(w.players[0].body.x,70);assert.equal(w.players[1].body.hp,100);
});
test('zone crossing starts a scene once; commands and damage simulation are suspended, actors and camera animate',()=>{
 const w=new World(0);w.mode='playing';w.player.x=7.95;
 w.step(1/60,{...IDLE,move:1});assert.equal(w.story?.id,'river-watch');
 const start=JSON.parse(JSON.stringify(w.story)),time=w.time,hp=w.player.hp,energy=w.player.energy;
 const guard=w.enemies.find(e=>e.id===w.story!.guardId)!,guardX=guard.x;
 const bullets=JSON.stringify(w.bullets),boxes=JSON.stringify(w.boxes);
 tick(w,50,[{...IDLE,move:-1,fire:true,ultimate:true,special:true,jump:true,interact:true}]);
 assert.equal(w.time,time);assert.equal(w.player.hp,hp);assert.equal(w.player.energy,energy);assert.equal(JSON.stringify(w.bullets),bullets);assert.equal(JSON.stringify(w.boxes),boxes);
 assert.ok(guard.x>guardX);assert.notEqual(w.story!.camera.x,start.camera.x);assert.equal(w.player.x,start.players[0].x);
 for(let i=0;i<400&&w.story;i++)w.step(1/60,{...IDLE,fire:true,ultimate:true});assert.equal(w.story,null);assert.equal(w.player.energy,energy);assert.ok(w.player.x>start.players[0].x);assert.ok(w.player.invulnerable>0);
 assert.equal(beginStory(w,'river-watch'),false);const endX=w.player.x;w.step(1/60,{...IDLE,jump:true});assert.ok(w.player.vy>0);tick(w,20,[{...IDLE,move:1}]);assert.ok(w.player.x>endX+.5);
});
test('pause freezes the scene, skip exits through the flag, and co-op snapshots own the timeline',()=>{
 const w=new World(0);w.mode='playing';w.addPlayer();assert.ok(beginStory(w,'river-watch'));tick(w,30);
 w.mode='paused';const frozen=JSON.stringify(w);tick(w,60);assert.equal(JSON.stringify(w),frozen);
 w.mode='playing';const writer=new SnapshotWriter(w),guest=new World();applySnapshot(guest,JSON.parse(JSON.stringify(writer.snapshot(1))));
 assert.deepEqual(guest.story,w.story);assert.deepEqual(guest.storyDone,w.storyDone);assert.deepEqual(teamCamera(guest),teamCamera(w));
 skipStory(w);assert.equal(w.story!.exit,0);tick(w,20);assert.ok(w.story);tick(w,24);assert.equal(w.story,null);assert.equal(w.mode,'playing');
 applySnapshot(guest,JSON.parse(JSON.stringify(writer.snapshot(2))));assert.equal(guest.story,null);assert.deepEqual(guest.players.map(a=>a.body.x),w.players.map(a=>a.body.x));
});
test('story data has finite shots, Ukrainian captions and valid real cast bindings; no guard means no softlock',()=>{
 for(const scene of STORY_SCENES){const w=new World(scene.mission);w.mode='playing';assert.ok(beginStory(w,scene.id));assert.ok(scene.beats.every(b=>b.seconds>0&&b.seconds<10&&(b.caption?.length??0)<80));tick(w,400);assert.equal(w.story,null);}
 const w=pair();assert.equal(beginStory(w,'river-watch'),false);assert.equal(w.story,null);assert.deepEqual(w.storyDone,[]);
});
test('authored tracks give each player and several guards independent animated directions',()=>{
 const scene={id:'test-ensemble',mission:0,triggerX:8,guardPost:15,extraGuards:[24],beats:[{seconds:1,camera:{x:25,y:5},players:{0:{jump:true},1:{dx:-1,pose:'cast' as const}},enemies:{0:{dx:1},1:{dx:-1,pose:'aim' as const}}}]};
 STORY_SCENES.push(scene);
 try{const w=new World();w.mode='playing';w.addPlayer('lesya');assert.ok(beginStory(w,scene.id));const starts=w.story!.cast.map(e=>e.x);tick(w,12);
 assert.ok(w.players[0].body.y>0);assert.equal(w.players[1].body.y,0);assert.equal(w.players[1].body.cast,.5);
 const cast=w.story!.cast.map(c=>w.enemies.find(e=>e.id===c.id)!);assert.ok(cast[0].x>starts[0]);assert.ok(cast[1].x<starts[1]);assert.ok(cast[1].infantry!.attack>0);
 skipStory(w);tick(w,44);assert.equal(w.story,null);assert.equal(w.players[1].body.cast,0);assert.ok(cast.every(e=>e.infantry!.attack===0));
 }finally{STORY_SCENES.pop();}
});
