import test from 'node:test';import assert from 'node:assert/strict';
import {MobileFraming,cameraFollow,mobileViewCrop,guardGameGestures,mobileCameraShift} from '../src/game/mobile-view.ts';
import {teamCamera} from '../src/game/shared-screen.ts';
import {World} from '../src/game/world.ts';

test('mobile scene grows but keeps the player and ground inside the frame at either map edge',()=>{
 for(const x of [48,205,320,600])for(const facing of [-1,1]){
  const crop=mobileViewCrop(1.35,[{x,y:266,facing}]);assert.equal(crop.zoom,1.35);
  assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=640.001&&crop.y+crop.height<=360.001);
  assert.ok(x>=crop.x&&x<=crop.x+crop.width);assert.ok(234>=crop.y&&266<=crop.y+crop.height);
 }
 assert.equal(mobileViewCrop(1,[]).zoom,1);assert.equal(mobileViewCrop(NaN,[]).zoom,1);
});
test('co-op zoom fits both actors and tanks across every legal team separation and height',()=>{
 const w=new World(0);w.addPlayer();
 for(const x of [3,35,90])for(const dx of [0,10,20,30])for(const y of [0,8,20])for(const dy of [0,6,12]){
  Object.assign(w.players[0].body,{x,y});Object.assign(w.players[1].body,{x:x+dx,y:y+dy});
  const camera=teamCamera(w),actors=w.players.map(a=>({x:a.body.x*16-(camera.x*16-320),y:266-a.body.y*16+Math.max(0,camera.y*16-80),facing:1,mounted:true}));
  const shift=mobileCameraShift(actors.map(a=>a.x));for(const actor of actors)actor.x+=shift;
  const crop=mobileViewCrop(1.5,actors);
  for(const a of actors){assert.ok(a.x-24>=crop.x-.001&&a.x+24<=crop.x+crop.width+.001);assert.ok(a.y-40>=crop.y-.001&&a.y<=crop.y+crop.height+.001);}
  assert.ok(crop.zoom>=1&&crop.zoom<=1.5);
 }
});
test('separated co-op partners widen the view without moving either actor',()=>{
 const actors=[{x:80,y:266,facing:1},{x:560,y:266,facing:-1}],before=structuredClone(actors);
 const wide=mobileViewCrop(1.35,actors),close=mobileViewCrop(1.35,[actors[0],{...actors[1],x:160}]);
 assert.ok(wide.zoom<close.zoom);assert.deepEqual(actors,before);
});
test('gameplay gestures are cancelled, menu gestures and keyboard clicks remain available',()=>{
 const surface=new EventTarget();let active=true;const remove=guardGameGestures(surface,()=>active);
 for(const type of ['touchstart','touchmove','touchend','gesturestart','dblclick']){const e=new Event(type,{cancelable:true});surface.dispatchEvent(e);assert.equal(e.defaultPrevented,true);}
 const click=new Event('click',{cancelable:true});surface.dispatchEvent(click);assert.equal(click.defaultPrevented,false);
 active=false;const menu=new Event('touchend',{cancelable:true});surface.dispatchEvent(menu);assert.equal(menu.defaultPrevented,false);
 active=true;remove();const detached=new Event('touchstart',{cancelable:true});surface.dispatchEvent(detached);assert.equal(detached.defaultPrevented,false);
});

test('mobile camera moves a left-edge spawn clear of the thumb zone without hiding the partner',()=>{
 for(const xs of [[48],[48,64],[48,528],[580,600]]){
  const shift=mobileCameraShift(xs);for(const x of xs)assert.ok(x+shift>=32&&x+shift<=608);
  if(xs.length===1)assert.ok(xs[0]+shift>200);
 }
});

test('turning at mobile zoom moves the crop gradually instead of jumping across the hero',()=>{
 const rig=new MobileFraming(),actor={x:269,y:266,facing:1};
 const start=rig.step(1.35,[actor],1/60);actor.facing=-1;
 const instant=mobileViewCrop(1.35,[actor]),first=rig.step(1.35,[actor],1/60);
 assert.ok(Math.abs(instant.x-start.x)>80,'reproduces the old framing jump');
 assert.ok(Math.abs(first.x-start.x)<5,'one rendered frame cannot jump to the opposite crop');
 let last=first;for(let i=0;i<20;i++){const next=rig.step(1.35,[actor],1/60);assert.ok(next.x<=last.x);assert.ok(actor.x>=next.x&&actor.x<=next.x+next.width);last=next;}
 assert.ok(Math.abs(last.x-instant.x)<5,'quick settling, not a sluggish camera');
 const frozen=rig.step(1.35,[{...actor,facing:1}],0);assert.deepEqual(frozen,last);
 rig.reset();assert.deepEqual(rig.step(1.35,[actor],0),instant,'mission resets do not inherit the previous look direction');
});
test('camera and framing response are stable at 30, 60 and 120 fps without actor mutations',()=>{
 const values=[];for(const fps of [30,60,120]){
  const rig=new MobileFraming(),a={x:269,y:266,facing:1};rig.step(1.35,[a],0);a.facing=-1;let crop,camera=0;
  for(let i=0;i<fps/2;i++){crop=rig.step(1.35,[a],1/fps);camera=cameraFollow(camera,128,1/fps);}
  values.push({x:crop!.x,camera});assert.deepEqual(a,{x:269,y:266,facing:-1});
 }
 for(const v of values){assert.ok(Math.abs(v.x-values[0].x)<1e-8);assert.ok(Math.abs(v.camera-values[0].camera)<1e-8);}
 assert.equal(cameraFollow(10,200,0),10);
});
test('smoothed framing immediately widens for a separated co-op partner and slowly zooms back',()=>{
 const rig=new MobileFraming(),near=[{x:250,y:266,facing:1,mounted:true},{x:290,y:266,facing:-1,mounted:true}];
 rig.step(1.5,near,0);const far=[{...near[0],x:65},{...near[1],x:575,y:100}],wide=rig.step(1.5,far,1/60);
 for(const a of far){assert.ok(a.x-24>=wide.x&&a.x+24<=wide.x+wide.width);assert.ok(a.y-40>=wide.y&&a.y<=wide.y+wide.height);}
 const closer=rig.step(1.5,near,1/60);assert.ok(closer.zoom>wide.zoom&&closer.zoom<1.5);
});
