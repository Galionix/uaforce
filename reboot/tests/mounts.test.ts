import test from 'node:test';import assert from 'node:assert/strict';
import {MISSIONS} from '../src/game/content.ts';
import {World,IDLE} from '../src/game/world.ts';import {addMount,TANK,damageMount} from '../src/game/mounts.ts';import {hostileBlast,addVehicle} from '../src/game/enemies.ts';import {abilityStates} from '../src/game/hud.ts';
function fixture(){const w=new World();w.mode='playing';w.mounts=[];w.enemies=[];w.allies=[];w.boxes=w.boxes.filter(b=>b.y<0);w.player.x=12;w.player.hp=67;const t=addMount(w,12);return{w,t};}
function run(w:World,n:number,a=IDLE){for(let i=0;i<n;i++)w.step(1/60,a);}
function enter(w:World){w.step(1/60,{...IDLE,interact:true});}
function shot(w:World,x:number,y:number,damage=25){w.bullets.push({id:w.nextId(),x,y,vx:-90,vy:0,life:1,friendly:false,damage});}
test('tank enters on interaction edge, holds controls, moves slower and exits only with interaction',()=>{
 const{w,t}=fixture();assert.equal(w.prompt,'Сісти в танк');enter(w);assert.equal(w.mounted,t);assert.equal(w.prompt,'Вийти з танка');run(w,10,{...IDLE,interact:true});assert.equal(w.mounted,t,'holding F must not exit');
 const x=t.x;run(w,60,{...IDLE,move:1,special:true,ultimate:true});assert.ok(Math.abs(t.x-x-TANK.speed)<.01);assert.equal(w.player.x,t.x);assert.equal(w.player.energy,100);assert.equal(w.specialCharges,w.hero.specialCharges);
 w.step(1/60,IDLE);w.step(1/60,{...IDLE,interact:true});assert.equal(w.mounted,null);assert.ok(w.player.y>t.y+TANK.h&&w.player.vy>0);assert.equal(w.player.hp,67);assert.equal(t.armor,TANK.armor);
});
test('all individual impacts hit tank armor, never pilot health or invulnerability budget',()=>{
 const{w,t}=fixture();enter(w);w.player.invulnerable=2;
 for(let i=0;i<3;i++){shot(w,t.x+2.6,t.y+1);w.step(1/60,IDLE);}
 assert.equal(t.armor,TANK.armor-75);assert.equal(w.player.hp,67);assert.equal(w.lives,3);
 shot(w,t.x+2.6,t.y+2,30);w.step(1/60,IDLE);assert.equal(t.armor,TANK.armor-105,'upper hull has its own collision');
});
test('broken armor leaves one wreck, automatically ejects without spill damage, cannot be entered again',()=>{
 const{w,t}=fixture();enter(w);t.armor=10;shot(w,14.5,1,500);w.step(1/60,IDLE);assert.equal(t.armor,0);assert.equal(w.mounted,null);assert.equal(w.mounts[0],t);assert.equal(w.player.hp,67);assert.ok(w.player.vy>0);assert.ok(w.player.invulnerable>=1);assert.equal(w.events.filter(e=>e.type==='mountBroken').length,1);
 damageMount(w,t,50);assert.equal(w.events.filter(e=>e.type==='mountBroken').length,1);run(w,120);w.player.x=t.x;w.player.y=t.y;enter(w);assert.equal(w.mounted,null);assert.equal(w.lives,3);
});
test('shells and radial attacks hit hull edges and unoccupied vehicles, cover shields them',()=>{
 const{w,t}=fixture();enter(w);hostileBlast(w,14.3,1.2,1,40);assert.equal(t.armor,320);assert.equal(w.player.hp,67);
 w.step(1/60,IDLE);w.step(1/60,{...IDLE,interact:true});hostileBlast(w,14.3,1.2,1,30);assert.equal(t.armor,290);
 w.boxes.push({id:w.nextId(),x:14.1,y:0,w:.15,h:3,hp:100,maxHp:100,kind:'wall'});hostileBlast(w,15,1,3,50);assert.equal(t.armor,290);
});
test('a lethal rocket blast cannot damage the ejected pilot in the same blast',()=>{
 const{w,t}=fixture();enter(w);t.armor=5;w.bullets.push({id:w.nextId(),x:14.5,y:1,vx:-90,vy:0,life:1,friendly:false,damage:80,ordnance:'rocket',blastRadius:2.8});w.step(1/60,IDLE);assert.equal(t.armor,0);assert.equal(w.mounted,null);assert.equal(w.player.hp,67);
});
test('cannon has mandatory reload, finite travel, damages enemies and consumes no hero ammo or ultimate',()=>{
 const{w,t}=fixture();enter(w);w.enemies.push({id:w.nextId(),x:19,y:0,hp:200,maxHp:200,dir:-1,cooldown:99,windup:0,anchor:19,heavy:false});
 const ammo=w.player.ammo;run(w,130,{...IDLE,fire:true});assert.equal(w.events.filter(e=>e.type==='mountShot').length,1);assert.ok(w.enemies[0].hp<200);assert.ok(t.cooldown>0);assert.equal(w.player.ammo,ammo);assert.equal(w.player.energy,100);run(w,30,{...IDLE,fire:true});assert.equal(w.events.filter(e=>e.type==='mountShot').length,2);
 const ui=abilityStates(w);assert.match(ui[0].label,/Танкова гармата/);assert.match(ui[2].label,/Броня/);assert.equal(w.events.filter(e=>e.type==='shot').length,0);
});
test('cannon cannot shoot through adjacent cover and tracks stop at a solid wall',()=>{
 const{w,t}=fixture();enter(w);w.boxes.push({id:w.nextId(),x:14.2,y:-.1,w:1,h:.1,hp:Infinity,maxHp:Infinity,kind:'platform'});w.boxes.push({id:w.nextId(),x:14.2,y:0,w:.2,h:3,hp:1000,maxHp:1000,kind:'wall'});w.enemies.push({id:w.nextId(),x:19,y:0,hp:200,maxHp:200,dir:-1,cooldown:99,windup:0,anchor:19,heavy:false});run(w,60,{...IDLE,move:1,fire:true});assert.ok(t.x<12.2);assert.equal(w.enemies[0].hp,200);assert.ok(w.boxes.at(-1)!.hp<1000);
});
test('pause and cinematics freeze hull, reload, armor, and engine cues; parked tank keeps its damage',()=>{
 const{w,t}=fixture();enter(w);run(w,20,{...IDLE,move:1,fire:true});damageMount(w,t,50);w.mode='paused';let before=JSON.stringify(w);run(w,600,{...IDLE,move:1,fire:true});assert.equal(JSON.stringify(w),before);
 w.mode='playing';w.beginCinematic('boss','iron-warden');before=JSON.stringify(w);run(w,600);assert.equal(JSON.stringify(w),before);w.finishCinematic();w.step(1/60,IDLE);w.step(1/60,{...IDLE,interact:true});run(w,120);w.player.x=t.x;w.player.y=t.y;enter(w);assert.equal(w.mounted,t);assert.equal(t.armor,310);
});
test('tank movement emits engine only while moving and crushed barrels can damage armor',()=>{
 const{w,t}=fixture();enter(w);run(w,60);assert.equal(w.events.filter(e=>e.type==='mountEngine').length,0);run(w,60,{...IDLE,move:1});assert.ok(w.events.filter(e=>e.type==='mountEngine').length>=3);
 const count=w.events.filter(e=>e.type==='mountEngine').length;run(w,60);assert.equal(w.events.filter(e=>e.type==='mountEngine').length,count);
 w.boxes.push({id:w.nextId(),x:t.x+2,y:0,w:1,h:1,hp:20,maxHp:20,kind:'barrel'});run(w,10,{...IDLE,move:1});assert.ok(t.armor<TANK.armor);assert.equal(w.player.hp,67);
});
test('drone collision uses the tank hull, including above the hidden pilot',()=>{
 const{w,t}=fixture();enter(w);const drone=addVehicle(w,'shahed',t.x+3,t.y+1.8,0);Object.assign(drone.vehicle!,{active:true,phase:'dive',vx:-10,vy:0});run(w,10);assert.equal(drone.hp,0);assert.ok(t.armor<TANK.armor);assert.equal(w.player.hp,67);
});
for(let m=0;m<6;m++)test(`mission ${m+1} has two accessible tanks and evacuation waits until the driver exits into the cabin`,()=>{
 const w=new World(m);assert.equal(w.mounts.length,2);for(const t of w.mounts){assert.ok(!w.boxes.some(b=>b.hp>0&&b.kind!=='platform'&&b.y+b.h>t.y+.1&&b.y<t.y+TANK.h&&Math.abs(b.x-t.x)<b.w/2+TANK.w/2));}
 w.mode='playing';w.enemies=[];w.boss=null;const t=w.mounts[0];t.x=w.mission.exit;w.player.x=t.x;enter(w);assert.equal(w.mounted,t);run(w,370);assert.equal(w.evac.phase,'boarding');assert.equal(w.mounted,t);enter(w);run(w,180);assert.equal(w.mode,'won');assert.equal(w.mounted,null);
});

