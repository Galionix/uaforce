import {storyTrigger,stepStory,type StoryState} from './story-scenes.ts';
import {constrainTeam,sharedRespawn} from './shared-screen.ts';
import {missionInfantry,stepInfantry,frighten,type Infantry,type InfantryKind} from './infantry.ts';
import {nearbyBarrel,interactBarrel,stepBarrels,dropBarrel} from './barrels.ts';
import {DeathLines,type DeathCause} from './enemy-death.ts';
import {MotionFoley} from './hero-foley.ts';
import {WALL,wallAt,ledgeAt} from './wall-movement.ts';
import {missionMounts,stepMounts,nearbyMount,exitMount,damageMount,TANK,type Mount} from './mounts.ts';
import {attachBoss,triggerBoss,resetBoss,stepBoss,bossDefeated,BOSSES,ARENA_RESTOCK_SECONDS,type BossActor,type BossId} from './bosses.ts';
import {missionVehicles,stepVehicle,hostileBlast,enemyActive,enemySize,type Vehicle} from './enemies.ts';
import {stepFollowers, clearShot, type Follower} from './followers.ts';
import {cycleWeapon,resetWeapon,WEAPONS} from './weapons.ts';
import {attack,mamaiMelee,canSpecial,launchEffect,stepHeroEffect,effectAudioPhase} from './hero-combat.ts';
import { HEROES, MISSIONS, heroById, type HeroId, type Mission } from './content.ts';
export type Effect={playerId?:number;kind:'weapon'|'special'|'ultimate';hero:HeroId;x:number;y:number;dir:number;life:number;age:number;hit:Set<number>;originX?:number;originY?:number;target?:number;audioMarks?:Set<string>};
export type Mode = 'ready' | 'playing' | 'paused' | 'lost' | 'won' | 'cinematic';
export type Actions = { move: number; jump: boolean; jumpHeld?:boolean; fire: boolean; special: boolean; ultimate?: boolean; interact: boolean; climb?: number };
export type Box = { id: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; vx?:number;vy?:number; kind: 'crate' | 'barrel' | 'wall' | 'radio' | 'platform' | 'earth' | 'stone' };
export type Enemy = { id: number; x: number; y: number; hp: number; maxHp: number; dir: number; cooldown: number; windup: number; anchor: number; heavy: boolean; vehicle?:Vehicle;infantry?:Infantry;boss?:BossActor; panic?:{remaining:number;playerId:number;hero:HeroId;kind:Effect['kind'];voiceIn:number}; rooted?:number; poison?:number; distracted?:number };
export type Bullet = { id: number; x: number; y: number; vx: number; vy: number; life: number; friendly: boolean; damage: number; hero?:HeroId;ordnance?:'shell'|'rocket';blastRadius?:number };
export type Event = { type: 'enemySuspect' | 'enemyPanic' | 'goreLand' | 'sfx' | 'barrelLift' | 'barrelThrow' | 'enemyDeath' | 'enemyAlert' | 'enemyAim' | 'enemyFuse' | 'enemyReload' | 'enemySniperShot' | 'enemyShieldHit' | 'shot' | 'enemyShot' | 'debris' | 'burst' | 'hurt' | 'rescue' | 'checkpoint' | 'won' | 'lost' | 'special' | 'ultimate' | 'thunder' | 'heroChanged' | 'evacCalled' | 'boarded' | 'respawn' | 'supportShot' | 'voiceWave' | 'railShot' | 'reloadStart' | 'reloadEnd' | 'followerHurt' | 'followerDown' | 'tankAlert' | 'planeAlert' | 'droneAlert' | 'tankEngine' | 'planeEngine' | 'droneEngine' | 'tankAim' | 'tankShot' | 'rocketLaunch' | 'droneDive' | 'hostileBlast' | 'ammoPickup' | 'bossEncounter' | 'bossDefeated' | 'bossWindup' | 'mountEnter' | 'mountExit' | 'mountBroken' | 'armorHit' | 'mountEngine' | 'mountShot' | 'mountJump' | 'mountLand' | 'wallJump' | 'wallVault' | 'footstep' | 'climbContact' | 'jump' | 'land' | 'abilityReady'; deathRole?:InfantryKind;deathCause?:DeathCause;soundOwner?:number;sfx?:string;variant?:'melee'|'pistol'|'infantry'|'turret';text?:string; boss?:BossId; hero?: HeroId; unlocked?: boolean; x: number; y: number };
export const IDLE: Actions = { move: 0, jump: false, fire: false, special: false, interact: false };

export function createPlayerBody(){return { x: 3, y: 0, vy: 0, hp: 100, facing: 1, grounded: true, invulnerable: 0, cooldown: 0, energy: 100, coyote: 0.12, wallSide:0,wallLock:0,wallVx:0,wallClimbing:false,ladder: -1, ladderLock: 0, detachVx: 0, ladderNeedsRelease:false, cast:0, attack:0, specialCooldown:0, specialRecovery:[] as number[], form:0, cloak:0, fireCount:0, ammo:0, reloading:0, burstShots:0, weaponTrigger:false };}
export type PlayerActor={id:number;body:ReturnType<typeof createPlayerBody>;heroId:HeroId;lives:number;checkpoint:number;mounted:Mount|null;heldBarrel:number|null;interactHeld:boolean;motionFoley:MotionFoley;move:number};
function createActor(id:number,heroId:HeroId):PlayerActor {return {id,body:createPlayerBody(),heroId,lives:3,checkpoint:3,mounted:null,heldBarrel:null,interactHeld:false,motionFoley:new MotionFoley(),move:0};}

