import test from 'node:test';import assert from 'node:assert/strict';
import {Announcer,announcement,ANNOUNCER_NAMES} from '../src/game/announcer.ts';
function fixture(){
 const nodes:any[]=[];const duck:boolean[]=[];const bus={};
 const ctx={createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),state:'running',currentTime:0,decodeAudioData:async()=>({duration:1.5}),createBufferSource(){const n={buffer:null,onended:null,stopped:false,at:0,connect(){},disconnect(){},start(at:number){this.at=at;},stop(){this.stopped=true;}};nodes.push(n);return n;}};
 const director=new Announcer(ctx as any,bus as any,bus as any,value=>duck.push(value));return{director,ctx,nodes,duck};
}
const ok=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}) as any;
test('each hero has an individual voice key with one common unlock riff',()=>{
 for(const h of ANNOUNCER_NAMES){const c=announcement('heroChanged',h.id,true)!;assert.deepEqual(c.voices,['new-hero',h.id]);assert.equal(c.riff,'hero');const repeat=announcement('heroChanged',h.id,false)!;assert.deepEqual(repeat.voices,[h.id]);assert.equal(repeat.riff,undefined);}
 assert.equal(announcement('shot'),null);assert.equal(announcement('won')!.priority,3);
});
test('speech is serial, lower priority cannot interrupt, higher priority cancels every old source',async()=>{
 const old=globalThis.fetch;globalThis.fetch=ok;
 try{const {director,nodes,duck}=fixture();await director.say(announcement('heroChanged','lesya',true)!);assert.equal(nodes.length,3);assert.ok(nodes[1].at>nodes[0].at);assert.ok(nodes[2].at>=nodes[1].at+1.5);assert.equal(director.busy,true);assert.equal(duck.at(-1),true);
 await director.say(announcement('checkpoint')!);assert.equal(nodes.length,3);
 await director.say(announcement('heroChanged','lesya',true)!);assert.equal(nodes.length,3,'duplicate unlock must not replay');
 await director.say(announcement('won')!);assert.ok(nodes.slice(0,3).every(n=>n.stopped));assert.equal(nodes.length,5);
 for(const n of nodes.slice(3))n.onended();assert.equal(director.busy,false);assert.equal(duck.at(-1),false);
 }finally{globalThis.fetch=old;}
});
test('pause while files are loading prevents late speech or riff playback',async()=>{
 const old=globalThis.fetch;let release:()=>void=()=>{};const ready=new Promise<void>(r=>release=r);globalThis.fetch=(async()=>{await ready;return ok();}) as any;
 try{const {director,nodes,duck}=fixture();const pending=director.say(announcement('missionStart')!);assert.equal(director.busy,true);director.stop();release();await pending;assert.equal(nodes.length,0);assert.equal(director.busy,false);assert.equal(duck.at(-1),false);}finally{globalThis.fetch=old;}
});
test('missing audio is safe and retryable; suspension drops a pending cue',async()=>{
 const old=globalThis.fetch;globalThis.fetch=(async()=>({ok:false}))as any;
 try{const {director,nodes,ctx}=fixture();await director.say(announcement('boarded')!);assert.equal(director.busy,false);assert.equal(nodes.length,0);globalThis.fetch=ok;await director.say(announcement('boarded')!);assert.equal(nodes.length,1);director.stop();ctx.state='suspended';await director.say(announcement('boarded')!);assert.equal(nodes.length,1);}finally{globalThis.fetch=old;}
});

test('audio context interruption during loading clears busy and permits the next cue',async()=>{
 const old=globalThis.fetch;let release:()=>void=()=>{};const ready=new Promise<void>(r=>release=r);globalThis.fetch=(async()=>{await ready;return ok();}) as any;
 try{const {director,nodes,ctx}=fixture();const pending=director.say(announcement('missionStart')!);ctx.state='suspended';release();await pending;assert.equal(nodes.length,0);assert.equal(director.busy,false);ctx.state='running';await director.say(announcement('boarded')!);assert.equal(nodes.length,1);}finally{globalThis.fetch=old;}
});

test('routine mission starts, repeat rescues and deaths do not repeat the unlock melody',()=>{for(const event of ['missionStart','respawn','heroChanged'])assert.equal(announcement(event,'shevchenko',false)!.riff,undefined);});
