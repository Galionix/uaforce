import test from 'node:test';import assert from 'node:assert/strict';
import {runPose,RUN_RIGS,MAVKA_RUN_RIG} from '../src/game/hero-run.ts';
import {heroFrame} from '../src/game/hero-animation.ts';import {HEROES} from '../src/game/content.ts';
test('both legs exchange ground support and recover across a complete stride',()=>{
 const poses=Array.from({length:8},(_,i)=>runPose(i));
 for(const leg of ['front','back'] as const){const feet=poses.map(p=>p[leg]);assert.ok(Math.min(...feet.map(f=>f[0]))<0);assert.ok(Math.max(...feet.map(f=>f[0]))>0);assert.ok(feet.some(f=>f[1]===0));assert.ok(feet.some(f=>f[1]>=3));assert.equal(new Set(feet.map(f=>f.join(','))).size,8);}
 for(let i=0;i<8;i++)assert.deepEqual(poses[i].front,poses[(i+4)%8].back);
 assert.deepEqual(runPose(8),runPose(0));
});
test('every playable appearance has two separate leg texture regions within the actor frame',()=>{
 assert.deepEqual(Object.keys(RUN_RIGS).sort(),HEROES.map(h=>h.id).sort());
 for(const rig of [...Object.values(RUN_RIGS),MAVKA_RUN_RIG]){
  assert.ok(rig.back[0]+rig.back[2]<=rig.front[0],'independent feet, not copies of one cropped leg');
  for(const [x,y,w,h]of [rig.back,rig.front,rig.mask]){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=40&&y+h<=32);}
  assert.ok(rig.hip<rig.mask[1]&&rig.hip<30);
 }
});
test('running while firing/reloading never selects idle or locks one gait phase; airborne/climbing still wins',()=>{
 const p={grounded:true,ladder:-1,wallClimbing:false,cast:1,attack:1,reloading:2};
 const frames=Array.from({length:8},(_,i)=>heroFrame(p,i/16,true));assert.equal(new Set(frames).size,8);assert.ok(frames.every(f=>f>=8&&f<16));
 assert.equal(heroFrame({...p,grounded:false},.1,true),3);assert.ok(heroFrame({...p,ladder:0},.1,true)<8);assert.ok(heroFrame(p,.1,false)<8);
});
