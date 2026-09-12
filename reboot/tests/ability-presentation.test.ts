import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITY_PALETTE,importAbilityPixels} from '../src/game/ability-palette.ts';
import {drawHeroEffect} from '../src/game/hero-vfx.ts';
import {HEROES} from '../src/game/content.ts';
import type {AbilityArt} from '../src/game/ability-art.ts';
import type {Effect} from '../src/game/world.ts';

test('generated alpha fringe and chroma key never become visible grey or magenta tiles',()=>{
 const pixels=new Uint8ClampedArray([255,0,255,255,120,170,210,90,247,205,60,255,23,38,54,200]);
 importAbilityPixels(pixels);
 assert.deepEqual([...pixels.slice(0,8)],Array(8).fill(0));
 for(let i=8;i<pixels.length;i+=4){assert.equal(pixels[i+3],255);assert.ok(ABILITY_PALETTE.some(c=>c.every((v,k)=>pixels[i+k]===v)));}
 const once=pixels.slice();importAbilityPixels(pixels);assert.deepEqual(pixels,once);
});

function capture(f:Effect,time=0){const calls:unknown[][]=[];const c=new Proxy({globalAlpha:1},{get:(target,key)=>key in target?target[key as keyof typeof target]:(...args:unknown[])=>calls.push([key,...args]),set:(target,key,value)=>{Object.assign(target,{[key]:value});return true;}}) as unknown as CanvasRenderingContext2D;
 const art={draw:(...args:unknown[])=>calls.push(['sprite',...args.slice(1)])} as unknown as AbilityArt;drawHeroEffect(c,f,200,200,time,art);return calls;}
const effect=(hero:Effect['hero'],age:number,kind:Effect['kind']='ultimate'):Effect=>({hero,kind,x:10,y:0,dir:1,age,life:2,hit:new Set()});

test('all eleven ability presentations are stable when paused even if renderer clock changes',()=>{
 for(const h of HEROES)for(const kind of ['special','ultimate'] as const){const f=effect(h.id,.75,kind);assert.deepEqual(capture(f,0),capture(f,100),h.id+' '+kind);assert.deepEqual([...f.hit],[]);}
});
test('lightning strike advances actual atlas frames; summons advance their own frame rows',()=>{
 const sprites=(f:Effect)=>capture(f).filter(x=>x[0]==='sprite');
 const first=sprites(effect('shevchenko',.66)).find(x=>x[1]==='lightning');
 const later=sprites(effect('shevchenko',.86)).find(x=>x[1]==='lightning');assert.ok(first&&later);assert.notEqual(first[2],later[2]);
 for(const [hero,row] of [['bandera',0],['mamai',4],['zelensky',8]] as const){const a=sprites(effect(hero,.01)).find(x=>x[1]==='summons'),b=sprites(effect(hero,.12)).find(x=>x[1]==='summons');assert.ok(a&&b);assert.ok(Number(a[2])>=row&&Number(a[2])<row+4);assert.notEqual(a[2],b[2]);}
});

test('new melee contacts use small four-frame sparks rather than oversized glove art',()=>{
 for(const hero of ['usyk','klychko'] as const){const sprites=capture(effect(hero,.05,'weapon')).filter(c=>c[0]==='sprite');assert.equal(sprites.length,1);assert.equal(sprites[0][1],'reinforcements');assert.ok(Number(sprites[0][2])<4);assert.ok(Number(sprites[0][5])<=36);}
});
test('summoning never paints duplicate stationary robots or stale tank art over physical units',()=>{
 assert.equal(capture(effect('prytula',.5,'special')).filter(c=>c[0]==='sprite').length,0);
 const early=capture(effect('prytula',.5)).filter(c=>c[0]==='sprite');assert.equal(early.length,1);assert.equal(early[0][2],6,'parachute is separate from the shared tank body');
 const late=capture(effect('prytula',1.5)).filter(c=>c[0]==='sprite');assert.equal(late.length,0);
 assert.equal(capture(effect('almaziv',.6)).filter(c=>c[0]==='sprite').length,0,'explosions must occur at projectile collisions');
});

test('Taira arcs use the existing pixel lightning atlas and detonation uses the blast atlas',()=>{const f=effect('taira',.05,'weapon');f.links=[{x:10,y:1,toX:14,toY:1},{x:14,y:1,toX:16,toY:2}];const calls=capture(f).filter(c=>c[0]==='sprite');assert.equal(calls.length,2);assert.ok(calls.every(c=>c[1]==='lightning'));f.power=2;assert.ok(capture(f).some(c=>c[0]==='sprite'&&c[1]==='blast'));const ult=effect('taira',.42);ult.impactAge=.35;assert.ok(capture(ult).some(c=>c[0]==='sprite'&&c[1]==='blast'));});
