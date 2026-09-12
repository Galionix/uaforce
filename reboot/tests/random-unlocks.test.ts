import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';
import {HEROES,ACTIVE_HEROES,type HeroId} from '../src/game/content.ts';
import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
function rescue(w:World){w.mode='playing';w.enemies=[];w.player.x=w.allies[0].x;w.player.y=0;w.step(1/60,{...IDLE,interact:true});}
test('every still-locked hero can be the very first unlock, with equal draw intervals',()=>{
 const seen=new Set<HeroId>(),count=ACTIVE_HEROES.length-1;
 for(let i=0;i<count;i++){let draws=0;const w=new World(0,['shevchenko'],'shevchenko',()=>{draws++;return (i+.5)/count;});rescue(w);seen.add(w.heroId);assert.equal(w.heroId,ACTIVE_HEROES[i+1].id);assert.equal(draws,1);assert.equal(w.unlocked.length,2);assert.equal(w.cinematic?.id,w.heroId);assert.equal(w.events.find(e=>e.type==='heroChanged')?.unlocked,true);w.step(1/60,{...IDLE,interact:true});assert.equal(draws,1);}
 assert.equal(seen.size,count);
});
test('known fighters cannot consume an unlock while a new fighter remains',()=>{
 const unlocked=HEROES.filter(h=>h.id!=='mamai').map(h=>h.id);const w=new World(0,unlocked,'lesya',()=>0);rescue(w);assert.equal(w.heroId,'mamai');assert.equal(w.unlocked.length,HEROES.length);assert.equal(new Set(w.unlocked).size,HEROES.length);
});
test('after the full roster is unlocked, rescue draws any other fighter without a reveal',()=>{
 const unlocked=HEROES.map(h=>h.id),seen=new Set<HeroId>();
 for(let i=0;i<ACTIVE_HEROES.length-1;i++){const w=new World(0,unlocked,'mamai',()=>(i+.5)/(ACTIVE_HEROES.length-1));rescue(w);seen.add(w.heroId);assert.notEqual(w.heroId,'mamai');assert.equal(w.mode,'playing');assert.equal(w.cinematic,null);assert.deepEqual(w.unlocked,unlocked);assert.equal(w.events.find(e=>e.type==='heroChanged')?.unlocked,false);}
 assert.equal(seen.size,ACTIVE_HEROES.length-1);
});
test('host picks a remote player unlock once; guest receives the same fighter and reveal without drawing',()=>{
 let draws=0;const host=new World(0,['shevchenko'],'shevchenko',()=>{draws++;return .999;});host.addPlayer('lesya');host.enemies=[];host.mode='playing';host.players[1].body.x=host.allies[0].x;
 const writer=new SnapshotWriter(host);host.stepPlayers(1/60,[IDLE,{...IDLE,interact:true}]);assert.equal(draws,1);assert.equal(host.players[0].heroId,'shevchenko');assert.equal(host.players[1].heroId,'prytula');
 const guest=new World(0,['shevchenko'],'shevchenko',()=>{throw Error('Guest must not draw');});const snapshot=JSON.parse(JSON.stringify(writer.snapshot(1,host.events)));applySnapshot(guest,snapshot);assert.equal(guest.heroId,'prytula');assert.deepEqual(guest.unlocked,host.unlocked);assert.deepEqual(guest.cinematic,host.cinematic);assert.equal(guest.events.find(e=>e.type==='heroChanged')?.hero,'prytula');
});
