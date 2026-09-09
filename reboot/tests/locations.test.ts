import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';import {MISSIONS} from '../src/game/content.ts';
import {abilityStates} from '../src/game/hud.ts';import {summonFollowers} from '../src/game/followers.ts';
function run(w:World,seconds:number){for(let i=0;i<Math.round(seconds*60);i++)w.step(1/60,IDLE);}
function fixture(){const w=new World();w.mode='playing';w.enemies=[];w.boxes=w.boxes.filter(b=>b.y<0);w.ammoCrates=[{x:12,y:0,used:false}];return w;}
test('ultimate never recharges from time, kills, rescue, checkpoints, or respawn',()=>{
 const w=fixture();w.step(1/60,{...IDLE,ultimate:true});assert.equal(w.player.energy,0);run(w,40);assert.equal(w.player.energy,0);
 const e={id:w.nextId(),x:6,y:0,hp:10,maxHp:10,dir:1,cooldown:99,windup:0,anchor:6,heavy:false};w.enemies.push(e);w.damageEnemy(e,30);assert.equal(w.player.energy,0);
 w.player.x=w.allies[0].x;w.step(1/60,{...IDLE,interact:true});assert.notEqual(w.heroId,'shevchenko');assert.equal(w.player.energy,0);w.finishCinematic();
 w.player.x=w.mission.checkpoints[1]+1;w.step(1/60,IDLE);assert.equal(w.player.energy,0);w.player.invulnerable=0;w.damagePlayer(100);assert.equal(w.player.energy,0);
 assert.match(abilityStates(w)[2].label,/ящик боєприпасів/);
});
test('ammo pickup recharges one ultimate, is not wasted when full and stays consumed after death',()=>{
 const w=fixture(),crate=w.ammoCrates[0];w.player.x=12;run(w,.1);assert.equal(crate.used,false);w.player.x=9;w.step(1/60,{...IDLE,ultimate:true});run(w,2);assert.equal(w.player.energy,0);w.player.x=12;run(w,.1);assert.equal(w.player.energy,100);assert.equal(crate.used,true);assert.equal(w.events.filter(e=>e.type==='ammoPickup').length,1);
 w.step(1/60,{...IDLE,ultimate:true});run(w,3);assert.equal(w.player.energy,0);w.player.invulnerable=0;w.damagePlayer(100);w.player.x=12;run(w,.1);assert.equal(w.player.energy,0);assert.equal(crate.used,true);
});
test('ammo pickup respects height and pause and falls with destroyed ground',()=>{
 const w=fixture(),crate=w.ammoCrates[0];w.player.energy=0;w.player.x=12;w.player.y=4;w.step(1/60,IDLE);assert.equal(crate.used,false);
 w.mode='paused';w.player.y=0;run(w,1);assert.equal(crate.used,false);w.mode='playing';w.player.x=15;
 for(const b of w.boxes)if(Math.abs(b.x-12)<2&&b.y>-3)b.hp=0;run(w,1);assert.equal(crate.y,-2);w.player.x=12;w.player.y=-2;run(w,.1);assert.equal(w.player.energy,100);
});
test('ordinary special still refills automatically while ultimate stays empty',()=>{const w=fixture();w.step(1/60,{...IDLE,special:true,ultimate:true});assert.equal(w.specialCharges,0);run(w,9);assert.equal(w.specialCharges,1);assert.equal(w.player.energy,0);});
for(let i=0;i<MISSIONS.length;i++)test('mission '+(i+1)+' has complete long terrain, staged threats, supplies and multiple checkpoints',()=>{
 const w=new World(i),m=w.mission;assert.ok(m.length>210);assert.equal(m.districts.length,3);assert.equal(m.districts[0].start,0);assert.equal(m.districts.at(-1)!.end,m.length);
 m.districts.forEach((d,j)=>{if(j)assert.equal(d.start,m.districts[j-1].end);assert.ok(m.enemies.filter(x=>x>=d.start&&x<d.end).length>=3);});
 assert.ok(m.vehicles.length>=5);assert.ok(m.vehicles[0][3]>=30);assert.ok(m.vehicles.filter(v=>v[3]>=m.districts[2].start).length>=2);assert.ok(m.ammo.length>=5);assert.equal(w.allies.length,4);assert.equal(m.checkpoints.length,3);
 assert.ok(w.enemies.find(e=>e.heavy)!.x>m.exit-10);assert.equal(w.boxes.filter(b=>b.kind==='earth'&&b.y===-3).length,m.length);
 for(const x of [...m.ammo,...m.checkpoints,...m.allies]){assert.ok(x>0&&x<m.exit);assert.ok(!w.boxes.some(b=>b.hp>0&&b.y===0&&Math.abs(x-b.x)<b.w/2+.32),'supplies and checkpoints are not inside cover at '+x);}
 for(const l of w.ladders){assert.ok(w.boxes.some(b=>(b.kind==='stone'||b.kind==='platform')&&Math.abs(b.y+b.h-l.top)<.1&&Math.abs(b.x-l.x)<3),'ladder reaches a real floor');}
 w.mode='playing';w.enemies=[];for(const x of m.checkpoints){w.player.x=x+1;w.step(1/60,IDLE);assert.equal(w.checkpoint,x);}w.player.invulnerable=0;w.damagePlayer(100);assert.equal(w.player.x,m.checkpoints.at(-1));
});
test('player and followers can travel past the former map boundary',()=>{
 const w=fixture();w.player.x=160;w.player.facing=1;summonFollowers(w,'infantry');for(let i=0;i<120;i++)w.step(1/60,{...IDLE,move:1});run(w,2);assert.ok(w.player.x>170);assert.ok(w.followers.every(f=>f.x>165));
});
