"""Offline sample-based sound design. No playback and no runtime oscillators.
Requires numpy and ffmpeg. Sources/edits/hashes are recorded per output.
"""
from pathlib import Path
import numpy as np
import subprocess,json,hashlib,wave
from functools import lru_cache
if (Path(__file__).resolve().parents[1]/'docs/SFX_STYLE.md').exists():
 raise SystemExit('Legacy library builder is archived. Current owner scope: docs/SFX_STYLE.md. Use generate-local-sfx.py and pack-local-sfx.py; do not overwrite generated SFX with the old library.')
R=Path(__file__).resolve().parents[1]; LIB=R/'tools/audio-source/sfx-library'; OUT=R/'public/assets/audio/sfx';OUT.mkdir(exist_ok=True)
SR=24000
@lru_cache(None)
def path(name):
 p=R/name
 if p.is_file():return p
 matches=[p for p in LIB.rglob(name) if not p.name.startswith('._')]
 if len(matches)!=1:raise ValueError((name,matches))
 return matches[0]
@lru_cache(None)
def read(name):
 p=path(name);raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-'])
 a=np.frombuffer(raw,dtype='<f4').copy();a-=a.mean();peak=np.max(np.abs(a))
 if peak<.00001:raise ValueError('silent source '+name)
 active=np.where(np.abs(a)>peak*.04)[0];a=a[max(0,active[0]-120):active[-1]+240]
 return a/max(np.max(np.abs(a)),.01)
