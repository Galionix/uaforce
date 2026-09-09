import {enemyActive} from './enemies.ts';
import {summonFollowers} from './followers.ts';
import type {World, Effect} from './world.ts';
import type {HeroId} from './content.ts';
export const SPECIAL_LIFE:Record<HeroId,number>={shevchenko:.7,lesya:4,franko:4,bandera:4.8,mamai:1.4,bayraktar:3,ghost:3,zelensky:6,bilozerska:30,'it-army':8,skovoroda:1.8};
export const ULTIMATE_LIFE:Record<HeroId,number>={shevchenko:1.6,lesya:6,franko:1,bandera:2.7,mamai:2.4,bayraktar:3,ghost:3.5,zelensky:5,bilozerska:1.1,'it-army':5,skovoroda:5};
export function hackTarget(w:World){return w.boxes.filter(b=>b.kind==='radio'&&b.hp>0&&Math.hypot(b.x-w.player.x,b.y-w.player.y)<14&&!w.followers.some(f=>f.hp>0&&f.source===b.id)).sort((a,b)=>Math.abs(a.x-w.player.x)-Math.abs(b.x-w.player.x))[0];}
export function canSpecial(w:World){return w.heroId==='it-army'?w.followers.filter(f=>f.hp>0&&f.kind==='turret').length<1&&!!hackTarget(w):w.heroId==='zelensky'?w.followers.filter(f=>f.hp>0&&f.kind==='infantry').length<2:true;}
export function launchEffect(w:World,kind:'special'|'ultimate'){
 const p=w.player,hero=w.heroId;
 if(kind==='special'&&hero==='zelensky'){summonFollowers(w,'infantry');return;}
 if(kind==='special'&&hero==='it-army'){const target=hackTarget(w);if(target)summonFollowers(w,'turret',target.id);return;}
 const f:Effect={kind,hero,x:p.x+(hero==='franko'&&kind==='special'?p.facing*1.6:0),y:p.y,originX:p.x,originY:p.y,dir:p.facing,life:(kind==='special'?SPECIAL_LIFE:ULTIMATE_LIFE)[hero],age:0,hit:new Set()};
 if(hero==='ghost'&&kind==='special')p.cloak=3;
 w.effects.push(f);
}
function reflect(w:World,x:number,y:number,r:number){for(const b of w.bullets)if(b.life>0&&!b.friendly&&Math.hypot(b.x-x,b.y-y)<r){b.friendly=true;b.vx=-b.vx;b.vy=-b.vy;b.damage=65;b.hero='skovoroda';b.life=Math.max(b.life,.6);w.emitSfx('ricochet',b.x,b.y,'skovoroda');}}
export function mamaiMelee(w:World){const p=w.player;return w.heroId==='mamai'&&w.enemies.some(e=>enemyActive(e)&&(e.x-p.x)*p.facing>=0&&(e.x-p.x)*p.facing<2.7&&Math.abs(e.y-p.y)<1.8);}
export function attack(w:World,melee=false){
 const p=w.player,id=w.heroId;
 p.cloak=0;p.fireCount++;
 if(melee){
  w.effects.push({kind:'weapon',hero:id,x:p.x,y:p.y,originX:p.x,originY:p.y,dir:p.facing,life:.2,age:0,hit:new Set()});
  for(const e of w.enemies)if(enemyActive(e)&&(e.x-p.x)*p.facing>=0&&(e.x-p.x)*p.facing<2.7&&Math.abs(e.y-p.y)<1.8){w.damageEnemy(e,78);w.emitSfx(id+'-hit',e.x,e.y,id);}
  w.events.push({type:'shot',hero:id,variant:'melee',x:p.x,y:p.y+1});
 }else w.projectile(p.x+p.facing*.45,p.y+1.03,p.facing,0,true);
 if(id==='skovoroda'){reflect(w,p.x+p.facing,p.y+1,2.8);w.effects.push({kind:'weapon',hero:id,x:p.x,y:p.y,dir:p.facing,life:.22,age:0,hit:new Set()});}
 if(id==='zelensky'&&p.fireCount%3===0){
  for(const e of w.enemies)if(enemyActive(e)&&(e.x-p.x)*p.facing>=0&&(e.x-p.x)*p.facing<6&&Math.abs(e.y-p.y)<3){e.rooted=1.25;e.windup=0;}
  w.effects.push({kind:'weapon',hero:id,x:p.x,y:p.y,dir:p.facing,life:.35,age:0,hit:new Set()});w.emit('voiceWave',p.x,p.y+1);
 }
}
/** Each effect owns its hit set and timing, so held keys cannot retrigger a one-shot impact. */
export function stepHeroEffect(w:World,f:Effect,dt:number){
 const p=w.player,ox=f.originX??f.x,oy=f.originY??f.y;
 const once=(key:number,fn:()=>void)=>{if(!f.hit.has(key)){f.hit.add(key);fn();}};
 const zone=(x:number,y:number,r:number,dmg:number)=>{for(const e of w.enemies)if(enemyActive(e)&&Math.hypot(e.x-x,e.y-y)<r)w.damageEnemy(e,dmg);};

 if(f.kind==='weapon'){if(f.hero==='skovoroda')reflect(w,f.x+f.dir,f.y+1,2.8);return;}
 if(f.kind==='special')switch(f.hero){
  case 'bandera':{
   // A short readable lob, then a persistent patch that hurts enemies only.
   if(f.age<.65){f.x=ox+f.dir*f.age*9;f.y=oy+1+Math.sin(f.age/.65*Math.PI)*2;}
   else {f.x=ox+f.dir*5.85;f.y=oy;once(-1,()=>w.events.push({type:'burst',sfx:'glass-fire',x:f.x,y:f.y,hero:f.hero}));zone(f.x,f.y,3.3,44*dt);}break;
  }
  case 'mamai':case 'skovoroda':{
   const duration=SPECIAL_LIFE[f.hero],turn=duration/2,returning=f.age>=turn;
   const t=Math.min(1,(f.age-turn)/turn);f.x=returning?(ox+f.dir*9)*(1-t)+p.x*t:ox+f.dir*9*f.age/turn;f.y=returning?(oy+1)*(1-t)+(p.y+1)*t:oy+1;
   for(const e of w.enemies)if(enemyActive(e)&&Math.abs(e.x-f.x)<1.3&&Math.abs(e.y+1-f.y)<2)once(e.id+(returning?1000000:0),()=>{w.damageEnemy(e,f.hero==='mamai'?65:55);w.emitSfx(f.hero+'-hit',e.x,e.y,f.hero);});break;
  }
  case 'bayraktar':{
   const target=w.enemies.filter(e=>enemyActive(e)).sort((a,b)=>Math.hypot(a.x-f.x,a.y+1-f.y)-Math.hypot(b.x-f.x,b.y+1-f.y))[0];
   const tx=target?.x??f.x+f.dir*8,ty=(target?.y??oy)+1,dist=Math.hypot(tx-f.x,ty-f.y)||1;
   f.x+=(tx-f.x)/dist*12*dt;f.y+=(ty-f.y)/dist*12*dt;
   if(dist<1||f.life<=0){w.explode(f.x,f.y,3.3,125);f.life=0;}break;
  }
  case 'ghost': f.x=p.x;f.y=p.y;if(p.cloak<=0)f.life=0;break;

  case 'bilozerska':{
   if(f.age>.45&&w.enemies.some(e=>enemyActive(e)&&Math.abs(e.x-f.x)<1.7&&Math.abs(e.y-f.y)<1.7)){w.explode(f.x,f.y+1,3.6,155);f.life=0;}break;
  }

 }else switch(f.hero){
  case 'bandera':case 'mamai':{
   f.x=ox+f.dir*f.age*(f.hero==='bandera'?12:16);
   for(const e of w.enemies)if(enemyActive(e)&&Math.abs(e.x-f.x)<3&&Math.abs(e.y-f.y)<3)once(e.id,()=>{w.damageEnemy(e,240);w.emitSfx(f.hero==='mamai'?'mamai-hit':'armor-hit',e.x,e.y,f.hero);});
   for(const b of w.boxes)if(b.hp>0&&b.y>=oy&&Math.abs(b.x-f.x)<3&&b.y<oy+3)once(b.id,()=>w.damageBox(b,260));
   if(f.hero==='bandera'&&f.life<=dt)once(-1,()=>w.explode(f.x,f.y+1,5,200));break;
  }
  case 'bayraktar':{
   for(let i=0;i<7;i++)if(f.age>=.8+i*.26)once(-i-1,()=>{const x=ox+f.dir*(3+i*3);w.explode(x,oy+1,3,150);w.emit('thunder',x,oy+1);});break;
  }
  case 'ghost':{
   f.x=ox+f.dir*(f.age*14-8);f.y=oy+8;
   for(let i=0;i<8;i++)if(f.age>=.65+i*.3)once(-i-1,()=>w.explode(ox+f.dir*(i*4),oy+1,2.8,145));break;
  }
  case 'zelensky':{
   f.x=ox+f.dir*f.age*5;f.y=oy+4;
   const beat=Math.floor(f.age/.5);once(-beat-1,()=>w.explode(f.x,oy+1,2.4,65));break;
  }
  case 'bilozerska':{
   if(f.age>=.5)once(-1,()=>{for(const e of w.enemies)if(enemyActive(e)&&(e.x-ox)*f.dir>=0&&(e.x-ox)*f.dir<55&&Math.abs(e.y-oy)<1.7)w.damageEnemy(e,500);for(const b of w.boxes)if(b.hp>0&&(b.x-ox)*f.dir>=0&&(b.x-ox)*f.dir<55&&b.y<=oy+1.1&&b.y+b.h>=oy+.9)w.damageBox(b,600);w.emit('railShot',ox,oy+1);});break;
  }
  case 'it-army':{
   for(const e of w.enemies)if(enemyActive(e)&&Math.abs(e.x-ox)<22&&Math.abs(e.y-oy)<12){e.rooted=.2;e.windup=0;}break;
  }
  case 'skovoroda':{
   f.x=p.x;f.y=p.y;reflect(w,f.x,f.y+1,5);p.hp=Math.min(100,p.hp+8*dt);
   for(const e of w.enemies)if(enemyActive(e)&&Math.hypot(e.x-p.x,e.y-p.y)<5){e.rooted=.2;e.windup=0;}break;
  }
 }
}

/** Audio gates use simulation age and actual effect lifetime; no wall-clock timers. */
export function effectAudioPhase(w:World,f:Effect){
 if(f.kind==='weapon')return;
 const marks=f.audioMarks??=new Set<string>();
 const at=(time:number,key:string)=>{if(f.age>=time&&!marks.has(key)){marks.add(key);w.emitSfx(key,f.x,f.y,f.hero);}};
 if(f.kind==='special'&&f.hero==='bilozerska')at(.45,'mine-arm');
 // Returning objects are caught only when they actually finish their return path.
 if(f.kind==='special'&&['mamai','skovoroda'].includes(f.hero)&&f.life<=0)at(0,f.hero+'-hit');
}
