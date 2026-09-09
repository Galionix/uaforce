import type {HeroId} from './content.ts';
export type WeaponSpec={mode:'single'|'burst'|'melee';magazine:number;reloadTime:number;cooldown:number;damage:number;projectileSpeed:number;range:number;burst:number;burstPause:number};
// Arcade balance in world units, not a claim about real-world ballistics.
export const WEAPONS:Record<HeroId,WeaponSpec>={
 shevchenko:{mode:'melee',magazine:0,reloadTime:0,cooldown:.5,damage:36,projectileSpeed:22,range:10,burst:0,burstPause:0},
 lesya:{mode:'single',magazine:1,reloadTime:1.4,cooldown:.3,damage:24,projectileSpeed:36,range:17,burst:0,burstPause:0},
 franko:{mode:'melee',magazine:0,reloadTime:0,cooldown:.72,damage:85,projectileSpeed:20,range:2.6,burst:0,burstPause:0},
 bandera:{mode:'burst',magazine:20,reloadTime:2.4,cooldown:.085,damage:11,projectileSpeed:48,range:16,burst:5,burstPause:.38},
 mamai:{mode:'single',magazine:1,reloadTime:2.8,cooldown:.65,damage:58,projectileSpeed:30,range:12,burst:0,burstPause:0},
 bayraktar:{mode:'burst',magazine:18,reloadTime:3,cooldown:.12,damage:15,projectileSpeed:44,range:18,burst:6,burstPause:.6},
 ghost:{mode:'burst',magazine:15,reloadTime:2.1,cooldown:.115,damage:18,projectileSpeed:60,range:20,burst:3,burstPause:.48},
 zelensky:{mode:'single',magazine:8,reloadTime:1.8,cooldown:.38,damage:26,projectileSpeed:42,range:15,burst:0,burstPause:0},
 bilozerska:{mode:'single',magazine:3,reloadTime:4.8,cooldown:1.65,damage:82,projectileSpeed:100,range:28,burst:0,burstPause:0},
 'it-army':{mode:'single',magazine:4,reloadTime:2,cooldown:.65,damage:24,projectileSpeed:22,range:10,burst:0,burstPause:0},
 skovoroda:{mode:'melee',magazine:0,reloadTime:0,cooldown:.6,damage:78,projectileSpeed:18,range:2.3,burst:0,burstPause:0},
};
export type WeaponState={ammo:number;reloading:number;burstShots:number;weaponTrigger:boolean;cooldown:number};
export function resetWeapon(p:WeaponState,s:WeaponSpec){p.ammo=s.magazine;p.reloading=0;p.burstShots=0;p.weaponTrigger=false;p.cooldown=0;}
/** Reloads use simulation time. Releasing the trigger cannot skip a burst pause. */
export function cycleWeapon(p:WeaponState,s:WeaponSpec,dt:number,trigger:boolean,meleeOverride=false){
 const edge=trigger&&!p.weaponTrigger;p.weaponTrigger=trigger;
 p.cooldown=Math.max(0,p.cooldown-dt);
 let reloadFinished=false,reloadStarted=false;
 if(p.reloading>0){p.reloading=Math.max(0,p.reloading-dt);if(p.reloading<1e-8){p.reloading=0;p.ammo=s.magazine;reloadFinished=true;}}
 if(!trigger&&p.burstShots>0){p.burstShots=0;p.cooldown=Math.max(p.cooldown,s.burstPause);}
 const fired=trigger&&p.cooldown<1e-8&&(meleeOverride||(!p.reloading&&(s.magazine===0||p.ammo>0)&&(s.mode!=='single'||edge)));
 if(fired){
  p.cooldown=meleeOverride?.55:s.cooldown;
  if(!meleeOverride){
   if(s.mode==='burst'&&++p.burstShots>=s.burst){p.burstShots=0;p.cooldown=s.burstPause;}
   if(s.magazine>0&&--p.ammo===0){p.reloading=s.reloadTime;p.burstShots=0;reloadStarted=true;}
  }
 }
 return {fired,reloadStarted,reloadFinished};
}
export function weaponDescription(id:HeroId){const s=WEAPONS[id];if(!s.magazine)return `Дальність ${s.range} м. Пауза між ударами ${s.cooldown} с.`;return `${s.mode==='burst'?`Черга ${s.burst} пострілів, пауза ${s.burstPause} с.`:'Один постріл на натискання.'} Магазин: ${s.magazine}. Автоперезаряджання: ${s.reloadTime} с. Дальність: ${s.range} м.`;}
