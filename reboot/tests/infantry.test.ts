import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';import {INFANTRY,addInfantry,type InfantryKind} from '../src/game/infantry.ts';import {launchHostile} from '../src/game/enemies.ts';
function setup(){const w=new World();w.mode='playing';w.enemies=[];w.allies=[];w.followers=[];w.mounts=[];w.ladders=[];w.boxes=[{id:9999,x:70,y:-2,w:140,h:2,hp:Infinity,maxHp:Infinity,kind:'earth'}];w.player.x=10;w.player.invulnerable=999;return w;}
const run=(w:World,t:number)=>{for(let i=0;i<Math.round(t*60);i++)w.step(1/60,IDLE);};
test('every campaign mixes roles gradually, with no demolition unit at the initial spawn',()=>{for(let i=0;i<6;i++){const w=new World(i);assert.ok(new Set(w.enemies.flatMap(e=>e.infantry?[e.infantry.kind]:[])).size>=6);assert.ok(w.enemies.filter(e=>e.infantry?.kind==='demolition').every(e=>e.x>30));}});
test('sighting produces one local alert and reaction delay before pursuit',()=>{const w=setup(),e=addInfantry(w,'rifle',23);run(w,.3);assert.equal(e.infantry!.state,'alert');assert.equal(e.x,23);assert.equal(w.bullets.length,0);run(w,1.4);assert.ok(e.x<21);assert.equal(w.events.filter(x=>x.type==='enemyAlert').length,1);run(w,2);assert.ok(w.events.some(x=>x.type==='enemyShot'));});
test('opaque cover prevents detection and shooting; uncovering causes detection',()=>{const w=setup(),e=addInfantry(w,'rifle',18);const wall={id:9000,x:14,y:0,w:1,h:5,hp:200,maxHp:200,kind:'wall' as const};w.boxes.push(wall);run(w,3);assert.equal(e.infantry!.memory,0);assert.equal(w.events.filter(x=>x.type==='enemyShot').length,0);wall.hp=0;run(w,.2);assert.ok(e.infantry!.alert>0);});
test('lost sight uses last seen position rather than tracking through walls forever',()=>{const w=setup(),e=addInfantry(w,'rifle',19);run(w,.7);const seen=e.infantry!.lastX;w.player.cloak=20;w.player.x=45;run(w,2);assert.equal(e.infantry!.lastX,seen);assert.equal(w.events.filter(x=>x.type==='enemyShot').length,0);run(w,4);assert.equal(e.infantry!.state,'patrol');});
test('scout warns only its local squad, not the entire map',()=>{const w=setup(),scout=addInfantry(w,'scout',24),near=addInfantry(w,'rifle',30),far=addInfantry(w,'rifle',60);run(w,.1);assert.ok(scout.infantry!.memory>0);assert.ok(near.infantry!.alert>0);assert.equal(far.infantry!.memory,0);});
for(const kind of Object.keys(INFANTRY).filter(x=>x!=='demolition') as InfantryKind[])test(kind+' closes distance, fires finite bursts and really reloads',()=>{const w=setup(),spec=INFANTRY[kind],e=addInfantry(w,kind,10+spec.range+2);let reload=false,shots=0;for(let i=0;i<60*16;i++){w.events=[];w.step(1/60,IDLE);reload ||=e.infantry!.reloading>0;shots+=w.events.filter(x=>x.type==='enemyShot'||x.type==='enemySniperShot').length;for(const b of w.bullets)if(!b.friendly)assert.ok(b.life*Math.hypot(b.vx,b.vy)<=spec.range+1e-5);}assert.ok(e.x<10+spec.range+1);assert.ok(shots>0);assert.ok(reload);});
test('leaving attack range during aim cancels the shot, even when still visible',()=>{const w=setup(),e=addInfantry(w,'sniper',22);run(w,.8);assert.ok(e.windup>0);w.player.x=4;run(w,.8);assert.equal(w.events.filter(x=>x.type==='enemySniperShot').length,0);assert.ok(e.x<22);});
test('expired rifle rounds cannot hit a remote actor on the same horizontal line',()=>{const w=setup(),e=addInfantry(w,'rifle',18);run(w,1.2);assert.ok(w.bullets.length);w.player.x=1;w.player.invulnerable=0;e.hp=0;run(w,2);assert.equal(w.player.hp,100);assert.equal(w.bullets.length,0);});
test('demolition rushes, telegraphs a locked fuse, can be dodged and killed before detonation',()=>{const w=setup(),e=addInfantry(w,'demolition',18);run(w,1.9);assert.ok(e.infantry!.fuse>=0);assert.ok(w.events.some(x=>x.type==='enemyFuse'));w.player.invulnerable=0;w.player.x=3;run(w,1);assert.equal(e.hp,0);assert.equal(w.player.hp,100);assert.equal(w.events.filter(x=>x.type==='hostileBlast').length,1);
 const w2=setup(),e2=addInfantry(w2,'demolition',11.5);run(w2,.7);w2.damageEnemy(e2,100);run(w2,2);assert.equal(w2.events.filter(x=>x.type==='hostileBlast').length,0);assert.equal(w2.kills,1);});
