import {Telemetry,trafficSource} from './game/telemetry.ts';
const telemetry=new Telemetry(),q=new URLSearchParams(location.search);
const source=trafficSource(location.search)||'tiktok',link=new URL('https://uaforce.thedimas.com/');
link.searchParams.set('utm_source',source==='direct'?'tiktok':source);
for(const key of ['silent','qa','analytics'])if(q.has(key))link.searchParams.set(key,q.get(key)!);
const play=document.querySelector<HTMLAnchorElement>('#play')!;play.href=link.href;
const mobile=matchMedia('(pointer:coarse)').matches&&innerWidth<1000;
if(mobile){document.querySelector('#device-title')!.textContent='Грай на телефоні · мобільний тест';play.textContent='Грати на телефоні →';}
telemetry.event('landing_view');
play.onclick=()=>{telemetry.event('play_click');telemetry.flush();};
document.querySelector<HTMLButtonElement>('#copy')!.onclick=async()=>{try{await navigator.clipboard.writeText(link.href);telemetry.event('link_copy');document.querySelector('#status')!.textContent='Скопійовано. Відкрий на ПК або надішли другу.';}catch{document.querySelector('#status')!.textContent=link.href;}};
document.querySelector<HTMLAnchorElement>('#test-feedback')!.onclick=()=>{telemetry.event('playtest_open');telemetry.flush();};
window.addEventListener('pagehide',()=>telemetry.flush());
