raise SystemExit("Retired by owner: use tools/separate-menu-score.py; no menu refrain in gameplay.")
"""Offline arrangements: shared recorded Lyria refrain, no runtime synth or playback.
Original masters are backed up once. Repeat runs always use those immutable masters.
"""
from pathlib import Path
import subprocess, json, hashlib, shutil, array, math, wave
root=Path(__file__).resolve().parents[1]
backup=root/'tools/audio-source/score-before-leitmotif';backup.mkdir(exist_ok=True)
manifest=root/'docs/BACKGROUND_MUSIC.json'
if not (backup/'manifest.json').exists():
 shutil.copy2(manifest,backup/'manifest.json')
 for p in (root/'public/assets/audio/music').glob('*.wav'):shutil.copy2(p,backup/p.name)
old=json.loads((backup/'manifest.json').read_text())
sr=44100
motif=root/'public/assets/audio/cues/hero.wav'
def decode(path,filters='anull'):
 a=array.array('f');a.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-af',filters,'-ar',str(sr),'-ac','2','-f','f32le','-']));return a

def save(id,a,meta):
 rms=math.sqrt(sum(v*v for v in a)/len(a));peak=max(abs(v) for v in a);gain=min(.18/rms,.91/peak)
 out=root/'public/assets/audio/music'/f'{id}.wav';pcm=array.array('h',(round(v*gain*32767) for v in a))
 with wave.open(str(out),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes(pcm.tobytes())
 return {**meta,'id':id,'file':str(out.relative_to(root)),'seconds':len(a)/2/sr,'rms':rms*gain,'peak':peak*gain,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'refrain':{'source':str(motif.relative_to(root)),'sha256':hashlib.sha256(motif.read_bytes()).hexdigest(),'method':'Recorded acoustic refrain; tempo/colour variation. Foreground bed fades out under refrain to avoid harmonic collision.'}}
clips=[]
for clip in old['clips']:
 id=clip['id'];a=decode(backup/(id+'.wav'));boss=id=='boss';explore=id.endswith('explore')
 # Time-stretch preserves the notes. Boss lowers register by one octave; melody intervals remain identical.
 fx='asetrate=22050,aresample=44100,atempo=1.6,lowpass=f=2500' if boss else ('atempo=0.78,lowpass=f=5000' if explore else 'atempo=1.04')
 phrase=decode(motif,fx);n=len(phrase)//2
 for start in ([6,26] if boss else [5,18]):
  at=round(start*sr)
  for i in range(n):
   if (at+i)*2+1>=len(a):break
   env=min(1,i/(sr*.12),(n-1-i)/(sr*.22));bed=1-env
   for ch in [0,1]:a[(at+i)*2+ch]=a[(at+i)*2+ch]*bed+phrase[i*2+ch]*env*(.8 if explore else 1)
 c=save(id,a,clip);c['refrain']['starts']=[6,26] if boss else [5,18];clips.append(c)
# Title theme starts with the same hook and expands into the original 60-second generation.
source=root/'tools/audio-source/lyria-uaforce-full.mp4'
a=decode(source,'silenceremove=start_periods=1:start_threshold=-50dB,atrim=duration=30,afade=t=out:st=29:d=1')
# Circular 200 ms crossfade, preserving the opening motif.
n=round(.2*sr)*2
for i in range(n):a[i]=a[-n+i]*(1-i/n)+a[i]*(i/n)
a=a[:-n]
clips.append(save('menu',a,{'source':str(source.relative_to(root)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'origin':'Original Lyria 3.5 / Galionix Pro; title arrangement','sourceStart':0,'processing':'Trimmed silence; circular crossfade; RMS/peak normalization'}))
manifest.write_text(json.dumps({**old,'clips':clips,'arrangement':'UaForce recurring recorded folk refrain, 2026-09-09','creativeReview':'Offline signal verification only. Listening review by owner pending; no playback by agent.','masterBackup':str(backup.relative_to(root))},ensure_ascii=False,indent=2)+'\n')
(root/'docs/LEITMOTIF.json').write_text(json.dumps({'identity':'Approved UaForce acoustic Lyria hero refrain','source':str(motif.relative_to(root)),'menu':'menu','inAllBackgroundTracks':True,'recurrenceSeconds':[5,18],'bossRecurrenceSeconds':[6,26],'moods':{'explore':'slower, softened highs','combat':'brisk, full-band','boss':'lower octave, slower, dark lowpass'},'knownLimitation':'Audio is arranged from recorded phrases, not a new fully through-composed orchestration. Musical listening review remains with owner.','playbackDuringWork':False},ensure_ascii=False,indent=2)+'\n')
print('Arranged',len(clips),'music tracks without playback; originals backed up.')
