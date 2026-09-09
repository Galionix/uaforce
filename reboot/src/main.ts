import {skipStory} from './game/story-scenes.ts';
import {SUPPORT_URL,supportUrl} from './game/support';
import {Feedback} from './game/feedback';
import {FlagTransition} from './game/flag-transition';
import {SnapshotWriter,applySnapshot} from './game/coop-state';
import type {OnlineRoom,RoomCommand} from './game/online';
import {reducedPresentation} from './game/motion-settings';
import {assetUrl} from './game/assets';
import {PresentationFx} from './game/presentation-fx';
import {musicDanger} from './game/music';
import {Cinematic} from './game/cinematic';
import {BOSSES} from './game/bosses';
import {weaponDescription,resetWeapon,WEAPONS} from './game/weapons';
import {practiceWorld} from './game/practice';
import './style.css';
import { World } from './game/world';
import { Input, freshBindings, padButtonLabel, type Bindings } from './game/input';
import { View } from './game/view';
import { Sound } from './game/audio';
import {mountAbilities} from './game/hud';
import {icon} from './game/hud-icons';
import {ANNOUNCER_NAMES} from './game/announcer';
import { HEROES, MISSIONS } from './game/content';
import { readProgress, saveProgress, readRecord, saveRecord } from './game/storage';

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('scene'), menu=$('menu'), pauseMenu=$('pause-menu'), settings=$<HTMLDialogElement>('settings');
for(const node of Array.from(document.querySelectorAll<HTMLElement>('[data-icon]')))node.innerHTML=icon(node.dataset.icon!);
const updateAbilities=mountAbilities($('ability-icons'));
const roster=$<HTMLDialogElement>('roster'), operations=$<HTMLDialogElement>('operations');
const menuFx=new PresentationFx($<HTMLCanvasElement>('menu-fx'));
let menuClock=0;
const onlineMenu=$<HTMLDialogElement>('online-menu'),about=$<HTMLDialogElement>('about-game');
let onlineAttempt=0;
let online:OnlineRoom|null=null,onlineLoading=false,roomCode='',writer:SnapshotWriter|null=null,netClock=0,netSequence=0,guestEpoch='';
let outgoingEvents:typeof world.events=[];

