import test from 'node:test';
import assert from 'node:assert/strict';
import {RunMetrics,trafficSource} from '../src/game/telemetry.ts';
import {PendingActions} from '../src/game/pending-actions.ts';
import {IDLE} from '../src/game/world.ts';
import worker from '../server/pages-worker.js';

test('tap between network ticks survives once, including interact for barrels and high-five',()=>{
 const pending=new PendingActions();pending.add({...IDLE,interact:true,fire:true,jump:true});pending.add({...IDLE});
 assert.equal(pending.take(IDLE).interact,true);assert.equal(pending.take(IDLE).interact,false);
 pending.add({...IDLE,interact:true});pending.clear();assert.equal(pending.take(IDLE).interact,false);
});
test('mission counters do not treat pause, respawn, hero reveal or result frames as new starts',()=>{
 const events:string[]=[];const metrics=new RunMetrics(e=>events.push(e)),a={},b={};
 for(const state of ['ready','playing','paused','playing','cinematic','playing','won','won'])metrics.observe(a,state,'single',0,50);
 metrics.observe(b,'playing','single',1,2);metrics.leave();metrics.leave();
 assert.deepEqual(events,['mission_start','mission_win','mission_start','mission_leave']);
});
test('source attribution accepts categories, never arbitrary query contents or room codes',()=>{
 assert.equal(trafficSource('?room=PRIVATE&email=private&ut m_source=secret'),'direct');
 assert.equal(trafficSource('?utm_source=tiktok'),'tiktok');assert.equal(trafficSource('?utm_source=private@email.com'),'direct');
 assert.equal(trafficSource('', 'https://www.reddit.com/r/test'),'reddit');assert.equal(trafficSource('?qa=1'),'qa');
});
const point={event:'load_ready',mode:'site',source:'qa',session:'12345678-1234-1234-1234-123456789abc',build:'growth-20260910',qa:true,mission:-1,seconds:0};
test('analytics stores only its whitelist; private extra properties are discarded',async()=>{
 const stored:object[]=[];const env={GAME_EVENTS:{writeDataPoint:(p:object)=>stored.push(p)}};
 const send=(p:object)=>worker.fetch(new Request('https://uaforce.thedimas.com/api/events',{method:'POST',headers:{Origin:'https://uaforce.thedimas.com','Content-Type':'application/json'},body:JSON.stringify([p])}),env);
 assert.equal((await send({...point,room:'PRIVATE',url:'secret',email:'private@example.com'})).status,204);
 assert.equal(stored.length,1);assert.equal(JSON.stringify(stored).includes('PRIVATE'),false);assert.equal(JSON.stringify(stored).includes('email'),false);
 assert.equal((await send({...point,event:'PRIVATE'})).status,400);
 assert.equal((await send({...point,seconds:Infinity})).status,400);
});
test('worker accepts bounded event batches; rejects invalid origin, oversized body and bad enum without writes',async()=>{
 const stored:object[]=[];const env={GAME_EVENTS:{writeDataPoint:(p:object)=>stored.push(p)}};
 const request=(body:unknown,origin='https://uaforce.thedimas.com')=>new Request('https://uaforce.thedimas.com/api/events',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await worker.fetch(request([point]),env)).status,204);assert.equal(stored.length,1);
 assert.equal((await worker.fetch(request([point],'https://example.com'),env)).status,403);
 assert.equal((await worker.fetch(request([{...point,event:'bad'}]),env)).status,400);
 assert.equal((await worker.fetch(request(Array(13).fill(point)),env)).status,400);
 assert.equal((await worker.fetch(request([{...point,extra:'x'.repeat(9000)}]),env)).status,413);
 assert.equal(stored.length,1);
 assert.equal((await worker.fetch(request([point]),{})).status,503);
});
