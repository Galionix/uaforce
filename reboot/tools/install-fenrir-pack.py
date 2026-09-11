"""Install a complete staged Fenrir pack after review; no API requests or playback."""
import argparse, importlib.util, json, hashlib, shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('generation',root/'tools/generate-fenrir-pack.py')
generation = importlib.util.module_from_spec(spec); spec.loader.exec_module(generation)
p=argparse.ArgumentParser();p.add_argument('--folder');p.add_argument('--model',default=generation.MODEL,choices=[generation.MODEL,'gemini-2.5-flash-preview-tts']);args=p.parse_args()
folder = Path(args.folder) if args.folder else generation.OUT
clips = []
for name in generation.LINES:
 clip = json.loads((folder/f'{name}.json').read_text())
 assert clip['voice']=='Fenrir' and clip['model']==args.model
 assert hashlib.sha256((folder/f'{name}.wav').read_bytes()).hexdigest()==clip['sha256']
 assert clip['sha256']!=clip['previousSha256']
 clips.append(clip)
checks = [json.loads(path.read_text()) for path in sorted(folder.glob('check-*.json'))]
checked = {clip['id'] for clip in clips for check in checks if check.get('clipHashes',{}).get(clip['id'])==clip['sha256']}
assert checked >= set(generation.LINES), f'Missing blind transcription: {set(generation.LINES)-checked}'
review=json.loads((folder/'review.json').read_text())
for clip in clips:
 decision=review['clips'].get(clip['id'],{})
 assert decision.get('sha256')==clip['sha256'] and decision.get('status')=='pass', f"Unresolved voice review: {clip['id']}"
intro = next(c['seconds'] for c in clips if c['id']=='new-hero')
names = [c for c in clips if c['mood']=='hero' and c['id'] not in ('new-hero','zelensky-shout')]
assert max(c['seconds'] for c in names)+intro+1.1+.12+1.5 <= 8.4, 'Unlock speech needs a longer musical tail'
for clip in clips: shutil.copy2(folder/f"{clip['id']}.wav",root/clip['file'])
manifest = {'date':'2026-09-12','voice':'Fenrir','model':args.model,'authority':'Owner chose deep Fenrir at normal tempo, approved the 2.5 voice trial and requested distinct acting per mood and every announcer replaced','playbackDuringGeneration':False,'excluded':['sirko (unused, excluded from release)'],'clips':clips,'transcriptionChecks':checks}
(root/'docs/ANNOUNCER_ASSETS.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
boss_path = root/'docs/BOSS_AUDIO_ASSETS.json'; boss=json.loads(boss_path.read_text())
boss['clips']=[c for c in boss['clips'] if '/announcer/' not in c['file']]+[c for c in clips if c['mood']=='boss' or c['id']=='putin-defeated']
boss_path.write_text(json.dumps(boss,ensure_ascii=False,indent=2)+'\n')
(root/'docs/THREAT_VOICES.json').write_text(json.dumps({'playbackDuringGeneration':False,'clips':[c for c in clips if c['mood']=='warning']},ensure_ascii=False,indent=2)+'\n')
print(f'Installed {len(clips)} Fenrir clips; music and combat effects preserved.')
