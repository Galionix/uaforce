import test from 'node:test';
import assert from 'node:assert/strict';
import {survivalWorld,stepSurvival,waveBudget,endSurvival,SURVIVAL} from '../src/game/survival.ts';
import {World,IDLE} from '../src/game/world.ts';
import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
import {TANK,addMount,stepMounts} from '../src/game/mounts.ts';
const tick=(w:World,seconds:number)=>{for(let i=0;i<seconds*60;i++){for(const a of w.players)a.body.invulnerable=100;w.stepPlayers(1/60,[IDLE,IDLE]);w.events=[];}};
function clear(w:World){const s=w.survival!;s.phase='combat';s.pending=0;w.enemies=[];stepSurvival(w,1/60);}
test('survival arena isolates campaign, supports every hero, no extraction or story',()=>{
 const w=survivalWorld('lesya','franko');assert.equal(w.players.length,2);assert.equal(w.players[1].heroId,'franko');assert.equal(w.unlocked.length,11);assert.equal(w.survival!.phase,'break');
 tick(w,8.2);assert.equal(w.survival!.wave,1);assert.ok(w.survival!.elapsed<.25);assert.equal(w.evac.phase,'waiting');assert.equal(w.story,null);assert.equal(new World().survival,null);
});
test('wave budgets grow without a final wave; active population and memory stay bounded',()=>{
 assert.ok(waveBudget(10001,1)>waveBudget(10000,1));assert.ok(waveBudget(3,2)>waveBudget(3,1));
 const w=survivalWorld('shevchenko','lesya');w.survival!.wave=10000;w.survival!.timer=0;stepSurvival(w,1/60);
 for(let i=0;i<600;i++)stepSurvival(w,.5);
 assert.equal(w.enemies.length,SURVIVAL.duoCap);assert.ok(w.survival!.pending>0);w.enemies.forEach(e=>e.hp=0);stepSurvival(w,.5);assert.ok(w.enemies.length<=1);
});
test('pause and between-wave preparation never add leaderboard combat time',()=>{
 const w=survivalWorld();tick(w,4);assert.equal(w.survival!.elapsed,0);w.mode='paused';tick(w,5);assert.ok(Math.abs(w.time-4)<1e-9);assert.equal(w.survival!.elapsed,0);
 w.mode='playing';tick(w,5);const time=w.survival!.elapsed;assert.ok(time>.9&&time<1.1);clear(w);tick(w,2);assert.equal(w.survival!.elapsed,time+1/60);
});
test('solo has one life, downed actor cannot move or be hurt repeatedly; coop can recover',()=>{
 const solo=survivalWorld();solo.damagePlayer(1000);assert.equal(solo.mode,'lost');assert.equal(solo.survival!.phase,'ended');assert.equal(solo.events.filter(e=>e.type==='lost').length,1);solo.damagePlayer(1000);assert.equal(solo.events.filter(e=>e.type==='lost').length,1);
 const w=survivalWorld('shevchenko','lesya');w.damagePlayer(1000);assert.equal(w.players[0].lives,0);assert.equal(w.mode,'playing');const x=w.player.x;w.stepPlayers(1/60,[{...IDLE,move:1,fire:true},IDLE]);assert.equal(w.player.x,x);assert.equal(w.nearestPlayer(x,0).id,1);
 clear(w);assert.equal(w.players[0].body.hp,65);assert.equal(w.players[0].lives,1);assert.equal(w.players[0].body.energy,0);
 w.player.invulnerable=0;w.damagePlayer(1000);w.withPlayer(1,()=>{w.player.invulnerable=0;w.damagePlayer(1000);});assert.equal(w.mode,'lost');assert.equal(w.survival!.phase,'ended');
});
test('tank delayed until fifth clear, not refilled, survival-only shell nerf',()=>{
 const w=survivalWorld();for(let wave=1;wave<=4;wave++){w.survival!.wave=wave;clear(w);}assert.equal(w.mounts.length,0);
 w.survival!.wave=5;clear(w);assert.equal(w.mounts.length,1);assert.equal(w.mounts[0].armor,180);w.mounts[0].armor=10;w.survival!.wave=10;clear(w);assert.equal(w.mounts[0].armor,10);assert.equal(w.mounts.length,1);
 w.mounted=w.mounts[0];stepMounts(w,1/60,{...IDLE,fire:true},false);assert.equal(w.bullets[0].damage,65);assert.ok(w.mounted.cooldown>TANK.reload);
 const normal=new World();assert.equal(addMount(normal,10).armor,TANK.armor);
});
test('drops replenish ult and health with bounded pickups, co-op shares host snapshot',()=>{
 const w=survivalWorld('lesya','franko');tick(w,12);const enemy=w.enemies.find(e=>!e.vehicle)!;w.kills=34;w.damageEnemy(enemy,10000);assert.ok(w.ammoCrates.length);assert.ok(w.medkits.length);
 w.survival!.rank={id:crypto.randomUUID(),guestToken:crypto.randomUUID()};const writer=new SnapshotWriter(w);w.withPlayer(1,()=>{w.player.invulnerable=0;w.damagePlayer(1000);});const s=JSON.parse(JSON.stringify(writer.snapshot(1)));
 const guest=survivalWorld();applySnapshot(guest,s);assert.deepEqual(guest.survival,w.survival);assert.equal(guest.players[1].body.hp,0);assert.deepEqual(guest.ammoCrates,w.ammoCrates);assert.equal(guest.boxes.length,w.boxes.length);assert.ok(!JSON.stringify(s).includes('hostToken'));
 endSurvival(w,'disconnect');assert.equal(w.survival!.endReason,'disconnect');assert.equal(w.mode,'lost');
});

test('mixed entry points reach passive players instead of piling up behind cover forever',()=>{
 const w=survivalWorld('shevchenko','lesya');
 for(let i=0;i<60*70&&w.mode==='playing';i++){w.stepPlayers(1/60,[IDLE,IDLE]);w.events=[];}
 assert.equal(w.mode,'lost');assert.ok(w.survival!.elapsed<70);assert.ok(w.enemies.some(e=>e.x>22));assert.ok(w.enemies.some(e=>e.x<22));
});

test('downed partner does not become an invisible bullet shield',()=>{
 const w=survivalWorld('shevchenko','lesya');w.boxes=[];w.ladders=[];w.damagePlayer(1000);w.players[0].body.x=20;w.players[1].body.x=23;w.players[1].body.y=0;
 w.bullets.push({id:w.nextId(),x:18,y:1,vx:30,vy:0,life:1,friendly:false,damage:12});
 for(let i=0;i<15;i++)w.stepPlayers(1/60,[IDLE,IDLE]);assert.ok(w.players[1].body.hp<100);
});
