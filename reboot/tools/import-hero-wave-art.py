"""Import generated atlases: mechanical cell extraction, chroma alpha, nearest-neighbor sizing."""
from pathlib import Path
import json,subprocess,hashlib,shutil
R=Path(__file__).resolve().parents[1];G=Path('/Users/dmitry/.codex/generated_images/01a081ce-253d-7b62-9ad6-69e653f9af1f')
receipt=json.loads((R/'docs/HERO_WAVE_ART.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
legacy=json.loads((R/'docs/ROSTER_ASSETS.json').read_text());cin=json.loads((R/'docs/CINEMATIC_PROMPTS.json').read_text())
for id,a in receipt.items():
 dst=R/a['file'];subprocess.run(['ffmpeg','-v','error','-y','-i',a['source'],'-vf','scale=192:128:flags=neighbor,colorkey=0xff00ff:0.32:0,format=rgba',str(dst)],check=True)
 a['sha256']=sha(dst)
 entry=dict(id=id,file=a['file'],sha256=a['sha256'],frames=list(range(8)),prompt='UA Force coarse pixel art, 4 by 2 sprite atlas, flat magenta key, full body facing right. Consistent dark outline, limited flat palette, no gradients or smoothing. '+id,source=a['source'])
 legacy['clips']=[c for c in legacy['clips'] if c['id']!=id]+[entry]
for i,id in enumerate(receipt):
 dst=R/f'public/assets/cinematics/{id}.png';src=G/'exec-4825c4cd-f6eb-4cd7-928c-bdf18406b33d.png'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-vf',f'crop=512:512:{i%3*512}:{i//3*512},scale=160:160:flags=neighbor',str(dst)],check=True)
 receipt[id]['cinematic']=dict(file=str(dst.relative_to(R)),sha256=sha(dst),source=str(src),cell=i)
# Preserve legacy prompts shape; new provenance is fully recorded separately.
(R/'docs/ROSTER_ASSETS.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
(R/'docs/HERO_WAVE_ART.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
shutil.copy2(G/'exec-9fe200e7-3593-4e07-87d7-2af5879e3b3c.png',R/'public/assets/abilities/reinforcements.png')