export class World {
  players:PlayerActor[]=[createActor(0,"shevchenko")];
  private activePlayer=0;
  get actor(){return this.players[this.activePlayer];}
  get player(){return this.actor.body;}
  get heroId(){return this.actor.heroId;}
  set heroId(value:HeroId){this.actor.heroId=value;}
  get lives(){return this.actor.lives;}
  set lives(value:number){this.actor.lives=value;}
  get checkpoint(){return this.actor.checkpoint;}
  set checkpoint(value:number){this.actor.checkpoint=value;}
  get mounted(){return this.actor.mounted;}
  set mounted(value:Mount|null){this.actor.mounted=value;}
  get heldBarrel(){return this.actor.heldBarrel;}
  set heldBarrel(value:number|null){this.actor.heldBarrel=value;}
  private get interactHeld(){return this.actor.interactHeld;}
  private set interactHeld(value:boolean){this.actor.interactHeld=value;}
  private get motionFoley(){return this.actor.motionFoley;}
  selectPlayer(id:number){if(!this.players[id])throw new Error("Unknown player");this.activePlayer=id;}
  withPlayer<T>(id:number,fn:()=>T):T {const before=this.activePlayer;this.selectPlayer(id);try{return fn();}finally{this.activePlayer=before;}}
  addPlayer(hero:HeroId=this.heroId){if(this.players.length>=2)throw new Error("Two players maximum");const actor=createActor(1,hero);actor.body.x=this.player.x+1;actor.body.y=this.player.y;resetWeapon(actor.body,WEAPONS[hero]);this.players.push(actor);return actor;}
  nearestPlayer(x:number,y:number){return [...this.players].filter(a=>a.lives>0).sort((a,b)=>Math.hypot(a.body.x-x,a.body.y-y)-Math.hypot(b.body.x-x,b.body.y-y))[0]??this.players[0];}
  clearOwned(){const id=this.actor.id;this.followers=this.followers.filter(f=>(f.playerId??0)!==id);this.effects=this.effects.filter(f=>(f.playerId??0)!==id);}

