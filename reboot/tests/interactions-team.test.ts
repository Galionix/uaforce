import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE,type Box} from '../src/game/world.ts';
import {interactionTarget,TEAM_BOOST} from '../src/game/interactions.ts';
import {addInfantry} from '../src/game/infantry.ts';
import {addMount} from '../src/game/mounts.ts';
import {SnapshotWriter,applySnapshot,RemoteInput} from '../src/game/coop-state.ts';
const stage=(coop=false)=>{const w=new World();w.mode='playing';w.storyDone=['river-watch'];w.enemies=[];w.allies=[];w.mounts=[];w.medkits=[];w.ammoCrates=[];w.ladders=[];w.boxes=[{id:w.nextId(),x:50,y:-3,w:100,h:3,hp:Infinity,maxHp:Infinity,kind:'earth'}];w.player.x=20;if(coop)w.addPlayer('lesya');return w;};
function barrel(w:World,x=21){const b:Box={id:w.nextId(),x,y:0,w:1,h:1,hp:25,maxHp:25,kind:'barrel'};w.boxes.push(b);return b;}
const tick=(w:World,n:number,actions=[IDLE,IDLE])=>{for(let i=0;i<n;i++)w.stepPlayers(1/60,actions);};
test('thrown barrel clears blast radius even when the thrower runs forward; drop remains vertical',()=>{
 for(const dir of [-1,1]){const w=stage(),b=barrel(w,20+dir);w.player.facing=dir;tick(w,1,[{...IDLE,interact:true}]);tick(w,1);tick(w,1,[{...IDLE,interact:true}]);for(let i=0;i<180&&b.hp>0;i++)tick(w,1,[{...IDLE,move:dir}]);assert.equal(b.hp,0);assert.ok(Math.abs(b.x-w.player.x)>4,`gap ${Math.abs(b.x-w.player.x)}`);assert.equal(w.player.hp,100);}
 const w=stage(),b=barrel(w);tick(w,1,[{...IDLE,interact:true}]);tick(w,1);tick(w,1,[{...IDLE,interact:true,climb:-1}]);assert.ok(b.vy!<0);assert.ok(Math.abs(b.vx!)<2);
});
test('nearby hint follows interaction priority, vanishes with distance and excludes broken equipment',()=>{
 const w=stage(true),b=barrel(w);assert.equal(interactionTarget(w)?.kind,'barrel');const t=addMount(w,21);assert.equal(interactionTarget(w)?.kind,'tank');w.allies=[{x:20,rescued:false}];assert.equal(interactionTarget(w)?.kind,'rescue');w.allies=[];t.armor=0;b.hp=0;assert.equal(interactionTarget(w)?.kind,'highFive');w.player.x=40;assert.equal(interactionTarget(w),undefined);w.mode='paused';assert.equal(interactionTarget(w),undefined);
});
test('either player offers first, waits, and needs a fresh press from the other player',()=>{
 for(const id of [0,1]){const w=stage(true),offer=[IDLE,IDLE].map((a,i)=>({...a,interact:i===id}));
  tick(w,1,offer);assert.equal(w.highFive.offeredBy,id);assert.equal(w.highFive.left,0);assert.equal(w.highFive.cooldown,0);assert.deepEqual(w.events.map(e=>e.sfx),['team-hand-raise']);
  const positions=w.players.map(a=>a.body.x);tick(w,120,offer);assert.deepEqual(w.players.map(a=>a.body.x),positions);assert.equal(w.highFive.left,0);
  tick(w,1,[{...IDLE,interact:true},{...IDLE,interact:true}]);assert.equal(w.highFive.left,5);assert.equal(w.highFive.offeredBy,-1);assert.equal(w.events.filter(e=>e.type==='highFive').length,1);
  tick(w,1300,[{...IDLE,interact:true},{...IDLE,interact:true}]);assert.equal(w.events.filter(e=>e.type==='highFive').length,1);
 }
 const w=stage(true),b=barrel(w);tick(w,1,[{...IDLE,interact:true},IDLE]);assert.equal(w.heldBarrel,b.id);assert.equal(w.highFive.offeredBy,-1);
});
test('partner can approach an invitation but proximity and a pre-held button never confirm it',()=>{
 const w=stage(true);w.players[1].body.x=25;tick(w,1,[{...IDLE,interact:true},IDLE]);assert.equal(w.highFive.offeredBy,0);
 tick(w,35,[IDLE,{...IDLE,move:-1,interact:true}]);assert.ok(w.players[1].body.x-w.player.x<TEAM_BOOST.range);assert.equal(w.highFive.left,0);
 tick(w,1);tick(w,1,[IDLE,{...IDLE,move:-1,interact:true}]);assert.equal(w.highFive.left,5);
});
test('an offer cancels on deliberate movement, repeat press, damage or separation without spending cooldown',()=>{
 for(const mode of ['move','jump','fire','repeat','damage','far']){const w=stage(true);tick(w,1,[{...IDLE,interact:true},IDLE]);tick(w,1);
  if(mode==='damage'){w.player.invulnerable=0;w.damagePlayer(1);}else if(mode==='far'){w.players[1].body.x=40;tick(w,1);}else tick(w,1,[{...IDLE,move:mode==='move'?1:0,jump:mode==='jump',fire:mode==='fire',interact:mode==='repeat'},IDLE]);
  assert.equal(w.highFive.offeredBy,-1,mode);assert.equal(w.highFive.left,0);assert.equal(w.highFive.cooldown,0);assert.equal(w.events.filter(e=>e.type==='highFive').length,0);
 }
});
test('high-five cannot occur through walls, in the air, in tanks or during a story',()=>{
 const w=stage(true);w.boxes.push({id:w.nextId(),x:20.5,y:0,w:.1,h:3,hp:100,maxHp:100,kind:'wall'});assert.equal(interactionTarget(w),undefined);w.boxes.pop();w.players[1].body.grounded=false;assert.equal(interactionTarget(w),undefined);w.players[1].body.grounded=true;w.players[1].mounted=addMount(w,21);assert.notEqual(interactionTarget(w)?.kind,'highFive');
});
test('boost slows hostile projectiles and preserves their finite range; friendly bullets and players retain speed',()=>{
 const w=stage(true);tick(w,1,[{...IDLE,interact:true},{...IDLE,interact:true}]);w.bullets=[{id:1,x:40,y:8,vx:10,vy:0,life:2,friendly:false,damage:1},{id:2,x:40,y:10,vx:10,vy:0,life:2,friendly:true,damage:1}];tick(w,60,[{...IDLE,move:1},{...IDLE,move:1}]);assert.ok(Math.abs(w.bullets[0].x-43)<.01);assert.ok(Math.abs(w.bullets[1].x-50)<.01);assert.ok(Math.abs(w.player.x-27)<.05);assert.ok(Math.abs(w.highFive.left-4)<.01);
 tick(w,250);assert.equal(w.highFive.left,0);tick(w,180);assert.equal(w.bullets.length,0);
});
test('pause and story freeze boost timers and snapshots preserve the animation and slow state',()=>{
 const w=stage(true);tick(w,1,[{...IDLE,interact:true},{...IDLE,interact:true}]);w.mode='paused';const state=JSON.stringify(w.highFive);tick(w,100);assert.equal(JSON.stringify(w.highFive),state);const guest=new World();applySnapshot(guest,new SnapshotWriter(w).snapshot(1,w.events));assert.deepEqual(guest.highFive,w.highFive);assert.equal(guest.events.filter(e=>e.type==='highFive').length,1);
});

