"""Build a hash-bound final-edit review reel and its listening brief, silently."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tools/audio-source/local-sfx'
def main():
 p=argparse.ArgumentParser();p.add_argument('--name',required=True);p.add_argument('--start',type=int,default=0);p.add_argument('--end',type=int,default=389);p.add_argument('--ids');a=p.parse_args()
 jobs=json.loads((ROOT/'docs/LOCAL_SFX_CATALOG.json').read_text())['jobs'];by_id={j['id']:j for j in jobs}
 manifest=json.loads((OUT/'edited/manifest.json').read_text());clips={c['id']:c for c in manifest['clips']}
 ids=a.ids.split(',') if a.ids else [j['id'] for j in jobs[a.start:a.end]]
 missing=[key for key in ids if key not in clips]
 if missing:raise SystemExit('Missing edited candidates: '+', '.join(missing))
 subprocess.run([sys.executable,str(ROOT/'tools/review-local-sfx.py'),'--edited','--ids',','.join(ids),'--name',a.name],check=True,stdout=subprocess.DEVNULL)
 timeline=json.loads((OUT/(a.name+'-timeline.json')).read_text())
 prompt='Audit EVERY actual edited game sound in this attached reel. Report defects only, with exact clip id: wrong material/action, music or intelligible speech, noise artifacts, missing attack, doubled gunshots, bad cut or loop. Judge the actual audio, not filenames. These are deliberately short action-game effects; movement contacts are short quiet one-shots, sustained effects are loops. Do not reject appropriate short clips just for not being a full real-world event. If the rest are usable, explicitly say so.\n'
 prompt+='\n'.join(f"{r['start']}-{r['end']} {r['id']} ({'loop' if clips[r['id']]['loop'] else 'one-shot'}): {by_id[r['id']]['prompt']}" for r in timeline)
 (OUT/(a.name+'-prompt.txt')).write_text(prompt)
 (OUT/(a.name+'-receipt.json')).write_text(json.dumps(dict(clips=[clips[k] for k in ids],playback=False,review='pending'),indent=2)+'\n')
 print(f'{a.name}: {len(ids)} clips, {timeline[-1]["end"]} seconds, pending content review')
if __name__=='__main__':main()
