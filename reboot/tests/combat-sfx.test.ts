import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {World,IDLE} from '../src/game/world.ts';
import {HEROES,type HeroId} from '../src/game/content.ts';
import {SFX_ASSETS} from '../src/game/sfx-assets.ts';
import {attack} from '../src/game/hero-combat.ts';
const root=new URL('../',import.meta.url);
test('every playable kit and reload has measured, traceable PCM matching the sample bank',()=>{
 const m=JSON.parse(readFileSync(new URL('docs/COMBAT_SFX_ASSETS.json',root),'utf8'));
 const bank=readFileSync(new URL(m.bank.file,root));assert.equal(createHash('sha256').update(bank).digest('hex'),m.bank.sha256);
 assert.equal(bank.toString('ascii',0,4),'RIFF');assert.ok(bank.length<25*1024**2);
 for(const c of m.clips){
  const bytes=readFileSync(new URL(c.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);
  assert.ok(c.rms>.0001&&c.peak<=.8);assert.ok(c.layers.length>0);
  const entry=SFX_ASSETS[c.id as keyof typeof SFX_ASSETS];assert.equal(entry.seconds,c.seconds);assert.ok(entry.offset+entry.seconds<=m.bank.seconds);
  const pcm=bytes.subarray(44),start=44+Math.round(entry.offset*24000)*2;
  assert.ok(bank.subarray(start,start+pcm.length).equals(pcm),c.id+' exact bank slice');
 }
 for(const h of HEROES){for(const key of ['weapon-0','special','ultimate','hit'])assert.ok(m.clips.some((c:any)=>c.id===h.id+'-'+key));if(h.magazine)for(const key of ['reload','reload-end'])assert.ok(m.clips.some((c:any)=>c.id===(h.id==='taira'?(key==='reload'?'taira-cell-v1':'taira-cell-ready-v2'):h.id+'-'+key)));}
});
function fixture(hero:HeroId){const w=new World(0,HEROES.map(h=>h.id),hero);w.mode='playing';w.player.x=5;w.mounts=[];w.enemies=[];w.allies=[];w.boxes=w.boxes.filter(b=>b.y<0);return w;}
const run=(w:World,n:number)=>{for(let i=0;i<n;i++)w.step(1/60,IDLE);};
test('sword miss has no hit, reflection requires a projectile, sniper bolt is separate from reload',()=>{
 const w=fixture('mamai');attack(w,true);assert.ok(w.events.some(e=>e.type==='shot'&&e.variant==='melee'));assert.equal(w.events.some(e=>e.sfx?.endsWith('-hit')),false);
 const p=fixture('skovoroda');attack(p);assert.equal(p.events.some(e=>e.sfx==='ricochet'),false);
 p.bullets.push({id:987,x:6,y:1,vx:-10,vy:0,life:1,damage:10,friendly:false});attack(p);assert.equal(p.events.filter(e=>e.sfx==='ricochet').length,1);
 const s=fixture('bilozerska');s.step(1/60,{...IDLE,fire:true});run(s,30);assert.equal(s.events.filter(e=>e.sfx==='bolt').length,1);assert.equal(s.events.filter(e=>e.type==='reloadStart').length,0);run(s,150);assert.equal(s.events.filter(e=>e.sfx==='bolt').length,1);
});
test('mine arm, bottle ignition, root contact and natural end follow simulation phases',()=>{
 const mine=fixture('bilozerska');mine.step(1/60,{...IDLE,special:true});assert.equal(mine.events.some(e=>e.sfx==='mine-arm'),false);run(mine,35);assert.equal(mine.events.filter(e=>e.sfx==='mine-arm').length,1);run(mine,90);assert.equal(mine.events.filter(e=>e.sfx==='mine-arm').length,1);
 const bottle=fixture('bandera');bottle.step(1/60,{...IDLE,special:true});assert.equal(bottle.events.some(e=>e.sfx==='glass-fire'),false);run(bottle,45);assert.equal(bottle.events.filter(e=>e.sfx==='glass-fire').length,1);run(bottle,260);assert.equal(bottle.events.filter(e=>e.sfx==='bandera-special-end').length,1);
 const lesya=fixture('lesya');lesya.enemies.push({id:987,x:7,y:0,hp:1000,maxHp:1000,dir:-1,anchor:7,heavy:false,cooldown:99,windup:0});lesya.step(1/60,{...IDLE,ultimate:true});run(lesya,90);assert.equal(lesya.events.filter(e=>e.sfx==='roots').length,1,'one root contact, not one sound per damage tick');
});
