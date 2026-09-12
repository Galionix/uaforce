import type {Box} from './world.ts';
import type {InfantryKind} from './infantry.ts';
export type DeathCause='combat'|'barrel'|'explosion';
export type DeathContext={cause?:DeathCause;role?:InfantryKind};
/** Military satire: a triumphant report contradicted by the soldier’s death. */
export const DEATH_LINES=[
 "Нас тут не було.",
 "Усе за планом.",
 "Це не відступ. Це жест доброї волі!",
 "Втрат немає. Є уточнення.",
 "Особовий склад? На папері весь.",
 "У звіті я ще живий!",
 "Штабе, викресли тільки прізвище!",
 "Наш наступ успішно йде назад.",
 "Цілі досягнуто. Які — засекречено.",
 "Розбиті? Зате не оточені!",
 "Перемогу підтверджую. Заочно!",
 "Позицію тримаю. Горизонтально.",
 "Втрати за межами цього звіту.",
 "Загиблих немає. Шукати заборонено.",
 "Перемога є. Свідків немає.",
 "Головне — не псувати статистику.",
 "Війська цілі. Списки скоротили.",
 "Підкріплення буде. У пресрелізі.",
 "Взяли висоту! Щоправда, від’ємну.",
 "Завдання — зникнути зі звіту.",
 "Ворог тікає! До нас!",
 "План виконано. Мене — списано.",
 "Переможців не рахують!",
 "Відступаємо суворо за графіком.",
 "Прошу вважати мене не втратою.",
 "Рапорт про успіх уже відправили!",
 "Ми не програли. Нам уточнять!",
 "Залишаємо ворогу порожню перемогу!",
 "Підрозділ цілий. У різних місцях.",
 "Це скорочення витрат на забезпечення.",
 "Штабе, заперечуй до останнього!",
 "За зведенням — ми ще наступаємо!"
];
export const CAUSE_LINES:Record<Exclude<DeathCause,'combat'>,string[]>={
barrel:[
 "Тару прийнято. Бійця списано.",
 "Пальне освоїли. Разом зі мною.",
 "Бочка своя. Втрати не рахуємо.",
 "Штабе, це планове розвантаження!",
 "Постачання б’є всі рекорди. І нас.",
 "За накладною — без вибухів.",
 "Вантаж прибув. Підрозділ вибув.",
 "Удар згори? Наше постачання!"
],
explosion:[
 "Не вибух! Звільнення позицій.",
 "Перегруповуюся по частинах!",
 "Розлітаємося згідно з наказом!",
 "Це салют на честь нашої перемоги!",
 "Позиції розширено силою вибуху.",
 "Штабе, нас тепер на всіх напрямках!",
 "Втрати? Лише цілісності!",
 "У зведенні це буде гроза."
]
};
export const ROLE_LINES:Partial<Record<InfantryKind,string[]>>={
scout:[
 "Зв’язок є. Відповідати вже нікому.",
 "Штабе, мовчання означає успіх!",
 "Доповідь позитивна. Пульс — ні.",
 "Прийом! Прийом! Прийміть втрату!"
],
shield:[
 "За документами щит непробивний!",
 "Щит витримав. За версією штабу.",
 "Захист надійний. Для звітності.",
 "Пробито мене, не репутацію!"
],
sniper:[
 "Ціль уражено. Уточнення: я.",
 "Маскування повне. Навіть у списках.",
 "Позицію не викрито. Її знищено.",
 "Постріл точний. Шкода, що не мій!"
],
gunner:[
 "Вогневу перевагу лишаю у звіті.",
 "Кулемет цілий. За мене не пишіть.",
 "Придушив ворога! Своїм падінням.",
 "Стріляв успішно. У потрібний бік."
],
assault:[
 "Штурм успішний. Повертатися нікому.",
 "Просування є. Просто донизу.",
 "Першими зайняли місце у зведенні.",
 "Наказ «не відступати» виконано!"
],
demolition:[
 "Підрив успішний. Сапер зайвий.",
 "Знешкодив! Разом із собою.",
 "Підірвано лише заплановане. Майже.",
 "Помилок немає. Перевіряти нікому."
]
};
export const ALL_DEATH_LINES=[...DEATH_LINES,...Object.values(CAUSE_LINES).flat(),...Object.values(ROLE_LINES).flat()];
export class DeathLines{
 private used=new Set<string>();private recent:string[]=[];
 next(random=Math.random,context:DeathContext={}){
  const contextual=context.cause&&context.cause!=='combat'?CAUSE_LINES[context.cause]:ROLE_LINES[context.role!];
  const eligible=[...DEATH_LINES,...(contextual??[])];
  let fresh=eligible.filter(line=>!this.used.has(line));
  if(!fresh.length){for(const line of eligible)this.used.delete(line);fresh=eligible;}
  const unrepeated=fresh.filter(line=>!this.recent.includes(line));if(unrepeated.length)fresh=unrepeated;
  const specific=fresh.filter(line=>contextual?.includes(line));
  const general=fresh.filter(line=>!contextual?.includes(line));
  // Most opportunities use the situation; exhausted context lines fall back to fresh general gags.
  const pool=specific.length&&(!general.length||random()<.7)?specific:general;
  const line=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  this.used.add(line);this.recent=[...this.recent,line].slice(-8);return line;
 }
}
/** Two compact lines keep the punchline readable without shrinking the pixel font. */
export function wrapDeathLine(text:string){
 const words=text.split(/\s+/),lines:string[]=[];let line='';
 for(const word of words){if(line&&line.length+word.length+1>28){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
 if(line)lines.push(line);return lines;
}
export type Gib={x:number;y:number;vx:number;vy:number;life:number;size:number;color:string;chunk:boolean;bounced:boolean};
export type Stain={x:number;y:number;w:number;h:number;life:number;box:number;color:string};
/** Cosmetic only: bounded particles/decals cannot change damage, kill counts or the terrain. */
export class Gore{
 bits:Gib[]=[];stains:Stain[]=[];
 clear(){this.bits=[];this.stains=[];}
 burst(x:number,y:number,random=Math.random,launchDir=0){
  for(let i=0;i<34;i++)this.bits.push({x,y,vx:launchDir?launchDir*(10+random()*12):(random()-.5)*14,vy:(launchDir?6:2)+random()*10,life:i<7?3:1.5+random(),size:i<7?3+Math.floor(random()*3):1+Math.floor(random()*2),color:['#c62e33','#8c1827','#ec4b46','#561526'][i%4],chunk:i<7,bounced:false});
  if(this.bits.length>420)this.bits.splice(0,this.bits.length-420);
 }
 step(dt:number,boxes:Box[],onImpact?:(x:number,y:number)=>void){
  const solids=boxes.filter(b=>b.hp>0&&b.kind!=='barrel');
  const columns=new Map<number,Box[]>();
  for(const b of solids)for(let x=Math.floor(b.x-b.w/2-.03);x<=Math.floor(b.x+b.w/2+.03);x++){const list=columns.get(x)??[];list.push(b);columns.set(x,list);}
  for(const p of this.bits){
   p.life-=dt;const oldX=p.x,oldY=p.y;p.vy-=22*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
   let hit:Box|undefined;
   for(const b of columns.get(Math.floor(p.x))??[]){
    if(Math.abs(p.x-b.x)<b.w/2+.03&&p.vy<0&&oldY>=b.y+b.h&&p.y<=b.y+b.h){if(!hit||b.y+b.h>hit.y+hit.h)hit=b;}
    else if(b.kind!=='platform'&&p.y>b.y&&p.y<b.y+b.h&&Math.abs(p.x-b.x)<b.w/2&&Math.abs(oldX-b.x)>=b.w/2){this.stains.push({x:b.x+Math.sign(oldX-b.x)*b.w/2,y:p.y,w:.1,h:.18,life:32,box:b.id,color:p.color});p.life=0;break;}
   }
   if(hit&&p.life>0){p.y=hit.y+hit.h;this.stains.push({x:p.x,y:p.y,w:p.chunk?.45:.2,h:.09,life:32,box:hit.id,color:p.color});
    if(p.chunk&&!p.bounced&&p.vy<-2)onImpact?.(p.x,p.y);
    if(p.chunk&&!p.bounced){p.bounced=true;p.vy=Math.abs(p.vy)*.27;p.vx*=.45;}else p.life=0;
   }
  }
  this.bits=this.bits.filter(p=>p.life>0&&p.y>-4);
  const liveIds=new Set(solids.map(b=>b.id));this.stains=this.stains.filter(s=>(s.life-=dt)>0&&liveIds.has(s.box)).slice(-260);
 }
}
