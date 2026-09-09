"""Edit newly generated masters into a candidate PCM bank. Never plays audio.

Default: stage available candidates only. --install requires complete, hash-bound
content review of every edited clip in docs/LOCAL_SFX_REVIEW.json.
Run with the local generator venv (numpy/soundfile); ffmpeg handles resampling.
"""
import argparse, hashlib, json, shutil, subprocess, wave
from functools import lru_cache
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'tools/audio-source/local-sfx'
OUT = RAW / 'edited'
SR = 24000
# Legacy library files sometimes lasted only 60–130ms. Keep reload/foley
# timing, but allow physical attacks and major abilities a readable decay.
EDIT_SECONDS = {'franko-weapon': .32, 'skovoroda-weapon': .28,
    'mamai-melee-weapon': .28, 'shevchenko-ultimate': 1.3,
    'lesya-ultimate': 1.1, 'mamai-special': .45, 'zelensky-ultimate': .85,
    'bilozerska-ultimate': 1.1, 'tank-land': .65, 'armor-hit': .22}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

@lru_cache(maxsize=64)
def decode(master,rate=1):
    pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(master),'-ac','1','-ar',str(SR),
        '-af',f'asetrate=44100*{rate},highpass=f=35,lowpass=f=10500','-f','f32le','-'])
    return np.frombuffer(pcm,dtype='<f4').astype(np.float64)

