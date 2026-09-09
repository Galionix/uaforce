import test from 'node:test';
import assert from 'node:assert/strict';
import { World, IDLE, segmentHit } from '../src/game/world.ts';
test('swept shots intersect thin cover before a target behind it',()=>{
  assert.equal(segmentHit(0,1,20,1,4,.5,4.1,1.5),.2);
  assert.equal(segmentHit(0,2,20,2,4,.5,4.1,1.5),null);
});
test('pause freezes combat, movement, cooldowns and mission time',()=>{
  const w=new World();w.mode='paused';const before=JSON.stringify(w);w.step(1/60,{...IDLE,move:1,fire:true});assert.equal(JSON.stringify(w),before);
});
test('cover blocks walking; jumping lands on platforms without falling through',()=>{
  const w=new World();w.mode='playing';w.enemies=[];
  for(let i=0;i<150;i++)w.step(1/60,{...IDLE,move:1});
  assert.ok(w.player.x<9.2);
  w.player.x=18;w.player.y=3.5;w.player.vy=-1;
  for(let i=0;i<60;i++)w.step(1/60,IDLE);
  assert.ok(Math.abs(w.player.y-2.55)<1e-8);assert.equal(w.player.grounded,true);
});
test('one interact rescues an ally exactly once without restoring the ultimate',()=>{
  const w=new World();w.mode='playing';w.player.x=29;w.player.energy=0;
  w.step(1/60,{...IDLE,interact:true});w.step(1/60,{...IDLE,interact:true});
  assert.equal(w.rescued,1);assert.equal(w.events.filter(e=>e.type==='rescue').length,1);assert.equal(w.player.energy,0);
});
test('extraction waits for commander then flies in and leaves without mandatory rescue or radio',()=>{
  const w=new World();w.mode='playing';w.player.x=w.mission.exit;w.step(1/60,{...IDLE,interact:true});assert.equal(w.mode,'playing');
  w.enemies.find(e=>e.heavy)!.hp=0;
  for(let i=0;i<360;i++)w.step(1/60,IDLE);assert.equal(w.mode,'won');assert.equal(w.rescued,0);assert.equal(w.radioDestroyed,false);
});
test('damage uses checkpoint, invulnerability and finite lives',()=>{
  const w=new World();w.mode='playing';w.checkpoint=44;w.damagePlayer(100);
  assert.equal(w.player.x,44);assert.equal(w.lives,2);w.damagePlayer(100);assert.equal(w.lives,2);
  w.player.invulnerable=0;w.damagePlayer(100);w.player.invulnerable=0;w.damagePlayer(100);assert.equal(w.mode,'lost');assert.equal(w.lives,0);
});
test('operation is completable through movement, jump, fire, special and interact',()=>{
 const w=new World(0,['shevchenko'],'shevchenko',()=>0);w.mode='playing';let lastX=w.player.x,blocked=0;
 for(let i=0;i<60*180&&(w.mode==='playing'||w.mode==='cinematic');i++){
  if(w.mode==='cinematic'){w.finishCinematic();continue;}
  const p=w.player;blocked=Math.abs(p.x-lastX)<.01?blocked+1:0;lastX=p.x;
  const commander=w.enemies.find(e=>e.heavy&&e.hp>0&&Math.abs(e.x-p.x)<12);
  w.step(1/60,{move:commander?(Math.abs(commander.x-p.x)>3||p.facing!==Math.sign(commander.x-p.x)?Math.sign(commander.x-p.x):0):p.x>w.mission.exit?0:1,jump:blocked>50&&p.grounded,fire:true,special:w.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<6),interact:true});
 }
 assert.equal(w.rescued,w.allies.length);
  assert.equal(w.mode,'won',JSON.stringify({x:w.player.x,lives:w.lives,rescued:w.rescued,radio:w.radioDestroyed,kills:w.kills,time:w.time}));
});

test('shots stay horizontal, retain facing and rise only with the player',()=>{
  const w=new World();w.mode='playing';w.enemies=[];w.boxes=[];
  w.step(1/60,{...IDLE,move:-1});w.step(1/60,{...IDLE,fire:true});
  const first=w.bullets[0];assert.ok(first.vx<0);assert.equal(first.vy,0);const height=first.y;
  for(let i=0;i<Math.ceil(w.hero.cooldown*60);i++)w.step(1/60,{...IDLE,jump:i===0});
  w.step(1/60,{...IDLE,fire:true});const second=w.bullets.at(-1)!;
  assert.ok(second.vx<0);assert.equal(second.vy,0);assert.ok(second.y>height+1);
});
test('ladders reach upper floors and release back into gravity',()=>{
  const w=new World();w.mode='playing';w.enemies=[];w.player.x=18;
  for(let i=0;i<110;i++)w.step(1/60,{...IDLE,climb:1});
  assert.ok(w.player.y>=w.ladders[0].top-.1);w.step(1/60,{...IDLE,move:1});
  for(let i=0;i<90;i++)w.step(1/60,IDLE);
  assert.ok(w.player.y<w.ladders[0].top);
});
test('barrel explosions destroy earth and its collision disappears',()=>{
  const w=new World(0,['shevchenko','franko'],'franko');w.mode='playing';w.enemies=[];w.player.x=8;
  const ground=w.boxes.filter(b=>b.kind==='earth'&&b.y===-1&&b.x>8&&b.x<13);
  w.boxes=w.boxes.filter(b=>b.y<0);w.boxes.push({id:900,x:10,y:0,w:1,h:1.2,hp:20,maxHp:20,kind:'barrel'});
  w.step(1/60,{...IDLE,fire:true});
  for(let i=0;i<30;i++)w.step(1/60,IDLE);
  assert.ok(ground.some(b=>b.hp<=0));
  for(let i=0;i<25;i++)w.step(1/60,{...IDLE,move:1});
  assert.ok(w.player.y<0);assert.ok(w.player.y>=-2);
});
test('jump detaches from ladder even while climb is held and cannot immediately recapture',()=>{
  const w=new World();w.mode='playing';w.enemies=[];w.player.x=18;
  for(let i=0;i<35;i++)w.step(1/60,{...IDLE,climb:1});
  const y=w.player.y;w.step(1/60,{...IDLE,climb:1,jump:true});
  assert.ok(w.player.vy>10,'ladder must not overwrite jump velocity');assert.ok(w.player.y>y);
  w.step(1/60,{...IDLE,climb:1,move:1});assert.ok(w.player.x>18,'horizontal jump must leave ladder');assert.ok(w.player.vy>0);
});
test('releasing stick on ladder holds position without falling or jitter',()=>{
 const w=new World();w.mode='playing';w.enemies=[];w.player.x=18;
 for(let i=0;i<35;i++)w.step(1/60,{...IDLE,climb:1});const y=w.player.y;
 for(let i=0;i<20;i++)w.step(1/60,IDLE);assert.equal(w.player.y,y);
});