test('enemy contact is a paced impact, not armor damage on every rendered frame',()=>{const{w,t}=fixture();enter(w);w.enemies.push({id:w.nextId(),x:t.x,y:0,hp:200,maxHp:200,dir:-1,cooldown:999,windup:0,anchor:t.x,heavy:false});run(w,60);assert.equal(t.armor,TANK.armor-24);assert.equal(w.player.hp,67);});

test('jump lifts the occupied tank, preserves pilot and can fire in the air; held jump never repeats',()=>{
 const{w,t}=fixture();enter(w);w.step(1/60,{...IDLE,jump:true,fire:true});assert.equal(w.mounted,t);assert.ok(t.vy>0&&t.y>0);assert.equal(t.grounded,false);assert.equal(w.player.y,t.y);assert.equal(w.player.hp,67);assert.equal(w.events.filter(e=>e.type==='mountShot').length,1);
 let peak=t.y;for(let i=0;i<180;i++){w.step(1/60,{...IDLE,jump:true});peak=Math.max(peak,t.y);}
 assert.ok(peak>4&&peak<4.3);assert.equal(t.grounded,true);assert.equal(t.y,0);assert.equal(w.events.filter(e=>e.type==='mountJump').length,1);assert.equal(w.events.filter(e=>e.type==='mountLand').length,1);
 w.step(1/60,IDLE);w.step(1/60,{...IDLE,jump:true});assert.ok(t.vy>0);assert.equal(w.events.filter(e=>e.type==='mountJump').length,2);
});
test('tank can clear a low wall and jump out of a two-unit crater, but cannot double jump',()=>{
 const{w,t}=fixture();enter(w);w.boxes.push({id:w.nextId(),x:15,y:0,w:1,h:1.6,hp:1000,maxHp:1000,kind:'wall'});
 w.step(1/60,{...IDLE,jump:true,move:1});run(w,20,{...IDLE,move:1});const vy=t.vy;w.step(1/60,{...IDLE,jump:true,move:1});assert.ok(t.vy<vy);run(w,75,{...IDLE,move:1});assert.ok(t.x>18);assert.equal(w.mounted,t);
 w.boxes=[];t.y=-2;t.vy=0;w.step(1/60,IDLE);w.step(1/60,{...IDLE,jump:true});run(w,30);assert.ok(t.y>1.8);assert.equal(w.mounted,t);
});
test('solid ceilings stop a jumping hull; destroyed supporting ground cannot grant an air jump',()=>{
 const{w,t}=fixture();enter(w);w.boxes.push({id:w.nextId(),x:12,y:4,w:8,h:1,hp:1000,maxHp:1000,kind:'wall'});w.step(1/60,{...IDLE,jump:true});let peak=t.y;for(let i=0;i<90;i++){w.step(1/60,IDLE);peak=Math.max(peak,t.y);}assert.ok(peak<=4-TANK.h+.001);assert.equal(t.grounded,true);
 w.boxes=[];w.step(1/60,{...IDLE,jump:true});assert.ok(t.vy<0);assert.equal(w.events.filter(e=>e.type==='mountJump').length,1);
});

test('all tanks have eight finite shells; leaving and reentering never replenishes them',()=>{
 const{w,t}=fixture();enter(w);assert.equal(t.rounds,8);assert.equal(t.maxRounds,8);
 for(let i=0;i<12;i++){t.cooldown=0;w.step(1/60,{...IDLE,fire:true});}
 assert.equal(w.events.filter(e=>e.type==='mountShot').length,8);assert.equal(t.rounds,0);assert.equal(abilityStates(w)[0].ready,false);
 w.step(1/60,{...IDLE,interact:true});w.player.x=t.x;w.player.y=t.y;w.player.vy=0;w.step(1/60,IDLE);enter(w);assert.equal(w.mounted,t);assert.equal(t.rounds,0);
});
