import test from 'node:test';
import assert from 'node:assert/strict';
import { axis,padActions,freshBindings,Edges,loadBindings,Input } from '../src/game/input.ts';
const pad=()=>({id:'Test controller',index:2,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});
test('deadzone removes drift and rescales the remaining stick range',()=>{
  assert.equal(axis(.19,.2),0);assert.equal(axis(-.19,.2),0);assert.equal(axis(1,.2),1);assert.equal(axis(-1,.2),-1);assert.equal(axis(NaN,.2),0);assert.ok(Math.abs(axis(.6,.2)-.5)<1e-9);
});
test('standard pad maps movement, D-pad, trigger and ignores right-stick aiming',()=>{
  const p=pad();p.axes=[.7,0,-.9,-.8];p.buttons[7].value=.8;p.buttons[0].pressed=true;
  const a=padActions(p,freshBindings());assert.ok(a.move>0);assert.equal("aimX" in a,false);assert.equal("aimY" in a,false);assert.equal(a.fire,true);assert.equal(a.jump,true);
  p.buttons[14].pressed=true;assert.equal(padActions(p,freshBindings()).move,-1);
});
test('nonstandard movement and button mappings and missing controls are supported',()=>{
  const p=pad(),b=freshBindings();b.buttons.fire=3;b.moveAxis=1;p.buttons[3].pressed=true;p.axes[1]=.8;
  assert.equal(padActions(p,b).fire,true);assert.ok(padActions(p,b).move>0);assert.equal(padActions(null,b).fire,false);assert.equal(padActions({...p,axes:[],buttons:[]},b).move,0);
});
test('one-shot input edges do not repeat while held',()=>{
  const e=new Edges();assert.equal(e.take('jump',true),true);assert.equal(e.take('jump',true),false);e.take('jump',false);assert.equal(e.take('jump',true),true);
});
test('invalid persisted values cannot poison input configuration',()=>{
  const b=loadBindings('{"deadzone":1,"moveAxis":-1,"buttons":{"jump":999}}');assert.deepEqual(b,freshBindings());assert.deepEqual(loadBindings('broken'),freshBindings());
});
test('adapter reads sparse pad slots, releases held inputs on reconnect and preserves fast keyboard taps',()=>{
  const win=new EventTarget();const canvas=new EventTarget() as EventTarget&{focus:()=>void};canvas.focus=()=>{};
  let devices:any[]=[null,null,pad()];
  Object.defineProperty(globalThis,'window',{value:win,configurable:true});
  Object.defineProperty(globalThis,'document',{value:{activeElement:null,hidden:false,hasFocus:()=>true},configurable:true});
  Object.defineProperty(globalThis,'HTMLElement',{value:class{},configurable:true});
  Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>devices},configurable:true});
  Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>null,setItem:()=>{}},configurable:true});
  const input=new Input(canvas as any);let disconnected=0;input.onDisconnect=()=>disconnected++;
  input.poll();assert.equal(input.pad?.index,2);
  devices[2].buttons[0].pressed=true;assert.equal(input.poll().action.jump,true);const held=input.poll().action;assert.equal(held.jump,false);assert.equal(held.jumpHeld,true);
  devices=[];assert.equal(input.poll().action.move,0);assert.equal(disconnected,1);
  const connected=pad();connected.buttons[0].pressed=true;devices=[null,null,connected];assert.equal(input.poll().action.jump,false);
  connected.buttons[0].pressed=false;input.poll();connected.buttons[0].pressed=true;assert.equal(input.poll().action.jump,true);
  connected.buttons[0].pressed=false;input.poll();
  const down=new Event('keydown');Object.defineProperty(down,'code',{value:'Space'});win.dispatchEvent(down);const up=new Event('keyup');Object.defineProperty(up,'code',{value:'Space'});win.dispatchEvent(up);
  assert.equal(input.poll().action.jump,true);assert.equal(input.poll().action.jump,false);
  const trigger=devices[2];trigger.buttons[5].pressed=true;trigger.buttons[6].value=.9;
  let actions=input.poll().action;assert.equal(actions.special,true);assert.equal(actions.ultimate,true);assert.equal(actions.fire,false);
  actions=input.poll().action;assert.equal(actions.special,false);assert.equal(actions.ultimate,false);
  trigger.buttons[5].pressed=false;trigger.buttons[6].value=0;input.poll();
  const q=new Event('keydown');Object.defineProperty(q,'code',{value:'KeyQ'});win.dispatchEvent(q);
  const qup=new Event('keyup');Object.defineProperty(qup,'code',{value:'KeyQ'});win.dispatchEvent(qup);
  assert.equal(input.poll().action.ultimate,true);assert.equal(input.poll().action.ultimate,false);
  win.dispatchEvent(q);assert.equal(input.poll().action.ultimate,true);input.clear();
  const repeat=new Event('keydown');Object.defineProperties(repeat,{code:{value:'KeyQ'},repeat:{value:true}});win.dispatchEvent(repeat);assert.equal(input.poll().action.ultimate,false,'held key cannot spend an ultimate after a reveal clears input');
  trigger.buttons[0].pressed=true;input.clear();assert.equal(input.poll().confirm,false,'held pad confirmation waits for release');trigger.buttons[0].pressed=false;input.poll();trigger.buttons[0].pressed=true;assert.equal(input.poll().confirm,true);
  win.dispatchEvent(qup);win.dispatchEvent(q);assert.equal(input.poll().action.ultimate,true);input.destroy();
});

