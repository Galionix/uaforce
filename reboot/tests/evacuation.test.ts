import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';
import {canBoardHelicopter} from '../src/game/evacuation.ts';
import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
function fixture(){const w=new World();w.mode='playing';w.enemies=[];w.mounts=[];w.allies=[];w.boxes=w.boxes.filter(b=>b.y<0);w.player.x=w.mission.exit;return w;}
function tick(w:World,n:number){for(let i=0;i<n;i++)w.step(1/60,IDLE);}
test('waiting on the ground never boards; a normal jump reaches the cabin and finishes extraction',()=>{
 const w=fixture();tick(w,600);assert.equal(w.evac.phase,'boarding');assert.equal(w.player.y,0);
 assert.equal(w.events.filter(e=>e.type==='evacCalled').length,1);assert.equal(w.events.some(e=>e.type==='boarded'),false);
 w.step(1/60,{...IDLE,jump:true});assert.equal(w.evac.phase,'boarding','pressing jump is not enough before reaching the picture');
 tick(w,15);assert.equal(w.evac.phase,'departing');assert.equal(w.events.filter(e=>e.type==='boarded').length,1);
 tick(w,150);assert.equal(w.mode,'won');
});
test('old wide trigger, rope, ground, ladder, roof standing and dead actors cannot board',()=>{
 const w=fixture(),e={x:w.player.x,y:3},a=w.actor;
 for(const patch of [{x:e.x+6,y:2,grounded:false},{x:e.x,y:.1,grounded:false},{x:e.x,y:2,grounded:true},{x:e.x,y:2,grounded:false,ladder:0},{x:e.x,y:2,grounded:false,hp:0},{x:e.x,y:5,grounded:false}]){
  Object.assign(a.body,{x:e.x,y:0,grounded:true,ladder:-1,hp:100},patch);assert.equal(canBoardHelicopter(a,e),false,JSON.stringify(patch));
 }
 Object.assign(a.body,{x:e.x,y:2,grounded:false,ladder:-1,hp:100});assert.equal(canBoardHelicopter(a,e),true);
 a.mounted={} as any;assert.equal(canBoardHelicopter(a,e),false,'jumping tank is not a fighter jumping into the cabin');
});
test('guest jumping into the cabin can extract the team while the nearer host stays on the ground',()=>{
 const w=fixture();const guest=w.addPlayer('lesya');guest.body.x=w.mission.exit+.4;tick(w,180);
 assert.equal(w.evac.phase,'boarding');w.stepPlayers(1/60,[IDLE,{...IDLE,jump:true}]);
 for(let i=0;i<20;i++)w.stepPlayers(1/60,[IDLE,IDLE]);assert.equal(w.evac.phase,'departing');
 const event=w.events.find(e=>e.type==='boarded')!;assert.equal(event.hero,'lesya');
 const remote=new World();applySnapshot(remote,JSON.parse(JSON.stringify(new SnapshotWriter(w).snapshot(1,[event]))));
 assert.equal(remote.evac.phase,'departing');assert.equal(remote.events[0].type,'boarded');
});
