"""Stage new locally generated hero SFX, preserving the existing combat bank. No playback."""
from pathlib import Path
import importlib.util,json
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('packer',R/'tools/pack-local-sfx.py');packer=importlib.util.module_from_spec(spec);spec.loader.exec_module(packer)
jobs=json.loads((R/'docs/HERO_WAVE_SFX_CATALOG.json').read_text())['jobs']
mainpath=R/'docs/LOCAL_SFX_CATALOG.json';main=json.loads(mainpath.read_text());known={j['id'] for j in main['jobs']}
for job in jobs:
 if job['id'] not in known:main['jobs'].append(job)
 packer.edit(job,packer.RAW/(job['id']+'.wav'))
mainpath.write_text(json.dumps(main,indent=2)+'\n')
print('Staged '+str(len(jobs))+' masters for silent PCM screening.')
