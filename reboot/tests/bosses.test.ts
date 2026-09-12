import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {World,IDLE} from '../src/game/world.ts';import {BOSSES,stepBoss} from '../src/game/bosses.ts';import {HEROES} from '../src/game/content.ts';import {enemyActive,enemySize} from '../src/game/enemies.ts';import {announcement} from '../src/game/announcer.ts';
const tick=(w:World,n=60)=>{for(let i=0;i<n;i++)w.step(1/60,IDLE);};
function encounter(m=1){const w=new World(m);w.mode='playing';const e=w.boss!;if(w.mission.layout){w.routeProgress=w.mission.layout.checkpoints.length-1;for(const b of w.boxes)if(b.required)b.hp=0;}w.player.x=BOSSES[e.boss!.id].left;w.step(1/60,IDLE);return w;}
test('first unlock freezes the entire simulation until acknowledged; familiar rescue does not',()=>{
 const w=new World();w.mode='playing';w.player.x=w.allies[0].x;w.step(1/60,{...IDLE,interact:true});assert.notEqual(w.heroId,'shevchenko');assert.deepEqual(w.cinematic,{kind:'hero',id:w.heroId,serial:1});
 const before=JSON.stringify(w);for(let i=0;i<600;i++)w.step(1/60,{move:1,jump:true,fire:true,special:true,ultimate:true,interact:true});assert.equal(JSON.stringify(w),before);
 w.finishCinematic();assert.equal(w.mode,'playing');const t=w.time;w.step(1/60,IDLE);assert.ok(w.time>t);
 const known=new World(0,HEROES.map(h=>h.id));known.mode='playing';known.player.x=known.allies[0].x;known.step(1/60,{...IDLE,interact:true});assert.equal(known.cinematic,null);assert.equal(known.mode,'playing');
});
for(const m of [1,2,11]){
 test(`boss ${m}: supplies stay inside the arena, regenerate as pickups and reset on retry`,()=>{
  const w=encounter(m),boss=w.boss!,spec=BOSSES[boss.boss!.id];w.finishCinematic();
  w.enemies=[boss];boss.rooted=999;w.player.invulnerable=999;
  const supplies=w.ammoCrates.filter(c=>c.arena);assert.equal(supplies.length,2);
  for(const c of supplies)assert.ok(c.x>spec.left+1&&c.x<spec.right-1);
  const outside=w.ammoCrates.find(c=>!c.arena)!;outside.used=true;
  const c=supplies[0];w.player.x=c.x;w.player.energy=0;tick(w,1);
  assert.equal(c.used,true);assert.equal(w.player.energy,100);
  w.player.x=spec.left+1;w.player.energy=0;tick(w,600);
  assert.equal(c.used,true);assert.equal(w.player.energy,0,'supply must be collected physically');
  w.mode='paused';const remaining=c.restock;tick(w,600);assert.equal(c.restock,remaining);
  w.mode='playing';tick(w,600);assert.equal(c.used,false);assert.equal(w.player.energy,0);
  w.player.x=c.x;w.player.y=c.y;tick(w,1);assert.equal(w.player.energy,100);
  for(const a of supplies){a.used=true;a.restock=18;}
  const kit=w.medkits.find(k=>k.arena)!;kit.used=true;
  w.player.invulnerable=0;w.damagePlayer(100);
  assert.ok(supplies.every(a=>!a.used&&a.restock===0));assert.equal(kit.used,false);
  assert.equal(outside.used,true,'retry must not reset previously collected level loot');
  w.player.invulnerable=999;boss.rooted=999;
  for(const b of w.boxes)if(b.y<0&&b.y>=-2&&Math.abs(b.x-c.x)<2)b.hp=0;
  w.player.x=c.x;w.player.y=0;w.player.energy=100;tick(w,60);
  assert.equal(c.y,-2);assert.equal(c.used,false,'full ultimate must not waste supplies');
  w.player.energy=0;tick(w,1);assert.equal(w.player.energy,100,'pickup stays reachable on the crater floor');
 });
 test(`boss ${m}: dormant cannot take damage, entry freezes time, retry does not repeat title`,()=>{
  const w=new World(m),e=w.boss!;assert.equal(enemyActive(e),false);w.damageEnemy(e,99999);assert.equal(e.hp,e.maxHp);assert.ok(enemySize(e).w>2);assert.equal(w.objectiveComplete,false);
  w.mode='playing';if(w.mission.layout){w.routeProgress=w.mission.layout.checkpoints.length-1;for(const b of w.boxes)if(b.required)b.hp=0;}w.player.x=BOSSES[e.boss!.id].left;w.step(1/60,IDLE);assert.equal(w.mode,'cinematic');assert.equal(w.events.filter(v=>v.type==='bossEncounter').length,1);
  const frozen=JSON.stringify(w);tick(w,600);assert.equal(JSON.stringify(w),frozen);w.finishCinematic();w.damageEnemy(e,200);w.player.energy=0;w.player.invulnerable=0;w.damagePlayer(100);
  assert.equal(e.hp,e.maxHp);assert.equal(w.player.energy,0);assert.equal(w.cinematic,null);assert.equal(w.mode,'playing');assert.equal(w.checkpoint,BOSSES[e.boss!.id].left+1);
 });
 test(`boss ${m}: telegraph locks aim; stages and attacks advance; death clears arena and permits extraction`,()=>{
  const w=encounter(m),e=w.boss!,b=e.boss!;w.finishCinematic();stepBoss(w,e,1.1);assert.equal(b.phase,'windup');const target=b.aimX;w.player.x+=4;stepBoss(w,e,.2);assert.equal(b.aimX,target);
  w.damageEnemy(e,e.maxHp*.4);stepBoss(w,e,.01);assert.equal(b.stage,2);w.damageEnemy(e,e.maxHp*.35);stepBoss(w,e,.01);assert.equal(b.stage,3);
  for(let i=0;i<600;i++)stepBoss(w,e,1/60);assert.ok(b.turn>=3);assert.ok(w.bullets.length>0||b.minions.length>0);
  w.damageEnemy(e,9999);assert.equal(b.active,false);assert.equal(w.objectiveComplete,true);assert.equal(w.bullets.filter(p=>!p.friendly).length,0);assert.ok(b.minions.every(id=>w.enemies.find(a=>a.id===id)!.hp<=0));
  w.player.x=w.mission.exit;tick(w,180);assert.equal(w.evac.phase,'boarding');w.step(1/60,{...IDLE,jump:true});tick(w,180);assert.equal(w.mode,'won');assert.equal(w.events.filter(v=>v.type==='bossDefeated').length,1);
 });
}
test('active arena bounds hold the player; summoned drones have bounded living population',()=>{
 const w=encounter(2),e=w.boss!,b=e.boss!,spec=BOSSES[b.id];w.finishCinematic();w.player.x=spec.right-1;for(let i=0;i<60;i++)w.step(1/60,{...IDLE,move:1});assert.ok(w.player.x<=spec.right-.7);
 for(let i=0;i<20;i++){b.phase='attack';b.timer=0;b.turn=0;stepBoss(w,e,.01);}assert.ok(b.minions.filter(id=>w.enemies.find(e=>e.id===id)!.hp>0).length<=3);
});
test('all cinematic images are standalone PNGs, distinct from sheets, with saved prompts',()=>{
 const prompts=JSON.parse(readFileSync(new URL('../docs/CINEMATIC_PROMPTS.json',import.meta.url),'utf8'));const text=JSON.stringify(prompts);
 for(const id of [...HEROES.map(h=>h.id),...Object.keys(BOSSES)]){const bytes=readFileSync(new URL(`../public/assets/cinematics/${id}.png`,import.meta.url));assert.equal(bytes.toString('ascii',1,4),'PNG');assert.ok(bytes.readUInt32BE(16)>=128);assert.ok(text.includes(id));const h=HEROES.find(h=>h.id===id);if(h)assert.notDeepEqual(bytes,readFileSync(new URL('../public'+h.sheet,import.meta.url)));}
});
test('boss cues have separate Ukrainian lines, sinister scores, and silent provenance',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/BOSS_AUDIO_ASSETS.json',import.meta.url),'utf8'));assert.equal(manifest.playbackDuringGeneration,false);
 for(const id of Object.keys(BOSSES)){const cue=announcement('bossEncounter',id)!;assert.deepEqual(cue.voices,[id]);assert.match(cue.riff!,/^boss-/);assert.equal(cue.priority,3);}
 for(const clip of manifest.clips){const bytes=readFileSync(new URL('../'+clip.file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(clip.seconds>2&&clip.seconds<10);assert.ok(bytes.length>100000);}
});
test('real named commanders replace the anonymous bosses and the final victory names Putin',()=>{
 assert.equal(BOSSES.putin.name,'Хуйло');
 assert.equal(BOSSES['iron-warden'].name,'Валерій Герасімов');
 assert.equal(BOSSES['swarm-master'].name,'Сергій Суровікін');
 const cue=announcement('bossDefeated','putin')!;assert.deepEqual(cue.voices,['putin-defeated']);
 const manifest=JSON.parse(readFileSync(new URL('../docs/BOSS_AUDIO_ASSETS.json',import.meta.url),'utf8'));
 for(const [id,spec] of Object.entries(BOSSES))assert.ok(manifest.clips.find((c:any)=>c.file.endsWith(`/announcer/${id}.wav`)).text.includes(spec.name));
});
test('Putin blocks extraction alive, attacks the player, and leaves an inert wreck only after defeat',()=>{
 const w=encounter(11),e=w.boss!,b=e.boss!;w.finishCinematic();w.enemies=w.enemies.filter(x=>x===e);w.player.invulnerable=0;
 w.player.x=w.mission.exit;tick(w,1);assert.equal(w.evac.phase,'waiting');assert.equal(w.objectiveComplete,false);
 const hp=w.player.hp,lives=w.lives;tick(w,280);assert.ok(w.player.hp<hp||w.lives<lives,'the final antagonist actively damages an idle player');
 w.damageEnemy(e,e.maxHp);assert.equal(b.defeatedAt,w.time);assert.equal(w.objectiveComplete,true);assert.equal(b.active,false);
 w.events=[];tick(w,120);assert.equal(w.events.some(v=>['rocketLaunch','hostileBlast','bossWindup'].includes(v.type)),false);
});
