import test from 'node:test';import assert from 'node:assert/strict';
import {World,IDLE,type Enemy} from '../src/game/world.ts';import {HEROES,type HeroId} from '../src/game/content.ts';
import {SFX_ASSETS} from '../src/game/sfx-assets.ts';import {HERO_ICONS} from '../src/game/hud-icons.ts';import {practiceWorld} from '../src/game/practice.ts';import {abilityStates} from '../src/game/hud.ts';
function fixture(id:HeroId){const w=new World(0,HEROES.map(h=>h.id),id);w.mode='playing';w.boxes=w.boxes.filter(b=>b.y<0);w.enemies=[];w.player.x=5;return w;}
function enemy(w:World,x=8,hp=1000,y=0){const e:Enemy={id:w.nextId(),x,y,hp,maxHp:hp,cooldown:99,windup:0,dir:-1,anchor:x,heavy:false};w.enemies.push(e);return e;}
function run(w:World,seconds:number){for(let i=0;i<Math.round(seconds*60);i++)w.step(1/60,IDLE);}
test('eleven named heroes have complete, distinct kits, icons and sound profiles; no Sirko',()=>{
 assert.equal(HEROES.length,11);assert.ok(!HEROES.some(h=>(h.id as string)==='sirko'));
 for(const key of ['weapon','special','ultimate'] as const)assert.equal(new Set(HEROES.map(h=>h[key])).size,11);
 assert.equal(new Set(HEROES.flatMap(h=>HERO_ICONS[h.id])).size,33);
 assert.equal(new Set(HEROES.map(h=>SFX_ASSETS[`${h.id}-special`].offset)).size,11);
});
test('rescue unlocks all eleven before rotating and clears previous hero state',()=>{
 let unlocked:HeroId[]=['shevchenko'],hero:HeroId='shevchenko';
 for(let i=1;i<=11;i++){const w=new World(0,unlocked,hero);w.mode='playing';w.enemies=[];w.player.x=w.allies[0].x;w.player.cloak=3;w.player.fireCount=2;w.step(1/60,{...IDLE,interact:true});assert.equal(w.heroId,HEROES[i%11].id);assert.equal(w.player.cloak,0);assert.equal(w.player.fireCount,0);unlocked=w.unlocked;hero=w.heroId;}
 assert.equal(unlocked.length,11);
});
test('Bandera rapid fire outpaces sniper; the Molotov has a lob then persistent damage',()=>{
 const rapid=fixture('bandera'),slow=fixture('bilozerska');for(let i=0;i<60;i++){rapid.step(1/60,{...IDLE,fire:true});slow.step(1/60,{...IDLE,fire:true});}assert.ok(rapid.shots>=7&&rapid.shots<=10);assert.equal(slow.shots,1);
 const w=fixture('bandera'),e=enemy(w,10.85);w.step(1/60,{...IDLE,special:true});run(w,.5);assert.equal(e.hp,1000);run(w,1);assert.ok(e.hp<970);assert.equal(w.specialCharges,1);
});
test('Bandermobile rams once and explodes only once at end of travel',()=>{
 const w=fixture('bandera'),e=enemy(w,12);w.step(1/60,{...IDLE,ultimate:true});run(w,1);assert.equal(e.hp,760);run(w,2);assert.equal(w.effects.length,0);assert.equal(w.events.filter(e=>e.type==='burst').length,1);
});
test('Mamai chooses saber at close range and pistol at distance',()=>{
 const near=fixture('mamai'),e=enemy(near,7);near.step(1/60,{...IDLE,fire:true});assert.equal(e.hp,922);assert.equal(near.bullets.length,0);assert.equal(near.effects[0].kind,'weapon');
 const far=fixture('mamai');enemy(far,12);far.step(1/60,{...IDLE,fire:true});assert.equal(far.bullets.length,1);
});
for(const id of ['mamai','skovoroda'] as const)test(id+' returning special damages exactly once on each pass',()=>{const w=fixture(id),e=enemy(w,9);w.step(1/60,{...IDLE,special:true});run(w,.6);const first=e.hp;assert.ok(first<1000);run(w,1.4);assert.equal(e.hp,1000-2*(1000-first));assert.equal(w.effects.length,0);});
test('spectral cavalry breaks cover while leaving footing intact',()=>{const w=fixture('mamai');const e=enemy(w,14);w.boxes.push({id:w.nextId(),x:11,y:0,w:1,h:2,hp:200,maxHp:200,kind:'wall'});w.step(1/60,{...IDLE,ultimate:true});run(w,1);assert.equal(e.hp,760);assert.ok(w.boxes.at(-1)!.hp<=0);assert.ok(w.boxes.filter(b=>b.y<0).every(b=>b.hp>0));});
test('kamikaze drone seeks an elevated target; rocket swarm has seven timed impacts',()=>{const w=fixture('bayraktar');const e=enemy(w,11,1000,4);w.boxes.push({id:w.nextId(),x:11,y:3,w:2,h:1,hp:Infinity,maxHp:Infinity,kind:'platform'});w.step(1/60,{...IDLE,special:true});run(w,.8);assert.ok(e.hp<1000);assert.ok(!w.effects.some(f=>f.kind==='special'));w.step(1/60,{...IDLE,ultimate:true});run(w,3.1);assert.equal(w.events.filter(e=>e.type==='thunder').length,7);});
test('Ghost cloak accelerates movement, cancels enemy aim, and ends on firing',()=>{const w=fixture('ghost'),e=enemy(w,12);e.cooldown=0;w.step(1/60,{...IDLE,special:true});const x=w.player.x;for(let i=0;i<30;i++)w.step(1/60,{...IDLE,move:1});assert.ok(w.player.x-x>6);assert.equal(w.bullets.filter(b=>!b.friendly).length,0);assert.equal(e.windup,0);w.step(1/60,{...IDLE,fire:true});assert.equal(w.player.cloak,0);assert.equal(w.effects.length,0);});
test('Ghost jet and flag drone execute distinct timed bomb patterns',()=>{for(const [id,seconds,count]of [['ghost',3.6,8],['zelensky',5.1,11]]as const){const w=fixture(id);w.step(1/60,{...IDLE,ultimate:true});run(w,seconds);assert.equal(w.events.filter(e=>e.type==='burst').length,count,id);}});
test('Zelensky microphone fires on the third shot and allies provide friendly fire',()=>{const w=fixture('zelensky'),e=enemy(w,10);for(let i=0;i<3;i++){w.step(1/60,{...IDLE,fire:true});run(w,.4);}assert.equal(w.events.filter(e=>e.type==='voiceWave').length,1);assert.ok(e.rooted!>0);w.step(1/60,{...IDLE,special:true});assert.equal(w.followers.length,2);run(w,1);assert.ok(e.hp<900);});
test('mines wait for arming, ignore player, trigger once, and have three charges',()=>{const w=fixture('bilozerska');w.step(1/60,{...IDLE,special:true});const e=enemy(w,6.3);run(w,.25);assert.equal(e.hp,1000);run(w,.3);assert.equal(e.hp,845);assert.equal(w.player.hp,100);assert.equal(w.effects.length,0);assert.equal(w.specialCharges,2);run(w,6);assert.equal(w.specialCharges,3);});
test('sniper ultimate telegraphs then pierces multiple enemies and walls only in facing direction',()=>{const w=fixture('bilozerska'),front=enemy(w,10),rear=enemy(w,2),far=enemy(w,40);const wall={id:w.nextId(),x:8,y:0,w:1,h:2,hp:300,maxHp:300,kind:'wall' as const};w.boxes.push(wall);w.step(1/60,{...IDLE,ultimate:true});run(w,.4);assert.equal(front.hp,1000);assert.equal(wall.hp,300);run(w,.8);assert.equal(front.hp,500);assert.equal(far.hp,500);assert.equal(rear.hp,1000);assert.ok(wall.hp<=0);assert.equal(w.events.filter(e=>e.type==='railShot').length,1);});
test('IT EMP stuns; hack consumes no charge without a node and turns radio into friendly fire',()=>{
 const w=fixture('it-army'),e=enemy(w,8);w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,2);assert.equal(abilityStates(w)[1].ready,false);w.step(1/60,{...IDLE,fire:true});run(w,.2);assert.ok(e.rooted!>0);
 const radio={id:w.nextId(),x:10,y:0,w:1.6,h:2.2,hp:150,maxHp:150,kind:'radio' as const};w.boxes.push(radio);assert.equal(abilityStates(w)[1].ready,true);e.x=14;w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,1);assert.equal(w.followers[0].source,radio.id);run(w,2.6);assert.ok(e.hp<950);assert.equal(radio.hp,150);w.step(1/60,{...IDLE,special:true});assert.equal(w.specialCharges,1,'cannot rehack active node');
});
test('DDoS freezes a wide area without damage or creating a stone shockwave',()=>{const w=fixture('it-army'),e=enemy(w,24);e.cooldown=0;w.step(1/60,{...IDLE,ultimate:true});run(w,4);assert.equal(e.hp,1000);assert.ok(e.rooted!>0);assert.equal(w.bullets.length,0);run(w,1.5);assert.equal(e.rooted,0);});
test('Skovoroda pan reflects hostile bullets; ultimate heals and expires',()=>{const w=fixture('skovoroda');w.bullets.push({id:w.nextId(),x:7,y:1,vx:-12,vy:0,life:1,friendly:false,damage:15});w.step(1/60,{...IDLE,fire:true});assert.ok(w.bullets.some(b=>b.friendly&&b.vx>0&&b.damage===65));w.player.hp=40;w.step(1/60,{...IDLE,ultimate:true});run(w,5.2);assert.ok(w.player.hp>=79&&w.player.hp<=81);assert.equal(w.effects.length,0);});
for(const h of HEROES)test(h.id+' practice selection, pause and respawn clear transient abilities',()=>{const w=practiceWorld(h.id);assert.equal(w.heroId,h.id);assert.equal(w.unlocked.length,11);w.enemies=[];w.step(1/60,{...IDLE,special:true,ultimate:true});const before=JSON.stringify([w.effects.map(f=>[f.life,f.age]),w.player.specialRecovery]);w.mode='paused';run(w,1);assert.equal(JSON.stringify([w.effects.map(f=>[f.life,f.age]),w.player.specialRecovery]),before);w.mode='playing';w.player.invulnerable=0;w.damagePlayer(100);assert.equal(w.effects.length,0);assert.equal(w.followers.length,0);assert.equal(w.player.cloak,0);assert.equal(w.player.hp,100);});
