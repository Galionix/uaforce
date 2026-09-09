import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ANNOUNCER_NAMES,announcement} from '../src/game/announcer.ts';
const root=new URL('../',import.meta.url);
test('all names and lifecycle events have nonempty offline WAV files matching provenance',()=>{
 const manifest=JSON.parse(readFileSync(new URL('docs/ANNOUNCER_ASSETS.json',root),'utf8'));
 const ids=new Set<string>(ANNOUNCER_NAMES.map(h=>h.id));
 for(const event of ['missionStart','heroChanged','checkpoint','evacCalled','boarded','won','lost','respawn'])for(const id of announcement(event,'shevchenko',true)!.voices)ids.add(id);
 assert.equal(ids.size,20);
 for(const id of ids){const clip=manifest.clips.find((c:any)=>c.id===id);assert.ok(clip,id+' provenance');const data=readFileSync(new URL(clip.file,root));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.ok(data.length>5000);assert.ok(clip.seconds>.2&&clip.seconds<8);assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);}
 const music=JSON.parse(readFileSync(new URL('docs/MUSIC_CUES.json',root),'utf8'));
 for(const event of ['missionStart','heroChanged','checkpoint','evacCalled','won','lost','respawn']){const cue=announcement(event,'shevchenko',true)!;if(!cue.riff)continue;const file=`public/assets/audio/cues/${cue.riff}.wav`;const clip=music.clips.find((c:any)=>c.file===file);assert.ok(clip,file);const data=readFileSync(new URL(file,root));assert.equal(createHash('sha256').update(data).digest('hex'),clip.sha256);}
});