def layer(name,gain=1,at=0,rate=1,cut=None,reverse=False,start=0):return dict(source=name,gain=gain,at=at,rate=rate,cut=cut,reverse=reverse,start=start)
L=layer
jobs={}
def add(key,layers,seconds=None,loop=False):jobs[key]=dict(layers=layers,seconds=seconds,loop=loop)
def mix(job):
 parts=[]
 for l in job['layers']:
  a=read(l['source'])[int(l['start']*SR):]
  if len(a)==0:raise ValueError(('empty layer',l,'source seconds',len(read(l['source']))/SR))
  if l['cut']:a=a[:int(l['cut']*SR)]
  if l['reverse']:a=a[::-1]
  a=np.interp(np.arange(0,len(a),l['rate']),np.arange(len(a)),a)
  fade=min(int(.012*SR),len(a)//2);a[:fade]*=np.linspace(0,1,fade);a[-fade:]*=np.linspace(1,0,fade)
  parts.append((int(l['at']*SR),a*l['gain']))
 n=int(job['seconds']*SR) if job['seconds'] else max(i+len(a) for i,a in parts)+240
 a=np.zeros(n)
 for i,b in parts:
  length=min(len(b),n-i)
  if length>0:a[i:i+length]+=b[:length]
 if job['loop']:
  # Crossfade tail into head before wrapping: no amplitude discontinuity.
  f=min(1200,n//4);t=np.linspace(0,1,f);a[:f]=a[-f:]*(1-t)+a[:f]*t;a=a[:-f]
 else:
  f=min(720,n//4);a[-f:]*=np.linspace(1,0,f)
 a-=a.mean();peak=max(abs(a));a*=min(.79/max(peak,.001),.18/max(np.sqrt(np.mean(a*a)),.001))
 return a
swing='swing.wav';paper='bookFlip1.ogg';cloth='cloth1.ogg';stone='sfx100v2_stones_01.ogg';air='sfx100v2_air_01.ogg';metal='metalLatch.ogg';motor='sfx100v2_loop_machine_02.ogg';fire='fire-1.wav';thunder='sfx100v2_thunder_01.ogg';ring='metal-ringing.wav';rotor='heli_0.ogg';engine='engine_start_up_01.wav'
# Weapons: a short isolated report, never a prerecorded automatic burst or reload.
weapon={
 'shevchenko':[L(swing,.8,rate=.75,cut=.24),L(paper,.3)],
 'lesya':[L('metalClick.ogg',.7),L('knifeSlice.ogg',.8,.035,1.5,.18)],
 'franko':[L('swing3.wav',1,rate=.65,cut=.34)],
 'bandera':[L('P_30P.wav',1,cut=.16),L(metal,.13,.025,cut=.08)],
 'mamai':[L('M_21P.wav',.9,rate=.8,cut=.42),L('metalClick.ogg',.3)],
 'mamai-melee':[L('knifeSlice2.ogg',1,cut=.24)],
 'bayraktar':[L('G_31P.wav',.95,cut=.2),L('metalClick.ogg',.25)],
 'ghost':[L('D_32P.wav',1,cut=.23)],
 'zelensky':[L('X_39P.wav',1,cut=.3)],
 'bilozerska':[L('W_29P.wav',1,cut=.85)],
 'it-army':[L('spell.wav',.7,rate=1.6,cut=.4),L(motor,.3,cut=.3)],
 'skovoroda':[L('swing2.wav',1,cut=.27)]}
for hero,layers in weapon.items():
 for v in range(3):
  add(hero+'-weapon-'+str(v),[{**l,'rate':l['rate']*(.975+.025*v)} for l in layers])
# Materials reserved for actual contacts: no fake hit when swinging into air.
contacts={'shevchenko':['impactWood_heavy_000.ogg',stone],'lesya':['chop.ogg','bubble.wav'],'franko':['impactMining_000.ogg',stone],'bandera':['impactSoft_heavy_000.ogg'],'mamai':['impactMetal_light_000.ogg','impactPunch_heavy_000.ogg'],'bayraktar':['impactMetal_medium_000.ogg'],'ghost':['impactSoft_heavy_001.ogg'],'zelensky':['impactPunch_medium_000.ogg'],'bilozerska':['impactSoft_heavy_002.ogg'],'it-army':['spell.wav','metalClick.ogg'],'skovoroda':['metalPot1.ogg']}
for hero,names in contacts.items():add(hero+'-hit',[L(s,.8 if i==0 else .35,rate=1.1 if hero=='it-army' else 1,cut=.38) for i,s in enumerate(names)],.42)
add('ricochet',[L('metalPot3.ogg',1,rate=1.2,cut=.4)],.45)
add('explosion',[L(thunder,1,rate=.75,cut=1.2),L('impactMining_001.ogg',.5),L('P_30P.wav',.3,cut=.1)],1.3)
add('glass-fire',[L('sfx100v2_glass_01.ogg',1,cut=.4),L(fire,.6,.08,cut=.5)],.65)
add('roots',[L('sfx100v2_wood_03.ogg',.8,rate=.8,cut=.5),L(stone,.3,.08,cut=.35)],.7)
add('stone-hit',[L('impactMining_002.ogg',1),L(stone,.4,.05,cut=.35)],.5)
add('thunder',[L(thunder,1,cut=1.2),L('impactMetal_heavy_000.ogg',.3)],1.3)
add('rail-shot',[L('W_29P.wav',1,rate=.85,cut=.8),L('M_21P.wav',.45,.035,cut=.5),L(air,.25,.05,cut=.7)],1.1)
add('bolt',[L('shotguncock_0.wav',.7,cut=.36),L('metalClick.ogg',.35,.15)],.4)
add('mine-arm',[L('metalClick.ogg',1),L(metal,.6,.08,cut=.1)],.22)
add('rocket',[L(air,1,rate=.7,cut=.55),L('P_30P.wav',.3,cut=.07)],.65)
# Original Ukrainian recitation, rendered to file without playback. No real-person voice imitation.
voice=R/'tools/audio-source/shevchenko-recite.aiff'
if not voice.exists():subprocess.run(['say','-v','Lesya','-r','235','-o',str(voice),'Борітеся — поборете!'],check=True)
add('shevchenko-special',[L(str(voice.relative_to(R)),1,rate=.83),L(paper,.2)],1.7)
starts={
 'lesya':([L('crow_caw.wav',.8,cut=.85),L('cloth4.ogg',.5,rate=.7)], [L('sfx100v2_wood_03.ogg',.7,rate=.7,cut=.7),L(air,.6,reverse=True,cut=.7)]),
 'franko':([L(stone,1,rate=.65,cut=.65),L('impactMining_000.ogg',.6,.15)], [L('impactMining_003.ogg',1),L(thunder,.7,.1,rate=.8,cut=.7)]),
 'bandera':([L(swing,.7,cut=.25),L('bottle.wav',.5)], [L(engine,1,cut=1.3),L(metal,.5)]),
 'mamai':([L('public/assets/audio/cues/hero.wav',.65,cut=.16),L(swing,.55,cut=.25)], [L('footstep_wood_000.ogg',1),L('chainmail1.wav',.6),L(air,.3,rate=.6,cut=.6)]),
 'bayraktar':([L(motor,.6,reverse=True,cut=.4),L(rotor,.7,cut=.5)], [L(metal,.5),L(air,1,rate=.75,reverse=True,cut=.7)]),
 'ghost':([L('metalClick.ogg',.4),L(air,1,reverse=True,cut=.5)], [L(rotor,.6,rate=.55,cut=1),L(air,.8,rate=.7,cut=1)]),
 'zelensky':([L('sfx100v2_switch_01.ogg',.8),L(motor,.35,rate=1.7,cut=.35)], [L(rotor,1,rate=1.7,cut=.7),L(metal,.35)]),
 'bilozerska':([L('dropLeather.ogg',.7),L(metal,.5,.07)], [L('shotguncock_0.wav',.7,cut=.25),L(air,.6,reverse=True,cut=.5)]),
 'it-army':([L('sfx100v2_switch_02.ogg',.5),L('magic1.wav',.65,rate=1.8,cut=.45)], [L(motor,.65,rate=.6,cut=.65),L('spell.wav',.6,reverse=True,cut=.65)]),
 'skovoroda':([L('bookOpen.ogg',.7),L(paper,1,.08),L(swing,.4,.05,cut=.25)], [L('bookOpen.ogg',.5),L(ring,.45,rate=.7,cut=.8),L(air,.5,reverse=True,cut=.7)])}
for hero,(special,ultimate) in starts.items():add(hero+'-special',special);add(hero+'-ultimate',ultimate)
add('shevchenko-ultimate',[L(paper,1),L(air,.7,reverse=True,cut=.55)],.6)
# Continuous material beds. Runtime follows living effects rather than fixed timers.
loops={
 'lesya-special':[L('cloth4.ogg',.8,rate=.65),L('cloth3.ogg',.7,.4,rate=.7),L('crow_caw.wav',.4,.9,cut=.8)],
 'lesya-ultimate':[L('sfx100v2_wood_03.ogg',.8,rate=.8),L(air,.25)],
 'franko-special':[L(stone,.7,rate=.6),L('sfx100v2_stones_02.ogg',.4,.6,rate=.8)],
 'bandera-special':[L(fire,1,cut=2)],'bandera-ultimate':[L(engine,.7,start=.65,cut=2),L(motor,.5,rate=.7,cut=2)],
 'mamai-special':[L('public/assets/audio/cues/hero.wav',.3,cut=.12),L(swing,.5,.2,rate=.8)],
 'mamai-ultimate':[L('footstep_wood_000.ogg',.8),L('footstep_wood_001.ogg',.75,.18),L('footstep_wood_002.ogg',.8,.45),L('footstep_wood_003.ogg',.75,.62),L('chainmail1.wav',.35)],
 'bayraktar-special':[L(rotor,.8,rate=2.7,cut=4)],'bayraktar-ultimate':[L(air,.8,rate=.65,cut=2)],
 'ghost-ultimate':[L(rotor,.5,rate=.5,cut=1.5),L(air,.9,rate=.6,cut=2)],
 'zelensky-ultimate':[L(rotor,1,rate=1.65,cut=3)],
 'it-army-ultimate':[L(motor,.7,rate=.55,cut=2),L('magic1.wav',.2,rate=.65,cut=2)],
 'skovoroda-special':[L(paper,.9),L('bookFlip2.ogg',.7,.3),L('bookFlip3.ogg',.6,.6)],
 'skovoroda-ultimate':[L(air,.7,rate=.7,cut=2),L(ring,.2,rate=.6,cut=2)]}
for key,layers in loops.items():add(key+'-loop',layers,1 if key.startswith('mamai') else 1.8,loop=True)
endMaterials={'shevchenko':paper,'lesya':'cloth4.ogg','franko':stone,'bandera':fire,'mamai':'chainmail2.wav','bayraktar':motor,'ghost':air,'zelensky':rotor,'bilozerska':metal,'it-army':'sfx100v2_switch_01.ogg','skovoroda':'bookClose.ogg'}
for hero,source in endMaterials.items():
 for kind in ['special','ultimate']:add(hero+'-'+kind+'-end',[L(source,.8,rate=.9 if kind=='special' else .7,cut=.4)],.5)
# Reload is spread over actual weapon reloadTime, with the latch only on reloadEnd.
reloads={'lesya':1.4,'bandera':2.4,'mamai':2.8,'bayraktar':3,'ghost':2.1,'zelensky':1.8,'bilozerska':4.8,'it-army':2}
for hero,duration in reloads.items():
 source='gunreload1.wav' if hero=='zelensky' else 'assaultriflereload1_0.wav'
 layers=[L(source,.8,cut=.5),L(metal,.5,at=duration*.48,cut=.18),L(source,.65,at=duration*.7,start=.65,cut=.3)]
 if hero=='lesya':layers=[L('creak1.ogg',.65,cut=.5),L('knifeSlice.ogg',.6,at=.8,rate=.7,cut=.3)]
 if hero=='mamai':layers=[L('clothBelt.ogg',.7,cut=.5),L('metalClick.ogg',.65,at=1.2),L('handleSmallLeather.ogg',.65,at=1.9,cut=.45)]
 if hero=='it-army':layers=[L('sfx100v2_switch_02.ogg',.7),L(motor,.45,at=.35,cut=.9),L(metal,.35,at=1.5)]
 add(hero+'-reload',layers,duration-.12);add(hero+'-reload-end',[L('metalClick.ogg' if hero=='lesya' else metal,1,rate=1.2 if hero=='it-army' else 1)],.2)
# World/follower material effects share recordings, not hero identity or shot timers.
world={
 'support-infantry':[L('D_32P.wav',1,cut=.2)],'support-turret':[L('G_31P.wav',.8,cut=.22),L(metal,.2)],
 'turret-step':[L('metalClick.ogg',1),L(motor,.4,cut=.15)],'follower-hurt':[L('impactMetal_light_000.ogg',.6),L('impactSoft_heavy_000.ogg',.5)],
 'follower-down':[L('impactMetal_medium_000.ogg',.7),L('dropLeather.ogg',.6)],
 'barrel-lift':[L('metalPot2.ogg',.5,cut=.25),L('clothBelt.ogg',.7)],'barrel-throw':[L(swing,.7),L('metalPot3.ogg',.3,cut=.16)],
 'armor-hit':[L('impactMetal_heavy_003.ogg',1)],'tank-land':[L('impactMetal_heavy_000.ogg',1),L(stone,.6)],
 'tank-jump':[L(motor,.8,rate=.7,cut=.4),L('metalLatch.ogg',.6)],'hatch':[L('doorClose_1.ogg',1,cut=.5)],
 'tank-shot':[L(thunder,1,rate=.65,cut=.8),L('W_29P.wav',.7,rate=.65,cut=.4)],
 'tank-engine':[L(engine,.65,start=.65,cut=1.2),L(motor,.55,rate=.6,cut=1.5)],
 'plane-engine':[L(rotor,.4,rate=.55,cut=1),L(air,1,rate=.65,cut=1)],
 'drone-engine':[L(rotor,1,rate=2.7,cut=2)],'drone-dive':[L(rotor,.8,rate=3.4,cut=2),L(air,.5,cut=.6)],
 'enemy-alert':[L('sfx100v2_switch_01.ogg',.5),L('impactBell_heavy_000.ogg',.55,rate=1.7,cut=.25)],
 'enemy-fuse':[L('metalClick.ogg',.7),L('metalClick.ogg',.8,.2),L('metalClick.ogg',1,.4)],
 'pickup':[L('bookPlace1.ogg',.6),L('metalLatch.ogg',.7,.1)],'debris':[L(stone,1,cut=.5),L('sfx100v2_wood_hit_01.ogg',.5)]}
for key,layers in world.items():add(key,layers)
# Replace all 66 procedural hero-foley families with recorded material combinations.
for h in contacts:
 identity={'shevchenko':paper,'lesya':'cloth3.ogg','franko':stone,'bandera':'clothBelt.ogg','mamai':'chainmail1.wav','bayraktar':metal,'ghost':'clothBelt2.ogg','zelensky':'handleSmallLeather.ogg','bilozerska':'cloth4.ogg','it-army':'metalClick.ogg','skovoroda':'bookFlip2.ogg'}[h]
 for kind in ['step','climb','jump','land','hurt','ready']:
  for v in range(3):
   base=f'footstep_grass_00{v}.ogg' if kind=='step' else f'impactSoft_heavy_00{v}.ogg' if kind in ['land','hurt'] else f'cloth{v+1}.ogg'
   if kind=='ready':base='metalClick.ogg'
   add(f'foley-{h}-{kind}-{v}',[L(base,.8,cut=.2),L(identity,.25,rate=.96+v*.04,cut=.18)],.26 if kind=='land' else .2)
clips=[]
for key,job in jobs.items():
 a=mix(job);p=OUT/(key+'.wav')
 with wave.open(str(p),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes(np.round(a*32767).astype('<i2').tobytes())
 clips.append(dict(id=key,file=str(p.relative_to(R)),seconds=len(a)/SR,loop=job['loop'],peak=float(max(abs(a))),rms=float(np.sqrt(np.mean(a*a))),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),layers=[{**l,'file':str(path(l['source']).relative_to(R)),'sourceSha256':hashlib.sha256(path(l['source']).read_bytes()).hexdigest()} for l in job['layers']]))
manifest=dict(method='Offline sample editing, layering, envelopes, resampling; no WebAudio oscillator synthesis. Ukrainian recitation: offline Lesya TTS, original voice, not an impersonation.',playback=False,sources=[json.loads(p.read_text()) for p in LIB.glob('*/source.json')],clips=clips)
(R/'docs/COMBAT_SFX_ASSETS.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# One fetch/decode for the whole pack; clips retain sample-accurate offsets.
bank=OUT/'combat-bank.wav';cursor=0;index={}
with wave.open(str(bank),'wb') as dst:
 dst.setnchannels(1);dst.setsampwidth(2);dst.setframerate(SR)
 for c in clips:
  with wave.open(str(R/c['file']),'rb') as src:data=src.readframes(src.getnframes())
  index[c['id']]=dict(offset=cursor/SR,seconds=c['seconds']);dst.writeframes(data+b'\0'*1920);cursor+=len(data)//2+960
manifest['bank']=dict(file=str(bank.relative_to(R)),sha256=hashlib.sha256(bank.read_bytes()).hexdigest(),seconds=cursor/SR)
(R/'docs/COMBAT_SFX_ASSETS.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'src/game/sfx-assets.ts').write_text('// Generated by tools/build-combat-sfx.py; provenance: docs/COMBAT_SFX_ASSETS.json.\nexport const SFX_BANK = "/assets/audio/sfx/combat-bank.wav";\nexport const SFX_ASSETS = '+json.dumps(index,indent=2)+' as const;\nexport type SfxId=keyof typeof SFX_ASSETS;\n')
print('Rendered',len(clips),'sample-based clips;',round(sum(p.stat().st_size for p in OUT.glob('*.wav'))/1024**2,2),'MiB; no playback.')
