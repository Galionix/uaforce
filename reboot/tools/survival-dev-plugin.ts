/** Local-only D1 adapter. No production credentials; QA scores stay on this computer. */
import {readFileSync,mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../server/pages-worker.js';
export function survivalDevPlugin(){return {name:'local-survival-api',configureServer(server:any){
 mkdirSync('.release',{recursive:true});const sqlite=new DatabaseSync('.release/survival-dev.sqlite');sqlite.exec(readFileSync('server/survival-schema.sql','utf8'));
 const db={prepare(sql:string){
  return {bind(...args:any[]){
   const q=sqlite.prepare(sql);
   return {async first(){return q.get(...args)??null;},async all(){return {results:q.all(...args)};},async run(){return q.run(...args);}};
  }};
 }};
 server.httpServer?.once('close',()=>sqlite.close());
 server.middlewares.use(async(req:any,res:any,next:any)=>{
  if(!req.url?.startsWith('/api/survival/'))return next();
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.statusCode=413;res.end();return;}}
   const r=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:req.method==='POST'?body:undefined}),{SURVIVAL_DB:db});res.statusCode=r.status;for(const [k,v]of r.headers)res.setHeader(k,v);res.end(await r.text());
  }catch{res.statusCode=500;res.end('{}');}
 });
}};}
