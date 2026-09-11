import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE} from '../src/game/world.ts';
import {MISSIONS,HEROES} from '../src/game/content.ts';
import {SnapshotWriter,applySnapshot} from '../src/game/coop-state.ts';
import {interactionTarget} from '../src/game/interactions.ts';
const cases=MISSIONS.map((m,i)=>({m,i})).filter(({m,i})=>m.layout&&i<9);
const frame=(w:World,n=1)=>{for(let i=0;i<n;i++)w.step(1/60,IDLE);};
function quiet(i:number){const w=new World(i,HEROES.map(h=>h.id));w.mode='playing';w.enemies=[];w.player.invulnerable=1e6;return w;}
test('three new authored operations preserve the original six and reuse existing media',()=>{
 assert.equal(cases.length,3);assert.deepEqual(MISSIONS.slice(0,6).map(m=>m.name),['Тихий берег','Останній рубіж','Острів свободи','Гірський прохід','Сталевий вузол','Нічна варта']);
 for(const {m,i} of cases){const w=new World(i);assert.ok(MISSIONS.slice(0,6).some(old=>old.background===m.background));assert.ok(new Set(w.enemies.flatMap(e=>e.infantry?[e.infantry.kind]:[])).size>=5);assert.equal(w.enemies.filter(e=>e.heavy).length,1);assert.ok(Math.max(...w.boxes.map(b=>b.y+b.h))>=18);}
});
test('elevated checkpoints require the actual floor and restore it after death, including snapshots',()=>{
 for(const {m,i} of cases){const w=quiet(i);const points=m.layout!.checkpoints;
  for(const p of points){w.player.x=p.x;w.player.y=p.y+4;frame(w);assert.ok(w.checkpoint!==p.x||w.actor.checkpointY!==p.y);w.player.x=p.x;w.player.y=p.y;w.player.vy=0;frame(w);assert.equal(w.checkpoint,p.x);assert.equal(w.actor.checkpointY,p.y);}
  const last=points.at(-1)!;w.player.x=last.x+8;w.player.invulnerable=0;w.damagePlayer(1000);assert.equal(w.player.x,last.x);assert.equal(w.player.y,last.y);
  w.addPlayer('lesya');const guest=new World(i);applySnapshot(guest,new SnapshotWriter(w).snapshot(1,w.events));assert.equal(guest.players[0].checkpointY,last.y);assert.equal(guest.routeProgress,points.length-1);
 }
});
test('upper rescues, medicine and ammo cannot be collected from beneath their floor',()=>{
 for(const {i} of cases){const w=quiet(i),a=w.allies.find(a=>(a.y??0)>0)!;w.mounts=[];w.player.x=a.x;w.player.y=0;frame(w);assert.notEqual(interactionTarget(w)?.kind,'rescue');w.player.x=a.x;w.player.y=a.y!;w.player.vy=0;w.step(1/60,{...IDLE,interact:true});assert.ok(a.rescued,JSON.stringify({i,a,p:w.player,mode:w.mode}));
  w.routeProgress=w.mission.layout!.checkpoints.length-1;const kit=w.medkits.find(k=>(k.y??0)>0)!;w.player.x=kit.x;w.player.y=kit.y!;w.player.hp=30;w.player.vy=0;frame(w);assert.ok(kit.used);assert.ok(w.player.hp>30);
  const crate=w.ammoCrates.find(c=>c.y>0)!;w.player.energy=0;w.player.x=crate.x;w.player.y=crate.y;w.player.vy=0;frame(w);assert.ok(crate.used);assert.equal(w.player.energy,100);
 }
});
test('extraction requires route posts and correct elevation, then completes normally',()=>{
 for(const {m,i} of cases){const w=quiet(i),l=m.layout!;w.player.x=m.exit;w.player.y=l.exitY;frame(w);assert.equal(w.evac.phase,'waiting');w.routeProgress=l.checkpoints.length-1;w.player.y=0;frame(w);assert.equal(w.evac.phase,'waiting');w.player.x=m.exit;w.player.y=l.exitY;w.player.vy=0;frame(w,180);assert.equal(w.evac.phase,'boarding');w.step(1/60,{...IDLE,jump:true});frame(w,180);assert.equal(w.mode,'won');}
});

