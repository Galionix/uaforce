import {importAbilityPixels} from './ability-palette.ts';
import {NEW_HEROES} from './hero-expansion.ts';
import {SceneFx,ATMOSPHERES,stormLight} from './scene-fx.ts';
import {translate} from './i18n.ts';
import {MobileFraming,cameraFollow,mobileCameraShift} from './mobile-view.ts';
import {interactionTarget,TEAM_BOOST} from './interactions.ts';
import {teamCamera} from './shared-screen.ts';
import {drawFlagWipe} from './flag-wipe.ts';
import {AbilityArt} from './ability-art';
import {reducedPresentation} from './motion-settings';
import {buildHeroRunFrames,RUN_RIGS,MAVKA_RUN_RIG} from './hero-run.ts';
import {heroFrame} from './hero-animation.ts';
import {Gore,wrapDeathLine} from './enemy-death.ts';
import {assetUrl} from './assets.ts';
import {drawMount} from './mount-view';
import {drawBoss,drawArena,drawBossWreck,type BossArt} from './boss-view';
import {BOSSES,ARENA_RESTOCK_SECONDS,type BossId} from './bosses';
import {drawDistrictScenery} from './district-view.ts';
import {enemyActive} from './enemies.ts';
import {drawVehicle,drawInfantryGear} from './enemy-view.ts';
import {FOLLOWER_WEAPONS} from './followers.ts';
import {actorBounds,isolatedBounds} from './sprite-bounds';
import {drawHeroEffect,drawCharge} from './hero-vfx';
import { HEROES, MISSIONS } from './content';
import { World, type Event, type Box } from './world';
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;size:number;color:string};
const S=16,W=640,H=360;
const hash=(x:number,y:number=0)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
/** Pixel coordinates are the art grid; CSS scales the completed frame without smoothing. */
export class View {
  readonly sceneFx=new SceneFx();
  invalidate(){this.needsDraw=true;}
  private requestedZoom=1;
  private framing=new MobileFraming();private cameraReady=false;
  setZoom(value:number){if(this.requestedZoom!==value){this.requestedZoom=value;this.needsDraw=true;}}
  interactKey='F'; private enemyClock=0;

