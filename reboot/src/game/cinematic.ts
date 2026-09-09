import {reducedPresentation} from './motion-settings';
import {revealTimeline} from './reveal-timeline';
import {PresentationFx} from './presentation-fx';
import {assetUrl} from './assets.ts';
import {HEROES} from './content';
import {BOSSES,type BossId} from './bosses';
import type {World} from './world';
import type {Sound} from './audio';
/** The world owns the pause; this controller only presents and acknowledges it. */
export class Cinematic {
 readonly dialog=document.createElement('dialog');
 private loaded=false;private announced=false;private loadToken=0;
 private fx!:PresentationFx;private get reduced(){return reducedPresentation();}
 private button=document.createElement('button');private elapsed=0;private current:World|null=null;private serial=-1;
 constructor(private sound:Sound,private resetInput:()=>void,private redraw:(w:World)=>void){
  this.dialog.className='cinematic';this.dialog.setAttribute('aria-labelledby','reveal-name');
  this.dialog.innerHTML='<img class="reveal-art" alt=""><div class="reveal-shade"></div><div class="reveal-copy"><p class="reveal-kicker"></p><h1 id="reveal-name"></h1><p class="reveal-subtitle"></p></div>';
  const effects=document.createElement('canvas');effects.className='reveal-fx';effects.setAttribute('aria-hidden','true');this.dialog.append(effects);this.fx=new PresentationFx(effects);
  this.button.className='reveal-continue';this.button.onclick=()=>this.confirm();this.dialog.append(this.button);document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>e.preventDefault());
  this.dialog.addEventListener('keydown',e=>{if(['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)this.confirm();}});
 }
 sync(w:World){
  if(!w.cinematic||w.mode!=='cinematic')return;
  if(this.current===w&&this.serial===w.cinematic.serial)return;
  this.current=w;this.serial=w.cinematic.serial;this.elapsed=0;this.loaded=false;this.announced=false;const loadToken=++this.loadToken;this.resetInput();this.sound.stopAll();
  const {kind,id}=w.cinematic;const boss=kind==='boss'?BOSSES[id as BossId]:null;const hero=HEROES.find(h=>h.id===id);
  this.dialog.dataset.kind=kind;this.dialog.dataset.boss=id;
  const img=this.dialog.querySelector('img')!;img.src=assetUrl(`/assets/cinematics/${id}.png`);img.alt=boss?.name??hero?.name??id;
  this.dialog.querySelector('.reveal-kicker')!.textContent=boss?(id==='putin'?'ГОЛОВНИЙ ВОРОГ':'РОСІЙСЬКЕ КОМАНДУВАННЯ'):'НОВОГО БІЙЦЯ ВІДКРИТО';
  this.dialog.querySelector('h1')!.textContent=boss?.name??hero!.name;
  this.dialog.querySelector('.reveal-subtitle')!.textContent=boss?.subtitle??hero!.weapon;
  this.button.textContent=boss?'Прийняти бій · Enter / ✕ / A':'До бою · Enter / ✕ / A';this.button.disabled=true;
  this.animate();this.dialog.showModal();this.dialog.focus();this.redraw(w);
  // A cold network load must not consume the entire entrance before the art is visible.
  const ready=()=>{if(this.loadToken!==loadToken)return;this.loaded=true;this.elapsed=0;this.dialog.dataset.ready='true';};
  this.dialog.dataset.ready='false';void img.decode().then(ready,ready);
 }
 step(dt:number,confirm=false){
  if(!this.dialog.open)return;
  if(document.hidden||!document.hasFocus()||!this.loaded)return;
  const before=this.elapsed;this.elapsed+=Math.min(dt,.1);this.animate();
  if(!this.announced&&this.elapsed>=.48){this.announced=true;this.sound.announce(this.dialog.dataset.kind==='boss'?'bossEncounter':'heroChanged',this.dialog.dataset.boss!,true);}
  for(const impact of [.5,1.8])if(before<impact&&this.elapsed>=impact)this.sound.event({type:this.dialog.dataset.kind==='boss'?'hostileBlast':'burst',x:0,y:0});
  this.button.disabled=this.elapsed<3.6||(this.sound.announcing&&this.elapsed<12);
  if(confirm)this.confirm();
 }
 private animate(){
  const pose=revealTimeline(this.elapsed,this.reduced);this.fx.draw(this.reduced?5:this.elapsed,this.dialog.dataset.kind==='boss'?'boss':'hero');
  this.dialog.style.setProperty('--reveal-x',`${pose.x}vw`);
  this.dialog.style.setProperty('--reveal-scale',String(pose.scale));
  this.dialog.style.setProperty('--reveal-crop',`${pose.crop}%`);
  this.dialog.style.setProperty('--title-x',`${pose.titleX}vw`);
  this.dialog.style.setProperty('--title-opacity',String(pose.titleOpacity));
  this.dialog.style.setProperty('--shake-x',`${pose.shakeX}px`);this.dialog.style.setProperty('--shake-y',`${pose.shakeY}px`);
  this.dialog.style.setProperty('--band',String(pose.band));
  this.dialog.dataset.phase=this.elapsed<.48?'charge':this.elapsed<1.8?'entrance':this.elapsed<2.4?'impact':'hold';
 }
 confirm(){
  if(!this.current||!this.dialog.open||this.button.disabled)return;
  this.sound.stopAll();this.current.finishCinematic();this.dialog.close();this.resetInput();this.redraw(this.current);
  document.querySelector<HTMLCanvasElement>('#scene')?.focus();
 }
}
