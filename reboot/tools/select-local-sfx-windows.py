"""Find actual material-bearing intervals with CLAP; writes proposals, never plays."""
import json,hashlib,subprocess
from pathlib import Path
import numpy as np
import torch
from transformers import ClapModel,ClapProcessor
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'tools/audio-source/local-sfx'
jobs=json.loads((ROOT/'docs/LOCAL_SFX_WINDOW_SEARCH.json').read_text())
torch.set_num_threads(3);torch.manual_seed(0);np.random.seed(0)
processor=ClapProcessor.from_pretrained('laion/clap-htsat-unfused');model=ClapModel.from_pretrained('laion/clap-htsat-unfused',use_safetensors=True).eval()
result_path=BASE/'clap/window-proposals.json'
out=json.loads(result_path.read_text()) if result_path.exists() else {}
for job in jobs:
 master=BASE/(job['sourceId']+'.wav');sr=48000
 sha=hashlib.sha256(master.read_bytes()).hexdigest();previous=out.get(job['id'],{})
 if previous.get('masterSha256')==sha and previous.get('seconds')==job['seconds'] and previous.get('description')==job['description']:continue
 x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(master),'-ac','1','-ar',str(sr),'-af','highpass=f=35,lowpass=f=10500','-f','f32le','-']),dtype='<f4')
 n=round(job['seconds']*sr);hop=240
 envelope=np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1,hop)**2,axis=1))
 threshold=float(envelope.max())*.15
 starts={0.,*[round(max(0,i*hop/sr-.008),3) for i in range(1,len(envelope)) if envelope[i]>=threshold and envelope[i-1]<threshold]}
 starts.update(np.arange(0,max(0,len(x)/sr-job['seconds']),.3).round(3).tolist())
 starts=sorted(s for s in starts if s+job['seconds']<=len(x)/sr)
 with torch.inference_mode():
  text=model.get_text_features(**processor(text=[job['description']],padding=True,return_tensors='pt'));text=torch.nn.functional.normalize(text,dim=-1)
 ranked=[]
 for i in range(0,len(starts),8):
  batch=[]
  for start in starts[i:i+8]:
   y=x[round(start*sr):round(start*sr)+n].copy();fade=min(1680,n//4);y[-fade:]*=np.linspace(1,0,fade);y[:96]*=np.linspace(0,1,96);batch.append(y)
  with torch.inference_mode():features=model.get_audio_features(**processor(audio=batch,sampling_rate=sr,return_tensors='pt'))
  scores=(torch.nn.functional.normalize(features,dim=-1)@text.T).squeeze(-1).tolist()
  ranked.extend(dict(start=start,similarity=score) for start,score in zip(starts[i:i+8],scores))
 ranked.sort(key=lambda r:r['similarity'],reverse=True)
 out[job['id']]=dict(sourceId=job['sourceId'],masterSha256=sha,seconds=job['seconds'],description=job['description'],best=ranked[:5],playback=False)
 (BASE/'clap/window-proposals.json').write_text(json.dumps(out,indent=2)+'\n')
 print(job['id'],ranked[0],flush=True)
