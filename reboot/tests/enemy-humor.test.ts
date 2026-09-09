import test from 'node:test';import assert from 'node:assert/strict';
import {DeathLines,DEATH_LINES,CAUSE_LINES,ROLE_LINES,ALL_DEATH_LINES,wrapDeathLine} from '../src/game/enemy-death.ts';
import {World} from '../src/game/world.ts';import {addInfantry} from '../src/game/infantry.ts';
test('owner-inspired gags remain short, unique and fit two readable lines',()=>{
 assert.equal(ALL_DEATH_LINES.length,72);assert.equal(new Set(ALL_DEATH_LINES).size,72);
 for(const text of ALL_DEATH_LINES){assert.ok(text.split(/\s+/).length<=8,text);assert.ok(wrapDeathLine(text).length<=2,text);assert.ok(wrapDeathLine(text).every(line=>line.length<=28),text);assert.doesNotMatch(text,/[ыэёъ]/i);}
 for(const text of ['Нас тут не було.','Усе за планом.','Моя смерть не канонічна!','Я взагалі декоративний!'])assert.ok(DEATH_LINES.includes(text));
});
test('barrel and explosion humor requires its actual context, never a random ordinary shot',()=>{
 for(const cause of ['barrel','explosion'] as const){const lines=new DeathLines();const picked=lines.next(()=>0,{cause});assert.ok(CAUSE_LINES[cause].includes(picked));}
 const normal=new DeathLines();for(let i=0;i<100;i++)assert.ok(DEATH_LINES.includes(normal.next(()=>.4)));
});
test('role-specific jokes match the dying role, while barrel impact takes priority',()=>{
 for(const role of ['scout','shield','sniper','gunner','assault','demolition'] as const){
  const lines=new DeathLines();assert.ok(ROLE_LINES[role]!.includes(lines.next(()=>0,{role})));
  assert.ok(CAUSE_LINES.barrel.includes(lines.next(()=>0,{role,cause:'barrel'})));
 }
});
test('switching contexts avoids recent repeats and works after several complete pools',()=>{
 const lines=new DeathLines(),recent:string[]=[];let seed=7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let i=0;i<600;i++){
  const line=lines.next(random,{cause:i%3===0?'barrel':i%3===1?'explosion':'combat',role:'scout'});
  assert.ok(!recent.includes(line),line);recent.push(line);if(recent.length>8)recent.shift();
 }
});
test('lethal barrel blasts propagate context to nearby victims; normal deaths retain role context',t=>{
 t.mock.method(Math,'random',()=>0);
 const w=new World();w.mode='playing';w.enemies=[];w.boxes=[];
 const scout=addInfantry(w,'scout',10);w.damageEnemy(scout,100);assert.ok(ROLE_LINES.scout!.includes(w.events.at(-1)!.text!));
 const guard=addInfantry(w,'shield',12);w.damageEnemy(guard,50);assert.ok(guard.hp>0);w.boxes.push({id:w.nextId(),kind:'barrel',x:12,y:0,w:1,h:1,hp:25,maxHp:25});w.damageBox(w.boxes[0],25);
 assert.ok(guard.hp<=0);assert.ok(CAUSE_LINES.barrel.includes(w.events.findLast(e=>e.type==='enemyDeath')!.text!));assert.equal(w.kills,2);
});
