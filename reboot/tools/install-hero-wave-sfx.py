"""Append screened generated materials and offline hero edits. Preserve existing PCM and offsets.
New clip provenance distinguishes fresh local generations from edits of existing generated foley.
No playback; semantic screening is not human artistic approval.
"""
from pathlib import Path
import json,hashlib,wave,copy
import numpy as np
R=Path(__file__).resolve().parents[1];raw=R/'tools/audio-source/local-sfx';manifest_path=R/'docs/COMBAT_SFX_ASSETS.json';m=json.loads(manifest_path.read_text());clips={c['id']:c for c in m['clips']};screen=json.loads((raw/'clap/edited.json').read_text());source=R/'src/game/sfx-assets.ts';text=source.read_text();index=json.loads(text.split('export const SFX_ASSETS = ')[1].split(' as const;')[0]);bank=R/m['bank']['file'];SR=24000
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(bank)==m['bank']['sha256']
with wave.open(str(bank),'rb') as f:params=f.getparams();pcm=bytearray(f.readframes(f.getnframes()))
added=[]
def append(c,data):
 key=c['id']
 if key in clips:return
 index[key]=dict(offset=len(pcm)/2/SR,seconds=c['seconds']);pcm.extend(data);pcm.extend(bytes(1920));clips[key]=c;m['clips'].append(c);added.append(c)
 with wave.open(str(R/c['file']),'wb') as f:f.setparams(params);f.writeframes(data)
 assert sha(R/c['file'])==c['sha256']
for j in json.loads((R/'docs/HERO_WAVE_SFX_CATALOG.json').read_text())['jobs']:
 key=j['id'];c=json.loads((raw/'edited'/f'{key}.edit.json').read_text())['clip'];p=raw/'edited'/f'{key}.wav';assert sha(p)==c['sha256']==screen[key]['sha256']
 with wave.open(str(p),'rb') as f:data=f.readframes(f.getnframes())
 # A generic explosion was rejected for the time-manipulation cue. Use the approved local time material below.
 if key=='klychko-ultimate':continue
 c['review']=screen[key];append(c,data)
def derived(key,base,seconds=None,gain=.93,rate=1,extra=None):
 if key in clips:return
 c=clips[base]
 with wave.open(str(R/c['file']),'rb') as f:a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32767
 a=np.interp(np.arange(0,len(a),rate),np.arange(len(a)),a)
 n=round((seconds if seconds is not None else len(a)/SR)*SR);x=np.zeros(n);x[:min(n,len(a))]=a[:n]*gain
 if extra:
  with wave.open(str(R/clips[extra]['file']),'rb') as f:b=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32767
  x[:min(n,len(b))]+=b[:n]*.3
 edge=min(240,n//4);x[:edge]*=np.linspace(0,1,edge);x[-edge:]*=np.linspace(1,0,edge);x*=min(1,.74/max(np.max(np.abs(x)),1e-8));data=np.round(x*32767).astype('<i2').tobytes()
 path=R/f'public/assets/audio/sfx/{key}.wav'
 with wave.open(str(path),'wb') as f:f.setparams(params);f.writeframes(data)
 item=dict(id=key,file=str(path.relative_to(R)),seconds=n/SR,loop=False,peak=float(np.max(np.abs(x))),rms=float(np.sqrt(np.mean(x*x))),sha256=sha(path),layers=copy.deepcopy(c['layers']),processing='Offline trim, bounded rate and gain, fades; derived from screened generated PCM; no synthesis',derivedFrom=dict(id=base,sha256=c['sha256'],gain=gain,rate=rate,extra=extra),humanAudition=False)
 append(item,data)
for hi,(hero,weapon,foley) in enumerate([('usyk','usyk-punch','mamai'),('almaziv','almaziv-weapon','franko'),('klychko','klychko-weapon','franko'),('taira','taira-weapon','lesya'),('prytula','prytula-weapon','zelensky')]):
 for v in range(3):derived(f'{hero}-weapon-{v}',weapon,.33 if hero!='almaziv' else .5,gain=.92-v*.035,rate=.97+v*.03)
 derived(hero+'-hit',weapon,.25,gain=.9)
 if hero=='klychko':derived(hero+'-ultimate','team-time-slow',1.2,.92,extra='klychko-weapon')
 for kind in ['special','ultimate']:derived(f'{hero}-{kind}-end',hero+'-'+kind,.28,gain=.57)
 if hero in ['almaziv','prytula']:
  derived(hero+'-reload','mamai-reload' if hero=='almaziv' else 'bandera-reload',.65,gain=.9,rate=1.025)
  derived(hero+'-reload-end','bolt',.23,gain=.86,rate=.97)
 for kind in ['step','climb','jump','land','hurt','ready']:
  for v in range(3):derived(f'foley-{hero}-{kind}-{v}',f'foley-{foley}-{kind}-{v}',min(.29,clips[f'foley-{foley}-{kind}-{v}']['seconds']),gain=.82+hi*.021+v*.003,rate=.975+hi*.009)
with wave.open(str(bank),'wb') as f:f.setparams(params);f.writeframes(pcm)
m['bank'].update(sha256=sha(bank),seconds=len(pcm)/2/SR)
manifest_path.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n');source.write_text(text.split('export const SFX_ASSETS = ')[0]+'export const SFX_ASSETS = '+json.dumps(index,indent=2)+' as const;\nexport type SfxId=keyof typeof SFX_ASSETS;\n')
(R/'docs/HERO_WAVE_SFX_DELIVERY.json').write_text(json.dumps(dict(method='Locally generated Stable Audio 3 and explicit offline edits of generated materials',humanAudition=False,playback=False,serviceCostUSD=0,clips=added,screening=screen,bank=m['bank']),indent=2)+'\n')
print('Appended',len(added),'clips; existing PCM and offsets preserved.')