let practice=false;
const input=new Input(canvas), view=new View(canvas), sound=new Sound(new URLSearchParams(location.search).get('silent')==='1');
let progress=readProgress();
let transition=0;
let world=new World(progress.mission,progress.unlocked,progress.hero), ready=false, accumulator=0, uiTime=0, toastTime=0, settingsWasPlaying=false, menuIndex=0;
let pendingJump=false,pendingSpecial=false,pendingUltimate=false,pendingFire=false,pendingInteract=false;
const cinematic=new Cinematic(sound,()=>{input.clear();accumulator=0;pendingJump=pendingSpecial=pendingUltimate=pendingFire=pendingInteract=false;},w=>view.reset(w));
const flags=new FlagTransition();
const storySkip=document.createElement('button');storySkip.className='story-skip';storySkip.textContent='Пропустити · Enter';storySkip.hidden=true;document.body.append(storySkip);
storySkip.onclick=()=>{if(online?.role==='guest')online.command('continue');else skipStory(world);};
let storyWasActive=false;
const feedback=new Feedback(canvas,()=>({mission:world.mission.name,hero:world.hero.name,mode:world.mode,session:online?`кооп / ${online.role}`:practice?'випробування':'одиночна',controller:input.pad?.id??'клавіатура'}),()=>{pause();sound.stopAll();input.clear();},()=>input.clear());
for(const id of ['feedback-open','menu-feedback','pause-feedback','about-feedback'])$(id).onclick=()=>feedback.show();
const bossStatus=document.createElement('div');bossStatus.id='boss-status';bossStatus.hidden=true;bossStatus.innerHTML='<span></span><progress max=1></progress>';canvas.parentElement!.append(bossStatus);
const formatTime=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
function toast(message:string){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=1.8;}
function remember(){if(practice||online)return;progress={...progress,unlocked:[...world.unlocked],hero:world.heroId};saveProgress(progress);}
function startMission(index:number){
  if(!ready)return;if(online?.role==='guest'){online.command('next');return;}practice=false;transition=0;sound.stopAll();const guestHero=world.players[1]?.heroId;world=new World(index,progress.unlocked,progress.hero);if(online?.connected){world.addPlayer(guestHero??'lesya');writer=new SnapshotWriter(world);}world.mode='playing';
  if(!online){progress.mission=index;progress.completed=false;saveProgress(progress);}view.reset(world);input.clear();accumulator=0;menu.hidden=true;pauseMenu.hidden=true;canvas.focus();sound.announce('missionStart',world.heroId);
  flags.play(index%2===1);toast(world.mission.name);
}
function begin(){if(practice){startPractice(world.heroId);return;}startMission(world.mode==='won'?(world.missionIndex+1)%MISSIONS.length:world.missionIndex);}
function resume(focusCanvas=true){if(world.mode!=='paused')return;if(online?.role==='guest'){online.command('resume');return;}world.mode='playing';menu.hidden=true;pauseMenu.hidden=true;input.clear();if(focusCanvas)canvas.focus();void sound.enable();}
function showMenu(){
  pauseMenu.hidden=true;menu.hidden=false;menuIndex=0;
  const won=world.mode==='won',lost=world.mode==='lost',paused=world.mode==='paused',last=world.missionIndex===MISSIONS.length-1;
  $('menu-kicker').textContent=won?(last?'КАМПАНІЮ ЗАВЕРШЕНО':'ЕВАКУАЦІЯ УСПІШНА'):lost?'ЗАГІН ВТРАЧЕНО':paused?'ОПЕРАЦІЮ ПРИЗУПИНЕНО':'ЗА СВОЇХ. ДО КІНЦЯ.';
  $('menu-title').textContent=won?(last?'Хуйло переможено.':'Летимо далі.'):lost?'Ще одна спроба.':paused?'Тримаємо позицію.':'UA FORCE';
  $('menu-copy').textContent=won?(last?'Командний бункер знищено. Російський наступ зупинено. Усі операції завершено.':'Наступна операція — '+MISSIONS[world.missionIndex+1].name+'.'):lost?'Підкріплення вичерпано. Спробуйте інший маршрут, стрибайте з драбин і використовуйте здібність героя.':paused?'Гра на паузі. Продовжуйте, коли будете готові.':world.mission.name+' · '+world.mission.region;
  $('primary').textContent=paused?'Продовжити':won?(last?'Грати знову':'Наступна операція →'):lost?'Спробувати знову':'Одиночна гра';
  if(practice){$('menu-kicker').textContent='ВИПРОБУВАННЯ БІЙЦЯ';$('menu-title').textContent=world.hero.name;$('menu-copy').textContent='J / RT — зброя · E / RB — спецприйом · Q / LT — ульта. Обери іншого бійця або повтори випробування.';if(!paused)$('primary').textContent='Повторити випробування';}
  $('campaign-return').hidden=!practice;
  for(const id of ['online-open','roster-open','operations-open'])$(id).hidden=!!online;
  $('restart').hidden=!paused;$('hero-cycle').hidden=practice||paused||lost;$('mission-cycle').hidden=true;
  $('mission-cycle').textContent=`Обрати операцію: ${world.missionIndex+1}/${MISSIONS.length} · ${world.mission.region}`;
  $('operations-open').hidden=!!online||paused||practice||lost;
  $('hero-description').textContent=world.hero.description+' '+weaponDescription(world.heroId)+' Ульта відновлюється тільки з ящика боєприпасів.';
  $('hero-cycle').textContent=`Герой: ${world.hero.name} · відкрито ${world.unlocked.length}/${HEROES.length}`;
  $('result').textContent=won||lost?`${formatTime(world.time)} · ${world.kills} ворогів · ${world.rescued}/${world.allies.length} звільнено`:'';
  input.clear();$('primary').focus();
}
function startPractice(id:typeof HEROES[number]['id']){if(!ready||online)return;transition=0;practice=true;sound.stopAll();world=practiceWorld(id);view.reset(world);roster.close();menu.hidden=true;pauseMenu.hidden=true;input.clear();accumulator=0;canvas.focus();flags.play();sound.announce('missionStart',id);toast(world.hero.name);}
for(const hero of HEROES){const button=document.createElement('button');button.className='roster-hero';button.innerHTML=`<span class="roster-image" data-hero="${hero.id}"></span><strong>${hero.name}</strong><span>${hero.weapon}</span>`;button.title=hero.description;button.onclick=()=>startPractice(hero.id);$('roster-grid').append(button);}
$('roster-open').onclick=()=>{pause();input.clear();roster.showModal();menuIndex=0;$('roster-grid').querySelector('button')?.focus();};
for(const [i,mission] of MISSIONS.entries()){const button=document.createElement('button');button.className='operation-card';button.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span><strong>${mission.name}</strong><small>${mission.region}</small></span>`;button.title=mission.brief;button.onclick=()=>{operations.close();transition=0;world=new World(i,progress.unlocked,progress.hero);view.reset(world);showMenu();};$('operations-grid').append(button);}
$('operations-open').onclick=()=>{input.clear();operations.showModal();operations.querySelector('button')?.focus();};
function closeOperations(){operations.close();input.clear();$('operations-open').focus();}
$('operations-close').onclick=closeOperations;operations.addEventListener('cancel',e=>{e.preventDefault();closeOperations();});
$('menu-audio').onclick=()=>{sound.music=true;$<HTMLInputElement>('music').checked=true;try{localStorage.setItem('uaforce.audio.background','on');}catch{}void sound.enable();};
window.addEventListener('pointerdown',()=>{void sound.enable();},{once:true});
window.addEventListener('keydown',()=>{void sound.enable();},{once:true});
function closeRoster(){roster.close();input.clear();$(pauseMenu.hidden?'roster-open':'pause-roster').focus();}
$('roster-close').onclick=closeRoster;roster.addEventListener('cancel',e=>{e.preventDefault();closeRoster();});
$('campaign-return').onclick=()=>{practice=false;transition=0;sound.stopAll();world=new World(progress.mission,progress.unlocked,progress.hero);view.reset(world);showMenu();};
function pause(reason?:string){if(world.mode!=='playing')return;if(online?.role==='guest'){online.command('pause');sound.stopAll();return;}world.mode='paused';sound.stopAll();menu.hidden=true;pauseMenu.hidden=false;menuIndex=0;input.clear();$('pause-mission').textContent=world.mission.name;$('pause-resume').focus();if(reason)toast(reason);}
$('mission-cycle').onclick=()=>{transition=0;world=new World((world.missionIndex+1)%MISSIONS.length,progress.unlocked,progress.hero);view.reset(world);showMenu();};
$('hero-cycle').onclick=()=>{world.followers=[];world.heroId=world.unlocked[(world.unlocked.indexOf(world.heroId)+1)%world.unlocked.length];resetWeapon(world.player,WEAPONS[world.heroId]);remember();view.reset(world);showMenu();};
$('primary').onclick=()=>world.mode==='paused'?resume():begin();$('restart').onclick=begin;
pauseMenu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=Array.from(pauseMenu.querySelectorAll<HTMLButtonElement>('button'));const at=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();});
$('pause-resume').onclick=()=>resume();
$('pause-restart').onclick=begin;
$('pause-settings').onclick=openSettings;
$('pause-roster').onclick=()=>{$('roster-open').click();};
$('pause-main').onclick=()=>{if(online){leaveOnline();return;}remember();practice=false;transition=0;sound.stopAll();world=new World(progress.mission,progress.unlocked,progress.hero);view.reset(world);showMenu();flags.play(true);};
$('pause').onclick=()=>world.mode==='playing'?pause():resume();
window.addEventListener('blur',()=>{sound.stopAll();pause('Пауза: вікно втратило фокус');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sound.stopAll();pause('Пауза: вкладку приховано');}});
input.onDisconnect=()=>pause('Контролер від’єднано. Підключіть його або скористайтеся клавіатурою.');

function drawBindings(){
  $('bindings').replaceChildren();
  const labels:Record<keyof Bindings['keys'],string>={left:'Ліворуч',right:'Праворуч',jump:'Стрибок',fire:'Вогонь',special:'Спецприйом',ultimate:'Ульта',interact:'Взаємодія',pause:'Пауза / меню'};
  for(const action of Object.keys(labels)as(keyof Bindings['keys'])[]){
    const row=document.createElement('div');row.className='binding-row';
    const label=document.createElement('span');label.textContent=labels[action];
    const key=document.createElement('button');key.textContent=input.bindings.keys[action];key.onclick=()=>{input.capture={kind:'key',action};$('capture-hint').textContent='Натисніть нову клавішу. Escape — скасувати.';};
    const pad=document.createElement('button');pad.textContent=action==='left'||action==='right'?'Стік / хрестовина':`Кнопка ${input.bindings.buttons[action]}`;pad.disabled=action==='left'||action==='right';pad.onclick=()=>{input.clear();input.capture={kind:'button',action};$('capture-hint').textContent='Відпустіть кнопки геймпада, потім натисніть потрібну. Escape — скасувати.';};
    row.append(label,key,pad);$('bindings').append(row);
  }
  for(const [id,key]of [['move-axis','moveAxis'],['deadzone','deadzone']]as const)$<HTMLInputElement>(id).value=String(input.bindings[key]);
  $('deadzone-value').textContent=input.bindings.deadzone.toFixed(2);
}
input.onCapture=()=>{$('capture-hint').textContent='Призначення збережено.';drawBindings();};
function openSettings(){menuIndex=0;settingsWasPlaying=world.mode==='playing';pause();input.clear();drawBindings();settings.showModal();}
function closeSettings(){sound.stopAll();input.capture=null;settings.close();input.clear();if(settingsWasPlaying)resume();else $(pauseMenu.hidden?'menu-controls':'pause-settings').focus();}
$<HTMLInputElement>('reduce-motion').checked=reducedPresentation();
$<HTMLInputElement>('reduce-motion').onchange=()=>{try{localStorage.setItem('uaforce.presentation.motion',$<HTMLInputElement>('reduce-motion').checked?'reduced':'full');}catch{}};
$('settings-open').onclick=openSettings;$('menu-controls').onclick=openSettings;$('settings-close').onclick=closeSettings;
settings.addEventListener('cancel',event=>{event.preventDefault();if(input.capture){input.capture=null;$('capture-hint').textContent='Призначення скасовано.';}else closeSettings();});
$('reset-controls').onclick=()=>{input.bindings=freshBindings();input.save();drawBindings();};
for(const[id,key]of[['move-axis','moveAxis'],['deadzone','deadzone']]as const)$<HTMLInputElement>(id).oninput=()=>{const val=Number($<HTMLInputElement>(id).value);if(Number.isFinite(val))input.bindings[key]=key==='deadzone'?Math.max(.05,Math.min(.5,val)):Math.max(0,Math.min(15,Math.round(val)));input.save();$('deadzone-value').textContent=input.bindings.deadzone.toFixed(2);};
$<HTMLInputElement>('volume').oninput=()=>{sound.setVolume(Number($<HTMLInputElement>('volume').value));void sound.enable();};
try{sound.music=localStorage.getItem('uaforce.audio.background')!=='off';}catch{}
$<HTMLInputElement>('music').checked=sound.music;
$<HTMLInputElement>('music').onchange=()=>{sound.music=$<HTMLInputElement>('music').checked;try{localStorage.setItem('uaforce.audio.background',sound.music?'on':'off');}catch{}void sound.enable();};
for(const channel of ['effects','music','voice'] as const){
  const control=$<HTMLInputElement>(channel+'-volume');
  try{const saved=localStorage.getItem('uaforce.audio.'+channel);if(saved!==null)sound.setMix(channel,Number(saved));}catch{}
  control.value=String(channel==='effects'?sound.effectsVolume:channel==='music'?sound.musicVolume:sound.voiceVolume);
  control.oninput=()=>{sound.setMix(channel,Number(control.value));try{localStorage.setItem('uaforce.audio.'+channel,control.value);}catch{}};
}
const previewSelect=$<HTMLSelectElement>('voice-preview-select');
for(const h of ANNOUNCER_NAMES)previewSelect.add(new Option(h.name,h.id));
for(const [id,label] of [['mission-start','Початок операції'],['new-hero','Новий боєць'],['checkpoint','Контрольна точка'],['evac-called','Виклик евакуації'],['boarded','Посадка'],['victory','Перемога'],['defeat','Поразка'],['respawn','Повернення в бій']])previewSelect.add(new Option(label,id));
$('voice-preview').onclick=()=>sound.preview(previewSelect.value);
$('voice-stop').onclick=()=>sound.stopAll();
$<HTMLSelectElement>('controller-select').onchange=()=>{input.selected=Number($<HTMLSelectElement>('controller-select').value);input.clear();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Повноекранний режим недоступний у цьому вікні.');}};

const scaleInput=$<HTMLInputElement>('ui-scale');
function setScale(value:number){const scale=Number.isFinite(value)?Math.max(100,Math.min(160,value)):100;document.documentElement.style.setProperty('--ui-scale',String(scale/100));scaleInput.value=String(scale);$('ui-scale-value').textContent=scale+'%';}
try{setScale(Number(localStorage.getItem('uaforce.ui-scale')??100));}catch{setScale(100);}
scaleInput.oninput=()=>{setScale(Number(scaleInput.value));try{localStorage.setItem('uaforce.ui-scale',scaleInput.value);}catch{}};

$('menu-fullscreen').onclick=()=>{$('fullscreen').click();};
let padSignature='';let portraitHero='';let promptSignature='';
function diagnostics(){
  const p=input.pad;
  $('pad-status').textContent=p?'● Геймпад підключено':'Геймпад: натисніть будь-яку кнопку';$('pad-status').classList.toggle('connected',!!p);
  if(!settings.open)return;
  $('audio-preview-status').textContent=sound.announcing?'Відтворюється оголошення…':'Готово до прослуховування';
  $('controller-info').textContent=p?`${p.id} · ${p.mapping==='standard'?'стандартна розкладка':'нестандартна розкладка — перевірте призначення'} · ${p.buttons.length} кнопок, ${p.axes.length} осей`:'Браузер ще не бачить контролер. Підключіть його та натисніть будь-яку кнопку на активній вкладці.';
  const signature=input.pads.map(p=>`${p.index}:${p.id}`).join('|');
  if(signature!==padSignature){padSignature=signature;const select=$<HTMLSelectElement>('controller-select');select.replaceChildren(new Option('Автоматично','-1'));for(const pad of input.pads)select.add(new Option(pad.id,String(pad.index)));select.value=String(input.selected);}
  $('pad-visual').replaceChildren();
  if(p){
    p.buttons.forEach((b,i)=>{const el=document.createElement('span');el.className='pad-button'+(b.pressed||b.value>.45?' active':'');el.textContent=`${i}: ${b.value.toFixed(1)}`;$('pad-visual').append(el);});
    p.axes.forEach((a,i)=>{const el=document.createElement('span');el.className='pad-axis';el.textContent=`Вісь ${i}: ${a.toFixed(2)}`;$('pad-visual').append(el);});
  }
}
function padLabel(action:keyof Bindings['buttons']){const n=input.bindings.buttons[action];return ({0:'A / ✕',2:'X / □',5:'RB / R1',6:'LT / L2',7:'RT / R2',9:'Start / Options'} as Record<number,string>)[n]??`Кнопка ${n}`;}
function battleKey(action:keyof Bindings['buttons']){
  if(input.source!=='gamepad')return input.bindings.keys[action].replace('Key','').replace('Digit','').replace('Space','␣').replace('ArrowLeft','←').replace('ArrowRight','→');
  return padButtonLabel(input.bindings.buttons[action],input.pad?.id);
}
function ui(){
  const boss=world.boss;bossStatus.hidden=world.mode!=='playing'||!boss?.boss?.active||boss.hp<=0;
  if(boss?.boss){bossStatus.querySelector('span')!.textContent=BOSSES[boss.boss.id].name+' · '+['I','II','III'][boss.boss.stage-1]+(boss.boss.phase==='windup'?' · '+BOSSES[boss.boss.id].attacks[boss.boss.turn%3]:'');bossStatus.querySelector('progress')!.value=boss.hp/boss.maxHp;}
  document.body.classList.toggle('menu-open',!menu.hidden);
  document.body.classList.toggle('paused',!pauseMenu.hidden);
  $('hero-name').textContent=world.hero.name;
  if(ready&&portraitHero!==world.heroId){portraitHero=world.heroId;const url=view.portrait(world.heroId);$<HTMLImageElement>('hero-portrait').src=url;$<HTMLImageElement>('menu-portrait').src=assetUrl(`/assets/cinematics/${world.heroId}.png`);$<HTMLImageElement>('menu-portrait').alt=world.hero.name;}
  document.title=`UA Force — ${world.mission.name}`;
  $('mission-name').textContent=`${world.mission.region} · ${world.section.name}`;
  $('health-text').textContent=String(Math.ceil(world.mounted?.armor??world.player.hp));$('health-bar').style.width=(world.mounted?world.mounted.armor/world.mounted.maxArmor*100:world.player.hp)+'%';$('lives').textContent=String(world.lives);
  const heroStatus=`${world.hero.name}. ${world.mounted?'Броня танка '+Math.ceil(world.mounted.armor):'Здоров’я '+Math.ceil(world.player.hp)}. Життя: ${world.lives}.`;
  $('hero-status').title=heroStatus;$('hero-status').setAttribute('aria-label',heroStatus);
  updateAbilities(world,world.mounted?[battleKey('fire'),battleKey('interact'),'']: [battleKey('fire'),battleKey('special'),battleKey('ultimate')]);
  $('rescue-count').textContent=`${world.rescued}/${world.allies.length}`;
  for(const [id,done,label] of [
    ['objective-rescue',world.rescued===world.allies.length,`Звільнено полонених: ${world.rescued}/${world.allies.length}`],
    ['objective-radio',world.radioDestroyed,`Радіовузол: ${world.radioDestroyed?'знищено':'додаткова ціль'}`],
    ['objective-heavy',world.evac.phase!=='waiting',world.objectiveComplete?'До прапора евакуації':world.mission.boss?BOSSES[world.mission.boss].objective:'Здолайте командира'],
  ] as const){$(id).classList.toggle('complete',done);$(id).title=label;$(id).setAttribute('aria-label',label);}
  const target=world.objectiveComplete?'helicopter':'skull';
  if($('target-icon').dataset.icon!==target){$('target-icon').dataset.icon=target;$('target-icon').innerHTML=icon(target);}
  $('time').textContent=formatTime(world.time);$('fps').textContent=`${Math.round(view.fps)} кадр/с`;
  const prompt=world.mode==='playing'?world.prompt:'';
  const rescue=prompt==='Звільнити полоненого',vehicle=prompt==='Сісти в танк'||prompt==='Вийти з танка',barrel=prompt==='Підняти бочку'||prompt==='Кинути бочку';
  const promptHtml=prompt&&!rescue&&!vehicle&&!barrel?`${rescue||vehicle||barrel?'<kbd>'+battleKey('interact')+'</kbd>':''}${icon(barrel?'barrel':vehicle?(world.mounted?'exit':'tank'):rescue?'captive':'helicopter')}${!rescue&&!vehicle&&!barrel&&world.evac.phase==='waiting'?'<b>→</b>':''}`:'';
  if(promptSignature!==promptHtml){promptSignature=promptHtml;$('interact-prompt').innerHTML=promptHtml;}
  if($('interact-prompt').title!==prompt){$('interact-prompt').setAttribute('aria-label',prompt);$('interact-prompt').title=prompt;}
  diagnostics();
}
view.onGoreImpact=(x,y)=>{if(world.mode==='playing')sound.event({type:'goreLand',x,y},world.player.x);};
function syncStoryControls(){
  const inStory=!!world.story;document.body.classList.toggle('story-active',inStory);storySkip.hidden=!inStory||world.mode!=='playing'||world.story!.age<.8||world.story!.exit!==null;
  if(storyWasActive!==inStory){input.clear();pendingJump=pendingSpecial=pendingUltimate=pendingFire=pendingInteract=false;sound.stopAll();storyWasActive=inStory;}
}
view.onFrame=dt=>{
  flags.step(dt);
  syncStoryControls();
  sound.bossBattle=!!world.boss?.boss?.active;sound.scoreTheme=world.mission.score;
  view.interactKey=battleKey('interact');
  const frame=input.poll(dt),wasMenu=!menu.hidden||!pauseMenu.hidden||settings.open||roster.open||operations.open||onlineMenu.open||about.open||feedback.open||flags.active;
  if(online?.role==='guest'&&online.connected){pendingJump ||= frame.action.jump;pendingSpecial ||= frame.action.special;pendingUltimate ||= !!frame.action.ultimate;netClock+=dt;if(netClock>=1/30){online.input(wasMenu?{move:0,jump:false,fire:false,special:false,interact:false}:{...frame.action,jump:pendingJump,special:pendingSpecial,ultimate:pendingUltimate});pendingJump=pendingSpecial=pendingUltimate=false;netClock=0;}}
  if(world.mode==='cinematic'){cinematic.sync(world);cinematic.step(dt,frame.confirm||frame.action.jump);view.render(world,dt,0);sound.step(dt,false,false);publishOnline(dt);ui();return;}
  if(world.story&&world.mode==='playing'&&world.story.age>=.8&&frame.confirm)storySkip.click();
  if(frame.pause){if(feedback.open)feedback.close();else if(onlineMenu.open)closeOnlineMenu();else if(about.open)closeAbout();else if(operations.open)closeOperations();else if(roster.open)closeRoster();else if(settings.open)closeSettings();else if(world.mode==='playing')pause();else if(world.mode==='paused')resume();}
  if(wasMenu){
    if(!menu.hidden){menuClock+=dt;menuFx.draw(menuClock,'menu');}
    if(frame.confirm)void sound.enable();
    $('menu-audio').textContent=sound.audioReady&&sound.music?'♫ Музика увімкнена':'♫ Увімкнути музику';
    const root=feedback.open?feedback.dialog:onlineMenu.open?onlineMenu:about.open?about:operations.open?operations:roster.open?roster:settings.open?settings:!pauseMenu.hidden?pauseMenu:menu;
    const buttons=Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter(b=>!b.hidden&&!b.disabled&&b.getClientRects().length>0);
    if(frame.up||frame.down){menuIndex=((buttons.indexOf(document.activeElement as HTMLButtonElement)>=0?buttons.indexOf(document.activeElement as HTMLButtonElement):menuIndex)+(frame.down?1:-1)+buttons.length)%Math.max(1,buttons.length);buttons[menuIndex]?.focus();}
    if(frame.confirm&&!input.capture){const focused=document.activeElement;((focused instanceof HTMLButtonElement&&root.contains(focused))?focused:buttons[menuIndex])?.click();}
  }
  if(world.mode==='playing'&&!wasMenu&&!settings.open&&online?.role!=='guest'){
    pendingJump ||= frame.action.jump;pendingSpecial ||= frame.action.special;pendingUltimate ||= !!frame.action.ultimate;pendingFire ||= frame.action.fire;pendingInteract ||= frame.action.interact;
    accumulator+=dt;let first=true;
    while(accumulator>=1/60){const wasStory=!!world.story;const action={...frame.action,jump:first&&pendingJump,special:first&&pendingSpecial,ultimate:first&&pendingUltimate,fire:frame.action.fire||pendingFire,interact:frame.action.interact||pendingInteract};if(online?.connected)world.stepPlayers(1/60,[action,online.remote.take(performance.now()/1000)]);else world.step(1/60,action);first=false;pendingJump=false;pendingSpecial=false;pendingUltimate=false;pendingFire=false;pendingInteract=false;accumulator-=1/60;if(wasStory!==!!world.story){accumulator=0;break;}}
  }else {accumulator=0;if(online?.role!=='guest'){pendingJump=false;pendingSpecial=false;pendingUltimate=false;}pendingFire=false;pendingInteract=false;}
  syncStoryControls();
  for(const event of world.events){
    view.event(event);if(!(event.type==='heroChanged'&&event.unlocked)&&event.type!=='bossEncounter')sound.event(event,world.player.x);
    if(event.type==='heroChanged'){remember();if(!event.unlocked)toast(world.hero.name);}
    if(event.type==='bossDefeated'&&event.boss)toast(BOSSES[event.boss].defeat);
    if(event.type==='evacCalled')toast('Евакуація');
    if(event.type==='won'||event.type==='lost'){
      if(event.type==='won'&&!practice&&!online){
        saveRecord({seconds:world.time,rescued:world.rescued,kills:world.kills,shots:world.shots,hits:world.hits},world.missionIndex);
        remember();progress.mission=Math.min(MISSIONS.length-1,world.missionIndex+1);progress.completed=world.missionIndex===MISSIONS.length-1;saveProgress(progress);
        if(!progress.completed)transition=1.2;
      }showMenu();
    }
  }
  publishOnline(dt);world.events=[];cinematic.sync(world);view.render(world,dt,frame.action.move);if(!world.story)sound.syncWorld(world);sound.step(dt,!!world.story?false:musicDanger(world,frame.action.fire),world.mode==='playing',frame.action.fire,world.mode==='ready'&&!menu.hidden&&document.hasFocus()&&!document.hidden&&!settings.open);
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
  if(transition>0&&!sound.announcing&&!settings.open&&!feedback.open&&document.hasFocus()&&!document.hidden){transition-=dt;if(transition<=0)startMission(world.missionIndex+1);}
  uiTime+=dt;if(uiTime>.08){ui();uiTime=0;}
};

function syncOnlineControls(){for(const id of ['pause-restart','pause-roster'])$(id).hidden=!!online;}
function leaveOnline(message?:string){
 const old=online;online=null;old?.close();writer=null;outgoingEvents=[];netClock=0;netSequence=0;guestEpoch='';
 sound.stopAll();cinematic.dismiss();onlineMenu.close();feedback.close();flags.stop();practice=false;transition=0;
 world=new World(progress.mission,progress.unlocked,progress.hero);view.reset(world);syncOnlineControls();showMenu();
 if(message){$('online-status').textContent=message;onlineMenu.showModal();$('online-close').focus();}
}
function publishOnline(dt:number){
 if(online?.role!=='host'||!online.connected||!writer)return;
 outgoingEvents.push(...world.events);if(outgoingEvents.length>256)outgoingEvents.splice(0,outgoingEvents.length-256);
 netClock+=dt;if(netClock>=.05){online.state(writer.snapshot(++netSequence,outgoingEvents));outgoingEvents=[];netClock=0;}
}
function onlineCommand(command:RoomCommand){
 if(command==='pause')pause('Пауза друга');
 if(command==='resume')resume(false);
 if(command==='continue'){if(world.story&&world.mode==='playing')skipStory(world);else if(world.mode==='cinematic')cinematic.confirm();}
 if(command==='next'&&world.mode==='won')begin();
}
cinematic.onConfirm=()=>{if(online?.role==='guest'){online.command('continue');return false;}return true;};
async function enterOnline(role:'host'|'guest'){
 if(!ready||onlineLoading)return;
 if(online)leaveOnline();const attempt=++onlineAttempt;onlineLoading=true;$('online-status').textContent='Підключення…';
 try{
  const {OnlineRoom,normalizeRoom,validRoom}=await import('./game/online');
  const {connectionConfig}=await import('./game/ice');
  roomCode=role==='host'?OnlineRoom.code():normalizeRoom($<HTMLInputElement>('online-code').value);
  if(!validRoom(roomCode)){$('online-status').textContent='Введіть 8 символів коду кімнати.';return;}
  const hero=$<HTMLSelectElement>('online-hero').value as typeof HEROES[number]['id'];
  $('online-status').textContent='Готуємо пряме та резервне з’єднання…';
  const config=await connectionConfig(new URLSearchParams(location.search).get('relay')==='1');
  if(attempt!==onlineAttempt)return;
  online=new OnlineRoom(role,roomCode,hero,{
   status:text=>$('online-status').textContent=text,
   created:code=>{$('online-status').textContent='Код: '+code.slice(0,4)+' '+code.slice(4)+' · очікуємо друга';$('online-invite').hidden=false;},
   connected:guestHero=>{
    if(role==='host'){
     sound.stopAll();world=new World(world.missionIndex,HEROES.map(h=>h.id),hero);world.addPlayer(guestHero);world.mode='playing';writer=new SnapshotWriter(world);
     onlineMenu.close();menu.hidden=true;pauseMenu.hidden=true;view.reset(world);input.clear();accumulator=0;canvas.focus();flags.play();sound.announce('missionStart',hero);
    }else $('online-status').textContent='Друг поруч. Завантаження спільної операції…';
    syncOnlineControls();
   },
   snapshot:s=>{
    const fresh=s.epoch!==guestEpoch;
    if(fresh){sound.stopAll();cinematic.dismiss();world=new World(s.mission,s.state.unlocked as typeof world.unlocked,s.players[0].heroId);guestEpoch=s.epoch;}
    const before=world.mode;applySnapshot(world,s);
    if(fresh){onlineMenu.close();menu.hidden=true;pauseMenu.hidden=true;view.reset(world);input.clear();canvas.focus();flags.play(s.mission%2===1);}
    if(world.mode==='playing'){menu.hidden=true;pauseMenu.hidden=true;cinematic.dismiss();}
    if(world.mode==='paused'&&before!=='paused'){sound.stopAll();menu.hidden=true;pauseMenu.hidden=false;input.clear();$('pause-mission').textContent=world.mission.name;$('pause-resume').focus();}
   },
   command:onlineCommand,
   ended:message=>leaveOnline(message),
  },config);
 }catch{if(attempt!==onlineAttempt)return;$('online-status').textContent='Резервний сервіс з’єднання недоступний. Спробуйте ще раз за хвилину; одиночна гра працює.';}
 finally{onlineLoading=false;}
}
for(const hero of HEROES)$<HTMLSelectElement>('online-hero').add(new Option(hero.name,hero.id));
$('online-open').onclick=()=>{input.clear();$('online-status').textContent='';$('online-invite').hidden=true;onlineMenu.showModal();$('online-create').focus();};
function closeOnlineMenu(){onlineAttempt++;if(online&&!online.connected){leaveOnline();return;}onlineMenu.close();input.clear();$('online-open').focus();}
$('online-close').onclick=closeOnlineMenu;onlineMenu.addEventListener('cancel',e=>{e.preventDefault();closeOnlineMenu();});
$('online-create').onclick=()=>void enterOnline('host');$('online-join').onclick=()=>void enterOnline('guest');
async function copyLink(url:string){try{await navigator.clipboard.writeText(url);toast('Посилання скопійовано');return true;}catch{toast('Скопіюйте посилання з адресного рядка');return false;}}
$('online-invite').onclick=()=>{const url=new URL(location.href);url.search='';url.searchParams.set('room',roomCode);void copyLink(url.href);};
$('share-game').onclick=()=>void copyLink('https://uaforce.thedimas.com');
const support=supportUrl(SUPPORT_URL);if(support){$('support-development').hidden=false;$<HTMLAnchorElement>('support-link').href=support;}
$('about-open').onclick=()=>{input.clear();about.showModal();$('about-close').focus();};
function closeAbout(){about.close();input.clear();$('about-open').focus();}
$('about-close').onclick=closeAbout;about.addEventListener('cancel',e=>{e.preventDefault();closeAbout();});

void view.init().then(()=>{ready=true;for(const node of Array.from(document.querySelectorAll<HTMLElement>('.roster-image'))){const im=document.createElement('img');im.src=view.portrait(node.dataset.hero!);im.alt='';node.append(im);}view.reset(world);$<HTMLButtonElement>('primary').disabled=false;showMenu();const invite=new URLSearchParams(location.search).get('room');if(invite){$<HTMLInputElement>('online-code').value=invite;$('online-open').click();}const record=readRecord(world.missionIndex);if(record)$('result').textContent=`Найкращий час: ${formatTime(record.seconds)}`;ui();}).catch(error=>{$('primary').textContent='Не вдалося завантажити гру';$('menu-copy').textContent='Оновіть сторінку та перевірте локальний сервер.';console.error(error);});
window.addEventListener('pagehide',()=>{online?.close();input.destroy();sound.dispose();if(view.app)view.dispose();},{once:true});
