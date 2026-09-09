"""Create silent-by-default audio review reels; no speaker playback."""
import argparse,json
from pathlib import Path
import numpy as np
import soundfile as sf
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tools/audio-source/local-sfx'
def main():
 p=argparse.ArgumentParser();p.add_argument('--ids');p.add_argument('--name',default='review');p.add_argument('--edited',action='store_true');a=p.parse_args()
 catalog=json.loads((ROOT/'docs/LOCAL_SFX_CATALOG.json').read_text())['jobs']
 ids=a.ids.split(',') if a.ids else [j['id'] for j in catalog if (OUT/(j['id']+'.json')).exists()]
 parts=[];timeline=[];t=0.;sr=24000 if a.edited else 44100
 for key in ids:
  data,rate=sf.read((OUT/'edited' if a.edited else OUT)/(key+'.wav'));assert rate==sr
  data=data.mean(axis=1) if data.ndim==2 else data
  assert np.isfinite(data).all() and np.max(np.abs(data))>1e-5,key
  data*=min(1,.7/max(abs(data)))
  timeline.append(dict(id=key,start=round(t,3),end=round(t+len(data)/sr,3)))
  parts.extend([data,np.zeros(sr//2)]);t+=len(data)/sr+.5
 sf.write(OUT/(a.name+'.wav'),np.concatenate(parts),sr,subtype='PCM_16')
 (OUT/(a.name+'-timeline.json')).write_text(json.dumps(timeline,indent=2)+'\n')
 print(json.dumps(timeline))
if __name__=='__main__':main()
