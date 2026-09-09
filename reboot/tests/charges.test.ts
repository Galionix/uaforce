import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';import {HEROES} from '../src/game/content.ts';
import {abilityStates} from '../src/game/hud.ts';
function fixture(){const w=new World(0,HEROES.map(h=>h.id),'franko');w.mode='playing';w.enemies=[];return w;}
function advance(w:World,seconds:number){for(let i=0;i<Math.round(seconds*60);i++)w.step(1/60,IDLE);}
test('two shields recover independently from their own activation times',()=>{
 const w=fixture();assert.equal(w.specialCharges,2);w.step(1/60,{...IDLE,special:true});advance(w,2);w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,0);
 const count=w.events.filter(e=>e.type==='special').length;w.step(1/60,{...IDLE,special:true});assert.equal(w.events.filter(e=>e.type==='special').length,count,'third cast is blocked');
 const state=abilityStates(w)[1];assert.equal(state.ready,false);assert.equal(state.charges.length,2);assert.ok(state.charges[0]>.19);assert.ok(state.charges[1]<.01);
 advance(w,8);assert.equal(w.specialCharges,1);assert.equal(w.player.specialRecovery.length,1);assert.ok(w.player.specialRecovery[0]>1.8);assert.equal(abilityStates(w)[1].ready,true);
 advance(w,2);assert.equal(w.specialCharges,2);assert.deepEqual(w.player.specialRecovery,[]);
});
test('pause freezes both charge timers; rescue clears the previous hero charge pool',()=>{
 const w=fixture();w.step(1/60,{...IDLE,special:true});advance(w,1);w.step(1/60,{...IDLE,special:true});const timers=[...w.player.specialRecovery];w.mode='paused';advance(w,12);assert.deepEqual(w.player.specialRecovery,timers);
 w.mode='playing';w.player.x=w.allies[0].x;w.player.y=0;w.step(1/60,{...IDLE,interact:true});assert.equal(w.heroId,'bandera');assert.equal(w.specialCharges,2);assert.deepEqual(w.player.specialRecovery,[]);
});
test('HUD distinguishes a ready spare charge from a depleted ultimate and a cooling single charge',()=>{
 const w=fixture();w.step(1/60,{...IDLE,special:true,ultimate:true});const [weapon,special,ultimate]=abilityStates(w);assert.equal(weapon.charges.length,0);assert.equal(special.ready,true);assert.deepEqual(special.charges,[1,0]);assert.equal(ultimate.ready,false);assert.equal(ultimate.progress,0);
 const single=new World();single.mode='playing';single.enemies=[];single.step(1/60,{...IDLE,special:true});assert.equal(abilityStates(single)[1].ready,false);assert.equal(abilityStates(single)[1].charges.length,0);
});
