"""Local CLAP similarity screening of actual WAV samples. Never speaker playback.

Scores are triage evidence, not a claim of human listening or an artistic grade.
No filename/audio inference by a text-only service: the classifier receives PCM.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
import torch
from transformers import ClapModel,ClapProcessor
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'tools/audio-source/local-sfx'
LABELS=['a single gunshot','a gun reloading and metal clicking','metal clanging',
 'wood cracking and banging','a fast swoosh of air','wind blowing',
 'fire crackling','thunder rumbling','a loud explosion','wet slime squelching',
 'water splashing','water dripping','a crow cawing','a frog croaking',
 'a man grunting in pain','a man screaming','clothes rustling','paper pages turning',
 'footsteps on dirt','footsteps on wood','a wooden ladder creaking',
 'electricity sparking and crackling','a diesel engine running','a jet airplane engine',
 'a propeller drone flying','horses galloping','an acoustic string instrument plucking',
 'a metal bell ringing','rocks crumbling','a mechanical button clicking',
 'a machine whirring and gears rattling','music with a melody and drums',
 'a person speaking intelligible words','white noise and electronic static',
 'a high pitched electronic beep']
MODEL='laion/clap-htsat-unfused'
def main():
 p=argparse.ArgumentParser();p.add_argument('--ids');p.add_argument('--raw',action='store_true');a=p.parse_args()
 jobs=json.loads((ROOT/'docs/LOCAL_SFX_CATALOG.json').read_text())['jobs']
 additional=ROOT/'docs/LOCAL_SFX_PRIMITIVES.json'
 if additional.exists():jobs+=json.loads(additional.read_text())['jobs']
 by_id={j['id']:j for j in jobs}
 ids=a.ids.split(',') if a.ids else [j['id'] for j in jobs]
 prompts={j['id']:j['prompt'].split(' Dry close-mic')[0] for j in jobs}
 texts=list(dict.fromkeys(['The sound of '+label+'.' for label in LABELS]+list(prompts.values())))
 torch.set_num_threads(3);torch.manual_seed(0);np.random.seed(0)
 processor=ClapProcessor.from_pretrained(MODEL)
 model=ClapModel.from_pretrained(MODEL,use_safetensors=True).eval()
 with torch.inference_mode():
  text=[]
  for start in range(0,len(texts),32):text.append(model.get_text_features(**processor(text=texts[start:start+32],padding=True,return_tensors='pt')))
  text=torch.cat(text);text=torch.nn.functional.normalize(text,dim=-1)
 cache=BASE/'clap';cache.mkdir(exist_ok=True)
 results={}
 for n,key in enumerate(ids):
  path=(BASE if a.raw else BASE/'edited')/(key+'.wav')
  if not path.exists():continue
  sha=hashlib.sha256(path.read_bytes()).hexdigest();embedding_path=cache/(sha+'.npy')
  if embedding_path.exists():features=torch.from_numpy(np.load(embedding_path))
  else:
   data,sr=sf.read(path,dtype='float32');data=data.mean(axis=1) if data.ndim==2 else data
   if sr!=48000:data=resample_poly(data,48000//np.gcd(sr,48000),sr//np.gcd(sr,48000)).astype('float32')
   with torch.inference_mode():features=model.get_audio_features(**processor(audio=data,sampling_rate=48000,return_tensors='pt'))
   features=torch.nn.functional.normalize(features,dim=-1);np.save(embedding_path,features.numpy())
  similarities=(features@text.T).squeeze().numpy();top=np.argsort(similarities)[-5:][::-1]
  results[key]=dict(sha256=sha,model=MODEL,modelRevision=model.config._commit_hash,
   expected=prompts.get(key),expectedScore=float(similarities[texts.index(prompts[key])]) if key in prompts else None,
   top=[dict(description=texts[i],similarity=round(float(similarities[i]),4)) for i in top],
   musicScore=round(float(similarities[LABELS.index('music with a melody and drums')]),4),
   playback=False,status='screened-not-an-artistic-approval')
  (cache/('raw.json' if a.raw else 'edited.json')).write_text(json.dumps(results,indent=2)+'\n')
  print(f'[{n+1}/{len(ids)}] {key}: {results[key]["top"][0]}',flush=True)
 print('Local PCM screening complete; inspect mismatches, do not treat cosine as a quality rating.')
if __name__=='__main__':main()
