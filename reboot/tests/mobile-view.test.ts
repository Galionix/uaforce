import test from 'node:test';import assert from 'node:assert/strict';
import {mobileViewCrop,guardGameGestures,mobileCameraShift} from '../src/game/mobile-view.ts';
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
