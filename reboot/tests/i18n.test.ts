import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,setLocale,getLocale,onLocaleChange} from '../src/game/i18n.ts';
import {EN} from '../src/game/en.ts';
import {HEROES,MISSIONS} from '../src/game/content.ts';
import {BOSSES} from '../src/game/bosses.ts';
import {weaponDescription} from '../src/game/weapons.ts';
import {World} from '../src/game/world.ts';

test('every English catalog phrase translates exactly and Ukrainian stays verbatim',()=>{
 for(const [uk,en] of Object.entries(EN)){
  assert.equal(translate(uk,'uk'),uk);
  assert.equal(translate(uk,'en'),en,uk);
 }
});
test('all hero, weapon, mission, district and boss display data have translations',()=>{
 const strings=HEROES.flatMap(h=>[h.name,h.weapon,h.special,h.ultimate,h.description,weaponDescription(h.id)]);
 strings.push(...MISSIONS.flatMap(m=>[m.name,m.region,m.brief,...m.districts.map(d=>d.name)]));
 strings.push(...Object.values(BOSSES).flatMap(b=>[b.name,b.subtitle,b.objective,...b.attacks]));
 for(const value of strings){assert.equal(/[а-яіїєґ]/i.test(translate(value,'en')),false,value);}
});
test('dynamic counts, names and error codes survive translation',()=>{
 assert.equal(translate('Тарас Шевченко. Здоров’я 83. Життя: 3.','en'),'Taras Shevchenko. Health 83. Lives: 3.');
 assert.equal(translate('Код: AB12CD34 · очікуємо друга','en'),'Code: AB12CD34 · waiting for your friend');
 assert.equal(translate('Заповіт. 1/2. Відновлення кожного заряду: 8 с.','en'),'Testament. 1/2. Recharge per charge: 8 s.');
 assert.equal(translate('Невідомас.','en'),'Невідомас.');
});
test('locale switches notify once and never mutate world or progress data',()=>{
 setLocale('uk');const w=new World(0,['shevchenko'],'shevchenko');const before=JSON.stringify(w);
 let calls=0;const off=onLocaleChange(()=>calls++);
 setLocale('en');assert.equal(getLocale(),'en');assert.equal(translate(w.hero.name),'Taras Shevchenko');
 setLocale('en');setLocale('de');assert.equal(calls,1);assert.equal(getLocale(),'en');
 assert.equal(JSON.stringify(w),before);off();setLocale('uk');assert.equal(calls,1);
});
