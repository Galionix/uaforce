import {TANK} from './mounts.ts';
import {canSpecial,mamaiMelee} from './hero-combat.ts';
import type {World} from './world';
import {icon,HERO_ICONS} from './hud-icons.ts';
export type AbilityState={progress:number;ready:boolean;charges:number[];label:string};
export function abilityStates(world:World):AbilityState[]{
 const p=world.player,h=world.hero;
 if(world.mounted){const t=world.mounted;return [{progress:1-t.cooldown/TANK.reload,ready:t.cooldown===0,charges:[],label:`Танкова гармата. ${t.cooldown>0?'Перезаряджання: '+t.cooldown.toFixed(1)+' с.':'Готово.'}`},{progress:1,ready:true,charges:[],label:'Вийти з танка'},{progress:t.armor/t.maxArmor,ready:true,charges:[],label:`Броня: ${Math.ceil(t.armor)}/${t.maxArmor}`}];}
 const recover=p.specialRecovery.map(t=>1-t/h.specialCooldown);
 const charges=[...Array.from({length:world.specialCharges},()=>1),...recover];
 return [
  {progress:p.reloading>0?1-p.reloading/h.reloadTime:Math.max(0,1-p.cooldown/Math.max(h.cooldown,h.burstPause)),ready:p.cooldown<=0&&(p.reloading===0||mamaiMelee(world)),charges:[],label:`${h.weapon}${h.magazine?`. ${p.ammo}/${h.magazine}. ${p.reloading>0?'Перезаряджання: '+p.reloading.toFixed(1)+' с.':''}`:''}`},
  {progress:recover.length?Math.max(...recover):1,ready:world.specialCharges>0&&canSpecial(world),charges:h.specialCharges>1?charges:[],label:`${h.special}. ${world.specialCharges}/${h.specialCharges}. ${recover.length?'Відновлення кожного заряду: '+h.specialCooldown+' с.':(canSpecial(world)?'Готово.':world.heroId==='zelensky'?'Загін у повному складі.':world.followers.some(f=>f.hp>0&&f.kind==='turret')?'Турель активна.':'Потрібен радіовузол поруч.')}`},
  {progress:p.energy/100,ready:p.energy>=100,charges:[],label:`${h.ultimate}. ${p.energy>=100?'Готово.':'Знайдіть ящик боєприпасів.'}`},
 ];
}
export function mountAbilities(root:HTMLElement){
 root.innerHTML=['weapon','special','ultimate'].map(id=>`<div class="ability-icon ${id}" id="${id}-ability" role="img"><svg class="cooldown-ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="ring-track" cx="24" cy="24" r="22"/><circle class="ring-value" cx="24" cy="24" r="22" pathLength="100"/></svg><span class="ability-art"></span><kbd id="${id}-key"></kbd><b class="ammo-count" hidden></b><span class="charge-pips" aria-hidden="true"></span></div>`).join('');
 let hero='';
 return (world:World,keys:string[])=>{
  const skin=world.mounted?'tank':world.heroId;
  const states=abilityStates(world),nodes=Array.from(root.children) as HTMLElement[];
  nodes.forEach((node,i)=>{
   const s=states[i];
   if(hero!==skin)node.querySelector('.ability-art')!.innerHTML=icon(world.mounted?['tank','exit','wall'][i]:HERO_ICONS[world.heroId][i]);
   node.classList.toggle('unavailable',!s.ready);node.classList.toggle('recharging',s.progress<1);node.classList.toggle('ready',s.ready);
   node.querySelector('.ring-value')!.setAttribute('stroke-dasharray',`${Math.max(0,Math.min(1,s.progress))*100} 100`);
   node.querySelector('kbd')!.textContent=keys[i];node.title=s.label;node.setAttribute('aria-label',`${s.label} Кнопка ${keys[i]}`);
   const ammo=node.querySelector<HTMLElement>('.ammo-count')!;ammo.hidden=i!==0||!!world.mounted||world.hero.magazine===0;if(i===0){ammo.textContent=String(world.player.ammo);node.classList.toggle('reloading',world.player.reloading>0);}
   const pips=node.querySelector('.charge-pips')!;
   if(pips.children.length!==s.charges.length)pips.innerHTML=s.charges.map(()=>'<i><b></b></i>').join('');
   Array.from(pips.children).forEach((pip,j)=>{pip.classList.toggle('filled',s.charges[j]>=1);(pip.firstElementChild as HTMLElement).style.transform=`scaleX(${s.charges[j]})`;});
  });
  hero=skin;
 };
}