def edit(job, master):
    edits_path = ROOT/'docs/LOCAL_SFX_EDITS.json'
    edits = json.loads(edits_path.read_text()) if edits_path.exists() else {}
    chosen = edits.get(job['id'], {})
    master = RAW/(chosen.get('sourceId', job['id'])+'.wav')
    recipe = json.loads(master.with_suffix('.json').read_text())
    master_sha = digest(master)
    if chosen and chosen['masterSha256'] != master_sha:
        raise ValueError('Stale manual edit: ' + job['id'])
    for layer in chosen.get('mix',[]):
        if digest(RAW/(layer['sourceId']+'.wav'))!=layer['masterSha256']:raise ValueError('Stale composite layer: '+job['id'])
    fingerprint = hashlib.sha256(json.dumps([job,chosen,master_sha,digest(Path(__file__))],sort_keys=True).encode()).hexdigest()
    cached = OUT/(job['id']+'.edit.json')
    path = OUT/(job['id']+'.wav')
    if cached.exists() and path.exists():
        previous=json.loads(cached.read_text())
        if previous['fingerprint']==fingerprint and previous['clip']['sha256']==digest(path):return previous['clip']
    rate = chosen.get('rate', 1)
    if not .9 <= rate <= 1.1:raise ValueError('Excessive pitch shift')
    x = decode(master,rate)
    if not np.isfinite(x).all() or np.max(np.abs(x)) < 1e-5:
        raise ValueError('Silent or invalid master: ' + job['id'])
    family = job['id'].rsplit('-',1)[0] if '-weapon-' in job['id'] else job['id']
    length = round(chosen.get('seconds', EDIT_SECONDS.get(family, job['seconds'])) * SR)
    # A generated six-second master can contain multiple foley contacts.
    # Select one strong event, keeping its attack; never compress the entire
    # sequence into a tiny movement clip or include six seconds of footsteps.
    hop = 120
    envelope = np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1, hop)**2, axis=1))
    loop = job['loop'] or job['id'] in ['tank-engine','plane-engine','drone-engine']
    if loop:
        start = min(SR, max(0, len(x)-length))
    else:
        peak = int(np.argmax(envelope))
        begin = peak
        while begin > 0 and envelope[begin-1] > envelope[peak] * .1:
            begin -= 1
        start = max(0, begin*hop-round(.008*SR))
    # A review can select a better interval without changing the master.
    if 'start' in chosen:
        start = round(chosen['start']*SR/rate)
    y = np.zeros(length)
    segment = x[start:start+length]
    if chosen.get('mix'):
        # Generated masters have different raw levels. Match each material
        # before mixing so a loud thud cannot bury the intended wet/voice layer.
        segment=segment*min(.76/max(float(np.max(np.abs(segment))),1e-8),.14/max(float(np.sqrt(np.mean(segment*segment))),1e-8))
    y[:len(segment)] = segment*chosen.get('gain',1)
    layers=[dict(source=master.name,sourceSha256=master_sha,model='Stable Audio 3 Small SFX',
        seed=recipe['seed'],prompt=recipe['prompt'],cfg=recipe.get('cfg',1),negativePrompt=recipe.get('negativePrompt'),
        runtimeCommit=recipe['runtimeCommit'],start=start/SR*rate,rate=rate,cut=length/SR,gain=chosen.get('gain',1),at=0)]
    for layer in chosen.get('mix',[]):
        layer_path=RAW/(layer['sourceId']+'.wav');r=json.loads(layer_path.with_suffix('.json').read_text());speed=layer.get('rate',1)
        if not .9<=speed<=1.1:raise ValueError('Excessive layer pitch shift')
        audio=decode(layer_path,speed);begin=round(layer.get('start',0)*SR/speed);at=round(layer.get('at',0)*SR)
        count=min(round(layer.get('cut',length/SR)*SR),length-at,len(audio)-begin)
        if count<=0:raise ValueError('Empty composite layer')
        piece=audio[begin:begin+count].copy();edge=min(480,count//4)
        piece[:edge]*=np.linspace(0,1,edge);piece[-edge:]*=np.linspace(1,0,edge)
        piece*=min(.76/max(float(np.max(np.abs(piece))),1e-8),.14/max(float(np.sqrt(np.mean(piece*piece))),1e-8))
        y[at:at+count]+=piece*layer.get('gain',.4)
        layers.append(dict(source=layer_path.name,sourceSha256=layer['masterSha256'],model='Stable Audio 3 Small SFX',
            seed=r['seed'],prompt=r['prompt'],cfg=r.get('cfg',1),negativePrompt=r.get('negativePrompt'),runtimeCommit=r['runtimeCommit'],
            start=layer.get('start',0),rate=speed,cut=count/SR,gain=layer.get('gain',.4),at=at/SR))
    if loop:
        # Symmetric boundary crossfade: value and slope approach the same
        # midpoint at either end of a repeated buffer, without a silent gap.
        n = min(round(.045*SR), length//4)
        seam = (y[:n] + y[-n:])*.5
        w = np.linspace(0, 1, n)
        y[:n] = seam*(1-w)+y[:n]*w
        y[-n:] = y[-n:]*(1-w)+seam*w
        edge = (y[0]+y[-1])*.5
        y[:n] = edge*(1-w)+y[:n]*w
        y[-n:] = y[-n:]*(1-w)+edge*w
    else:
        attack = min(round(.002*SR), length//8)
        decay = min(round(.035*SR), length//4)
        y[:attack] *= np.linspace(0, 1, attack)
        y[-decay:] *= np.linspace(1, 0, decay)
    peak = np.max(np.abs(y)); rms = np.sqrt(np.mean(y*y))
    if rms < 1e-5:
        raise ValueError('Empty edit: '+job['id'])
    y *= min(.76/peak, .14/rms)
    data = np.round(y*32767).astype('<i2').tobytes()
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR); wav.writeframes(data)
    clip = dict(id=job['id'], file='public/assets/audio/sfx/'+path.name,
        seconds=length/SR, loop=loop, peak=float(np.max(np.abs(y))),
        rms=float(np.sqrt(np.mean(y*y))), sha256=digest(path),
        processing='35Hz highpass, 10.5kHz lowpass, mono 24kHz, envelope and level; no synthesis',layers=layers)
    cached.write_text(json.dumps(dict(fingerprint=fingerprint,clip=clip),indent=2)+'\n')
    return clip

def main():
    parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group();mode.add_argument('--install', action='store_true');mode.add_argument('--install-candidate',action='store_true');args=parser.parse_args()
    jobs=json.loads((ROOT/'docs/LOCAL_SFX_CATALOG.json').read_text())['jobs']
    OUT.mkdir(parents=True, exist_ok=True)
    clips=[];missing=[]
    for job in jobs:
        master=RAW/(job['id']+'.wav');receipt=RAW/(job['id']+'.json')
        if not master.exists() or not receipt.exists():missing.append(job['id']);continue
        r=json.loads(receipt.read_text())
        request=hashlib.sha256(json.dumps(job,sort_keys=True).encode()).hexdigest()
        if r['requestHash']!=request or r['sha256']!=digest(master):
            missing.append(job['id']);continue
        clips.append(edit(job, master))
    manifest=dict(method='Locally generated Stable Audio 3 Small SFX; edited one-shots and loops. No runtime synthesis.',
        playback=False, serviceCostUSD=0, sources=[dict(model='Stable Audio 3 Small SFX',
        url='https://huggingface.co/stabilityai/stable-audio-3-optimized', license='Stability AI Community',
        terms='https://stability.ai/license')], clips=clips, missing=missing)
    bank=OUT/'combat-bank.wav';cursor=0;index={}
    with wave.open(str(bank),'wb') as dst:
        dst.setnchannels(1);dst.setsampwidth(2);dst.setframerate(SR)
        for clip in clips:
            with wave.open(str(OUT/(clip['id']+'.wav')),'rb') as src:data=src.readframes(src.getnframes())
            index[clip['id']]=dict(offset=cursor/SR,seconds=clip['seconds'])
            dst.writeframes(data+b'\0'*1920);cursor+=len(data)//2+960
    manifest['bank']=dict(file='public/assets/audio/sfx/combat-bank.wav',sha256=digest(bank),seconds=cursor/SR)
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    source='// Generated by tools/pack-local-sfx.py; provenance: docs/COMBAT_SFX_ASSETS.json.\nexport const SFX_BANK = "/assets/audio/sfx/combat-bank.wav";\nexport const SFX_ASSETS = '+json.dumps(index,indent=2)+' as const;\nexport type SfxId=keyof typeof SFX_ASSETS;\n'
    (OUT/'sfx-assets.ts').write_text(source)
    print(f'Staged {len(clips)}/{len(jobs)} edited effects. No playback.')
    if args.install or args.install_candidate:
        if missing:raise SystemExit('Refusing incomplete replacement: '+str(len(missing))+' missing masters')
        if args.install_candidate:
            review=json.loads((RAW/'clap/edited.json').read_text())
            rejected=[c['id'] for c in clips if review.get(c['id'],{}).get('sha256')!=c['sha256']]
            manifest['review']=dict(status='local-playtest-candidate',method='CLAP screening of actual PCM; objective file checks',humanAudition=False)
        else:
            review=json.loads((ROOT/'docs/LOCAL_SFX_REVIEW.json').read_text())
            rejected=[c['id'] for c in clips if review.get(c['id'],{}).get('sha256')!=c['sha256'] or review.get(c['id'],{}).get('status')!='accepted']
        if rejected:raise SystemExit('Content review required for edited clips: '+', '.join(rejected))
        # Validate all inputs before touching the currently working game bank.
        for clip in clips:shutil.copy2(OUT/(clip['id']+'.wav'), ROOT/clip['file'])
        shutil.copy2(bank, ROOT/manifest['bank']['file'])
        (ROOT/'docs/COMBAT_SFX_ASSETS.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        (ROOT/'src/game/sfx-assets.ts').write_text(source)
        print('Installed complete bank: '+('local candidate, human audition pending' if args.install_candidate else 'content-reviewed')+'.')

if __name__=='__main__':main()
