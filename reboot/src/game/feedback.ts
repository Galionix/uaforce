export const FEEDBACK_URL='https://tally.so/r/b5pMz7';
export const FEEDBACK_BUILD='demo-2026-09-09-feedback';
export type FeedbackDetails={mission:string;hero:string;mode:string;session:string;controller:string};
export function reportContext(details:FeedbackDetails,client:{agent:string;width:number;height:number}){
 return [`UA Force ${FEEDBACK_BUILD}`,`Операція: ${details.mission}`,`Боєць: ${details.hero}`,`Стан: ${details.mode}`,
  `Сесія: ${details.session}`,`Керування: ${details.controller}`,`Вікно: ${client.width}×${client.height}`,`Браузер: ${client.agent}`].join('\n').slice(0,2000);
}
export function feedbackUrl(context:string,embed=false){const url=new URL(FEEDBACK_URL);url.searchParams.set('context',context.slice(0,2000));if(embed){url.pathname='/embed/b5pMz7';url.searchParams.set('transparentBackground','1');url.searchParams.set('hideTitle','1');url.searchParams.set('alignLeft','1');}return url.href;}

/** Form submission and screenshots go directly to the owner's Tally inbox, never game storage. */
export class Feedback {
 readonly dialog=document.createElement('dialog');
 private returnFocus:HTMLElement|null=null;
 private frame=document.createElement('iframe');
 private screenshot=document.createElement('a');
 private source:HTMLCanvasElement;private context:()=>FeedbackDetails;private onOpen:()=>void;private onClose:()=>void;
 constructor(source:HTMLCanvasElement,context:()=>FeedbackDetails,onOpen:()=>void,onClose:()=>void){
  this.source=source;this.context=context;this.onOpen=onOpen;this.onClose=onClose;
  this.dialog.id='feedback';this.dialog.setAttribute('aria-labelledby','feedback-title');
  this.dialog.innerHTML='<div class="dialog-head"><h2 id="feedback-title">Повідомити про помилку</h2><button id="feedback-close">Назад</button></div><div class="feedback-tools"><button id="feedback-shot">Зберегти скриншот гри</button><a id="feedback-external" target="_blank" rel="noopener noreferrer">Відкрити форму окремо ↗</a></div><p class="fine">Скриншот можна додати до форми нижче. Опис отримає розробник; email необов’язковий.</p><details><summary>Технічні дані, що додаються до звернення</summary><pre id="feedback-context"></pre></details><p id="feedback-note" role="status"></p>';
  this.frame.title='Форма повідомлення про помилку UA Force';this.frame.referrerPolicy='no-referrer';
  this.dialog.append(this.frame);document.body.append(this.dialog);
  this.dialog.querySelector<HTMLButtonElement>('#feedback-close')!.onclick=()=>this.close();
  this.dialog.querySelector<HTMLButtonElement>('#feedback-shot')!.onclick=()=>{
   this.screenshot.click();this.dialog.querySelector('#feedback-note')!.textContent='Додайте збережений PNG у поле «Скриншоти» нижче. Також можна прикріпити власний знімок.';
  };
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
 }
 get open(){return this.dialog.open;}
 show(){
  if(this.open)return;this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const context=reportContext(this.context(),{agent:navigator.userAgent,width:innerWidth,height:innerHeight});
  // Capture before pause UI is shown. Only the game's canvas is captured, never the desktop.
  const shot=this.dialog.querySelector<HTMLButtonElement>('#feedback-shot')!;
  try{this.screenshot.href=this.source.toDataURL('image/png');this.screenshot.download=`UA-Force-${Date.now()}.png`;shot.disabled=false;}catch{shot.disabled=true;}
  this.onOpen();this.dialog.querySelector('#feedback-context')!.textContent=context;this.dialog.querySelector('#feedback-note')!.textContent='';
  this.dialog.querySelector<HTMLAnchorElement>('#feedback-external')!.href=feedbackUrl(context);
  this.frame.src=feedbackUrl(context,true);this.dialog.showModal();this.dialog.querySelector<HTMLButtonElement>('#feedback-close')!.focus();
 }
 close(){if(!this.open)return;this.dialog.close();this.frame.src='about:blank';this.screenshot.removeAttribute('href');this.onClose();if(this.returnFocus?.isConnected)this.returnFocus.focus();}
}
