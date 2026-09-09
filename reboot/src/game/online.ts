import Peer,{type DataConnection} from 'peerjs';
import {COOP_VERSION,RemoteInput,type Snapshot} from './coop-state.ts';
import {HEROES,type HeroId} from './content.ts';
import type {Actions} from './world.ts';
export type RoomCommand='pause'|'resume'|'continue'|'next';
type Callbacks={status:(text:string)=>void;created:(code:string)=>void;connected:(hero:HeroId)=>void;snapshot:(value:Snapshot)=>void;command:(value:RoomCommand)=>void;ended:(text:string)=>void};
export const normalizeRoom=(value:string)=>value.trim().toUpperCase().replace(/[ -]/g,'');
export const validRoom=(value:string)=>/^[A-HJ-NP-Z2-9]{8}$/.test(value);
const prefix='uaforce-v1-';
/** Signaling uses the shared free PeerServer. No media permission, account or TURN credential. */
export class OnlineRoom {
 readonly remote=new RemoteInput();
 private peer:Peer;private connection?:DataConnection;private joined=false;private closed=false;
 private sequence=0;private received=-1;private last=performance.now();private deadline=performance.now()+20000;
 private heartbeat:ReturnType<typeof setInterval>;
 constructor(readonly role:'host'|'guest',code:string,private hero:HeroId,private callbacks:Callbacks){
  this.peer=role==='host'?new Peer(prefix+code,{debug:0}):new Peer({debug:0});
  this.peer.on('open',()=>{
   if(role==='host'){this.deadline=Infinity;callbacks.created(code);}
   else this.bind(this.peer.connect(prefix+code,{reliable:true,serialization:'binary'}));
  });
  this.peer.on('connection',c=>{
   if(role!=='host'||this.connection){c.on('open',()=>{c.send({type:'full'});setTimeout(()=>c.close(),200);});return;}
   this.bind(c);
  });
  this.peer.on('error',error=>{
   const messages:Record<string,string>={'unavailable-id':'Цей код зайнятий. Створіть кімнату ще раз.','peer-unavailable':'Кімнату не знайдено. Перевірте код і чи відкрито гру у друга.','network':'Не вдалося з’єднатися із сервісом кімнат.','webrtc':'Не вдалося встановити пряме з’єднання. Спробуйте іншу мережу.','browser-incompatible':'Цей браузер не підтримує потрібне з’єднання.'};
   this.fail(messages[error.type]??'З’єднання перервано. Створіть нову кімнату.');
  });
  this.heartbeat=setInterval(()=>{
   if(this.closed)return;
   const now=performance.now();
   if(now>this.deadline||this.joined&&now-this.last>15000){this.fail('Час очікування минув. Спробуйте нову кімнату або іншу мережу.');return;}
   if(this.connection?.open)this.send({type:'ping'});
  },1000);
 }
 static code(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...crypto.getRandomValues(new Uint8Array(8))].map(n=>alphabet[n%32]).join('');}
 get connected(){return this.joined&&!this.closed;}
 private bind(c:DataConnection){
  this.connection=c;this.deadline=performance.now()+20000;
  c.on('open',()=>{this.send({type:'hello',version:COOP_VERSION,hero:this.hero});});
  c.on('data',raw=>{
   if(!raw||typeof raw!=='object')return;
   const m=raw as Record<string,unknown>;this.last=performance.now();
   if(m.type==='full'){this.fail('Кімната вже заповнена. У ній можуть бути двоє.');return;}
   if(m.type==='leave'){this.fail(this.role==='guest'?'Господар закрив кімнату. Одиночна гра доступна.':'Друг вийшов із кімнати. Створіть нову або грайте самі.');return;}
   if(m.type==='hello'){
    if(m.version!==COOP_VERSION){this.fail('Версії гри різні. Оновіть сторінку в обох браузерах.');return;}
    if(this.joined)return;
    this.joined=true;this.deadline=Infinity;
    const hero=HEROES.find(h=>h.id===m.hero)?.id??'lesya';this.callbacks.connected(hero);return;
   }
   if(!this.joined)return;
   if(this.role==='host'){
    if(m.type==='input')this.remote.receive(m.sequence as number,m.action,performance.now()/1000);
    if(m.type==='command'&&['pause','resume','continue','next'].includes(m.value as string))this.callbacks.command(m.value as RoomCommand);
   }else if(m.type==='state'){
    const s=m.value as Snapshot;
    if(!s||s.version!==COOP_VERSION||!Number.isSafeInteger(s.sequence)||s.sequence<=this.received||!Number.isInteger(s.mission)||s.mission<0||s.mission>5||!Array.isArray(s.players)||s.players.length!==2||!s.state||!Array.isArray(s.boxes)||!Array.isArray(s.effects)||!Array.isArray(s.events))return;
    if(s.players.some((a,i)=>a.id!==i||!a.body||!Number.isFinite(a.body.x)||!Number.isFinite(a.body.y)||!HEROES.some(h=>h.id===a.heroId)))return;
    this.received=s.sequence;this.callbacks.snapshot(s);
   }
  });
  c.on('close',()=>{if(!this.closed)this.fail('Зв’язок із другом втрачено. Створіть нову кімнату.');});
  c.on('error',error=>{console.warn('UA Force data channel:',error.type,error.message);this.fail('Помилка прямого з’єднання. Спробуйте іншу мережу.');});
 }
 private send(data:unknown){if(!this.closed&&this.connection?.open)this.connection.send(data);}
 input(action:Actions){if(this.role==='guest'&&this.connected)this.send({type:'input',sequence:++this.sequence,action});}
 command(value:RoomCommand){if(this.connected)this.send({type:'command',value});}
 state(value:Snapshot){if(this.role==='host'&&this.connected&&this.connection!.dataChannel.bufferedAmount<65536)this.send({type:'state',value});}
 private fail(text:string){if(this.closed)return;this.close();this.callbacks.ended(text);}
 close(){if(this.closed)return;this.send({type:'leave'});this.closed=true;this.joined=false;clearInterval(this.heartbeat);this.connection?.close();this.peer.destroy();}
}