test('enemy patrol and reaction clocks advance at 30 percent while the team boost is active',()=>{
 const w=stage(true);const e=addInfantry(w,'rifle',55);e.infantry!.reaction=2;w.highFive.left=5;tick(w,60);assert.ok(Math.abs(e.infantry!.reaction-1.7)<.01);w.highFive.left=0;tick(w,60);assert.ok(Math.abs(e.infantry!.reaction-.7)<.01);
});

test('pending raised hand is synchronized without a high-five event or boost',()=>{const w=stage(true);tick(w,1,[{...IDLE,interact:true},IDLE]);tick(w,15);w.mode='paused';const before=JSON.stringify(w.highFive);tick(w,60);assert.equal(JSON.stringify(w.highFive),before);const guest=new World();applySnapshot(guest,new SnapshotWriter(w).snapshot(1,w.events));assert.equal(guest.highFive.offeredBy,0);assert.equal(guest.highFive.left,0);assert.equal(guest.events.filter(e=>e.type==='highFive').length,0);});

test('short guest confirmation between host ticks survives network input buffering',()=>{const w=stage(true),input=new RemoteInput();tick(w,1,[{...IDLE,interact:true},IDLE]);input.receive(1,{...IDLE,interact:true},0);input.receive(2,IDLE,.001);tick(w,1,[IDLE,input.take(.002)]);assert.equal(w.highFive.left,5);assert.equal(input.take(.003).interact,false);});


test('hand phase sounds fire once, lower after recoil or cancellation, and pause freezes the cue',()=>{
 const w=stage(true);const phases=()=>w.events.filter(e=>e.sfx?.startsWith('team-hand')).map(e=>e.sfx);
 tick(w,1,[{...IDLE,interact:true},IDLE]);tick(w,120,[{...IDLE,interact:true},IDLE]);
 assert.deepEqual(phases(),['team-hand-raise']);
 tick(w,1,[IDLE,{...IDLE,interact:true}]);assert.deepEqual(phases(),['team-hand-raise'],'confirmation does not lower arms before the clap');
 tick(w,10);w.mode='paused';tick(w,60);assert.deepEqual(phases(),['team-hand-raise']);w.mode='playing';tick(w,10);
 assert.deepEqual(phases(),['team-hand-raise','team-hand-lower']);tick(w,120);assert.equal(phases().length,2);
 const cancelled=stage(true);tick(cancelled,1,[{...IDLE,interact:true},IDLE]);tick(cancelled,1);tick(cancelled,1,[{...IDLE,interact:true},IDLE]);tick(cancelled,100);
 assert.deepEqual(cancelled.events.filter(e=>e.sfx?.startsWith('team-hand')).map(e=>e.sfx),['team-hand-raise','team-hand-lower']);
 assert.equal(cancelled.events.some(e=>e.type==='highFive'),false);
 const guest=new World();applySnapshot(guest,new SnapshotWriter(w).snapshot(1,w.events));assert.deepEqual(guest.events.filter(e=>e.sfx?.startsWith('team-hand')).map(e=>e.sfx),phases());
});
