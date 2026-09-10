import test from 'node:test';import assert from 'node:assert/strict';
import {TouchState,touchDevice} from '../src/game/touch-state.ts';
import {Input} from '../src/game/input.ts';
test('multi-touch chord keeps movement, held fire and jump independent',()=>{
 const t=new TouchState();assert.ok(t.startStick(1));assert.equal(t.startStick(9),false);t.moveStick(1,1,.1);t.press(2,'fire');t.press(3,'jump');
 let a=t.sample();assert.equal(a.move,1);assert.equal(a.climb,0);assert.equal(a.fire,true);assert.equal(a.jumpHeld,true);
 t.release(3);a=t.sample();assert.equal(a.jump,false);assert.equal(a.fire,true);assert.equal(a.move,1);
 t.moveStick(9,-1,0);assert.equal(t.sample().move,1);t.release(1);assert.equal(t.sample().move,0);assert.equal(t.sample().fire,true);
});
test('fast tap survives release, cancel and clear cannot leave a stuck input',()=>{
 const t=new TouchState();t.press(1,'interact');t.release(1);assert.equal(t.sample().interact,true);assert.equal(t.sample().interact,false);
 t.press(2,'ultimate');t.release(2,true);assert.equal(t.sample().ultimate,false);
 t.startStick(3);t.moveStick(3,0,-1);assert.equal(t.sample().climb,1);t.press(4,'fire');t.clear();const a=t.sample();assert.equal(a.move,0);assert.equal(a.climb,0);assert.equal(a.fire,false);
});
test('iPad desktop identity and coarse input work without requiring a mobile UA',()=>{
 assert.equal(touchDevice(true,5,'desktop','Linux'),true);assert.equal(touchDevice(false,5,'desktop','MacIntel'),true);
 assert.equal(touchDevice(false,0,'desktop','MacIntel'),false);assert.equal(touchDevice(false,5,'Android','Linux'),true);
});
test('touch adapter generates one-shot abilities; pause, blur and hidden pages release fingers',()=>{
 const win=new EventTarget(),doc={activeElement:null,hidden:false,hasFocus:()=>true};
 for(const [key,value] of Object.entries({window:win,document:doc,HTMLElement:class{},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null}}))Object.defineProperty(globalThis,key,{value,configurable:true});
 const input=new Input(new EventTarget() as any),t=input.touch;
 t.startStick(1);t.moveStick(1,1,0);t.press(2,'fire');t.press(3,'jump');t.press(4,'special');t.press(5,'ultimate');
 let a=input.poll().action;assert.equal(a.move,1);assert.equal(a.fire,true);assert.equal(a.jump,true);assert.equal(a.special,true);assert.equal(a.ultimate,true);
 a=input.poll().action;assert.equal(a.jump,false);assert.equal(a.jumpHeld,true);assert.equal(a.special,false);assert.equal(a.ultimate,false);
 input.clear();a=input.poll().action;assert.equal(a.move,0);assert.equal(a.fire,false);assert.equal(a.jump,false);
 t.press(6,'fire');win.dispatchEvent(new Event('blur'));assert.equal(input.poll().action.fire,false);
 t.press(7,'special');doc.hidden=true;assert.equal(input.poll().action.special,false);doc.hidden=false;assert.equal(input.poll().action.special,false);
 input.destroy();
});

test('fullscreen denial is recoverable and never requests an orientation lock',async()=>{
 const {gameFullscreen}=await import('../src/game/fullscreen.ts');let locks=0;
 Object.defineProperty(globalThis,'document',{value:{documentElement:{requestFullscreen:async()=>{throw Error('denied');}}},configurable:true});
 Object.defineProperty(globalThis,'screen',{value:{orientation:{lock:async()=>locks++}},configurable:true});
 assert.match(await gameFullscreen(true),/гра працює у вкладці/);assert.equal(locks,0);
});
test('landscape lock follows fullscreen success; unsupported lock still leaves fullscreen usable',async()=>{
 const {gameFullscreen}=await import('../src/game/fullscreen.ts'),calls:string[]=[];
 Object.defineProperty(globalThis,'document',{value:{documentElement:{requestFullscreen:async()=>{calls.push('fullscreen');}}},configurable:true});
 Object.defineProperty(globalThis,'screen',{value:{orientation:{lock:async(v:string)=>{calls.push(v);throw Error('unsupported');}}},configurable:true});
 assert.match(await gameFullscreen(true),/Поверни телефон/);assert.deepEqual(calls,['fullscreen','landscape']);
});
test('missing fullscreen API and fullscreen exit are safe on desktop and mobile',async()=>{
 const {gameFullscreen}=await import('../src/game/fullscreen.ts');let exited=false;
 Object.defineProperty(globalThis,'document',{value:{documentElement:{}},configurable:true});assert.match(await gameFullscreen(true),/без повного екрана/);
 Object.defineProperty(globalThis,'document',{value:{fullscreenElement:{},documentElement:{},exitFullscreen:async()=>{exited=true;}},configurable:true});assert.equal(await gameFullscreen(false),'');assert.equal(exited,true);
});
