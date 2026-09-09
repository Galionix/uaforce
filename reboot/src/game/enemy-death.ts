import type {Box} from './world.ts';
import type {InfantryKind} from './infantry.ts';
export type DeathCause='combat'|'barrel'|'explosion';
export type DeathContext={cause?:DeathCause;role?:InfantryKind};
/** Owner's comic premise: an absurdly confident explanation, disproved by the explosion. */
export const DEATH_LINES=[
 'Нас тут не було.','Усе за планом.','Це не поразка. Це перегрупування!',
 'Стривайте, я взагалі з логістики!', 'Мамо, я думав, це навчальна місія!',
 'Мені казали, тут самі NPC!','Мамо, я в катсцені?','Командире, у мене тут баг!',
 'А можна завантажити сейв?','Я не підписувався на боса!','Де кнопка здатися?',
 'Моя смерть не канонічна!','Я взагалі декоративний!',
 'Втрати? Які втрати?','Це тактичне зникнення.','Запишіть: планове вибуття.',
 'У звіті я ще живий!','На це потрібен підпис!','У мене кінець зміни!',
 'Я тільки розписатися!','Я за іншим квестом!','У мене сюжетна броня!',
 'Я ще не зберігся!','Поставте складність нижче!', 'Де тут безпечна зона?!',
 'Мій хітбокс не погоджено!', 'Мене додадуть у наступному патчі!',
 'Респавн входить у контракт?', 'Я ще не договорив туторіал!',
 'Мій дублер уже їде!', 'Мене ще немає в титрах!', 'Це збій відображення перемоги.',
];
export const CAUSE_LINES:Record<Exclude<DeathCause,'combat'>,string[]>={
 barrel:['Доставку не замовляв!','Бочка не за накладною!','Повернення тари — куди?',
  'Мені безконтактну доставку!','За тару хто розпишеться?', 'Вантаж прийняв. Головою.',
  'Тут мало бути пальне!', 'Обережно, крихкий одержувач!'],
 explosion:['Це святковий салют!', 'Штаб, я розширюю позицію!', 'Перегруповуюся по частинах!',
  'Це просто спецефекти!', 'Вибух не пройшов погодження!', 'Планове провітрювання!',
  'У звіті напишіть: конфеті.', 'Хто замовляв урочистості?'],
};
export const ROLE_LINES:Partial<Record<InfantryKind,string[]>>={
 scout:['Алло, це техпідтримка?', 'Штаб, зникаю з мережі!', 'Ваш абонент перегруповується.', 'Перемкніть на живого оператора!'],
 shield:['Щит ще на гарантії!', 'У сертифікаті інше!', 'Я ж за укриттям!', 'Це не гарантійний випадок?!'],
 sniper:['Я дивився в інший приціл!', 'Мене ж не мало бути видно!', 'Секунду, фокус налаштую!', 'У мене камера наближена!'],
 gunner:['Перерва на перезарядку!', 'У мене ще пів стрічки!', 'Кулемет казенний, обережно!', 'Дайте дочитати інструкцію!'],
 assault:['Мені обіцяли легкий режим!', 'Я біжу на іншу місію!', 'Моя хоробрість ще вантажиться!', 'Штурм перенесено. На завтра.'],
 demolition:['Таймер мав бути довший!', 'Це була репетиція!', 'Де тут скасувати доставку?', 'Я думав, воно на батарейках!'],
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
 burst(x:number,y:number,random=Math.random){
  for(let i=0;i<34;i++)this.bits.push({x,y,vx:(random()-.5)*14,vy:2+random()*10,life:i<7?3:1.5+random(),size:i<7?3+Math.floor(random()*3):1+Math.floor(random()*2),color:['#c62e33','#8c1827','#ec4b46','#561526'][i%4],chunk:i<7,bounced:false});
  if(this.bits.length>420)this.bits.splice(0,this.bits.length-420);
 }
 step(dt:number,boxes:Box[]){
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
    if(p.chunk&&!p.bounced){p.bounced=true;p.vy=Math.abs(p.vy)*.27;p.vx*=.45;}else p.life=0;
   }
  }
  this.bits=this.bits.filter(p=>p.life>0&&p.y>-4);
  const liveIds=new Set(solids.map(b=>b.id));this.stains=this.stains.filter(s=>(s.life-=dt)>0&&liveIds.has(s.box)).slice(-260);
 }
}
