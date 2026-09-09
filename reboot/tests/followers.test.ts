import test from 'node:test';
import assert from 'node:assert/strict';
import {World,IDLE,type Enemy} from '../src/game/world.ts';
import {summonFollowers, FOLLOWER_WEAPONS} from '../src/game/followers.ts';
function fixture(kind:'infantry'|'turret'='infantry'){
 const id=kind==='infantry'?'zelensky':'it-army';const w=new World(0,[id],id);w.mode='playing';w.boxes=w.boxes.filter(b=>b.y<0);w.enemies=[];w.allies=[];w.medkits=[];w.ladders=[];w.player.x=20;w.player.invulnerable=999;
 summonFollowers(w,kind);return w;
}
function run(w:World,seconds:number,move=0){for(let i=0;i<Math.round(seconds*60);i++)w.step(1/60,{...IDLE,move});}
function enemy(w:World,x:number,y=0){const e:Enemy={id:w.nextId(),x,y,hp:10000,maxHp:10000,cooldown:999,windup:0,dir:-1,anchor:x,heavy:false};w.enemies.push(e);return e;}
function box(w:World,x:number,y:number,width:number,height:number,kind:'wall'|'platform'='wall'){w.boxes.push({id:w.nextId(),x,y,w:width,h:height,hp:Infinity,maxHp:Infinity,kind});}
for(const kind of ['infantry','turret'] as const){
 test(kind+' follows, settles with spacing, and turns back with its owner',()=>{
  const w=fixture(kind);run(w,2,1);run(w,2);const positions=w.followers.map(f=>f.x);
  for(const f of w.followers)assert.ok(w.player.x-f.x>=1.2&&w.player.x-f.x<5);
  run(w,2);w.followers.forEach((f,i)=>assert.equal(f.x,positions[i],'no idle jitter'));
  run(w,2,-1);run(w,2);for(const f of w.followers)assert.ok(f.x-w.player.x>=1.2&&f.x-w.player.x<5);
 });
 test(kind+' acquires, approaches, attacks, reloads and returns after target death',()=>{
  const w=fixture(kind),f=w.followers[0],e=enemy(w,f.x+13);w.followers=[f];const initial=f.x;run(w,.3);assert.ok(f.x>initial);assert.equal(f.state,'approach');
  run(w,1.2);assert.ok(e.hp<10000);assert.ok(Math.abs(f.x-e.x)<=8);assert.ok(Math.abs(f.x-e.x)>2);
  let reload=false;for(let i=0;i<480;i++){w.step(1/60,IDLE);if(f.reloading>0){reload=true;assert.equal(f.ammo,0);const count=w.events.filter(e=>e.type==='supportShot').length;run(w,.2);assert.equal(w.events.filter(e=>e.type==='supportShot').length,count);break;}}
  assert.ok(reload,'magazine actually runs out');e.hp=0;run(w,FOLLOWER_WEAPONS[kind].reloadTime+3);assert.equal(f.ammo,FOLLOWER_WEAPONS[kind].magazine);assert.equal(f.state,'follow');assert.ok(Math.abs(w.player.x-f.x)<5);
 });
 test(kind+' uses ladders up and down and walks over low cover',()=>{
  const w=fixture(kind),f=w.followers[0];w.followers=[f];w.ladders=[{x:23,bottom:0,top:4.5}];box(w,25,4,8,.5,'platform');w.player.x=27;w.player.y=4.5;w.player.vy=0;
  run(w,4);assert.ok(Math.abs(f.y-4.5)<.1,JSON.stringify(f));assert.ok(f.x>23);
  w.player.x=18;w.player.y=0;run(w,5);assert.equal(f.y,0);assert.ok(f.x<22);
  w.ladders=[];box(w,22,0,1,1.2);w.player.x=29;run(w,4);assert.ok(f.x>23,'jump over cover');
 });
}
test('pursuit has a leash, ignores far enemies and reacquires only after returning',()=>{
 const w=fixture(),f=w.followers[0];w.followers=[f];enemy(w,85);run(w,1);assert.equal(f.target,undefined);
 const e=enemy(w,30);run(w,.5);assert.equal(f.target,e.id);w.player.x=65;run(w,.1);assert.equal(f.state,'return');assert.equal(f.target,undefined);run(w,6);assert.ok(Math.abs(f.x-w.player.x)<5);assert.equal(f.state,'follow');
});
test('enemy projectiles hit the nearest companion and cannot pass through to the owner',()=>{
 const w=fixture(),f=w.followers[0];w.followers=[f];f.x=23;
 w.bullets.push({id:w.nextId(),x:25,y:1,vx:-60,vy:0,life:1,friendly:false,damage:25});run(w,.1);assert.equal(f.hp,35);assert.equal(w.player.hp,100);assert.equal(w.bullets.length,0);
 w.damageFollower(f,100);assert.equal(f.hp,0);const before=w.events.filter(e=>e.type==='supportShot').length;enemy(w,26);run(w,1);assert.equal(w.followers.length,0);assert.equal(w.events.filter(e=>e.type==='supportShot').length,before);assert.equal(w.events.filter(e=>e.type==='followerDown').length,1);
});
test('enemies aim at a nearer follower even while the owner is cloaked',()=>{
 const w=fixture(),f=w.followers[0];w.followers=[f];f.x=24;w.player.cloak=10;const e=enemy(w,27);e.cooldown=0;run(w,2);assert.ok(f.hp<60);assert.equal(w.player.hp,100);
});
test('friendly bullets and allied abilities spare followers; dangerous barrel blasts do damage',()=>{
 const w=fixture(),f=w.followers[0];w.followers=[f];w.bullets.push({id:w.nextId(),x:f.x-2,y:1,vx:40,vy:0,life:1,friendly:true,damage:90});run(w,.1);assert.equal(f.hp,60);w.explode(f.x,f.y+1,3,90);assert.equal(f.hp,60);w.explode(f.x,f.y+1,3,90,true);assert.equal(f.hp,0);
});
test('reinforcement cap preserves survivors and replaces only casualties',()=>{
 const w=fixture(),survivor=w.followers[0];survivor.hp=25;w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,1);assert.equal(w.followers.length,2);
 w.damageFollower(w.followers[1],100);w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,0);assert.equal(w.followers.length,2);assert.equal(survivor.hp,25);assert.ok(w.followers.some(f=>f.hp===60&&f.slot===1));
});
test('mobile hack survives losing radio, enforces capacity, and allows replacement after death',()=>{
 const w=fixture('turret');w.followers=[];const node={id:w.nextId(),x:23,y:0,w:1.6,h:2.2,hp:150,maxHp:150,kind:'radio' as const};w.boxes.push(node);
 w.step(1/60,{...IDLE,special:true});assert.equal(w.followers.length,1);assert.equal(w.followers[0].source,node.id);node.hp=0;run(w,1);assert.equal(w.followers.length,1);
 w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,1);w.damageFollower(w.followers[0],200);node.hp=150;w.step(1/60,{...IDLE,special:true});assert.equal(w.followers.length,1);assert.equal(w.specialCharges,0);
});
test('pause freezes AI; respawn and rescued hero change clear companions',()=>{
 const w=fixture();enemy(w,29);run(w,.3);w.mode='paused';const state=JSON.stringify(w.followers);run(w,2);assert.equal(JSON.stringify(w.followers),state);w.mode='playing';w.player.invulnerable=0;w.damagePlayer(100);assert.equal(w.followers.length,0);
 summonFollowers(w,'infantry');w.allies=[{x:w.player.x,rescued:false}];w.step(1/60,{...IDLE,interact:true});assert.equal(w.followers.length,0);
});
test('cover blocks allied shots and bodies; a tall sealed wall is not bypassed by teleporting',()=>{
 const w=fixture(),f=w.followers[0];w.followers=[f];box(w,22,0,1,10);const e=enemy(w,27);run(w,5);assert.ok(f.x<21.2);assert.equal(e.hp,10000);assert.equal(w.events.filter(e=>e.type==='supportShot').length,0);
});