for(const coop of [false,true])for(const ruined of [false,true])for(const {m,i} of MISSIONS.map((m,i)=>({m,i})).filter(({m})=>m.layout))test(`${m.name}: ${coop?'coop':'solo'} ${ruined?'destroyed':'intact'} route using normal input`,()=>{
 const w=quiet(i);if(coop)w.addPlayer('lesya');w.boxes=w.boxes.filter(b=>!['barrel','crate','wall','radio'].includes(b.kind));w.mounts=[];if(ruined)for(const b of w.boxes)if(Number.isFinite(b.hp))b.hp=0;
 for(const [index,target] of m.layout!.route.entries()){
  let ticks=0;const last=w.players.map(a=>a.body.x),stuck=w.players.map(()=>0);
  while(ticks++<1800){
   if(w.players.every(a=>Math.abs(target.x-a.body.x)<.22&&Math.abs(target.y-a.body.y)<.03))break;
   const actions=w.players.map((a,id)=>{const p=a.body,dx=target.x-p.x,dy=target.y-p.y;
    if(Math.abs(dx)<.22&&Math.abs(dy)<.03)return IDLE;
    stuck[id]=Math.abs(p.x-last[id])<.005?stuck[id]+1:0;last[id]=p.x;
    const climbing=Math.abs(dx)<.18&&Math.abs(dy)>.01;
    const ladderHere=w.ladders.some(l=>Math.abs(l.x-p.x)<.65&&p.y>=l.bottom-.15&&p.y<=l.top+.15);
    const gap=!w.boxes.some(b=>b.hp>0&&Math.abs(p.x+Math.sign(dx)*.8-b.x)<b.w/2&&Math.abs(b.y+b.h-p.y)<.15);
    return {...IDLE,move:Math.abs(dx)>.18?Math.sign(dx):0,climb:climbing?Math.sign(dy):0,jump:p.grounded&&(climbing&&dy<-.4||!(climbing&&ladderHere)&&(dy>.4||Math.abs(dx)>.5&&(gap||stuck[id]>12))),jumpHeld:true};
   });
   w.stepPlayers(1/60,actions);
   if(coop){assert.ok(Math.abs(w.players[0].body.y-w.players[1].body.y)<=12.001);assert.ok(Math.abs(w.players[0].body.x-w.players[1].body.x)<=30.001);}
  }
  assert.ok(ticks<1800,JSON.stringify({mission:m.name,index,target,actual:w.players.map(a=>({x:a.body.x,y:a.body.y,ladder:a.body.ladder})),route:w.routeProgress}));
 }
 frame(w,180);assert.equal(w.evac.phase,'boarding');w.stepPlayers(1/60,w.players.map(()=>({...IDLE,jump:true})));frame(w,180);assert.equal(w.mode,'won');
});

test('upper commander can be defeated with ordinary weapon fire on every new operation',()=>{
 for(const {i} of cases){const w=new World(i,HEROES.map(h=>h.id),'bilozerska');w.mode='playing';const leader=w.enemies.find(e=>e.heavy)!;w.enemies=[leader];w.player.x=leader.x-4;w.player.y=leader.y;w.player.facing=1;w.player.invulnerable=1e6;
  for(let n=0;n<1200&&leader.hp>0;n++)w.step(1/60,{...IDLE,fire:n%50===0,move:Math.sign(leader.x-w.player.x)*.01});assert.ok(leader.hp<=0,JSON.stringify({i,leader:{x:leader.x,y:leader.y,hp:leader.hp},player:{x:w.player.x,y:w.player.y},shots:w.shots,hits:w.hits}));assert.ok(w.objectiveComplete);
 }
});
