import type {World} from './world.ts';
import {navigateGround} from './followers.ts';
import {constrainTeam,teamCamera} from './shared-screen.ts';
export type Direction={dx?:number;face?:-1|1;pose?:'idle'|'aim'|'cast';jump?:boolean};
export type StoryBeat={seconds:number;camera:'team'|'guard'|{x:number;y:number};cameraOffsetX?:number;player?:Direction;players?:Record<number,Direction>;guard?:Direction;enemies?:Record<number,Direction>;caption?:string;sound?:'enemySuspect'|'enemyAlert'};
export type StoryScene={id:string;mission:number;triggerX:number;guardPost:number;extraGuards?:number[];beats:StoryBeat[]};
/** Authoring surface: explicit shots, not hard-coded branches in the gameplay loop. */
export const STORY_SCENES:StoryScene[]=[
 {id:'depot-raid',mission:9,triggerX:8,guardPost:16,beats:[
  {seconds:1.6,camera:'guard',guard:{face:1},caption:'Склади, що живили наступ. Пора припинити постачання.'},
  {seconds:1.8,camera:'team',player:{face:1,pose:'aim'},caption:'Три арсенали. Потім — аеродром.'},
 ]},
 {id:'airbase-raid',mission:10,triggerX:8,guardPost:16,beats:[
  {seconds:1.5,camera:'guard',guard:{face:-1,pose:'aim'},sound:'enemySuspect',caption:'Сьогодні ці літаки нікуди не полетять.'},
  {seconds:1.8,camera:'team',player:{face:1,pose:'aim'},caption:'Знищуємо стоянки. Відкриваємо шлях на Москву.'},
 ]},
 {id:'kremlin-final',mission:11,triggerX:8,guardPost:17,beats:[
  {seconds:1.6,camera:'guard',guard:{face:1},caption:'Кремль. Тут закінчується ланцюг наказів.'},
  {seconds:1.8,camera:'team',player:{face:1,pose:'aim'},caption:'Остання ціль — Хуйло. Доведемо справу до кінця.'},
 ]},

 {id:'river-watch',mission:0,triggerX:8,guardPost:15,beats:[
  {seconds:1.3,camera:'guard',cameraOffsetX:8,guard:{dx:1.5,face:1},caption:'Ворожий патруль. Не дамо підняти тривогу.'},
  {seconds:1.1,camera:'guard',cameraOffsetX:8,guard:{face:-1,pose:'aim'},sound:'enemySuspect'},
  {seconds:1.5,camera:'team',player:{dx:1.5,face:1,pose:'aim'},players:{1:{dx:.7,face:-1,pose:'aim'}},guard:{dx:-1},caption:'Разом. За своїх.'},
 ]},
 {id:'harbor-watch',mission:2,triggerX:8,guardPost:12,beats:[
  {seconds:1.2,camera:'guard',cameraOffsetX:8,guard:{dx:1.5,face:1},caption:'Попереду порт. Знайдемо шлях до полонених.'},
  {seconds:1.1,camera:'guard',cameraOffsetX:8,guard:{face:-1,pose:'aim'},sound:'enemySuspect'},
  {seconds:1.5,camera:'team',player:{dx:1.2,face:1},caption:'Тримаймося разом. Рушаймо!'},
 ]},
];
export type StoryState={id:string;beat:number;elapsed:number;age:number;exit:number|null;guardId:number;players:{x:number;y:number}[];guard:{x:number;y:number};cast:{id:number;x:number;y:number}[];camera:{x:number;y:number};caption:string;entered:boolean};
export function beginStory(w:World,id:string){
 const scene=STORY_SCENES.find(s=>s.id===id);if(!scene||w.story||w.mode!=='playing'||w.storyDone.includes(id)||w.players.some(a=>!!a.mounted||!a.body.grounded))return false;
 const guard=w.enemies.find(e=>e.hp>0&&!e.boss&&!e.vehicle&&Math.abs(e.anchor-scene.guardPost)<.1);if(!guard)return false;
 w.storyPending=null;for(const e of w.enemies)if(e.infantry){e.infantry.moving=false;e.infantry.grounded=e.infantry.vy<=0&&w.boxes.some(b=>b.hp>0&&Math.abs(e.x-b.x)<b.w/2+.2&&Math.abs(e.y-b.y-b.h)<.05);}
 for(const f of w.followers)f.moving=false;
 w.storyDone.push(id);w.story={id,beat:0,elapsed:0,age:0,exit:null,guardId:guard.id,players:w.players.map(a=>({x:a.body.x,y:a.body.y})),guard:{x:guard.x,y:guard.y},cast:[guard,...(scene.extraGuards??[]).flatMap(post=>w.enemies.filter(e=>e.hp>0&&!e.boss&&!e.vehicle&&Math.abs(e.anchor-post)<.1))].map(e=>({id:e.id,x:e.x,y:e.y})),camera:teamCamera(w),caption:'',entered:false};
 for(const a of w.players){a.move=0;a.body.attack=0;a.body.cast=0;a.body.burstShots=0;a.body.weaponTrigger=false;}
 return true;
}
export function storyTrigger(w:World,before:{x:number;y:number}[]){
 if(w.story||w.mode!=='playing')return;
 for(const s of STORY_SCENES)if(s.mission===w.missionIndex&&!w.storyDone.includes(s.id)&&w.players.some((a,i)=>before[i].x<s.triggerX&&a.body.x>=s.triggerX))w.storyPending=s.id;
 const pending=STORY_SCENES.find(s=>s.id===w.storyPending);if(!pending)return;
 if(w.players.every(a=>a.body.x>pending.triggerX+8)||!w.enemies.some(e=>e.hp>0&&!e.boss&&!e.vehicle&&Math.abs(e.anchor-pending.guardPost)<.1)){w.storyPending=null;return;}
 beginStory(w,pending.id);
}
export function skipStory(w:World){if(w.story&&w.story.exit===null){w.story.exit=0;w.story.caption='';w.story.camera=teamCamera(w);}}
export function stepStory(w:World,dt:number){
 const state=w.story;if(!state||w.mode!=='playing')return;
 const scene=STORY_SCENES.find(s=>s.id===state.id);if(!scene){finishStory(w);return;}
 state.age+=dt;
 if(state.exit!==null){state.exit+=dt;if(state.exit>=.72)finishStory(w);return;}
 const beat=scene.beats[state.beat],guard=w.enemies.find(e=>e.id===state.guardId);
 if(!beat){skipStory(w);return;}
 const entering=!state.entered;state.entered=true;
 state.caption=beat.caption??'';
 if(entering&&beat.sound&&guard)w.emit(beat.sound,guard.x,guard.y+1);
 const before=w.players.map(a=>({x:a.body.x,y:a.body.y}));
 for(const a of w.players){
  const p=a.body,d=beat.players?.[a.id]??beat.player??{},start=state.players[a.id],tx=start.x+(d.dx??0);
  const body={x:p.x,y:p.y,dir:p.facing,vy:p.vy,grounded:p.grounded,ladder:-1,moving:false};
  if(d.jump&&entering&&body.grounded){body.vy=11.5;body.grounded=false;}
  navigateGround(w,body,d.dx===undefined?p.x:tx,start.y,dt,2.5);
  Object.assign(p,{x:body.x,y:body.y,vy:body.vy,grounded:body.grounded,ladder:body.ladder,facing:d.face??body.dir,wallClimbing:false,wallSide:0,wallVx:0,detachVx:0,cast:d.pose==='cast'?.5:0,attack:d.pose==='aim'?.2:0});a.move=body.moving?body.dir:0;
 }
 constrainTeam(w,before);
 for(const [i,origin] of state.cast.entries()){
  const actor=w.enemies.find(e=>e.id===origin.id);if(!actor?.infantry)continue;
  const a=actor.infantry,d=beat.enemies?.[i]??(i===0?beat.guard:undefined)??{};const body={x:actor.x,y:actor.y,dir:actor.dir,vy:a.vy,grounded:a.grounded,ladder:a.ladder,moving:false};
  if(d.jump&&entering&&body.grounded){body.vy=11.5;body.grounded=false;}
  navigateGround(w,body,d.dx===undefined?actor.x:origin.x+d.dx,origin.y,dt,2.3);
  actor.x=body.x;actor.y=body.y;actor.dir=d.face??body.dir;a.vy=body.vy;a.grounded=body.grounded;a.ladder=body.ladder;a.moving=body.moving;a.attack=d.pose==='aim'?.2:0;
 }
 const focus=typeof beat.camera==='object'?beat.camera:beat.camera==='guard'&&guard?{x:guard.x+(beat.cameraOffsetX??0),y:guard.y+2}:teamCamera(w);
 state.camera.x+=(focus.x-state.camera.x)*Math.min(1,dt*2.5);state.camera.y+=(focus.y-state.camera.y)*Math.min(1,dt*2.5);
 state.elapsed+=dt;if(state.elapsed>=beat.seconds){state.beat++;state.elapsed=0;state.entered=false;if(state.beat>=scene.beats.length)skipStory(w);}
}
function finishStory(w:World){
 const s=w.story;if(!s)return;
 for(const a of w.players){a.move=0;a.body.cast=0;a.body.attack=0;a.body.burstShots=0;a.body.weaponTrigger=false;a.body.invulnerable=Math.max(a.body.invulnerable,1);}
 for(const origin of s.cast){const e=w.enemies.find(e=>e.id===origin.id);if(e?.infantry){e.infantry.moving=false;e.infantry.attack=0;e.infantry.reaction=Math.max(.55,e.infantry.reaction);}}
 w.story=null;
}