  private deathLines=new DeathLines();
  mode: Mode = 'ready';
  story:StoryState|null=null;storyDone:string[]=[];storyPending:string|null=null;
  mounts:Mount[]=[];
  cinematic:{kind:'hero'|'boss';id:string;serial:number}|null=null;
  private cinematicSerial=0;
  boss:Enemy|null=null;
  beginCinematic(kind:'hero'|'boss',id:string){this.cinematic={kind,id,serial:++this.cinematicSerial};this.mode='cinematic';}
  finishCinematic(){if(this.mode!=='cinematic'||!this.cinematic)return;this.cinematic=null;this.mode='playing';this.player.invulnerable=Math.max(this.player.invulnerable,.8);}
  mission: Mission; missionIndex:number; unlocked:HeroId[];
  evac={phase:"waiting" as "waiting"|"arriving"|"boarding"|"departing"|"done",time:0,x:112,y:8};
  boxes: Box[] = [];
  ladders = [{x:18,bottom:0,top:8.5},{x:34,bottom:0,top:8.5},{x:51,bottom:0,top:8.5},{x:65,bottom:0,top:8.5},{x:79,bottom:0,top:8.5}];
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  followers: Follower[] = [];
  allies = [{ x: 29, rescued: false }, { x: 66, rescued: false }];
  ammoCrates:{x:number;y:number;used:boolean;arena?:BossId;restock?:number}[]=[];
  medkits:{x:number;used:boolean;arena?:BossId}[] = [{ x: 36, used: false }, { x: 71, used: false }];
  effects:Effect[]=[];
  events: Event[] = [];
  // Host-only short-lived hearing stimuli, independent of presentation event draining.
  noises:{x:number;y:number;until:number}[]=[];
  time = 0; kills = 0; shots = 0; hits = 0; destroyed = 0;
  private serial = 1;
  private heroRandom:()=>number;
  nextId(){return this.serial++;}
  emit(type:Event["type"],x:number,y:number){this.event(type,x,y);}
  emitSfx(sfx:string,x:number,y:number,hero:HeroId=this.heroId,soundOwner?:number){this.events.push({type:'sfx',sfx,x,y,hero,soundOwner});}
  constructor(missionIndex=0,unlocked:HeroId[]=["shevchenko"],heroId:HeroId="shevchenko",heroRandom:()=>number=Math.random) {
    this.heroRandom=heroRandom;
    this.missionIndex=Math.max(0,Math.min(MISSIONS.length-1,missionIndex));this.mission=MISSIONS[this.missionIndex];this.unlocked=[...new Set(["shevchenko" as HeroId,...unlocked])];this.heroId=this.unlocked.includes(heroId)?heroId:"shevchenko";
    resetWeapon(this.player,WEAPONS[this.heroId]);
    this.ammoCrates=this.mission.ammo.map(x=>({x,y:0,used:false}));
    this.evac.x=this.mission.exit+22;
    this.allies=this.mission.allies.map(x=>({x,rescued:false}));this.medkits=this.mission.medkits.map(x=>({x,used:false}));
    this.ladders=this.mission.ladders.map(x=>({x,bottom:0,top:Math.max(...(this.mission.floorPlans[this.mission.forts.findIndex(([l,r])=>x>=l-2&&x<=r)]??this.mission.floors))+.5}));
    const box = (x: number, y: number, w: number, h: number, hp: number, kind: Box['kind']) => this.boxes.push({ id: this.serial++, x, y, w, h, hp, maxHp: hp, kind });
    box(10, 0, 1.1, 1.1, 30, 'crate'); box(19, 0, 1.1, 1.1, 25, 'barrel');
    box(23, 0, 1.2, 1.2, 50, 'crate'); box(23, 1.2, 1.2, 1.2, 30, 'crate');
    box(33, 0, 1.5, 1.6, 85, 'wall'); box(40, 0, 1.1, 1.1, 25, 'barrel');
    box(52, 0, 1.2, 1.2, 50, 'crate'); box(58, 0, 1.1, 1.1, 25, 'barrel');
    box(this.mission.radio, 0, 1.6, 2.2, 150, 'radio'); box(82, 0, 1.1, 1.1, 25, 'barrel');
    box(18, 2.2, 6, 0.35, Infinity, 'platform'); box(54, 2.2, 6, 0.35, Infinity, 'platform');
    for(const [left,right,top] of this.mission.bridges)box((left+right)/2,top-.35,right-left,.35,Infinity,'platform');
    for(let x=0;x<this.mission.length;x++)for(let y=-3;y<0;y++)box(x+.5,y,1,1,y===-3?Infinity:40,'earth');
    for(const [index,[left,right]] of this.mission.forts.entries()) {
      const floors=this.mission.floorPlans[index];
      for(const y of floors)for(let x=left;x<right;x++)box(x+.5,y,1,.5,65,'stone');
      for(const x of [left,right-1])for(let y=0;y<floors.at(-1)!;y++)if(y%4>1)box(x+.5,y,1,1,50,'stone');
      if(index>0){box(left+3,0,1.1,.9,35,'crate');if(index>2){const bx=[left+10,left+12,left+5].find(x=>![...this.mission.allies,...this.mission.ammo,...this.mission.checkpoints].some(s=>Math.abs(s-x)<1.5))!;box(bx,0,1.1,1.1,25,'barrel');}}
      box(left+4,floors[0]+.5,1,1,25,'barrel');box(left+8,floors.at(-1)!+.5,1,1,30,'crate');
    }
    this.mission.enemies.forEach((x, index) => {
      const heavy = index === this.mission.enemies.length-1 && !this.mission.boss;
      this.enemies.push({ id: this.serial++, x, y: 0, hp: heavy ? 180 : 48, maxHp: heavy ? 180 : 48, dir: -1, cooldown: 1.2 + index % 3 * .3, windup: 0, anchor: x, heavy });
    });
    this.mission.forts.forEach(([left],i)=>this.enemies.push({id:this.serial++,x:left+6,y:this.mission.floorPlans[i][0]+.5,hp:48,maxHp:48,dir:-1,cooldown:2,windup:0,anchor:left+6,heavy:false}));
    missionInfantry(this);missionVehicles(this);attachBoss(this);missionMounts(this);
  }
  get section(){return this.mission.districts.find(d=>this.player.x>=d.start&&this.player.x<d.end)??this.mission.districts.at(-1)!;}
  get hero(){return heroById(this.heroId);}
  get specialCharges(){return this.hero.specialCharges-this.player.specialRecovery.length;}
  get rescued() { return this.allies.filter(a => a.rescued).length; }
  get radioDestroyed() { return this.boxes.some(b => b.kind === 'radio' && b.hp <= 0); }
  get objectiveComplete() { return this.enemies.every(e => !e.heavy || e.hp <= 0); }
  get prompt() {
    const p=this.player;
    if(this.mounted)return 'Вийти з танка';
    if(this.heldBarrel!==null)return 'Кинути бочку';
    if(this.evac.phase==='departing')return 'Евакуація…';
    if(this.allies.some(a=>!a.rescued&&Math.abs(a.x-p.x)<2.2&&p.y<2))return 'Звільнити полоненого';
    if(nearbyMount(this))return 'Сісти в танк';
    if(nearbyBarrel(this))return 'Підняти бочку';
    if(this.evac.phase==='arriving')return 'Гелікоптер наближається — тримайте точку';
    if(this.evac.phase==='boarding')return 'Підійдіть до троса біля прапора';
    if(this.objectiveComplete)return 'До прапора евакуації →';
    return '';
  }
  private changeHero(){
    this.motionFoley.reset();
    // The host draws once per rescue; snapshots carry the result to the guest.
    const closed=HEROES.filter(h=>!this.unlocked.includes(h.id)).map(h=>h.id);
    const newlyUnlocked=closed.length>0;
    const pool=newlyUnlocked?closed:this.unlocked.filter(id=>id!==this.heroId);
    const next=pool[Math.floor(this.heroRandom()*pool.length)]??this.heroId;
    this.clearOwned();if(this.players.length===1)this.bullets=this.bullets.filter(b=>!b.friendly);this.player.cloak=0;this.player.fireCount=0;this.player.cooldown=0;this.player.form=0;this.player.specialCooldown=0;this.player.specialRecovery=[];
    this.heroId=next;
    resetWeapon(this.player,WEAPONS[this.heroId]);
    if(newlyUnlocked){this.unlocked.push(next);this.beginCinematic('hero',next);}
    this.events.push({type:'heroChanged',x:this.player.x,y:this.player.y+1,hero:this.heroId,unlocked:newlyUnlocked});
  }
  private stepEvac(dt:number){
    const e=this.evac,p=this.player,x=this.mission.exit;
    if(e.phase==='waiting'&&this.objectiveComplete&&p.x>=x-4){e.phase='arriving';e.time=0;this.event('evacCalled',x,1);}
    if(e.phase==='arriving'){
      e.time+=dt;const t=Math.min(1,e.time/2.6),ease=t*t*(3-2*t);e.x=x+22*(1-ease);e.y=3+5*(1-ease);
      if(t===1){e.phase='boarding';e.time=0;}
    }else if(e.phase==='boarding'&&Math.abs(p.x-x)<7&&p.y<4){
      exitMount(this);e.phase='departing';e.time=0;p.ladder=-1;this.bullets=[];this.event('boarded',x,1);
    }else if(e.phase==='departing'){
      e.time+=dt;e.x=x+e.time*5;e.y=3+e.time*3;p.x=e.x;p.y=e.y-1;p.vy=0;
      if(e.time>=2.2){e.phase='done';this.mode='won';this.event('won',p.x,p.y);}
    }
  }
  private event(type: Event['type'], x: number, y: number) { this.events.push({ type, x, y, hero:this.heroId });
    if(['shot','mountShot','burst','hostileBlast','ultimate'].includes(type)){this.noises.push({x,y:y-1,until:this.time+.65});if(this.noises.length>12)this.noises.shift();}
  }
  damagePlayer(amount: number,contact=false) {
    const p = this.player;
    if(this.mode!=='playing')return;
    if(this.mounted){if(contact){if(this.mounted.contactCooldown>0)return;this.mounted.contactCooldown=.65;}damageMount(this,this.mounted,amount);return;}
    if (p.invulnerable > 0) return;
    p.hp = Math.max(0, p.hp - amount); p.invulnerable = .65;
    this.event('hurt', p.x, p.y + .8);
    if (p.hp === 0) {
      this.lives--;this.clearOwned();dropBarrel(this);if(this.players.length===1)resetBoss(this);
      if(this.players.length>1&&this.lives<=0)this.lives=1;
      if (this.lives <= 0) { this.mode = 'lost'; this.event('lost', p.x, p.y); }
      else { this.motionFoley.reset();p.x = this.checkpoint; p.y = 0; p.ladder=-1;p.ladderLock=0;p.detachVx=0;p.wallSide=0;p.wallLock=0;p.wallVx=0;p.wallClimbing=false;p.ladderNeedsRelease=false; p.vy = 0; p.hp = 100; p.invulnerable = 2.5; if(this.players.length===1)this.bullets = []; this.clearOwned();p.form=0;p.cloak=0;p.fireCount=0;resetWeapon(p,WEAPONS[this.heroId]);sharedRespawn(this);this.event('respawn',p.x,p.y); }
    }
  }
  damageFollower(f:Follower,damage:number){
    if(f.hp<=0)return;
    f.hp=Math.max(0,f.hp-damage);f.hurt=.16;
    this.events.push({type:f.hp===0?'followerDown':'followerHurt',x:f.x,y:f.y+.8,hero:f.owner,soundOwner:f.id});
  }
  damageEnemy(enemy: Enemy, damage: number, cause:DeathCause='combat') {
    if (!enemyActive(enemy)) return;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      if(enemy.boss)bossDefeated(this,enemy);this.kills++;
      if(enemy.vehicle||enemy.boss)this.event('burst',enemy.x,enemy.y+.8);
      else this.events.push({type:'enemyDeath',x:enemy.x,y:enemy.y+.9,deathRole:enemy.infantry?.kind??(enemy.heavy?'gunner':'rifle'),deathCause:cause,text:this.deathLines.next(Math.random,{cause,role:enemy.infantry?.kind})});
    }
  }
  damageBox(box: Box, damage: number) {
    if (box.hp <= 0 || box.kind === 'platform') return;
    box.hp -= damage;
    if (box.hp <= 0) {
      this.destroyed++; this.event(box.kind==='barrel'?'burst':'debris', box.x, box.y + box.h / 2);
      if (box.kind === 'barrel') this.explode(box.x, box.y + .5, 4, 90, true,'barrel');
    }
  }
  explode(x: number, y: number, radius: number, damage: number, hurtPlayer = false,cause:DeathCause='explosion') {
    this.event('burst', x, y);
    this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - x, e.y + .8 - y) < radius).forEach(e => this.damageEnemy(e, damage,cause));
    this.boxes.filter(b => b.hp > 0 && Math.hypot(b.x - x, b.y + b.h / 2 - y) < radius).forEach(b => this.damageBox(b, damage));
    if(hurtPlayer)for(const f of this.followers)if(Math.hypot(f.x-x,f.y+.8-y)<radius)this.damageFollower(f,damage);
    if(hurtPlayer)for(const a of this.players)if(Math.hypot(a.body.x-x,a.body.y+.8-y)<radius)this.withPlayer(a.id,()=>this.damagePlayer(18));
  }
  private ordnanceBlast(b:Bullet,x:number,y:number){
    if(b.friendly)this.explode(x,y,b.blastRadius!,b.damage);else hostileBlast(this,x,y,b.blastRadius!,b.damage);
  }
  projectile(x: number, y: number, ax: number, ay: number, friendly: boolean, heavy = false) {
    const length = Math.hypot(ax, ay) || 1;
    this.bullets.push({ id: this.serial++, x, y, vx: ax / length * (friendly ? this.hero.projectileSpeed : 12), vy: ay / length * (friendly ? this.hero.projectileSpeed : 12), life: friendly ? this.hero.projectileLife : 1.25, friendly, hero:friendly?this.heroId:undefined, damage: friendly ? this.hero.damage : heavy ? 15 : 9 });
    this.event(friendly ? 'shot' : 'enemyShot', x, y);
  }
  private stepEffects(dt:number){
    for(const f of [...this.effects])this.withPlayer(f.playerId??0,()=>{
      f.age+=dt;f.life-=dt;effectAudioPhase(this,f);
      if(f.kind==='weapon'||!['shevchenko','lesya','franko'].includes(f.hero)){stepHeroEffect(this,f,dt);return;}
      if(f.life<=0)return;
      if(f.kind==='special'){
        if(f.hero==='shevchenko'){
          for(const e of this.enemies)if(e.hp>0&&!f.hit.has(e.id)&&Math.abs(e.x-f.x)<8&&Math.abs(e.y-f.y)<4){f.hit.add(e.id);frighten(this,e,f);this.emitSfx('shevchenko-hit',e.x,e.y,f.hero);}
        }else if(f.hero==='lesya'){
          f.x+=f.dir*2*dt;
          for(const e of this.enemies)if(e.hp>0&&Math.abs(e.x-f.x)<9&&Math.abs(e.y-f.y)<5){if(!e.vehicle&&!e.boss)frighten(this,e,f);else e.distracted=.15;}
        }else{
          for(const b of this.bullets)if(!b.friendly&&Math.abs(b.x-f.x)<2&&b.y>=f.y&&b.y<f.y+4){b.life=0;this.emitSfx('stone-hit',b.x,b.y,f.hero);}
        }
      }else if(f.hero==='shevchenko'){
        // Telegraph the written word first; three visible, separately timed strikes.
        for(let i=0;i<3;i++)if(f.age>=.65+i*.22&&!f.hit.has(-1-i)){
          f.hit.add(-1-i);const x=f.x+f.dir*(2+i*4);this.event('thunder',x,f.y+1);
          for(const e of this.enemies)if(Math.abs(e.x-x)<2.5&&e.y>=f.y-3&&e.y<f.y+12)this.damageEnemy(e,180);
          for(const b of this.boxes)if(Math.abs(b.x-x)<2&&b.y>=f.y&&b.y<f.y+12)this.damageBox(b,200);
        }
      }else if(f.hero==='lesya'){
        f.x=this.player.x;f.y=this.player.y;
        for(const e of this.enemies)if(e.hp>0&&Math.abs(e.x-f.x)<6&&Math.abs(e.y-f.y)<3){e.rooted=.2;if(!f.hit.has(e.id)){f.hit.add(e.id);this.emitSfx('roots',e.x,e.y,f.hero);}this.damageEnemy(e,32*dt);}
      }else{
        const radius=Math.min(9,f.age*20);
        for(const e of this.enemies)if(!f.hit.has(e.id)&&Math.abs(e.x-f.x)<radius&&Math.abs(e.y-f.y)<4){f.hit.add(e.id);this.damageEnemy(e,220);}
        for(const b of this.boxes)if(!f.hit.has(b.id)&&Math.abs(b.x-f.x)<radius&&b.y>=f.y&&b.y<f.y+5){f.hit.add(b.id);this.damageBox(b,280);}
      }
    });
    for(const f of this.effects)if(f.life<=0&&f.kind!=='weapon')this.emitSfx(`${f.hero}-${f.kind}-end`,f.x,f.y,f.hero);
    this.effects=this.effects.filter(f=>f.life>0);
  }
  private stepPlayer(dt:number,action:Actions){
    this.actor.move=action.move;
    const p = this.player;
    const recovering=p.specialRecovery.length;
    p.cloak=Math.max(0,p.cloak-dt);p.invulnerable = Math.max(0, p.invulnerable - dt); p.specialRecovery=p.specialRecovery.map(t=>Math.max(0,t-dt)).filter(t=>t>1e-8);p.specialCooldown=this.specialCharges>0?0:Math.min(...p.specialRecovery);p.form=Math.max(0,p.form-dt);p.cast=Math.max(0,p.cast-dt);p.attack=Math.max(0,p.attack-dt);
    if(p.specialRecovery.length<recovering)this.event('abilityReady',p.x,p.y+1);
    const interactEdge=action.interact&&!this.interactHeld;this.interactHeld=action.interact;
    const carried=this.heldBarrel!==null;
    const barrelAction=carried&&interactEdge&&interactBarrel(this,(action.climb??0)<-.3);
    const vehicleControl=stepMounts(this,dt,action,interactEdge&&!carried);
    if(!vehicleControl&&!carried&&interactEdge&&!this.allies.some(a=>!a.rescued&&Math.abs(a.x-p.x)<2.2&&p.y<2))interactBarrel(this);
    if(!vehicleControl){
    const move = Math.max(-1, Math.min(1, action.move));
    if (move) p.facing = Math.sign(move);
    p.wallLock=Math.max(0,p.wallLock-dt);p.wallClimbing=false;
    p.ladderLock=Math.max(0,p.ladderLock-dt);
    const climb=Math.abs(action.climb??0)>.15?(action.climb??0):0;
    if(!climb)p.ladderNeedsRelease=false;
    const nearby=this.ladders.findIndex(l=>Math.abs(l.x-p.x)<.65&&p.y>=l.bottom-.15&&p.y<=l.top+.15);
    if(p.ladder<0&&p.ladderLock===0&&!p.ladderNeedsRelease&&climb&&nearby>=0)p.ladder=nearby;
    if(p.ladder>=0&&(nearby!==p.ladder||Math.abs(move)>.45)){p.ladder=-1;p.ladderLock=.25;}
    let climbing=p.ladder>=0;
    const oldWall=p.wallSide;p.wallSide=!climbing&&p.wallLock===0&&(wallAt(this.boxes,p.x,p.y,Math.sign(move)||oldWall))?(Math.sign(move)||oldWall):0;
    if(action.jump&&!climbing&&!p.grounded&&p.wallSide&&p.coyote<=0){p.wallVx=-p.wallSide*WALL.kickSpeed;p.vy=WALL.jumpSpeed;p.wallLock=WALL.lock;p.wallSide=0;this.event('wallJump',p.x,p.y+.8);}

    if(p.grounded||climbing)p.coyote=.12;else p.coyote-=dt;
    if(action.jump&&(climbing||p.coyote>0)){
      if(climbing){p.ladder=-1;p.ladderLock=.4;p.ladderNeedsRelease=true;p.detachVx=(Math.abs(move)>.1?Math.sign(move):p.facing)*3.5;}
      climbing=false;p.vy=13.5;p.grounded=false;p.coyote=0;this.event('jump',p.x,p.y);
    }
    const ladder=climbing?this.ladders[p.ladder]:null;
    const previousX=p.x;
    p.x+=(p.wallLock>0?p.wallVx:move*this.hero.speed*(p.cloak>0?1.8:1)+(move?0:p.detachVx))*dt;p.detachVx*=Math.max(0,1-dt*5);
    if(!climbing)for(const b of this.boxes){
      if(b.hp<=0||b.kind==='platform'||b.id===this.heldBarrel)continue;
      if(p.y+1.55>b.y+.05&&p.y<b.y+b.h-.05&&Math.abs(p.x-b.x)<b.w/2+.32){if(b.kind==='barrel'&&move)b.vx=move*3;p.x=b.x+(previousX<b.x?-1:1)*(b.w/2+.32);}
    }
    p.x = Math.max(1, Math.min(this.mission.length-2, p.x));
    if(this.boss?.boss?.active){const arena=BOSSES[this.boss.boss.id];p.x=Math.max(arena.left+.7,Math.min(arena.right-.7,p.x));}
    const contact=!climbing&&p.wallLock===0?wallAt(this.boxes,p.x,p.y,Math.sign(move)):null;
    if(contact&&!p.grounded){p.wallSide=Math.sign(move);p.wallClimbing=!!action.jumpHeld;if(p.wallClimbing)p.vy=WALL.climbSpeed+27*dt;else p.vy=Math.max(p.vy,-WALL.slideSpeed+27*dt);}
    else if(!contact)p.wallSide=0;
    const ledge=p.wallClimbing?ledgeAt(this.boxes,p.x,p.y,p.wallSide):null;
    if(ledge){p.x=ledge.x;p.y=ledge.y;p.vy=0;p.grounded=true;p.wallSide=0;p.wallClimbing=false;this.event('wallVault',p.x,p.y);}
    const previousY = p.y;
    p.vy -= 27 * dt; p.y += p.vy * dt; p.grounded = false;
    if(climbing){p.x=ladder!.x;p.y=Math.max(ladder!.bottom,Math.min(ladder!.top,previousY+climb*5*dt));p.vy=0;p.coyote=.12;}
    if (p.y <= -2) { p.y = -2; p.vy = 0; p.grounded = true; }
    for (const b of this.boxes) {
      if (b.hp <= 0 || b.id===this.heldBarrel || Math.abs(p.x - b.x) > b.w / 2 + .25) continue;
      const top = b.y + b.h;
      if(p.wallClimbing&&b.kind!=='platform'&&p.vy>0&&previousY+1.55<=b.y+.03&&p.y+1.55>=b.y){p.y=b.y-1.55;p.vy=0;}

      if (!climbing && p.vy <= 0 && previousY >= top - .03 && p.y <= top) { p.y = top; p.vy = 0; p.grounded = true; }
    }
    for(const type of this.motionFoley.step({...p,hero:this.heroId}))this.event(type,p.x,p.y);
    const beforeWeaponCooldown=p.cooldown;
    const melee=mamaiMelee(this),cycle=cycleWeapon(p,this.hero,dt,action.fire,melee);
    if(this.heroId==='bilozerska'&&!p.reloading&&beforeWeaponCooldown>1.28&&p.cooldown<=1.28)this.emitSfx('bolt',p.x,p.y+1);
    if(cycle.reloadFinished)this.event('reloadEnd',p.x,p.y+1);
    if(cycle.fired){attack(this,melee);this.shots++;p.attack=.16;}
    if(cycle.reloadStarted)this.event('reloadStart',p.x,p.y+1);
    if (action.special && this.specialCharges>0 && canSpecial(this)) {
      p.specialRecovery.push(this.hero.specialCooldown);p.specialCooldown=this.specialCharges>0?0:Math.min(...p.specialRecovery);p.cast=.6;
      this.event('special',p.x,p.y+1);
      launchEffect(this,'special');
    }
    if(action.ultimate && p.energy>=100){
      p.energy=0;p.cast=.8;p.invulnerable=Math.max(p.invulnerable,1);
      if(this.heroId==='lesya')p.form=6;
      this.event('ultimate',p.x,p.y+1);
      launchEffect(this,'ultimate');
    }
    }
    if(vehicleControl)this.motionFoley.reset();
    if(this.players.length===1)this.stepEffects(dt);
    const reached=this.mission.checkpoints.filter(x=>p.x>x&&x>this.checkpoint).at(-1);
    if(reached!==undefined){this.checkpoint=reached;p.hp=100;this.event('checkpoint',reached,1);}
    for(const crate of this.ammoCrates){
      if(this.actor.id===0&&crate.used&&crate.arena&&this.boss?.boss?.active){
        crate.restock=Math.max(0,(crate.restock??ARENA_RESTOCK_SECONDS)-dt);
        if(crate.restock===0)crate.used=false;
      }
      if(crate.used)continue;
      const floor=Math.max(-2,...this.boxes.filter(b=>b.hp>0&&Math.abs(b.x-crate.x)<b.w/2+.25&&b.y+b.h<=crate.y+.05).map(b=>b.y+b.h));
      crate.y=Math.max(floor,crate.y-8*dt/this.players.length);
      if(p.energy<100&&Math.abs(p.x-crate.x)<.9&&Math.abs(p.y-crate.y)<1.2){crate.used=true;if(crate.arena)crate.restock=ARENA_RESTOCK_SECONDS;p.energy=100;this.event('ammoPickup',crate.x,crate.y+1);}
    }
    for (const kit of this.medkits) if (!kit.used && p.hp<100 && Math.abs(kit.x - p.x) < .8 && p.y < 1) { kit.used = true; p.hp = Math.min(100, p.hp + 35); }
    if(this.players.length===1)stepBarrels(this,dt);
    if (action.interact&&!vehicleControl&&!barrelAction&&!carried) {
      for (const ally of this.allies) if (!ally.rescued && Math.abs(ally.x - p.x) < 2.2 && p.y < 2) { ally.rescued = true; p.hp = Math.min(100, p.hp + 25); this.event('rescue', ally.x, 1);this.changeHero();p.invulnerable=Math.max(p.invulnerable,1); }
    }
  }
  step(dt:number, action:Actions){this.stepPlayers(dt,[action]);}
  stepPlayers(dt:number,actions:Actions[]){
    if(this.mode!=='playing')return;
    if(this.story){stepStory(this,Math.min(dt,1/30));return;}
    const before=this.players.map(a=>({x:a.body.x,y:a.body.y}));
    for(const actor of this.players)if(this.withPlayer(actor.id,()=>triggerBoss(this))){
      const arena=this.boss?.boss&&BOSSES[this.boss.boss.id];
      if(arena&&this.players.length>1)for(const a of this.players){a.body.x=Math.max(arena.left+1,Math.min(arena.right-1,a.body.x));a.checkpoint=arena.left+2;}
      return;
    }
    dt=Math.min(dt,1/30);this.time+=dt;this.noises=this.noises.filter(n=>n.until>this.time);
    this.withPlayer(this.nearestPlayer(this.mission.exit,0).id,()=>this.stepEvac(dt));
    if(this.evac.phase==='departing'||this.mode!=='playing'){
      if(this.evac.phase==='departing')for(const a of this.players){a.body.x=this.evac.x;a.body.y=this.evac.y-1;}
      return;
    }
    for(const actor of this.players){this.withPlayer(actor.id,()=>this.stepPlayer(dt,actions[actor.id]??IDLE));if(this.cinematic)break;}
    constrainTeam(this,before);
    storyTrigger(this,before);if(this.story)return;
    if(this.players.length>1){this.stepEffects(dt);stepBarrels(this,dt);}
    if(this.cinematic)return;
    stepFollowers(this,dt);
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const poisoned=Math.min(dt,enemy.poison??0);enemy.poison=Math.max(0,(enemy.poison??0)-dt);if(poisoned)this.damageEnemy(enemy,18*poisoned);if(enemy.hp<=0)continue;
      enemy.distracted=Math.max(0,(enemy.distracted??0)-dt);
      this.withPlayer(this.nearestPlayer(enemy.x,enemy.y).id,()=>{
        if(enemy.boss)stepBoss(this,enemy,dt);
        else if(enemy.vehicle)stepVehicle(this,enemy,dt);
        else stepInfantry(this,enemy,dt);
      });
    }
    for (const bullet of this.bullets) {
      if (bullet.life <= 0) continue;
      const travel=Math.min(dt,bullet.life);
      const nextX = bullet.x + bullet.vx * travel, nextY = bullet.y + bullet.vy * travel;
      let nearest = 2; let target: Box | Enemy | Follower | Mount | PlayerActor | null = null;
      const test = (x: number, y: number, w: number, h: number, candidate: typeof target) => {
        const t = segmentHit(bullet.x, bullet.y, nextX, nextY, x - w / 2, y, x + w / 2, y + h);
        if (t !== null && t < nearest) { nearest = t; target = candidate; }
      };
      for (const b of this.boxes) if (b.hp > 0) test(b.x, b.y, b.w, b.h, b);
      if (bullet.friendly) for (const enemy of this.enemies) { if (enemyActive(enemy)) test(enemy.x, enemy.y, enemySize(enemy).w, enemySize(enemy).h, enemy); }
      else {for(const a of this.players)if(!a.mounted)test(a.body.x,a.body.y,.65,1.6,a);for(const t of this.mounts)if(t.armor>0)test(t.x,t.y,TANK.w,TANK.h,t);for(const f of this.followers)if(f.hp>0)test(f.x,f.y,.7,1.5,f);}
      if (target) {
        bullet.life = 0;
        const hit = target as Box | Enemy | Follower | Mount | PlayerActor;
        if(bullet.friendly&&bullet.hero&&!bullet.ordnance)this.emitSfx(bullet.hero+'-hit',bullet.x+(nextX-bullet.x)*nearest,bullet.y+(nextY-bullet.y)*nearest,bullet.hero);
        if(bullet.ordnance){const t=Math.max(0,nearest-1e-4);this.ordnanceBlast(bullet,bullet.x+(nextX-bullet.x)*t,bullet.y+(nextY-bullet.y)*t);}
        else if ('body' in hit) this.withPlayer(hit.id,()=>this.damagePlayer(bullet.damage));
        else if('armor' in hit)damageMount(this,hit,bullet.damage);
        else if ('owner' in hit)this.damageFollower(hit,bullet.damage);
        else if ('kind' in hit) { if (bullet.friendly) this.hits++; this.damageBox(hit, bullet.damage); }
        else { if (bullet.friendly) this.hits++; if(hit.infantry?.shield&&bullet.vx*hit.dir<0){hit.infantry.shield=Math.max(0,hit.infantry.shield-bullet.damage);this.event('enemyShieldHit',hit.x,hit.y+1);}else {this.damageEnemy(hit, bullet.damage);if(bullet.hero==='lesya'&&hit.hp>0)hit.poison=3;if(bullet.hero==='it-army'&&hit.hp>0){hit.rooted=.65;hit.windup=0;}} }
      }
      if(!target&&bullet.ordnance&&bullet.life<=dt)this.ordnanceBlast(bullet,nextX,nextY);
      bullet.x = nextX; bullet.y = nextY; bullet.life -= dt;
    }
    this.bullets = this.bullets.filter(b => b.life > 0 && b.y > -3 && b.y < 20);
  }
}

/** Earliest segment/AABB intersection; swept projectiles cannot tunnel through thin cover. */
export function segmentHit(ax: number, ay: number, bx: number, by: number, left: number, bottom: number, right: number, top: number): number | null {
  let enter = 0, exit = 1;
  for (const [start, delta, low, high] of [[ax, bx - ax, left, right], [ay, by - ay, bottom, top]]) {
    if (Math.abs(delta) < 1e-9) { if (start < low || start > high) return null; continue; }
    const a = (low - start) / delta, b = (high - start) / delta;
    enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return enter;
}
