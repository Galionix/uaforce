"""Create public game assets only; retain all original art/audio locally. Never plays audio."""
from pathlib import Path
import hashlib,json,re,subprocess,shutil
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
cache=root/'.release';out=cache/'public';out.mkdir(parents=True,exist_ok=True)
# Referenced gameplay art plus the standalone hero/boss reveal art.
images=set()
for source in ['src/game/content.ts','src/game/missions.ts','src/game/bosses.ts','src/game/ability-art.ts']:
 images.update(re.findall(r'/assets/[\w/-]+\.png',(root/source).read_text()))
images.update(['/assets/infantry-pixel-sheet.png','/assets/mavka-pixel-sheet.png'])
images.update('/'+str(p.relative_to(root/'public')) for p in (root/'public/assets/cinematics').glob('*.png'))
audio=[]
for sub in ['music','cues','announcer']:
 audio.extend('/'+str(p.relative_to(root/'public')) for p in (root/'public/assets/audio'/sub).glob('*.wav') if p.stem!='sirko')
audio.append('/assets/audio/sfx/combat-bank.wav')

def convert(url):
 src=root/'public'/url.lstrip('/');sha=hashlib.sha256(src.read_bytes()).hexdigest()[:16]
 ext='.webp' if src.suffix=='.png' else '.wav' if src.name=='combat-bank.wav' else '.mp3'
 name=re.sub(r'[^a-zA-Z0-9_-]','-',src.stem)+'-'+sha+ext
 target=out/'media'/name;target.parent.mkdir(exist_ok=True)
 if not target.exists():
  if ext=='.wav':
   shutil.copy2(src,target)
   return url,'/media/'+name
  if ext=='.webp':cmd=['cwebp','-quiet','-lossless','-exact','-z','6',str(src),'-o',str(target)]
  else:cmd=['ffmpeg','-v','error','-y','-i',str(src),'-vn','-map_metadata','-1','-codec:a','libmp3lame','-b:a','192k' if '/music/' in url or '/cues/' in url else '128k',str(target)]
  subprocess.run(cmd,check=True)
 return url,'/media/'+name
with ThreadPoolExecutor(max_workers=4) as pool:manifest=dict(pool.map(convert,sorted(images)+sorted(audio)))
# Remove obsolete generated files from this build directory only.
keep={Path(p).name for p in manifest.values()}
for p in (out/'media').iterdir():
 if p.name not in keep:p.unlink()
(cache/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(out/'_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n')
# Explicit 404 disables Pages SPA fallback for missing/private files.
(out/'404.html').write_text('<!doctype html><html lang="uk"><meta charset="utf-8"><title>UaForce — сторінку не знайдено</title><p>Сторінку не знайдено. <a href="/">До гри</a></p></html>')
print('Public media:',len(manifest),'files,',round(sum(p.stat().st_size for p in out.rglob('*') if p.is_file())/1024**2,2),'MiB')

shutil.copy2(root/'server/pages-worker.js',out/'_worker.js')
(out/'_routes.json').write_text(json.dumps({'version':1,'include':['/api/*'],'exclude':[]}))
