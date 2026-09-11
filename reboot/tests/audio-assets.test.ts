import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ANNOUNCER_NAMES,announcement} from '../src/game/announcer.ts';
const root=new URL('../',import.meta.url);
test('partial Fenrir release installs only six approved 3.1 clips and preserves every other voice',()=>{
 const release=JSON.parse(readFileSync(new URL('docs/FENRIR_PARTIAL_RELEASE.json',root),'utf8'));
 const rejected=JSON.parse(readFileSync(new URL('docs/FENRIR_STAGED_REVIEW.json',root),'utf8'));
 const rejectedHashes=new Set(Object.values(rejected.clips).map((c:any)=>c.sha256));
 assert.deepEqual(release.installed.map((c:any)=>c.id).sort(),['bandera','bandera-bro','franko','lesya','mamai','shevchenko']);
 const hash=(id:string)=>createHash('sha256').update(readFileSync(new URL(`public/assets/audio/announcer/${id}.wav`,root))).digest('hex');
 for(const c of release.installed){assert.equal(c.voice,'Fenrir');assert.equal(c.model,'gemini-3.1-flash-tts-preview');assert.equal(hash(c.id),c.sha256);assert.equal(rejectedHashes.has(c.sha256),false);}
 assert.equal(Object.keys(release.retained).length,22);
 for(const [id,sha]of Object.entries(release.retained)){assert.equal(hash(id),sha,id+' keeps its existing recording');assert.equal(rejectedHashes.has(sha),false);}
});
test('all names and lifecycle events have nonempty offline WAV files matching provenance',()=>{
 const manifest=JSON.parse(readFileSync(new URL('docs/ANNOUNCER_ASSETS.json',root),'utf8'));
 const ids=new Set<string>(ANNOUNCER_NAMES.map(h=>h.id));
 for(const event of ['missionStart','heroChanged','checkpoint','evacCalled','boarded','won','lost','respawn'])for(const id of announcement(event,'shevchenko',true)!.voices)ids.add(id);
 assert.equal(ids.size,20);
 for(const id of ids){const clip=manifest.clips.find((c:any)=>c.id===id);assert.ok(clip,id+' provenance');const data=readFileSync(new URL(clip.file,root));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.ok(data.length>5000);assert.ok(clip.seconds>.2&&clip.seconds<8);assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);}
 const music=JSON.parse(readFileSync(new URL('docs/MUSIC_CUES.json',root),'utf8'));
 for(const event of ['missionStart','heroChanged','checkpoint','evacCalled','won','lost','respawn']){const cue=announcement(event,'shevchenko',true)!;if(!cue.riff)continue;const file=`public/assets/audio/cues/${cue.riff}.wav`;const clip=music.clips.find((c:any)=>c.file===file);assert.ok(clip,file);const data=readFileSync(new URL(file,root));assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);}
});
