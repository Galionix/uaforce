import type {World} from './world.ts';
import {HEROES,type HeroId} from './content.ts';
import {translate} from './i18n.ts';
type Ticket={id:string;hostToken:string;guestToken:string};
export const survivalTime=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
async function api(path:string,body?:unknown){
 const r=await fetch('/api/survival/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('leaderboard');return r.json();
}
/** UI/network side effects stay out of the host simulation and snapshots. */
export class SurvivalUI {
 readonly dialog=document.createElement('dialog');
 private tickets=new WeakMap<World,Promise<Ticket|null>>();
 private readyTickets=new WeakMap<World,Ticket>();
 private sends=new WeakMap<World,Promise<unknown>>();
 private last=new WeakMap<World,number>();
 private drawId=0;
 constructor(private start:(hero:HeroId,coop:boolean)=>void,private clear:()=>void){this.dialog.id='survival-dialog';this.dialog.className='survival-dialog';document.body.append(this.dialog);this.dialog.addEventListener('close',clear);}
 get open(){return this.dialog.open;}
 close(){this.drawId++;this.dialog.close();this.clear();}
 private page(title:string){this.drawId++;this.dialog.replaceChildren();const head=document.createElement('div');head.className='dialog-head';const h=document.createElement('h2');h.textContent=title;head.append(h,this.button('Назад',()=>this.close()));this.dialog.append(head);if(!this.open)this.dialog.showModal();this.clear();}
 private button(text:string,fn:()=>void){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
 private text(copy:string){const p=document.createElement('p');p.textContent=copy;this.dialog.append(p);return p;}
 choose(){
  this.page('Нескінченна оборона');this.text('Хвилі зростають. Ящики повертають ульту. Танк — після п’ятої хвилі.');
  const label=document.createElement('label');label.textContent='Боєць ';const select=document.createElement('select');select.id='survival-hero';for(const h of HEROES)select.add(new Option(translate(h.name),h.id));label.append(select);this.dialog.append(label);
  this.text('Удвох: протримайся до кінця хвилі, щоб повернути напарника. Якщо впадуть обидва — забіг завершено.');
  const solo=this.button('Грати самому',()=>{const hero=select.value as HeroId;this.close();this.start(hero,false);});solo.className='primary';
  this.dialog.append(solo,this.button('Удвох онлайн',()=>{const hero=select.value as HeroId;this.close();this.start(hero,true);}),this.button('Таблиця рекордів',()=>void this.board(1)));solo.focus();
 }
 register(w:World){
  if(!w.survival||this.tickets.has(w))return;
  const p=api('run',{players:w.players.length,qa:new URLSearchParams(location.search).get('silent')==='1'}).then((ticket:Ticket)=>{this.readyTickets.set(w,ticket);if(w.survival)w.survival.rank={id:ticket.id,guestToken:ticket.guestToken};return ticket;}).catch(()=>null);
  this.tickets.set(w,p);
 }
 update(w:World,finish=false){
  if(!w.survival||!this.tickets.has(w))return Promise.resolve(false);
  if(!finish&&w.survival.elapsed-(this.last.get(w)??0)<30)return Promise.resolve(false);
  this.last.set(w,w.survival.elapsed);
  const score={seconds:Math.floor(w.survival.elapsed),wave:w.survival.cleared,kills:w.kills,finished:finish};
  const previous=this.sends.get(w)??Promise.resolve();
  const send=previous.catch(()=>{}).then(async()=>{const ticket=await this.tickets.get(w);if(!ticket)return false;await api(`run/${ticket.id}/progress`,{token:ticket.hostToken,...score});return true;});
  this.sends.set(w,send);return send;
 }
 finishOnUnload(w:World){
  const ticket=this.readyTickets.get(w),s=w.survival;if(!ticket||!s)return;
  // Send the final host score when a tab closes; the partner can still enter their own name.
  const body=JSON.stringify({token:ticket.hostToken,seconds:Math.floor(s.elapsed),wave:s.cleared,kills:w.kills,finished:true});
  try{navigator.sendBeacon(`/api/survival/run/${ticket.id}/progress`,new Blob([body],{type:'application/json'}));}catch{}
 }
 result(w:World){
  if(!w.survival)return;
  this.page('Забіг завершено');const page=this.drawId;
  this.text(`${survivalTime(w.survival.elapsed)} · Хвиль пройдено: ${w.survival.cleared} · Ворогів знищено: ${w.kills}`);
  this.text(w.players.length===2?'Спільний результат пари. Кожен вводить своє ім’я на своєму пристрої.':'Збережи результат у відкритій таблиці.');
  const label=document.createElement('label');label.textContent='Твоє ім’я ';const name=document.createElement('input');name.id='survival-name';name.maxLength=20;name.setAttribute('autocomplete','nickname');name.spellcheck=false;label.append(name);this.dialog.append(label);
  try{name.value=localStorage.getItem('uaforce.survival.name')??'';}catch{}
  this.text('2–20 символів: літери, цифри, пробіл, апостроф, дефіс. Без посилань.');
  const status=this.text(''),save=this.button('Записати результат',async()=>{
   const value=name.value.normalize('NFKC').trim().replace(/ +/g,' ');
   if([...value].length<2||[...value].length>20||!/^[\p{Script=Latin}\p{Script=Cyrillic}0-9 _'’ʼ-]+$/u.test(value)||!/[\p{L}0-9]/u.test(value)){status.textContent='Перевір ім’я: 2–20 літер або цифр.';return;}
   save.disabled=true;status.textContent='Збереження…';
   try{
    const ticket=await this.tickets.get(w);if(ticket){if(!await this.update(w,true))throw new Error('run');}
    const id=ticket?.id??w.survival!.rank?.id,token=ticket?.hostToken??w.survival!.rank?.guestToken;if(!id||!token)throw new Error('run');
    const result=await api(`run/${id}/name`,{token,name:value});
    try{localStorage.setItem('uaforce.survival.name',value);}catch{}
    if(this.drawId===page){status.textContent=result.published?'Результат у таблиці!':'Ім’я збережено. Чекаємо результат і ім’я напарника.';save.textContent='Збережено';}
   }catch{if(this.drawId===page){status.textContent='Таблиця тимчасово недоступна. Спробуй зберегти ще раз.';save.disabled=false;}}
  });
  this.dialog.append(save,this.button('Таблиця рекордів',()=>void this.board(w.players.length===2?2:1)));name.focus();
 }
 async board(players:1|2){
  this.page('Таблиця рекордів');const page=this.drawId;
  const single=this.button('Одиночні',()=>void this.board(1)),duo=this.button('Пари',()=>void this.board(2));single.disabled=players===1;duo.disabled=players===2;this.dialog.append(single,duo);
  this.text('Час активного бою. Пауза та перепочинки не враховуються.');
  const status=this.text('Завантаження…');
  try{const {rows}=await api(`leaderboard?players=${players}`);if(this.drawId!==page)return;status.textContent=rows.length?'':'Тут поки немає рекордів. Будь першим!';
   const table=document.createElement('table');table.className='survival-board';const head=document.createElement('tr');for(const copy of ['#','Бійці','Час','Хвилі']){const th=document.createElement('th');th.textContent=copy;head.append(th);}table.append(head);
   for(const [i,row]of rows.entries()){const tr=document.createElement('tr');for(const [j,value]of [String(i+1),row.names.join(' + '),survivalTime(row.seconds),String(row.wave)].entries()){const td=document.createElement('td');td.textContent=value;if(j===1)td.setAttribute('translate','no');tr.append(td);}table.append(tr);}this.dialog.append(table);
  }catch{if(this.drawId===page){status.textContent='Таблиця тимчасово недоступна. Грати можна й без неї.';this.dialog.append(this.button('Оновити',()=>void this.board(players)));}}
 }
}
