import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HEROES} from '../src/game/content.ts';
import {MotionFoley} from '../src/game/hero-foley.ts';
import {World,IDLE} from '../src/game/world.ts';

test('all eleven heroes have recorded movement and contact variants in the runtime pack',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/COMBAT_SFX_ASSETS.json',import.meta.url),'utf8'));
 for(const kind of ['step','climb','jump','land','hurt','ready']){
  const signatures=new Set<string>();
  for(const h of HEROES)for(let variant=0;variant<3;variant++){
   const c=manifest.clips.find((c:any)=>c.id===`foley-${h.id}-${kind}-${variant}`);
   assert.ok(c);assert.ok(c.seconds<=.3&&c.rms>.001&&c.peak<.8);signatures.add(c.sha256);
  }
  assert.equal(signatures.size,33,'hero/material variants remain distinct');
 }
});

function fixture(){
  const w=new World();w.mode='playing';w.enemies=[];w.mounts=[];w.ladders=[];w.allies=[];w.ammoCrates=[];
  w.boxes=[{id:9000,x:50,y:-1,w:100,h:1,hp:Infinity,maxHp:Infinity,kind:'earth'}];
  return w;
}
const tick=(w:World,n:number,a=IDLE)=>{for(let i=0;i<n;i++)w.step(1/60,a);};
test('footsteps follow ground displacement, not idle input or movement blocked by a wall',()=>{
  const w=fixture();tick(w,60);assert.equal(w.events.some(e=>e.type==='footstep'||e.type==='land'),false);
  tick(w,60,{...IDLE,move:1});assert.equal(w.events.filter(e=>e.type==='footstep').length,3);
  w.boxes.push({id:9001,x:w.player.x+1,y:0,w:1,h:5,hp:100,maxHp:100,kind:'wall'});
  tick(w,10,{...IDLE,move:1});w.events=[];tick(w,120,{...IDLE,move:1});assert.equal(w.events.some(e=>e.type==='footstep'),false);
});
test('a ground jump has one takeoff and one landing; idle does not repeat contacts',()=>{
  const w=fixture();tick(w,1);w.step(1/60,{...IDLE,jump:true});tick(w,100);
  assert.equal(w.events.filter(e=>e.type==='jump').length,1);assert.equal(w.events.filter(e=>e.type==='land').length,1);
  w.events=[];tick(w,180);assert.deepEqual(w.events,[]);
});
test('ladder movement has contacts, holding position does not; vehicle movement has no footsteps',()=>{
  const w=fixture();w.ladders=[{x:3,bottom:0,top:12}];tick(w,60,{...IDLE,climb:1});
  assert.ok(w.events.filter(e=>e.type==='climbContact').length>=3);
  w.events=[];tick(w,60);assert.equal(w.events.some(e=>e.type==='climbContact'||e.type==='footstep'),false);
  const vehicle=new World();vehicle.mode='playing';vehicle.enemies=[];vehicle.mounted=vehicle.mounts[0];vehicle.player.x=vehicle.mounted.x;
  tick(vehicle,60,{...IDLE,move:1});assert.equal(vehicle.events.some(e=>['footstep','jump','land','climbContact'].includes(e.type)),false);
});
test('readiness sounds once per recovered charge batch and cannot regenerate the ultimate',()=>{
  const w=fixture();w.heroId='bilozerska';w.player.specialRecovery=[.1,.1,.4];w.player.energy=0;
  tick(w,8);assert.equal(w.events.filter(e=>e.type==='abilityReady').length,1);
  tick(w,40);assert.equal(w.events.filter(e=>e.type==='abilityReady').length,2);assert.equal(w.player.energy,0);
  w.events=[];w.player.specialRecovery=[.1];w.mode='paused';tick(w,120);assert.deepEqual(w.events,[]);assert.equal(w.player.specialRecovery[0],.1);
});
test('teleports and hero changes reset stride, without phantom landing or inherited contacts',()=>{
  const f=new MotionFoley(),m={x:0,y:3,grounded:false,ladder:-1,wallClimbing:false,hero:'shevchenko' as const};
  f.step(m);assert.deepEqual(f.step({...m,x:90,y:0,grounded:true}),[]);
  assert.deepEqual(f.step({...m,x:90,y:0,grounded:true,hero:'lesya'}),[]);
});
