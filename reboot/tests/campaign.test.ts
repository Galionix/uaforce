import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';import {HEROES,ACTIVE_HEROES,MISSIONS} from '../src/game/content.ts';import {parseProgress} from '../src/game/storage.ts';
test('random unlocks persist across rescues and mission changes',()=>{
 const w=new World(0,['shevchenko'],'shevchenko',()=>.999);w.mode='playing';w.enemies=[];
 w.player.x=w.allies[0].x;w.step(1/60,{...IDLE,interact:true});assert.equal(w.heroId,ACTIVE_HEROES.at(-1)!.id);assert.equal(w.unlocked.length,2);w.finishCinematic();
 w.player.x=w.allies[1].x;w.step(1/60,{...IDLE,interact:true});assert.equal(w.heroId,ACTIVE_HEROES.at(-2)!.id);assert.equal(w.unlocked.length,3);
 const next=new World(1,w.unlocked,w.heroId,()=>.999);next.mode='playing';next.enemies=[];next.player.x=next.allies[0].x;next.step(1/60,{...IDLE,interact:true});assert.equal(next.heroId,ACTIVE_HEROES.at(-3)!.id);assert.equal(next.unlocked.length,4);
});
test('progress validates saved heroes and preserves unlocked roster across reload',()=>{
 const p=parseProgress(JSON.stringify({mission:1,hero:'franko',unlocked:HEROES.map(h=>h.id),completed:false}));const w=new World(p.mission,p.unlocked,p.hero);assert.equal(w.heroId,'franko');assert.equal(w.missionIndex,1);
 assert.equal(parseProgress('{oops').hero,'shevchenko');assert.equal(parseProgress('{"hero":"fake","mission":999}').mission,MISSIONS.length-1);
});
for(let mission=0;mission<6;mission++)test(`mission ${mission+1} can be completed using ordinary actions and helicopter extraction`,()=>{
 // Keep this navigation bot's kit sequence reproducible; random draws have separate coverage.
 const w=new World(mission,['shevchenko'],'shevchenko',()=>0);w.mode='playing';let lastX=w.player.x,blocked=0,dropX:number|null=null;
 for(let i=0;i<60*300&&(w.mode==='playing'||w.mode==='cinematic');i++){
  if(w.mode==='cinematic'){w.finishCinematic();continue;}
  const p=w.player;blocked=Math.abs(p.x-lastX)<.01?blocked+1:0;lastX=p.x;
  const boss=w.boss?.boss?.active&&w.boss.hp>0?w.boss:null;
  const dx=boss?boss.x-p.x:0;
  const captive=w.allies.find(a=>!a.rescued);
  const refill=boss&&p.energy<100?w.ammoCrates.filter(c=>c.arena&&!c.used).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]:undefined;
  if(captive&&!boss&&p.x>captive.x-2&&p.y>1.5&&dropX===null){const fort=w.mission.forts.find(([l,r])=>captive.x>=l&&captive.x<=r);dropX=fort?fort[1]+1.5:captive.x+4;}
  if(p.y<1.5)dropX=null;
  const goal=refill?.x??dropX??captive?.x??w.mission.exit;
  const travel=Math.abs(goal-p.x)<.25?0:Math.sign(goal-p.x);
  const threat=w.enemies.filter(e=>e.hp>0&&!e.boss&&Math.abs(e.x-p.x)<8&&Math.abs(e.y-p.y)<2).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
  const evade=boss?.boss?.id==='putin'&&boss.boss.phase!=='recover'&&p.x>238;
  w.step(1/60,{move:!boss&&Math.abs(goal-p.x)<.4&&threat?(p.facing!==Math.sign(threat.x-p.x)?Math.sign(threat.x-p.x):0):refill?travel:evade?-1:boss?(Math.abs(dx)>Math.min(w.hero.range-1,5)?Math.sign(dx):p.facing!==Math.sign(dx)?Math.sign(dx):0):travel,jump:((w.evac.phase==='boarding')||(blocked>50&&Math.abs(goal-p.x)>.5)||!!boss&&(boss.boss!.phase==='windup'||p.y<(refill?.y??boss.y)-.2))&&p.grounded,ultimate:!!boss&&Math.abs(dx)<5&&p.energy>=100,fire:w.heroId==='mamai'?(w.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<2.7&&Math.abs(e.y-p.y)<1.8)?i%8===0:!p.mamaiFired):w.hero.mode==='single'?i%8===0:true,special:w.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<6),interact:true});
 }
 assert.equal(w.rescued,w.allies.length);
 assert.equal(w.mode,'won',JSON.stringify({x:w.player.x,mode:w.mode,phase:w.evac.phase,kills:w.kills,hp:w.enemies.find(e=>e.heavy)?.hp}));assert.equal(w.evac.phase,'done');
});
test('evacuation arrival and departure freeze on pause',()=>{
 const w=new World();w.mode='playing';w.player.x=w.mission.exit;w.enemies.find(e=>e.heavy)!.hp=0;w.step(1/60,IDLE);assert.equal(w.evac.phase,'arriving');w.mode='paused';const before=JSON.stringify(w.evac);w.step(1,IDLE);assert.equal(JSON.stringify(w.evac),before);
});
