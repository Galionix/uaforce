"""Verify public artifact boundaries, referenced media and Cloudflare limits; create upload ZIP."""
from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[1];out=root/'dist-release'
manifest=json.loads((root/'.release/manifest.json').read_text());files=[p for p in out.rglob('*') if p.is_file()]
assert not (out/'assets-review.html').exists()
assert len(files)<1000
for p in files:
 assert p.stat().st_size<25*1024**2,p
 assert p.suffix not in ['.glb','.mp4','.ts','.map','.json'],p
 if p.suffix=='.wav':assert '/'+str(p.relative_to(out))==manifest['/assets/audio/sfx/combat-bank.wav'],p
for url,path in manifest.items():assert (out/path.lstrip('/')).is_file(),url
html=(out/'index.html').read_text();assert 'assets-review' not in html
receipt={'files':len(files),'bytes':sum(p.stat().st_size for p in files),'assets':manifest,'sha256':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
(root/'.release/receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(root/'.release/uaforce.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(out))
print('Verified release:',len(files),'files,',round(receipt['bytes']/1024**2,2),'MiB; ZIP ready.')