test('pause navigation and confirmation work with a held trigger; stick/D-pad repeat without double confirmation',()=>{
 const win=new EventTarget(),p=pad();
 Object.defineProperty(globalThis,'window',{value:win,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{activeElement:null,hidden:false,hasFocus:()=>true},configurable:true});
 Object.defineProperty(globalThis,'HTMLElement',{value:class{},configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[p]},configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>null},configurable:true});
 const input=new Input(new EventTarget() as any);input.poll();
 p.buttons[7].pressed=true;p.buttons[9].pressed=true;assert.equal(input.poll().pause,true);
 input.clear();p.buttons[13].pressed=true;
 assert.equal(input.poll().down,true,'D-pad must not wait for the trigger or Start release');
 assert.equal(input.poll(.1).down,false);assert.equal(input.poll(.4).down,true);
 assert.equal(input.poll(.12).down,true,'held direction repeats');
 p.buttons[13].pressed=false;p.axes[1]=-.55;assert.equal(input.poll().up,true,'stick reverses immediately');
 p.buttons[0].pressed=true;assert.equal(input.poll().confirm,true);assert.equal(input.poll().confirm,false);
 input.clear();assert.equal(input.poll().confirm,false,'held confirm cannot leak into a new screen');
 p.buttons[0].pressed=false;input.poll();p.buttons[0].pressed=true;assert.equal(input.poll().confirm,true);
 assert.equal(input.poll().action.fire,false,'held gameplay trigger remains blocked after pause');
 p.buttons[7].pressed=false;input.poll();p.buttons[7].pressed=true;assert.equal(input.poll().action.fire,true);
 input.destroy();
});

test('older saved bindings acquire an independent ultimate control',()=>{const b=loadBindings('{"keys":{"special":"KeyK"},"buttons":{"special":3}}');assert.equal(b.keys.special,'KeyK');assert.equal(b.keys.ultimate,'KeyQ');assert.equal(b.buttons.ultimate,6);assert.equal(b.buttons.special,3);});

test('PlayStation jump is cross and interaction is square; unknown pads show both conventions',async()=>{
 const {padButtonLabel}=await import('../src/game/input.ts');
 assert.equal(padButtonLabel(0,'DualSense Wireless Controller'),'✕');assert.equal(padButtonLabel(2,'054c-0ce6'),'□');
 assert.equal(padButtonLabel(2,'Xbox Wireless Controller'),'X');assert.equal(padButtonLabel(2,'Generic Controller'),'X / □');
});