test('demolition blast can hurt the player but cover shields them',()=>{const w=setup(),e=addInfantry(w,'demolition',11.2);run(w,.7);w.player.invulnerable=0;run(w,1);assert.equal(w.player.hp,62);assert.equal(e.hp,0);});
test('pursuers climb an available ladder to reach an elevated target',()=>{const w=setup(),e=addInfantry(w,'assault',16);w.player.y=4;w.boxes.push({id:9000,x:10,y:3.5,w:4,h:.5,hp:100,maxHp:100,kind:'platform'});w.ladders=[{x:13,bottom:0,top:4}];e.infantry!.memory=5;e.infantry!.lastX=10;e.infantry!.lastY=4;run(w,2.6);assert.ok(e.y>3.5,JSON.stringify(e));});
test('shield blocks frontal bullets, can break, and does not block a rear shot',()=>{const w=setup(),e=addInfantry(w,'shield',18);e.dir=-1;const shoot=(x:number,vx:number)=>{w.bullets.push({id:w.nextId(),x,y:1,vx,vy:0,life:.2,friendly:true,damage:40});w.step(.05,IDLE);};shoot(16,50);assert.equal(e.hp,INFANTRY.shield.hp);assert.equal(e.infantry!.shield,40);shoot(20,-50);assert.equal(e.hp,INFANTRY.shield.hp-40);});
test('pause freezes pursuit, fuse and magazines',()=>{const w=setup();addInfantry(w,'demolition',12);addInfantry(w,'gunner',20);run(w,.8);w.mode='paused';const before=JSON.stringify(w);run(w,3);assert.equal(JSON.stringify(w),before);});
test('shells and rockets have hard travel caps even when aimed across the entire map',()=>{const w=setup(),e=addInfantry(w,'rifle',20);for(const kind of ['shell','rocket'] as const){launchHostile(w,e,kind,200,1);const b=w.bullets.at(-1)!;assert.ok(b.life*Math.hypot(b.vx,b.vy)<=(kind==='shell'?19:26)+.001);}});

test('unaware infantry patrols both ways with pauses inside its post',()=>{
 const w=setup();w.player.cloak=999;const e=addInfantry(w,'rifle',50),xs:number[]=[],dirs=new Set<number>();let stopped=false;
 for(let i=0;i<60*12;i++){w.step(1/60,IDLE);xs.push(e.x);if(e.infantry!.moving)dirs.add(e.dir);stopped ||=e.infantry!.patrolWait>0;}
 assert.ok(Math.max(...xs)-Math.min(...xs)>4);assert.deepEqual([...dirs].sort(),[-1,1]);assert.ok(stopped);
 assert.ok(xs.every(x=>x>=46.4&&x<=53.6));assert.equal(w.events.some(e=>e.type==='enemyShot'),false);
});
test('patrol turns before roof edges, walls and newly destroyed footing instead of jumping',()=>{
 for(const roof of [false,true]){
  const w=setup();w.player.cloak=999;const y=roof?4:0,e=addInfantry(w,'rifle',50,y);
  if(roof)w.boxes.push({id:9001,x:50,y:3.5,w:4,h:.5,hp:100,maxHp:100,kind:'platform'});
  else w.boxes.push({id:9001,x:52,y:0,w:1,h:4,hp:100,maxHp:100,kind:'wall'});
  for(let i=0;i<60*10;i++){w.step(1/60,IDLE);assert.equal(e.y,y);assert.equal(e.infantry!.vy,0);if(roof)assert.ok(e.x>48&&e.x<52);else assert.ok(e.x<51.5);}
 }
 const w=setup();w.player.cloak=999;w.boxes=[];
 for(let x=45;x<=55;x++)w.boxes.push({id:x,x:x+.5,y:-1,w:1,h:1,hp:100,maxHp:100,kind:'earth'});
 const e=addInfantry(w,'rifle',50);run(w,.1);w.boxes.find(b=>b.x===51.5)!.hp=0;
 for(let i=0;i<600;i++){w.step(1/60,IDLE);assert.equal(e.y,0);assert.ok(e.x<51);}
});
test('hearing behind cover causes one questioning investigation without seeing or shooting the player',()=>{
 const w=setup(),e=addInfantry(w,'rifle',20);w.boxes.push({id:9000,x:15,y:0,w:1,h:5,hp:200,maxHp:200,kind:'wall'});
 w.emit('shot',12,1);run(w,.2);assert.equal(e.infantry!.state,'suspicious');assert.equal(e.infantry!.memory,0);
 assert.equal(w.events.filter(e=>e.type==='enemySuspect').length,1);
 run(w,1);assert.equal(w.events.filter(e=>e.type==='enemySuspect').length,1);assert.equal(w.events.some(e=>e.type==='enemyShot'),false);
 run(w,2);assert.equal(e.infantry!.state,'patrol');assert.equal(w.noises.length,0,'expired noise cannot retrigger forever');
 w.boxes.find(b=>b.id===9000)!.hp=0;run(w,.1);assert.ok(e.infantry!.alert>0);assert.equal(e.infantry!.suspicion,0);assert.ok(w.events.some(e=>e.type==='enemyAlert'));
});
test('quiet and distant players do not magically raise suspicion, and pause freezes patrol',()=>{
 const w=setup();w.player.cloak=999;const e=addInfantry(w,'scout',50);w.emit('shot',5,1);run(w,3);
 assert.equal(w.events.some(e=>e.type==='enemySuspect'),false);w.mode='paused';const before=JSON.stringify(e);run(w,3);assert.equal(JSON.stringify(e),before);
});
