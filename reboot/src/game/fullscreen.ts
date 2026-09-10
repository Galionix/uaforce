/** Request only from a user gesture. Failure leaves a playable browser viewport. */
export async function gameFullscreen(mobile:boolean):Promise<string>{
 const element=document.documentElement as HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
 try{
  if(document.fullscreenElement){await document.exitFullscreen();return '';}
  const request=element.requestFullscreen?.bind(element)??element.webkitRequestFullscreen?.bind(element);
  if(!request)return mobile?'Поверни телефон горизонтально. Можна грати й без повного екрана.':'Повноекранний режим недоступний у цьому вікні.';
  await request();
 }catch{return mobile?'Повний екран недоступний. Поверни телефон горизонтально — гра працює у вкладці.':'Повноекранний режим недоступний у цьому вікні.';}
 if(mobile){try{await (screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>}).lock?.('landscape');}catch{return 'Поверни телефон горизонтально; за потреби вимкни блокування обертання.';}}
 return '';
}
