import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';import {MISSIONS,HEROES} from '../src/game/content.ts';
import {CAMPAIGN_ROUTE,SIDE_OPERATIONS,nextCampaignMission,FINAL_MISSION} from '../src/game/campaign.ts';
import {parseProgress} from '../src/game/storage.ts';import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
import {triggerBoss,BOSSES} from '../src/game/bosses.ts';
const tick=(w:World,n:number)=>{for(let i=0;i<n;i++)w.step(1/60,IDLE);};
test('seven chapter campaign leads into Russia and ends at Kremlin; side maps retain stable IDs',()=>{
 assert.deepEqual(CAMPAIGN_ROUTE,[0,1,6,5,9,10,11]);assert.deepEqual([...CAMPAIGN_ROUTE,...SIDE_OPERATIONS].sort((a,b)=>a-b),MISSIONS.map((_,i)=>i));
 for(let i=0;i<CAMPAIGN_ROUTE.length-1;i++)assert.equal(nextCampaignMission(CAMPAIGN_ROUTE[i]),CAMPAIGN_ROUTE[i+1]);assert.equal(nextCampaignMission(FINAL_MISSION),null);for(const m of SIDE_OPERATIONS)assert.equal(nextCampaignMission(m),null);
 assert.deepEqual(MISSIONS.flatMap((m,i)=>m.boss==='putin'?[i]:[]),[11]);assert.equal(MISSIONS[11].region,'Москва · Кремль');assert.equal(BOSSES.putin.name,'Хуйло');
});
test('old completion opens the new raids, in-progress saves and roster survive, new finale stays complete',()=>{
 for(const size of [3,6,9]){const p=parseProgress(JSON.stringify({mission:size-1,campaignSize:size,completed:true,hero:'lesya',unlocked:['shevchenko','lesya']}));assert.equal(p.mission,9);assert.equal(p.hero,'lesya');assert.equal(p.completed,false);}
 assert.equal(parseProgress(JSON.stringify({mission:7,completed:false})).mission,7);
 assert.equal(parseProgress(JSON.stringify({mission:11,campaignRoute:1,campaignSize:12,completed:true})).completed,true);
});
for(const index of [9,10,11])test(`raid ${index}: objectives block extraction and can be shot`,()=>{
 const w=new World(index,HEROES.map(h=>h.id),'bilozerska');w.mode='playing';w.enemies=[];w.player.invulnerable=1e6;w.routeProgress=w.mission.layout!.checkpoints.length-1;
 const objectives=w.boxes.filter(b=>b.required);assert.equal(objectives.length,index===11?2:3);
 assert.equal(w.objectiveComplete,false);w.player.x=w.mission.exit;tick(w,10);assert.equal(w.evac.phase,'waiting');
 for(const target of objectives){if(target.hp<=0)continue;w.player.x=target.x-(target.w/2+2);w.player.y=target.y;w.player.vy=0;w.player.facing=1;
  for(let i=0;i<1200&&target.hp>0;i++)w.step(1/60,{...IDLE,fire:i%120===0});assert.ok(target.hp<=0,JSON.stringify({index,target,player:w.player.x}));
 }
 assert.equal(w.objectiveComplete,true); w.player.x=w.mission.exit;w.player.y=0;tick(w,180);assert.equal(w.evac.phase,'boarding');w.step(1/60,{...IDLE,jump:true});tick(w,180);assert.equal(w.mode,'won');
});
test('fuel ignition is delayed, pauses, chains into a parked jet, and synchronizes to guest',()=>{
 const w=new World(10);w.mode='playing';w.enemies=[];w.player.invulnerable=1e6;w.addPlayer('lesya');const writer=new SnapshotWriter(w);const guest=new World(10);
 const fuel=w.boxes.find(b=>b.sabotage==='fuel')!,jet=w.boxes.find(b=>b.sabotage==='jet')!;
 w.damageBox(fuel,1000);assert.equal(fuel.hp,1);assert.ok(fuel.fuse!>0);applySnapshot(guest,writer.snapshot(1));assert.equal(guest.boxes.find(b=>b.id===fuel.id)!.fuse,fuel.fuse);
 w.mode='paused';const fuse=fuel.fuse;tick(w,120);assert.equal(fuel.fuse,fuse);w.mode='playing';tick(w,120);assert.equal(fuel.hp,0);assert.equal(jet.hp,0);assert.ok(w.events.filter(e=>e.type==='burst').length>=6);
 applySnapshot(guest,writer.snapshot(2));assert.equal(guest.boxes.find(b=>b.id===jet.id)!.hp,0);
});
test('final arena cannot trap unfinished raid objectives; boss reveal and respawn are shared',()=>{
 const w=new World(11);w.mode='playing';w.addPlayer('lesya');w.player.x=235;
 assert.equal(triggerBoss(w),false);for(const b of w.boxes)if(b.required)b.hp=0;assert.equal(triggerBoss(w),false);w.routeProgress=w.mission.layout!.checkpoints.length-1;w.players[1].checkpointY=12;
 assert.equal(triggerBoss(w),true);assert.equal(w.cinematic!.id,'putin');assert.ok(w.players.every(a=>a.checkpointY===0));w.finishCinematic();w.damageEnemy(w.boss!,99999);assert.equal(w.objectiveComplete,true);
 assert.ok(w.finale>0);w.player.invulnerable=1e6;tick(w,300);assert.equal(w.finale,0);assert.ok(w.events.filter(e=>e.type==='burst').length>=18);
});
