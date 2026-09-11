"""Re-edit the existing Flow master; no new generation or playback."""
from pathlib import Path
import hashlib,json,shutil
from importlib.util import spec_from_file_location,module_from_spec
root=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('prepare_flow',root/'tools/prepare-flow-score.py');prep=module_from_spec(spec);spec.loader.exec_module(prep)
m_path=root/'docs/FLOW_MUSIC_REPLACEMENT.json';m=json.loads(m_path.read_text());hero=next(c for c in m['generated'] if c['id']=='hero')
source=root/hero['source'];assert prep.sha(source)==hero['sourceSha256']
old=root/hero['destination'];backup=root/'tools/audio-source/hero-before-long-reveal.wav'
if not backup.exists():shutil.copy2(old,backup)
# Preserve the opening performance; keep enough of its continuation for the spoken name and musical tail.
start=hero['prepared']['sourceStart'];length=8.4;data=prep.decode(source);out=data[round(start*prep.RATE):round((start+length)*prep.RATE)].copy()
import numpy as np
out[:265]*=np.linspace(0,1,265)[:,None];tail=round(.45*prep.RATE);out[-tail:]*=np.linspace(1,0,tail)[:,None]
out*=min(.17/max(float(np.sqrt(np.mean(out*out))),1e-8),.86/max(float(np.max(np.abs(out))),1e-8))
prepared=prep.write_clip(out,root/hero['prepared']['file']);prepared.update(sourceStart=start,sourceLength=length,processing='Existing Flow hero performance extended to 8.4s; 6ms attack, 450ms release, RMS/peak-limited gain; no looping or pitch/time alteration')
hero['prepared']=prepared;shutil.copy2(root/prepared['file'],old)
for row in m['installed_files']:
 if row['file']==hero['destination']:row.update(sha256=prep.sha(old),seconds=length)
m_path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
p=root/'docs/MUSIC_CUES.json';c=json.loads(p.read_text())
for row in c['clips']:
 if row.get('id')=='hero' or row.get('file')==hero['destination']:row.update(seconds=length,sha256=prep.sha(old))
p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(prepared,ensure_ascii=False))
