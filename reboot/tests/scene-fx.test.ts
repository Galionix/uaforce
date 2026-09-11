import test from 'node:test';import assert from 'node:assert/strict';
import {SceneFx,ATMOSPHERES,FX_PARTICLE_LIMIT,stormLight} from '../src/game/scene-fx.ts';
import {World} from '../src/game/world.ts';import {MISSIONS} from '../src/game/content.ts';
test('mission atmosphere is explicit and different across the campaign',()=>{for(const m of MISSIONS)assert.ok(m.atmosphere&&ATMOSPHERES[m.atmosphere]);assert.equal(MISSIONS[10].atmosphere,'storm');assert.equal(MISSIONS[5].atmosphere,'night');assert.equal(MISSIONS[3].atmosphere,'snow');assert.ok(new Set(MISSIONS.map(m=>m.atmosphere)).size>=7);});
test('simultaneous blasts are bounded, cosmetic, and expire completely',()=>{
 const fx=new SceneFx(),w=new World(0);w.mode='playing';const before=JSON.stringify({boxes:w.boxes,enemies:w.enemies,player:w.player});
 for(let i=0;i<500;i++)fx.emit({type:'hostileBlast',x:10,y:1},0,0);
 assert.equal(fx.bits.length,FX_PARTICLE_LIMIT);assert.equal(fx.rings.length,18);
 for(let i=0;i<240;i++)fx.step(w,1/60,0,0);
 assert.equal(fx.bits.length,0);assert.equal(fx.rings.length,0);assert.equal(JSON.stringify({boxes:w.boxes,enemies:w.enemies,player:w.player}),before);
});
test('offscreen events consume no particles, reset clears all presentation state',()=>{const fx=new SceneFx();fx.emit({type:'bossDefeated',x:200,y:0},0,0);assert.equal(fx.bits.length,0);fx.emit({type:'bossDefeated',x:20,y:0},0,0);assert.ok(fx.bits.length>100);fx.reset();assert.equal(fx.time,0);assert.equal(fx.bits.length,0);assert.equal(fx.rings.length,0);});
test('lightning has a brief two-part envelope and a long quiet interval',()=>{assert.equal(stormLight(0),0);assert.equal(stormLight(5),1);assert.ok(stormLight(5.32)>.5);for(let t=5.5;t<22.9;t+=.2)assert.equal(stormLight(t),0);for(let t=0;t<40;t+=.01)assert.ok(stormLight(t)>=0&&stormLight(t)<=1);});
test('paused atmospheric time, smoke and lightning do not advance',()=>{const fx=new SceneFx(),w=new World(10);fx.emit({type:'hostileBlast',x:10,y:1},0,0);fx.time=5;w.mode='paused';const before=JSON.stringify([fx.time,fx.bits,fx.rings]);fx.step(w,.05,0,0);assert.equal(JSON.stringify([fx.time,fx.bits,fx.rings]),before);});
