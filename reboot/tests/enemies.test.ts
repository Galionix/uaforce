import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';
import {addVehicle,hostileBlast,VEHICLES,enemyActive} from '../src/game/enemies.ts';
import {summonFollowers} from '../src/game/followers.ts';
import {announcement} from '../src/game/announcer.ts';
import fs from 'node:fs';import crypto from 'node:crypto';
function fixture(){const w=new World(0,['skovoroda','it-army','zelensky']);w.mode='playing';w.boxes=w.boxes.filter(b=>b.y<0);w.enemies=[];w.allies=[];w.medkits=[];w.player.x=15;return w;}
function run(w:World,seconds:number){for(let i=0;i<Math.round(seconds*60);i++)w.step(1/60,IDLE);}
test('existing missions introduce all three types with distinct stats and spaced triggers',()=>{for(let i=0;i<3;i++){const w=new World(i);assert.equal(new Set(w.enemies.filter(e=>e.vehicle).map(e=>e.vehicle!.kind)).size,3);assert.ok(w.enemies.filter(e=>e.vehicle).every(e=>!e.vehicle!.active));}assert.ok(VEHICLES.tank.hp>VEHICLES.plane.hp&&VEHICLES.plane.hp>VEHICLES.shahed.hp);});
for(const kind of ['tank','plane','shahed']as const)test(kind+' warns once, waits before attacking, freezes on pause and stops on death',()=>{
 const w=fixture(),e=addVehicle(w,kind,26,kind==='tank'?0:6,20);run(w,2);assert.equal(e.vehicle!.active,false);w.damageEnemy(e,1000);assert.equal(e.hp,e.maxHp,'dormant units are not hit');
 w.player.x=21;run(w,.5);assert.ok(enemyActive(e));assert.equal(w.bullets.length,0);assert.equal(e.vehicle!.phase,'warning');assert.equal(w.events.filter(e=>e.type.endsWith('Alert')).length,1);
 w.mode='paused';const state=JSON.stringify(w);run(w,2);assert.equal(JSON.stringify(w),state);w.mode='playing';w.damageEnemy(e,1000);const events=w.events.length;run(w,3);assert.equal(w.events.length,events);assert.equal(w.kills,1);
});
test('tank locks an aim point before firing and respects a long reload',()=>{
 const w=fixture(),e=addVehicle(w,'tank',27,0,0);run(w,1.3);assert.equal(e.vehicle!.phase,'aim');const aim=e.vehicle!.aimX;w.player.x=10;run(w,1);assert.equal(e.vehicle!.aimX,aim);assert.equal(w.events.filter(e=>e.type==='tankShot').length,1);const shell=w.bullets.find(b=>b.ordnance==='shell')!;assert.ok(shell);assert.ok(shell.life<=2.2);run(w,2.8);assert.equal(w.events.filter(e=>e.type==='tankShot').length,1);run(w,1.6);assert.equal(w.events.filter(e=>e.type==='tankShot').length,2);
});
test('plane moves slowly, fires exactly three discrete rockets, then leaves without awarding a kill',()=>{
 const w=fixture(),e=addVehicle(w,'plane',33,9,0);w.player.invulnerable=999;run(w,2);assert.ok(e.x<33&&e.x>31);run(w,6);assert.equal(w.events.filter(e=>e.type==='rocketLaunch').length,3);assert.equal(e.vehicle!.phase,'leaving');run(w,18);assert.equal(e.hp,0);assert.equal(w.kills,0);
});
test('drone locks its dive so moving after the warning can evade it',()=>{
 const w=fixture(),e=addVehicle(w,'shahed',22,5,0);run(w,1.5);assert.equal(e.vehicle!.phase,'aim');assert.equal(e.vehicle!.aimX,15);w.player.x=4;run(w,3);assert.equal(e.hp,0);assert.equal(w.player.hp,100);assert.equal(w.events.filter(e=>e.type==='droneDive').length,1);assert.equal(w.events.filter(e=>e.type==='hostileBlast').length,1);
});
test('shooting down a drone prevents its attack explosion',()=>{const w=fixture(),e=addVehicle(w,'shahed',21,0,0);run(w,.1);w.bullets.push({id:w.nextId(),x:17,y:.4,vx:60,vy:0,life:.3,friendly:true,damage:40});run(w,.2);assert.ok(e.hp<=0);assert.equal(w.kills,1);assert.equal(w.events.filter(e=>e.type==='hostileBlast').length,0);});
test('rockets sweep into cover; cover shields the player before being destroyed',()=>{
 const w=fixture();w.player.x=10;w.boxes.push({id:w.nextId(),x:11,y:0,w:.3,h:3,hp:40,maxHp:40,kind:'wall'});w.bullets.push({id:w.nextId(),x:12,y:1,vx:-100,vy:0,life:1,friendly:false,damage:24,ordnance:'rocket',blastRadius:2.8});run(w,.1);assert.equal(w.player.hp,100);assert.equal(w.bullets.length,0);assert.ok(w.boxes.at(-1)!.hp<=0);assert.equal(w.events.filter(e=>e.type==='hostileBlast').length,1);
});
test('hostile explosions damage followers and player, never award allied kills',()=>{const w=fixture();summonFollowers(w,'infantry');const f=w.followers[0];f.x=16;hostileBlast(w,15,1,3,24);assert.equal(w.player.hp,76);assert.equal(f.hp,36);assert.equal(w.kills,0);});
test('reflected rocket changes faction and no longer explodes against its owner',()=>{
 const w=fixture();w.heroId='skovoroda';const e=addVehicle(w,'tank',20,0,0);run(w,.1);w.bullets.push({id:w.nextId(),x:16,y:1,vx:-10,vy:0,life:2,friendly:false,damage:24,ordnance:'rocket',blastRadius:2.8});w.step(1/60,{...IDLE,fire:true});assert.ok(w.bullets.some(b=>b.ordnance&&b.friendly));run(w,1);assert.ok(e.hp<e.maxHp);assert.equal(w.player.hp,100);
});
test('DDoS stops a diving drone and an aiming tank without cancelling their HP',()=>{const w=fixture();w.heroId='it-army';const tank=addVehicle(w,'tank',24,0,0),drone=addVehicle(w,'shahed',22,5,0);run(w,1.5);w.step(1/60,{...IDLE,ultimate:true});const x=drone.x,y=drone.y;run(w,1);assert.equal(drone.x,x);assert.equal(drone.y,y);assert.equal(w.events.filter(e=>e.type==='tankShot').length,0);assert.equal(tank.hp,320);});
test('active vehicles share normal weapon damage and cannot duplicate kill rewards',()=>{const w=fixture(),e=addVehicle(w,'tank',23,0,0);run(w,.1);w.bullets.push({id:w.nextId(),x:19,y:1,vx:100,vy:0,life:.2,friendly:true,damage:82});run(w,.1);assert.equal(e.hp,238);w.damageEnemy(e,500);w.damageEnemy(e,500);assert.equal(w.kills,1);});
test('each radio alert references a present nonempty Ukrainian WAV with recorded provenance',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../docs/THREAT_VOICES.json',import.meta.url),'utf8'));
 for(const [event,id]of [['tankAlert','tank-alert'],['planeAlert','plane-alert'],['droneAlert','drone-alert']]){assert.equal(announcement(event)!.voices[0],id);const clip=manifest.clips.find((c:any)=>c.id===id);assert.ok(clip.seconds>0&&clip.seconds<6);const data=fs.readFileSync(new URL('../'+clip.file,import.meta.url));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),clip.sha256);}
});
