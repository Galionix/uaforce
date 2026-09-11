import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{cleanSurvivalName} from '../server/pages-worker.js';
const origin='https://uaforce.thedimas.com';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../server/survival-schema.sql',import.meta.url),'utf8'));
 const db={prepare(sql:string){
  return {bind(...args:unknown[]){
   const q=sqlite.prepare(sql);
   return {async first(){return q.get(...args as never[])??null;},async all(){return {results:q.all(...args as never[])};},async run(){return q.run(...args as never[]);}};
  }};
 }};

 const ip=crypto.randomUUID();const send=async(path:string,body?:unknown,headers={})=>{const r=await worker.fetch(new Request(origin+'/api/survival/'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...headers},body:body?JSON.stringify(body):undefined}),{SURVIVAL_DB:db});return {status:r.status,body:await r.json()};};
 return {sqlite,send};
}
test('display names allow Ukrainian and Latin, reject markup, SQL payloads, controls and oversized text',()=>{
 for(const name of ['Тарас','O’Brien','Боєць 12','Jean-Luc','Player_1'])assert.ok(cleanSurvivalName(name));
 for(const name of ['<img src=x onerror=alert(1)>',"x';DROP TABLE survival_runs;--",'hi\u202Eevil','a\nb','https://x.com','🙂','x'.repeat(21),'--',null])assert.equal(cleanSurvivalName(name),null);
 assert.equal(cleanSurvivalName('  Тарас   12 '),'Тарас 12');
});
test('solo complete/name/leaderboard roundtrip persists one idempotent row and hides credentials',async()=>{
 const {sqlite,send}=fixture();const {body:t,status}=await send('run',{players:1});assert.equal(status,201);
 assert.equal((await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:1,wave:0,kills:1,finished:true})).status,200);
 assert.equal((await send('leaderboard')).body.rows.length,0);
 assert.equal((await send(`run/${t.id}/name`,{token:t.hostToken,name:'Тарас'})).body.published,true);
 const board=(await send('leaderboard')).body;assert.equal(board.rows.length,1);assert.deepEqual(board.rows[0].names,['Тарас']);assert.ok(!JSON.stringify(board).includes('token'));
 await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:2,wave:0,kills:2,finished:true});assert.equal((await send('leaderboard')).body.rows[0].seconds,1);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM survival_runs').get()!.n,1);sqlite.close();
});
test('two participants submit own names into exactly one shared row; guest cannot forge score',async()=>{
 const {sqlite,send}=fixture();const {body:t}=await send('run',{players:2});
 assert.equal((await send(`run/${t.id}/progress`,{token:t.guestToken,seconds:1,wave:0,kills:0,finished:true})).status,403);
 await send(`run/${t.id}/name`,{token:t.guestToken,name:'Леся'});await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:1,wave:0,kills:0,finished:true});assert.equal((await send('leaderboard?players=2')).body.rows.length,0);
 await send(`run/${t.id}/name`,{token:t.hostToken,name:'Тарас'});assert.deepEqual((await send('leaderboard?players=2')).body.rows[0].names,['Тарас','Леся']);assert.equal((await send('leaderboard?players=1')).body.rows.length,0);sqlite.close();
});
test('rejects foreign origins, bad tokens, impossible or regressive scores; QA never pollutes public board',async()=>{
 const {sqlite,send}=fixture();assert.equal((await send('run',{players:1},{Origin:'https://evil.test'})).status,403);const {body:t}=await send('run',{players:1,qa:true});
 assert.equal((await send(`run/${t.id}/name`,{token:crypto.randomUUID(),name:'Іван'})).status,403);
 assert.equal((await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:90000,wave:5,kills:5,finished:true})).status,400);
 assert.equal((await send(`run/${t.id}/name`,{token:t.hostToken,name:'x'.repeat(3000)})).status,413);
 await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:2,wave:1,kills:2,finished:false});
 assert.equal((await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:1,wave:0,kills:1,finished:true})).status,400);
 await send(`run/${t.id}/progress`,{token:t.hostToken,seconds:2,wave:1,kills:2,finished:true});await send(`run/${t.id}/name`,{token:t.hostToken,name:'Тест'});assert.equal((await send('leaderboard')).body.rows.length,0);sqlite.close();
});
