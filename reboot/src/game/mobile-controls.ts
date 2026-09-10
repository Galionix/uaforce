import {TouchState,touchDevice,type TouchAction} from './touch-state.ts';
import {abilityStates} from './hud.ts';
import {icon,HERO_ICONS} from './hud-icons.ts';
import type {World} from './world.ts';
export class MobileControls {
 readonly root=document.createElement('div');readonly rotate=document.createElement('section');
 enabled=false;portrait=false;private active=false;private skin='';private stickPointer:number|null=null;
 private stick:HTMLElement;private knob:HTMLElement;private buttons=new Map<TouchAction,HTMLButtonElement>();private requestedPause=false;
 private preference:HTMLSelectElement;private coarse=matchMedia('(any-pointer:coarse)');
 constructor(private state:TouchState,private touched:()=>void,private onPortrait:()=>void){
  this.root.id='touch-controls';this.root.hidden=true;this.root.setAttribute('aria-label','Сенсорне керування');
  this.root.innerHTML='<div id="touch-stick" role="group" aria-label="Рух і драбини"><span class="stick-arrows" aria-hidden="true">↑<br>←　→<br>↓</span><i></i></div><div class="touch-buttons"></div>';
  this.stick=this.root.querySelector('#touch-stick')!;this.knob=this.stick.querySelector('i')!;
  const labels={fire:'Атака',jump:'Стрибок',interact:'Взаємодія',special:'Спецприйом',ultimate:'Ульта'};
  for(const action of ['fire','jump','interact','special','ultimate'] as TouchAction[]){
   const b=document.createElement('button');b.type='button';b.id='touch-'+action;b.className='touch-action '+action;b.setAttribute('aria-label',labels[action]);
   b.innerHTML=action==='jump'?'<span aria-hidden="true">✕</span>':action==='interact'?'<span aria-hidden="true">□</span>':'<svg class="touch-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" pathLength="100"/></svg><span class="touch-art"></span><small></small>';
   this.buttons.set(action,b);this.root.querySelector('.touch-buttons')!.append(b);
   b.addEventListener('pointerdown',e=>{if(!this.active||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();this.touched();this.state.press(e.pointerId,action);b.setPointerCapture(e.pointerId);b.classList.add('pressed');});
   const release=(e:PointerEvent)=>{this.state.release(e.pointerId,e.type!=='pointerup');b.classList.remove('pressed');};
   b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',e=>{if(b.classList.contains('pressed'))release(e);});
   // Native keyboard/accessibility activation also produces a single action.
   b.addEventListener('click',e=>{if(e.detail===0&&this.active){this.touched();this.state.press(-1,action);this.state.release(-1);}});
  }
  this.stick.addEventListener('pointerdown',e=>{if(!this.active||!this.state.startStick(e.pointerId))return;e.preventDefault();this.touched();this.stickPointer=e.pointerId;this.stick.setPointerCapture(e.pointerId);this.moveStick(e);});
  this.stick.addEventListener('pointermove',e=>this.moveStick(e));
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.stick.addEventListener(type,e=>{const p=e as PointerEvent;if(this.stickPointer!==p.pointerId)return;this.state.release(p.pointerId,true);this.stickPointer=null;this.knob.style.transform='translate(0px,0px)';});
  this.root.addEventListener('contextmenu',e=>e.preventDefault());
  this.rotate.id='rotate-device';this.rotate.hidden=true;this.rotate.setAttribute('aria-label','Поверніть телефон');
  this.rotate.innerHTML='<div><span class="rotate-phone" aria-hidden="true">▯ ↻ ▭</span><h2>Поверни телефон</h2><p>Грати зручніше горизонтально.<br>Гру призупинено.</p><button type="button">На весь екран</button><p id="fullscreen-note" role="status"></p><button type="button" class="rotate-menu">До меню</button></div>';
  this.rotate.querySelector<HTMLButtonElement>('.rotate-menu')!.onclick=()=>document.getElementById('pause-main')!.click();
  this.rotate.querySelector('button')!.onclick=()=>document.getElementById('fullscreen')!.click();
  document.body.append(this.root,this.rotate);
  this.preference=document.getElementById('touch-mode') as HTMLSelectElement;
  try{const value=localStorage.getItem('uaforce.touch');if(value==='on'||value==='off')this.preference.value=value;}catch{}
  this.preference.onchange=()=>{try{localStorage.setItem('uaforce.touch',this.preference.value);}catch{}this.resize();};
  this.coarse.addEventListener('change',()=>this.resize());window.addEventListener('resize',()=>this.resize());
  window.addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  this.resize();
 }
 private moveStick(e:PointerEvent){if(!this.active||this.stickPointer!==e.pointerId)return;const r=this.stick.getBoundingClientRect(),radius=r.width*.36;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const scale=Math.max(1,Math.hypot(x,y));x/=scale;y/=scale;this.state.moveStick(e.pointerId,x,y);this.knob.style.transform=`translate(${x*radius*.6}px,${y*radius*.6}px)`;}
 clear(){this.state.clear();this.stickPointer=null;this.knob.style.transform='translate(0px,0px)';for(const b of this.buttons.values())b.classList.remove('pressed');}
 private resize(){
  const before=this.portrait;this.enabled=this.preference.value==='on'||this.preference.value!=='off'&&touchDevice(this.coarse.matches,navigator.maxTouchPoints,navigator.userAgent,navigator.platform);
  this.portrait=this.enabled&&innerHeight>innerWidth;document.body.classList.toggle('touch-device',this.enabled);document.getElementById('mobile-tip')!.hidden=!this.enabled;document.getElementById('menu-fullscreen')!.hidden=!this.enabled;
  this.clear();if(before!==this.portrait)this.requestedPause=false;
 }
 sync(world:World,blocked:boolean){
  const rotating=this.portrait&&['playing','paused'].includes(world.mode)&&!blocked;
  const entering=rotating&&this.rotate.hidden;this.rotate.hidden=!rotating;
  if(rotating&&world.mode==='playing'&&!this.requestedPause){this.requestedPause=true;this.onPortrait();}
  if(entering)this.rotate.querySelector('button')!.focus();
  if(!rotating)this.requestedPause=false;
  const active=this.enabled&&!this.portrait&&!blocked&&world.mode==='playing'&&!world.story;
  if(this.active!==active){this.active=active;this.root.hidden=!active;this.clear();}
  if(!active)return;
  const skin=world.mounted?'tank':world.heroId,states=abilityStates(world);
  for(const [i,action] of (['fire','special','ultimate'] as const).entries()){
   const b=this.buttons.get(action)!;b.hidden=!!world.mounted&&i>0;if(b.hidden)continue;
   if(this.skin!==skin)b.querySelector('.touch-art')!.innerHTML=icon(world.mounted?'tank':HERO_ICONS[world.heroId][i]);
   const s=states[i];b.title=s.label;b.setAttribute('aria-label',s.label);b.classList.toggle('unavailable',!s.ready);
   b.querySelector('circle')!.setAttribute('stroke-dasharray',`${Math.max(0,Math.min(1,s.progress))*100} 100`);
   b.querySelector('small')!.textContent=i===0&&!world.mounted&&world.hero.magazine?String(world.player.ammo):i===1&&world.hero.specialCharges>1?String(world.specialCharges):'';
  }
  this.skin=skin;this.buttons.get('interact')!.classList.toggle('nearby',!!world.prompt||!!world.mounted||world.heldBarrel!==null);
 }
}