  private abilityArt=new AbilityArt();private screenPulse=0;private cinematicBlasts:{x:number;y:number;age:number;size:number}[]=[];
  private gore=new Gore();private deathCaptions:{x:number;y:number;text:string;life:number}[]=[];private lastDeathCaption=-100;
  app=true;fps=60;onFrame:(dt:number)=>void=()=>{};onGoreImpact:(x:number,y:number)=>void=()=>{};
  private frame=document.createElement('canvas');private frameContext:CanvasRenderingContext2D;private output:CanvasRenderingContext2D;
  private c:CanvasRenderingContext2D; private request=0;private last=0;private clock=0;
  private needsDraw=true;private cameraX=0;private cameraY=0;private shake=0;private particles:Particle[]=[];
  private backdrops=MISSIONS.map(()=>new Image());private heroImages=HEROES.map(()=>new Image());private mavka=new Image();private infantry=new Image();private theme="river";private frameBounds:number[][][]=[];private runFrames:HTMLCanvasElement[][]=[];
  private bossArt=new Map<BossId,BossArt>();
  private tiles=new Map<string,HTMLCanvasElement>();private flashes:{x:number;y:number;life:number;type:string}[]=[];
  constructor(private canvas:HTMLCanvasElement){canvas.width=W;canvas.height=H;this.frame.width=W;this.frame.height=H;this.output=canvas.getContext('2d',{alpha:false})!;this.frameContext=this.frame.getContext('2d',{alpha:false})!;this.c=this.output;if(!this.c||!this.frameContext)throw Error('Canvas 2D недоступний');}
  async init(){
    const load=(im:HTMLImageElement,url:string)=>new Promise<void>((resolve,reject)=>{im.onload=()=>resolve();im.onerror=()=>reject(Error('Не завантажився '+url));im.src=assetUrl(url);});
    await this.abilityArt.load();
    await Promise.all([...MISSIONS.map((m,i)=>load(this.backdrops[i],m.background)),...HEROES.map((h,i)=>load(this.heroImages[i],h.sheet)),load(this.infantry,'/assets/infantry-pixel-sheet.png'),load(this.mavka,'/assets/mavka-pixel-sheet.png')]);
    for(const h of NEW_HEROES){
      const im=this.heroImages[HEROES.findIndex(a=>a.id===h)];const cv=document.createElement('canvas');cv.width=192;cv.height=128;const c=cv.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(im,0,0,192,128);const pixels=c.getImageData(0,0,192,128);importAbilityPixels(pixels.data);c.putImageData(pixels,0,0);await new Promise<void>(resolve=>{im.onload=()=>resolve();im.src=cv.toDataURL();});
    }
    await Promise.all((Object.keys(BOSSES) as BossId[]).map(async id=>{const image=new Image();await load(image,BOSSES[id].sprite);const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;const c=cv.getContext('2d')!;c.drawImage(image,0,0);const bounds=isolatedBounds(c.getImageData(0,0,image.width,image.height).data,image.width,image.height);this.bossArt.set(id,{image,bounds});}));
    // Crop each actor without neighboring frame spill; generated source pixels remain intact.
    this.frameBounds=[...this.heroImages,this.infantry,this.mavka].map((im,index)=>{
      const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const cx=cv.getContext('2d')!;cx.drawImage(im,0,0);const a=cx.getImageData(0,0,im.width,im.height).data,rows=index===HEROES.length?1:2;
      return actorBounds(a,im.width,im.height,4,rows);
    });
    this.runFrames=this.heroImages.map((image,i)=>buildHeroRunFrames(image,this.frameBounds[i][0],RUN_RIGS[HEROES[i].id]));
    this.runFrames.push(buildHeroRunFrames(this.mavka,this.frameBounds[HEROES.length+1][0],MAVKA_RUN_RIG));
    const tick=(now:number)=>{const dt=this.last?Math.min(.1,(now-this.last)/1000):1/60;this.last=now;this.fps=this.fps*.94+.06/Math.max(.001,dt);this.onFrame(dt);this.request=requestAnimationFrame(tick);};this.request=requestAnimationFrame(tick);
  }
  portrait(id:string){
    const index=HEROES.findIndex(h=>h.id===id),bounds=this.frameBounds[index]?.[0];if(!bounds)return '';
    const cv=document.createElement('canvas');cv.width=bounds[2];cv.height=bounds[3];cv.getContext('2d')!.drawImage(this.heroImages[index],...bounds as [number,number,number,number],0,0,cv.width,cv.height);return cv.toDataURL();
  }
  reset(w:World){this.framing.reset();this.cameraReady=false;this.sceneFx.reset();this.needsDraw=true;this.cameraX=Math.max(0,Math.min(w.mission.length*S-W,w.player.x*S-170));this.cameraY=0;this.particles=[];this.flashes=[];this.cinematicBlasts=[];this.screenPulse=0;this.shake=0;this.gore.clear();this.deathCaptions=[];this.lastDeathCaption=-100;}
  private rect(x:number,y:number,w:number,h:number,color:string){this.c.fillStyle=color;this.c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  private tree(x:number,y:number,scale:number,far=false){
    const colors=far?['#285d6d','#357386','#418b98']:['#294b38','#426a40','#698744'];
    this.rect(x-2*scale,y-48*scale,4*scale,48*scale,far?'#397286':'#554d33');
    for(let i=0;i<20;i++){const xx=x+(hash(i,x)-.5)*38*scale,yy=y-28*scale-hash(i+40,x)*36*scale;this.rect(xx,yy,(6+hash(i+4)*12)*scale,(4+hash(i+1)*8)*scale,colors[i%3]);}
    if(!far){for(let i=0;i<7;i++)this.rect(x-8+i*3,y-3-(i%2),4,3,'#537641');}
  }
  private background(world:World){
    if(world.missionIndex>=9){const progress=Math.max(0,Math.min(1,this.cameraX/(world.mission.length*S-W)));this.c.drawImage(this.backdrops[world.missionIndex],-Math.round(progress*(800-W)),0,800,450);drawDistrictScenery(this.c,world,this.cameraX,this.cameraY,this.clock);return;}
    const offset=-(this.cameraX*.1)%800;
    for(let x=offset-800;x<640;x+=800)this.c.drawImage(this.backdrops[world.missionIndex],Math.round(x),Math.round(-this.cameraY*.2),800,450);
    drawDistrictScenery(this.c,world,this.cameraX,this.cameraY,this.clock);
  }
  private tile(kind:string,variant:number){
    const key=this.theme+kind+variant;const old=this.tiles.get(key);if(old)return old;
    const cv=document.createElement('canvas');cv.width=16;cv.height=16;const c=cv.getContext('2d')!;
    const r=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    if(this.theme==='kremlin'&&kind!=='earth'){r(0,0,16,16,'#39272f');for(let j=0;j<4;j++)for(let i=-1;i<3;i++){const x=i*8+(j%2)*4;r(x, j*4,7,3,['#7c4543','#63363b','#925348'][(j+variant)%3]);r(x,j*4,7,1,'#a36452');}}else if(kind==='earth'){
      r(0,0,16,16,this.theme==='mountain'?'#35484d':this.theme==='rail'?'#393d42':this.theme==='marsh'?'#152c32':this.theme==='city'?'#303636':this.theme==='coast'?'#44483a':'#20291e');for(let i=0;i<19;i++){const x=Math.floor(hash(i,variant)*16),y=Math.floor(hash(i+90,variant)*16);r(x,y,1+Math.floor(hash(i+20)*3),1+Math.floor(hash(i+12)*2),['#343c29','#454a32','#151c19','#57583b'][i%4]);}
    }else{
      r(0,0,16,16,'#252b24');r(0,0,16,1,'#79765a');r(0,1,1,15,'#535640');
      r(2,3,12,10,this.theme==='kremlin'?'#773c37':this.theme==='city'?'#665347':this.theme==='coast'?'#65645a':'#50533e');r(3,4,10,1,'#686a50');r(3,5,2,7,'#646548');r(6,6,6,5,'#3b4433');r(7,6,5,1,'#79785a');r(12,6,1,7,'#242c24');r(1,14,14,1,'#17231c');
    }this.tiles.set(key,cv);return cv;
  }
  private box(b:Box){
    const x=Math.round((b.x-b.w/2)*S-this.cameraX)+((b.collapseDelay??0)>0?Math.floor(this.clock*22)%3-1:0),y=Math.round(266-(b.y+b.h)*S+this.cameraY),ww=Math.round(b.w*S),hh=Math.round(b.h*S);
    if(x>W+30||x+ww<-30||y>H+30||y+hh<-30)return;
    if(b.sabotage){
      if(b.sabotage==='jet'){this.abilityArt.draw(this.c,'weapons',4,x+ww/2,y+hh/2,ww,hh+16);this.rect(x+15,y+hh-2,10,3,'#141b20');this.rect(x+ww-25,y+hh-2,10,3,'#141b20');}
      else {const fuel=b.sabotage==='fuel';this.rect(x,y,ww,hh,'#17242b');this.rect(x+2,y+2,ww-4,hh-4,fuel?'#6d7160':'#5c684c');for(let j=4;j<hh;j+=8)this.rect(x+2,y+j,ww-4,2,'#a9a181');this.rect(x+ww/2-5,y+hh/2-5,10,10,'#f2bf51');this.rect(x+ww/2-1,y+hh/2-3,2,4,'#392d21');this.rect(x+ww/2-1,y+hh/2+2,2,2,'#392d21');}
      this.rect(x,y-7,ww,3,'#17242b');this.rect(x,y-7,ww*b.hp/b.maxHp,2,b.fuse!==undefined?'#fff0a1':'#e5a553');
      if(b.required){this.rect(x+ww/2-3,y-17,6,6,'#f5ce65');this.rect(x+ww/2-1,y-15,2,2,'#402d25');}
      if(b.fuse!==undefined&&Math.floor(this.clock*18)%2)this.abilityArt.draw(this.c,'blast',0,x+ww/2,y+hh/2,30,30);
      return;
    }
    if(b.kind==='earth'||b.kind==='stone'||b.kind==='wall'||b.kind==='platform'){
      for(let i=Math.max(0,Math.floor(-x/16)*16);i<ww&&x+i<W+16;i+=16)for(let j=Math.max(0,Math.floor(-y/16)*16);j<hh&&y+j<H+16;j+=16)this.c.drawImage(this.tile(b.kind==='earth'?'earth':'stone',b.id%5),0,0,Math.min(16,ww-i),Math.min(16,hh-j),x+i,y+j,Math.min(16,ww-i),Math.min(16,hh-j));
      if((b.kind==='earth'&&(b.y===-1||b.h>1))||b.kind==='stone'){this.rect(x,y,ww,2,b.kind==='earth'?(this.theme==='mountain'?'#c4d7ce':this.theme==='rail'?'#999583':this.theme==='marsh'?'#557e70':this.theme==='city'?'#8b9386':this.theme==='coast'?'#b1ac80':'#6ea535'):'#92916a');for(let i=0;this.theme!=='kremlin'&&i<ww;i+=3){this.rect(x+i,y-1-(i+b.id)%3,2,3,'#92b944');if((i+b.id)%4===0)this.rect(x+i,y+2,1,3+(b.id%5),'#4b712e');}}
    }else if(b.kind==='crate'){
      this.rect(x,y,ww,hh,'#392c20');this.rect(x+2,y+2,ww-4,hh-4,'#685238');for(let i=4;i<ww;i+=5)this.rect(x+i,y+3,1,hh-6,'#463a28');this.rect(x,y,ww,3,'#a18150');this.rect(x,y+hh-3,ww,3,'#8b6b41');for(const xx of [x+1,x+ww-3])for(const yy of [y+1,y+hh-3])this.rect(xx,yy,1,1,'#d1bf88');
    }else if(b.kind==='barrel'){
      this.rect(x+1,y,ww-2,hh,'#842c22');this.rect(x+2,y+2,ww-4,hh-4,'#c03d2a');this.rect(x+3,y+3,2,hh-6,'#ed6240');this.rect(x,y+3,ww,2,'#d99167');this.rect(x,y+hh-5,ww,2,'#59291e');this.rect(x+ww/2-2,y+hh/2-2,4,4,'#f7d6a2');this.rect(x+ww/2-1,y+hh/2-1,1,1,'#7a2721');
    }else{
      this.rect(x,y,ww,hh,'#232f2b');this.rect(x+2,y+3,ww-4,hh-6,'#556052');this.rect(x+4,y+5,ww-8,8,'#142b29');this.rect(x+6,y+7,8,2,'#9cc278');for(let j=0;j<3;j++)this.rect(x+4,y+17+j*4,ww-8,1,'#25342b');this.rect(x+ww/2,y-24,2,24,'#a0a58c');this.rect(x+ww/2-8,y-20,18,1,'#b3b297');this.rect(x+ww/2-5,y-15,12,1,'#b3b297');this.rect(x+ww/2-1,y-26,4,3,Math.floor(this.clock*3)%2?'#ff6a3d':'#b93726');
    }
    if((b.hp<b.maxHp||(b.collapseDelay??0)>0||b.falling)&&Number.isFinite(b.maxHp)){this.rect(x,y+hh/2,ww/2,1,'#111c19');this.rect(x+ww/2,y+hh/2,1,4,'#111c19');}
  }
  private sprite(x:number,y:number,dir:number,frame:number,enemy=false,heavy=false,heroIndex=0,mavka=false){
    if(!enemy&&frame>=8){
      this.c.save();this.c.translate(Math.round(x*S-this.cameraX),Math.round(266-y*S+this.cameraY));this.c.scale(dir,1);
      this.c.drawImage(this.runFrames[mavka?HEROES.length:heroIndex][frame-8],-20,-32);this.c.restore();return;
    }
    if(frame>=8)frame=[1,0,2,0][Math.floor((frame-8)/2)];
    const slot=enemy?HEROES.length:mavka?HEROES.length+1:heroIndex;const bounds=this.frameBounds[slot][frame];const scale=(heavy?35:27)/this.frameBounds[slot][0][3],h=Math.round(bounds[3]*scale),w=Math.round(bounds[2]*scale);
    this.c.save();this.c.translate(Math.round(x*S-this.cameraX),Math.round(266-y*S+this.cameraY));this.c.scale(enemy?-dir:dir,1);
    this.c.drawImage(enemy?this.infantry:mavka?this.mavka:this.heroImages[heroIndex],...bounds as [number,number,number,number],-Math.round(w*.47),-h,w,h);this.c.restore();
  }
  event(e:Event){
    if(!(e.type==='ultimate'&&e.hero==='taira'))this.sceneFx.emit(e,this.cameraX,this.cameraY);
    if(this.particles.length>360)this.particles.splice(0,this.particles.length-360);if(this.flashes.length>60)this.flashes.splice(0,this.flashes.length-60);
    if(e.sfx==='taira-overload-v1'){this.shake=Math.max(this.shake,8);this.screenPulse=.15;}
    if(e.sfx==='klychko-slam-v2'){this.shake=Math.max(this.shake,8);this.screenPulse=.12;return;}
    if(e.sfx==='klychko-uppercut-v2'){this.shake=Math.max(this.shake,4);this.screenPulse=.06;}
    if(e.type==='healed'){for(let i=0;i<7;i++)this.particles.push({x:e.x+(i%3-1)*.25,y:e.y,vx:(i%3-1)*.4,vy:1+i*.25,life:.5,max:.5,size:2,color:i%2?'#b9f7cf':'#57ba9c'});return;}
    if(e.type==='highFive'){this.shake=Math.max(this.shake,2);this.screenPulse=.07;return;}
    if(e.type==='enemyDeath'){
      this.gore.burst(e.x,e.y,Math.random,e.launchDir??0);this.shake=Math.max(this.shake,1.4);
      if(e.text&&e.x*S>this.cameraX-30&&e.x*S<this.cameraX+W+30){
        this.deathCaptions=this.deathCaptions.filter(c=>c.life>0);
        // One punchline per simultaneous blast. Preserve reading time instead of replacing old lines.
        if(this.clock-this.lastDeathCaption<.3||this.deathCaptions.length>=2)return;
        this.lastDeathCaption=this.clock;
        const y=e.y+2+this.deathCaptions.filter(c=>Math.abs(c.x-e.x)<14).length*2.1;
        this.deathCaptions.push({x:e.x,y,text:e.text,life:2.6});
      }return;
    }
    if(e.type==='bossDefeated'){this.shake=9;this.flashes.push({x:e.x,y:e.y,life:.35,type:'hostileBlast'});for(let i=0;i<55;i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*18,vy:Math.random()*13,life:1.2,max:1.2,size:2+i%3,color:['#ffe097','#dc6b2c','#5a5951'][i%3]});return;}
    if(e.type==='shot'||e.type==='enemyShot'||e.type==='enemySniperShot'||e.type==='supportShot'||e.type==='tankShot'||e.type==='rocketLaunch'||e.type==='mountShot'){this.flashes.push({x:e.x,y:e.y,life:.07,type:e.type});return;}
    if(e.type==='followerHurt'||e.type==='followerDown'){for(let i=0;i<(e.type==='followerDown'?14:3);i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:Math.random()*5,life:.4,max:.4,size:2,color:i%2?'#8ab9aa':'#f4cb77'});return;}
    if(e.type==='ammoPickup'){for(let i=0;i<9;i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,life:.6,max:.6,size:2,color:i%2?'#ffe395':'#94e0b9'});return;}
    if(e.type==='debris'){for(let i=0;i<5;i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:Math.random()*5,life:.3+Math.random()*.3,max:.6,size:2,color:['#998966','#645a40','#bbad83'][i%3]});return;}
    if(e.type==='ultimate'&&e.hero==='taira')return;
    if(e.type==='special'||e.type==='ultimate'){this.shake=Math.max(this.shake,e.type==='ultimate'?7:1);if(e.type==='ultimate')this.screenPulse=.08;return;}
    if(e.type==='thunder'||e.type==='railShot'){this.shake=Math.max(this.shake,12);this.screenPulse=.18;return;}
    if(['burst','hurt','hostileBlast'].includes(e.type)){
      if(this.particles.length>300)this.particles.splice(0,this.particles.length-300);
      this.shake=Math.max(this.shake,e.type==='hurt'?3:5);if(e.type!=='hurt'){this.cinematicBlasts.push({x:e.x,y:e.y,age:0,size:e.type==='hostileBlast'?78:67});if(this.cinematicBlasts.length>20)this.cinematicBlasts.shift();}
      this.flashes.push({x:e.x,y:e.y,life:.22,type:e.type});
      for(let i=0;i<(e.type==='hurt'?9:23);i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*13,vy:Math.random()*10,life:.4+Math.random()*.7,max:1,size:1+Math.floor(Math.random()*3),color:['#ffd16b','#da6639','#a68d59','#473e2a','#f5f1b7'][i%5]});
    }
  }
  render(world:World,dt:number,move:number){
    const playing=world.mode==='playing';if(!playing&&!this.needsDraw)return;this.needsDraw=false;if(playing){this.clock+=dt;this.enemyClock+=dt*(world.highFive.left>0?TEAM_BOOST.enemyRate:1);}
    const cameraDt=playing?dt:0;
    let targetX:number,targetY:number;
    if(world.story){const camera=world.players.length>1?teamCamera(world,world.story.camera):world.story.camera;targetX=Math.max(0,Math.min(world.mission.length*S-W,camera.x*S-W/2));targetY=Math.max(0,camera.y*S-80);}
    else if(world.players.length>1){const camera=teamCamera(world);targetX=camera.x*S-W/2;targetY=Math.max(0,camera.y*S-80);}
    else {targetX=Math.max(0,Math.min(world.mission.length*S-W,world.player.x*S-W*.32));targetY=Math.max(0,world.player.y*S-94);}
    const mobile=this.requestedZoom>1&&!world.story;
    // Apply thumb-space composition to the target, never to the already damped camera.
    if(mobile)targetX-=mobileCameraShift(world.players.filter(a=>a.body.hp>0||world.mode==='lost').map(a=>a.body.x*S-targetX),W);
    if(!this.cameraReady||world.story){this.cameraX=targetX;this.cameraY=targetY;this.cameraReady=true;}
    else {this.cameraX=cameraFollow(this.cameraX,targetX,cameraDt,mobile?10:6);this.cameraY=cameraFollow(this.cameraY,targetY,cameraDt,mobile?8:5);}
    // Safety takes priority over lag when players separate, respawn or move between floors.
    if(mobile||world.players.length>1){
      const xs=world.players.filter(a=>a.body.hp>0||world.mode==='lost').map(a=>a.body.x*S),ys=world.players.filter(a=>a.body.hp>0||world.mode==='lost').map(a=>a.body.y*S);
      this.cameraX=Math.max(Math.max(...xs)+32-W,Math.min(Math.min(...xs)-32,this.cameraX));
      this.cameraY=Math.max(0,Math.max(...ys)-206,Math.min(Math.min(...ys)+64,this.cameraY));
    }
    const crop=this.framing.step(world.story?1:this.requestedZoom,world.players.filter(a=>a.body.hp>0||world.mode==='lost').map(a=>({x:a.body.x*S-this.cameraX,y:266-a.body.y*S+this.cameraY,facing:a.body.facing,mounted:!!a.mounted})),cameraDt,W,H);
    this.c=crop.zoom>1?this.frameContext:this.output;
    this.theme=world.mission.theme;this.c.imageSmoothingEnabled=false;if(playing)this.sceneFx.step(world,dt,this.cameraX,this.cameraY);this.background(world);this.sceneFx.sky(this.c,world,reducedPresentation());
    this.c.save();if(playing&&!reducedPresentation()&&this.shake>.1)this.c.translate(Math.round((Math.random()-.5)*this.shake),Math.round((Math.random()-.5)*this.shake));if(playing)this.shake=Math.max(0,this.shake-dt*28);
    if(playing&&!reducedPresentation()&&this.sceneFx.level>0&&ATMOSPHERES[world.mission.atmosphere??'sunlit'].storm){const kick=stormLight(this.sceneFx.time);this.c.translate(Math.round(Math.sin(this.clock*67)*kick*1.5),0);}
    // Rooms are dark cutaways. Their floors and edges below are live destructible blocks.
    for(const [index,[l,r]]of world.mission.forts.entries()){
      const height=world.mission.floorPlans[index].at(-1)!*S;const x=l*S-this.cameraX,y=266-height+this.cameraY,w=(r-l)*S;
      this.rect(x,y,w,height,world.mission.theme==='rail'?'#27282e':world.mission.theme==='mountain'?'#1b2f38':world.mission.theme==='marsh'?'#0b1c27':'#101b18');for(let yy=0;yy<height;yy+=8)for(let xx=0;xx<w;xx+=16){if(hash(xx+yy,l)>.4)this.rect(x+xx+(yy%16?5:0),y+yy,7,2,'#1d2720');}
      for(let xx=10;xx<w;xx+=50){this.rect(x+xx,y,3,height,'#353828');for(let yy=12;yy<height;yy+=48){this.c.strokeStyle='#343727';this.c.lineWidth=2;this.c.beginPath();this.c.moveTo(x+xx,y+yy);this.c.lineTo(x+xx+45,y+yy+32);this.c.stroke();}}
    }
    for(const room of world.mission.layout?.rooms??[]){
      const x=room.left*S-this.cameraX,y=266-room.top*S+this.cameraY,width=(room.right-room.left)*S,height=(room.top-room.bottom)*S;
      if(x>W||x+width<0||y>H||y+height<0)continue;
      this.rect(x,y,width,height,world.mission.theme==='rail'?'#242c32':'#101b20');
      for(let xx=Math.max(0,Math.floor(-x/32)*32);xx<width&&x+xx<W;xx+=32)for(let yy=Math.max(0,Math.floor(-y/12)*12);yy<height&&y+yy<H;yy+=12)this.rect(x+xx+(yy%24?8:0),y+yy,12,2,'#29383a');
      for(let xx=8;xx<width;xx+=96){this.rect(x+xx,y,4,height,'#48534e');for(let yy=20;yy<height;yy+=96){this.rect(x+xx+4,y+yy,35,3,'#5a6659');this.rect(x+xx+28,y+yy+3,8,4,'#bec396');}}
    }
    for(const l of world.ladders){const x=l.x*S-this.cameraX,y=266-l.top*S+this.cameraY,h=(l.top-l.bottom)*S;this.rect(x-5,y,2,h,'#8f7d4d');this.rect(x+5,y,2,h,'#635b3c');for(let yy=2;yy<h;yy+=6){this.rect(x-5,y+yy,12,2,'#a18d59');this.rect(x-5,y+yy+2,12,1,'#3f3c29');}}
    for(let x=-16;x<W+16;x+=16)for(let y=314+Math.round(this.cameraY);y<H;y+=16)this.c.drawImage(this.tile('earth',Math.abs(Math.floor((x+this.cameraX)/16))%5),x,y);
    for(const b of world.boxes)if(b.hp>0)this.box(b);
    if(playing)this.gore.step(Math.min(dt,1/30),world.boxes,this.onGoreImpact);
    for(const s of this.gore.stains)this.rect(s.x*S-this.cameraX-s.w*S/2,266-s.y*S+this.cameraY-1,s.w*S,s.h*S,s.color);
    for(const a of world.allies)if(!a.rescued){this.sprite(a.x,a.y??0,1,3,true);const x=a.x*S-this.cameraX,y=266-(a.y??0)*S+this.cameraY;this.rect(x-12,y-35,24,2,'#9c9e80');this.rect(x-12,y-1,24,2,'#565f4a');for(let i=-12;i<=12;i+=6)this.rect(x+i,y-34,1,34,'#8a9682');this.label('ВРЯТУЙ',x,y-41,'#e0d791');}
    for(const k of world.medkits)if(!k.used){const x=k.x*S-this.cameraX,y=266-(k.y??0)*S+this.cameraY;this.rect(x-5,y-7,10,7,'#dbd8b0');this.rect(x-1,y-6,2,5,'#a93d2c');this.rect(x-3,y-4,6,2,'#a93d2c');}
    for(const crate of world.ammoCrates){
      const x=crate.x*S-this.cameraX,y=266-crate.y*S+this.cameraY;
      if(crate.used){
        if(crate.arena&&world.boss?.boss?.active){
          this.rect(x-10,y-3,20,3,'#314840');
          const ready=1-(crate.restock??ARENA_RESTOCK_SECONDS)/ARENA_RESTOCK_SECONDS;
          // Twelve pixel segments show a returning supply without a text label.
          for(let i=0;i<12;i++){const a=i*Math.PI/6-Math.PI/2;this.rect(x+Math.round(Math.cos(a)*8)-1,y-12+Math.round(Math.sin(a)*8)-1,2,2,i<ready*12?'#ffe395':'#34544c');}
        }
        continue;
      }
      this.rect(x-11,y-15,22,15,'#1b3533');this.rect(x-10,y-14,20,12,'#497c6c');this.rect(x-10,y-15,20,3,'#94b495');
      this.rect(x-7,y-12,2,10,'#c3bc8b');this.rect(x+5,y-12,2,10,'#c3bc8b');
      this.rect(x,y-11,3,4,'#ffde80');this.rect(x-3,y-7,6,2,'#ffde80');this.rect(x-3,y-5,3,3,'#ffde80');
      if(world.player.energy<100){const bob=Math.floor(Math.sin(this.clock*4)*2);this.rect(x-3,y-25+bob,6,2,'#ffe395');this.rect(x-1,y-23+bob,2,3,'#ffe395');}
    }
    drawArena(this.c,world,this.cameraX,this.cameraY);
    if(world.boss&&world.boss.hp<=0)drawBossWreck(this.c,world.boss,world.boss.x*S-this.cameraX,266-world.boss.y*S+this.cameraY,world.time);
    for(const tank of world.mounts)drawMount(this.c,tank,tank.x*S-this.cameraX,266-tank.y*S+this.cameraY,this.clock,world.players.some(a=>a.mounted===tank));
    for(const enemy of world.enemies)if(enemyActive(enemy)||enemy.hp>0&&enemy.hacked){if(enemy.boss){drawBoss(this.c,enemy,enemy.x*S-this.cameraX,266-enemy.y*S+this.cameraY,this.bossArt.get(enemy.boss.id),this.enemyClock);continue;}if(enemy.vehicle){drawVehicle(this.c,enemy,enemy.x*S-this.cameraX,266-enemy.y*S+this.cameraY,this.enemyClock,this.abilityArt);continue;}if(enemy.infantry?.kind!=='demolition')this.sprite(enemy.x,enemy.y,enemy.dir,enemy.infantry?.moving?Math.floor(this.enemyClock*(enemy.panic?16:10))%2:enemy.heavy||(enemy.infantry?.attack??0)>0||enemy.infantry?.kind==='gunner'?2:0,true,enemy.heavy||enemy.infantry?.kind==='gunner');drawInfantryGear(this.c,enemy,enemy.x*S-this.cameraX,266-enemy.y*S+this.cameraY,this.enemyClock);if(enemy.heavy){const x=enemy.x*S-this.cameraX;this.rect(x-13,266-enemy.y*S-42+this.cameraY,26,2,'#402f27');this.rect(x-13,266-enemy.y*S-42+this.cameraY,26*enemy.hp/enemy.maxHp,2,'#db5a39');}}
    for(const f of world.followers)if(f.hp>0){
      const x=Math.round(f.x*S-this.cameraX),y=Math.round(266-f.y*S+this.cameraY);
      this.c.globalAlpha=f.hurt>0?.55:1;
      if(f.kind==='infantry'){this.sprite(f.x,f.y,f.dir,f.moving?Math.floor(this.clock*9)%2:0,true);this.rect(f.x*S-this.cameraX-6,266-f.y*S+this.cameraY-17,5,2,'#3a91d2');this.rect(f.x*S-this.cameraX-6,266-f.y*S+this.cameraY-15,5,2,'#f5d363');}
      else {
        this.abilityArt.draw(this.c,'summons',12+(f.moving?Math.floor(this.clock*10)%4:0),x,y-18,32,37,f.dir);
      }
      this.c.globalAlpha=1;
      this.rect(x-3,y-36,6,2,'#4ba4dd');this.rect(x-3,y-34,6,2,'#ffdf6a');
      this.rect(x-9,y-31,18,3,'#172928');this.rect(x-8,y-30,16*f.hp/f.maxHp,1,f.hp<f.maxHp*.3?'#ee986b':'#88dbb0');
      if(f.reloading>0){const duration=FOLLOWER_WEAPONS[f.kind].reloadTime;this.rect(x-8,y-27,16*(1-f.reloading/duration),1,'#f4b456');}
    }
    for(const actor of world.players){
    const p=actor.body;if(p.hp<=0)continue;this.c.globalAlpha=p.cloak>0?.38:1;if(!actor.mounted&&world.evac.phase!=='departing'&&(world.story||p.invulnerable<=0||Math.floor(this.clock*12)%2===0))this.sprite(p.x,p.y,p.facing,world.highFive.offeredBy===actor.id||world.highFive.age<.45?0:heroFrame(p,this.clock,Math.abs(world.players.length===1&&!world.story?move:actor.move)>.1),false,false,HEROES.findIndex(h=>h.id===actor.heroId),actor.heroId==='lesya'&&p.form>0);this.c.globalAlpha=1;
    if(actor.heroId==='klychko'&&p.klychkoHold>0&&!actor.mounted){const x=p.x*S-this.cameraX,y=266-p.y*S+this.cameraY;drawCharge(this.c,x,y,p.facing,p.klychkoHold,this.clock);this.rect(x-12,y-37,24,4,'#172928');this.rect(x-11,y-36,22*Math.min(1,p.klychkoHold/.9),2,p.klychkoHold>=.9?'#fff2bb':'#e8ab64');}
    if(actor.heroId==='mamai'&&p.attack>0&&!world.effects.some(f=>f.kind==='weapon')){const xx=p.x*S-this.cameraX,yy=266-(p.y+1)*S+this.cameraY;this.rect(xx+p.facing*4,yy,12*p.facing,3,'#c6ad7a');this.rect(xx+p.facing*5,yy+2,4*p.facing,4,'#845b38');}
      if(world.players.length>1){const x=p.x*S-this.cameraX,y=266-p.y*S+this.cameraY;this.label('P'+(actor.id+1),x,y-42,actor.id===0?'#ffdf6a':'#70d8ff');this.rect(x-10,y-36,20,2,'#172928');this.rect(x-10,y-36,20*p.hp/100,2,actor.id===0?'#ffdf6a':'#70d8ff');}
    }
    if(world.highFive.offeredBy>=0){
      const a=world.players.find(a=>a.id===world.highFive.offeredBy);
      if(a){const p=a.body,x=p.x*S-this.cameraX,y=266-(p.y+1)*S+this.cameraY,t=Math.min(1,world.highFive.offerAge/.18),d=p.facing,c=this.c;
        const hx=Math.round(x+d*9),hy=Math.round(y-21*t);c.strokeStyle=a.id===0?'#f5d364':'#67cced';c.lineWidth=4;c.beginPath();c.moveTo(Math.round(x+d*3),Math.round(y-4));c.lineTo(Math.round(x+d*8),Math.round(y-7*t));c.lineTo(hx,hy);c.stroke();this.rect(hx-3,hy-5,6,7,'#edbd85');
      }
    }
    if(world.highFive.age<.65){
      const t=world.highFive.age,c=this.c,flash=Math.max(0,1-Math.abs(t-.18)/.17);
      const x=world.highFive.x*S-this.cameraX,y=266-world.highFive.y*S+this.cameraY;
      if(!reducedPresentation()){
        c.save();c.globalAlpha=Math.max(0,1-t/.65)*.75;
        for(let i=0;i<24;i++){const a=i*Math.PI/12,r=10+t*110;this.rect(Math.round((x+Math.cos(a)*r)/2)*2,Math.round((y-8+Math.sin(a)*r*.65)/2)*2,4,2,i%2?'#70d8ff':'#ffe783');}
        c.restore();
      }
      // Pixel forearms reach up, palms meet, then recoil. No static overlay card.
      for(const actor of world.players){const ax=actor.body.x*S-this.cameraX,ay=266-(actor.body.y+1)*S+this.cameraY,reach=Math.min(1,t/.15)*Math.max(0,1-(t-.3)/.35);const hx=ax+Math.max(-14,Math.min(14,x-ax))*reach,hy=ay-14*reach;c.strokeStyle=actor.id===0?'#f5d364':'#67cced';c.lineWidth=4;c.beginPath();c.moveTo(Math.round(ax),Math.round(ay));c.lineTo(Math.round((ax+hx)/2),Math.round(ay-3));c.lineTo(Math.round(hx),Math.round(hy));c.stroke();this.rect(Math.round(hx)-3,Math.round(hy)-4,6,7,'#edbd85');}
      if(flash>0)for(let i=0;i<8;i++){const a=i*Math.PI/4,r=8+t*35;this.rect(Math.round(x+Math.cos(a)*r),Math.round(y-8+Math.sin(a)*r),3,3,i%2?'#62d8ff':'#ffe783');}
    }
    if(world.highFive.left>0){
      // A small shared timer above the heroes; no text covers the battle.
      for(const a of world.players){const x=a.body.x*S-this.cameraX,y=266-a.body.y*S+this.cameraY;this.rect(x-10,y-60,20,2,'#173b48');this.rect(x-10,y-60,20*world.highFive.left/TEAM_BOOST.seconds,2,'#6ee4f2');}
    }
    const hint=interactionTarget(world);
    if(hint){const x=Math.round(hint.x*S-this.cameraX),y=Math.round(266-hint.y*S+this.cameraY),pressed=this.clock%1.25>.9;
      this.rect(x-9,y-9,18,19,'#07151d');this.rect(x-8,y-8+(pressed?2:0),16,14,'#f4db87');this.rect(x-6,y-6+(pressed?2:0),12,10,'#182c37');
      this.c.fillStyle='#fff4cc';this.c.textAlign='center';this.c.font='bold 11px monospace';this.c.fillText(this.interactKey,x,y+3+(pressed?2:0));
    }
    for(const b of world.bullets){
      const x=b.x*S-this.cameraX,y=266-b.y*S+this.cameraY,dir=Math.sign(b.vx);
      if(b.gravity){this.abilityArt.draw(this.c,'reinforcements',5,x,y,12,12,1,this.clock*6);}
      else if(b.ordnance){this.abilityArt.draw(this.c,'weapons',3,x,y,22,8,1,Math.atan2(-b.vy,b.vx));
      }else if(b.hero==='shevchenko'){
        this.abilityArt.draw(this.c,'auras',12+Math.floor(this.clock*12)%3,x,y,24,28,dir);
      }else if(b.hero==='lesya'){
        this.abilityArt.draw(this.c,'ordnance',4,x,y,19,5,dir);
      }else if(b.hero==='franko'){
        this.abilityArt.draw(this.c,'weapons',2,x,y,34,23,dir,-.5);
      }else if(b.hero==='it-army'){this.abilityArt.draw(this.c,'ordnance',5,x,y,14,14,dir);}else if(b.hero==='skovoroda'){this.abilityArt.draw(this.c,'props',15,x,y,23,23,dir,this.clock*10);}else if(b.hero==='bilozerska'){this.rect(x-dir*16,y,18,1,'#f2edcf');}else{this.rect(x-dir*5,y,7,2,'#ff7841');this.rect(x,y,3,1,'#fffac5');}
    }
    for(const e of world.enemies)if(e.hp>0&&(e.hacked||(e.marked??0)>0)){const x=e.x*S-this.cameraX,y=266-e.y*S+this.cameraY;this.rect(x-7,y-43,14,3,e.hacked?'#79dbc0':'#ffe078');if(e.hacked)this.rect(x-7,y-43,14*e.hacked.left/8,3,'#fff1c3');}
    const panicCaptionXs:number[]=[];
    for(const enemy of world.enemies)if(enemyActive(enemy)||enemy.hp>0&&enemy.hacked){
      const x=enemy.x*S-this.cameraX,y=266-enemy.y*S-30+this.cameraY;
      if((enemy.ionized??0)>0){this.rect(x-4,y-9,3,5,'#94f5ef');this.rect(x-1,y-6,3,5,'#e8ffff');this.rect(x-3,y-2,3,4,'#94f5ef');}
      if(enemy.poison)for(let i=0;i<3;i++)this.rect(x-5+i*5,y+6+Math.sin(this.clock*5+i)*3,2,3,'#7fef72');
      if(enemy.panic){if(!panicCaptionXs.some(px=>Math.abs(px-x)<36)){panicCaptionXs.push(x);this.label('А-А!',x,y-8+Math.sin(this.clock*22)*2,'#ffdd83');}for(let i=0;i<2;i++)this.rect(x-enemy.dir*(8+i*5),y+14+(this.clock*20+i*3)%7,3,1,'#e6d4ac');}
      else if(enemy.rooted){this.label('…',x,y-6,'#ade8f3');}
    }
    for(const f of world.effects){
      const x=f.x*S-this.cameraX,y=266-f.y*S+this.cameraY;

      drawHeroEffect(this.c,f,x,y,this.clock,this.abilityArt);
    }
    this.flag(3,world);
    if(world.mission.layout){for(const [i,point] of world.mission.layout.checkpoints.entries())this.flag(point.x,world,point.y,i<=world.routeProgress,i===world.routeProgress+1);}
    else for(const x of world.mission.checkpoints)this.flag(x,world);
    if(!world.survival){this.flag(world.mission.exit,world,world.mission.layout?.exitY??0);this.helicopter(world);}
    if(playing){for(const f of this.flashes)f.life-=dt;for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=22*dt;}this.particles=this.particles.filter(p=>p.life>0);this.flashes=this.flashes.filter(f=>f.life>0);}
    for(const f of this.flashes){const x=f.x*S-this.cameraX,y=266-f.y*S+this.cameraY;if(f.type.includes('hot')){this.abilityArt.draw(this.c,'ordnance',7,x+3,y,20,14);}else{const radius=(f.type==='special'?22:13)*(1-f.life/.4);for(let i=0;i<8;i++){const a=i*Math.PI/4;this.rect(x+Math.cos(a)*radius-4,y+Math.sin(a)*radius-4,8,8,'#e96c2e');this.rect(x+Math.cos(a)*radius-2,y+Math.sin(a)*radius-2,4,4,'#ffe27d');}}}
    if(playing){for(const b of this.cinematicBlasts)b.age+=dt;this.cinematicBlasts=this.cinematicBlasts.filter(b=>b.age<.65);}
    for(const b of this.cinematicBlasts)this.abilityArt.draw(this.c,'blast',Math.floor(b.age/.65*8),b.x*S-this.cameraX,266-b.y*S+this.cameraY-12,b.size,b.size);
    for(const p of this.particles)this.rect(p.x*S-this.cameraX,266-p.y*S+this.cameraY,p.size,p.size,p.color);
    this.sceneFx.draw(this.c,world,this.cameraX,this.cameraY,reducedPresentation());
    for(const p of this.gore.bits){const x=p.x*S-this.cameraX,y=266-p.y*S+this.cameraY;this.rect(x,y,p.size,p.chunk?p.size*.65:p.size,p.color);if(p.chunk)this.rect(x+1,y,2,1,'#f07669');}
    if(playing){for(const c of this.deathCaptions){c.life-=dt;c.y+=dt*.18;}this.deathCaptions=this.deathCaptions.filter(c=>c.life>0);}
    for(const c of this.deathCaptions){const x=c.x*S-this.cameraX;if(x<-30||x>W+30)continue;this.c.font='bold 11px monospace';const lines=wrapDeathLine(translate(c.text)),half=Math.max(...lines.map(line=>this.c.measureText(line).width))/2+5,y=Math.max(40,266-c.y*S+this.cameraY);for(const [i,line]of lines.entries())this.label(line,Math.max(half,Math.min(W-half,x)),y+(i-lines.length+1)*15,'#ffe6be');}
    this.c.restore();
    if(playing)this.screenPulse=Math.max(0,this.screenPulse-dt);
    if(!reducedPresentation()&&this.screenPulse>0){this.c.save();this.c.globalAlpha=Math.min(.22,this.screenPulse*1.25);this.rect(0,0,W,H,'#d8f2ff');this.c.restore();}
    if(world.story){this.rect(0,0,W,30,'#071015');this.rect(0,H-58,W,58,'#071015');if(world.story.caption){this.c.font='bold 15px monospace';this.c.textAlign='center';this.c.fillStyle='#f6e9b6';this.c.fillText(translate(world.story.caption),W/2,H-32,W-32);}if(world.story.exit!==null)drawFlagWipe(this.c,W,H,world.story.exit,false,reducedPresentation());}
    if(crop.zoom>1){this.output.imageSmoothingEnabled=false;this.output.drawImage(this.frame,crop.x,crop.y,crop.width,crop.height,0,0,W,H);}
  }
  private label(text:string,x:number,y:number,color:string){text=translate(text);this.c.font='bold 11px monospace';this.c.textAlign='center';this.c.fillStyle='#10201beb';this.c.fillRect(Math.round(x-this.c.measureText(text).width/2-3),Math.round(y-11),this.c.measureText(text).width+6,15);this.c.fillStyle='#11201b';this.c.fillText(text,Math.round(x)+1,Math.round(y)+1);this.c.fillStyle=color;this.c.fillText(text,Math.round(x),Math.round(y));}
  private flag(x:number,w:World,y=0,reached?:boolean,next=false){const xx=x*S-this.cameraX,yy=266-y*S+this.cameraY;if(next)this.label('▼',xx+7,yy-49-Math.round(Math.sin(this.clock*4)*2),'#ffdc67');this.rect(xx,yy-40,2,40,'#cdcba6');const active=reached??(x===3||(x===w.mission.exit?w.objectiveComplete:w.checkpoint>=x));for(let strip=0;strip<7;strip++){const sway=Math.round(Math.sin(this.clock*3-strip*.65)*strip*.22);this.rect(xx+2+strip*2,yy-40+sway,2,5,active?'#379bd7':'#686f61');this.rect(xx+2+strip*2,yy-35+sway,2,5,active?'#f7d252':'#565e50');}}
  private helicopter(w:World){
    const e=w.evac;if(e.phase==='waiting'||e.phase==='done')return;
    const x=e.x*S-this.cameraX,y=266-e.y*S+this.cameraY;
    this.abilityArt.draw(this.c,'summons',8+Math.floor(this.clock*14)%4,x,y+3,112,76,1);
    if(e.phase==='boarding'){this.label('НА БОРТ ↑',x,y-20,'#fff1a6');}
    else if(e.phase==='departing'){this.sprite(e.x,e.y-1,1,3,false,false,HEROES.findIndex(h=>h.id===w.heroId));this.rect(x,y+18,1,9,'#d5cbaa');}
  }
  dispose(){cancelAnimationFrame(this.request);}
}
