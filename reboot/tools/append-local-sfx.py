"""Append a screened local SFX without changing any existing PCM clip or offset. No playback."""
import argparse, hashlib, json, shutil, wave
from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('id');args=p.parse_args();key=args.id
raw=R/'tools/audio-source/local-sfx';edit=json.loads((raw/'edited'/f'{key}.edit.json').read_text())['clip'];clip=raw/'edited'/f'{key}.wav'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
review=json.loads((raw/'clap/edited.json').read_text())[key]
assert sha(clip)==edit['sha256']==review['sha256']
manifest_path=R/'docs/COMBAT_SFX_ASSETS.json';manifest=json.loads(manifest_path.read_text());bank=R/manifest['bank']['file']
assert sha(bank)==manifest['bank']['sha256']
if any(c['id']==key for c in manifest['clips']):raise SystemExit('Already installed; no changes made.')
source_path=R/'src/game/sfx-assets.ts';source=source_path.read_text();index=json.loads(source.split('export const SFX_ASSETS = ')[1].split(' as const;')[0])
with wave.open(str(bank),'rb') as w:params=w.getparams();old=w.readframes(w.getnframes());offset=w.getnframes()/w.getframerate()
with wave.open(str(clip),'rb') as w:
 assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(params.nchannels,params.sampwidth,params.framerate)
 data=w.readframes(w.getnframes())
with wave.open(str(bank),'wb') as w:w.setparams(params);w.writeframes(old+data+b'\0'*1920)
index[key]={'offset':offset,'seconds':edit['seconds']};manifest['clips'].append(edit)
manifest['bank'].update(sha256=sha(bank),seconds=offset+edit['seconds']+.04)
shutil.copy2(clip,R/edit['file']);manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
source_path.write_text(source.split('export const SFX_ASSETS = ')[0]+'export const SFX_ASSETS = '+json.dumps(index,indent=2)+' as const;\nexport type SfxId=keyof typeof SFX_ASSETS;\n')
print(json.dumps({'appended':key,'unchangedClips':len(index)-1,'offset':offset,'screening':review['status'],'humanAudition':False}))
