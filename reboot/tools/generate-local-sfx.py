"""Resume local MLX SFX generation into staging. Never plays audio or publishes assets.

Run with system Python; inference uses the isolated official MLX environment.
--ids comma-separated enables a representative quality probe before the full run.
"""
import argparse,hashlib,json,subprocess,time,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ENGINE=ROOT/'tools/audio-source/stable-audio-3/optimized/mlx'
OUT=ROOT/'tools/audio-source/local-sfx'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--ids');parser.add_argument('--catalog',default='docs/LOCAL_SFX_CATALOG.json');args=parser.parse_args()
 cat=json.loads((ROOT/args.catalog).read_text());jobs=cat['jobs']
 if args.ids:
  chosen=args.ids.split(',');known={j['id'] for j in jobs}
  if set(chosen)-known:raise SystemExit('Unknown effect ids: '+str(set(chosen)-known))
  jobs=sorted((j for j in jobs if j['id'] in chosen),key=lambda j:chosen.index(j['id']))
 OUT.mkdir(parents=True,exist_ok=True)
 rev=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ENGINE,text=True).strip()
 for n,j in enumerate(jobs):
  wav=OUT/(j['id']+'.wav');receipt=OUT/(j['id']+'.json')
  identity=hashlib.sha256(json.dumps(j,sort_keys=True).encode()).hexdigest()
  if receipt.exists() and wav.exists():
   old=json.loads(receipt.read_text())
   if old.get('requestHash')==identity and old.get('sha256')==hashlib.sha256(wav.read_bytes()).hexdigest():continue
  if receipt.exists() and wav.exists():
   archive=OUT/'takes'/j['id']/hashlib.sha256(wav.read_bytes()).hexdigest()[:16];archive.mkdir(parents=True,exist_ok=True)
   for ext in ['wav','json','log']:
    oldfile=OUT/(j['id']+'.'+ext)
    if oldfile.exists():shutil.copy2(oldfile,archive/oldfile.name)
  cmd=[str(ENGINE/'.venv/bin/python'),str(ENGINE/'scripts/sa3_mlx.py'),'--dit','sm-sfx','--decoder','same-s','--dit-dtype',j['dtype'],'--steps','8','--cfg',str(j.get('cfg',1)),'--seed',str(j['seed']),'--seconds',str(j['generateSeconds']),'--prompt',j['prompt'],'--out',str(wav)]
  if j.get('negativePrompt'):cmd.extend(['--negative-prompt',j['negativePrompt']])
  start=time.monotonic();print(f'[{n+1}/{len(jobs)}] {j["id"]}',flush=True)
  with (OUT/(j['id']+'.log')).open('w') as log:subprocess.run(cmd,cwd=ENGINE,stdout=log,stderr=subprocess.STDOUT,check=True)
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(wav)],text=True))
  receipt.write_text(json.dumps(dict(**j,requestHash=identity,model=cat['model'],runtimeCommit=rev,serviceCostUSD=0,playback=False,wallSeconds=round(time.monotonic()-start,2),file=str(wav.relative_to(ROOT)),sha256=hashlib.sha256(wav.read_bytes()).hexdigest(),actualSeconds=float(info['format']['duration']),status='generated-needs-content-review'),indent=2)+'\n')
 print('Generated masters are staged, not automatically accepted or published.',flush=True)
if __name__=='__main__':main()
