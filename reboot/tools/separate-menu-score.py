"""Owner revision: no title refrain inside gameplay. Offline files only, no playback."""
from pathlib import Path
import subprocess,json,hashlib,shutil,array,math,wave
root=Path(__file__).resolve().parents[1]
backup=root/'tools/audio-source/score-before-leitmotif'
m=json.loads((backup/'manifest.json').read_text())
for clip in m['clips']:
 shutil.copy2(backup/(clip['id']+'.wav'),root/clip['file'])
source=root/'tools/audio-source/lyria-uaforce-full.mp4'
# Start well after the title's original opening. Gentler register, no repeated hook inserts.
a=array.array('f');a.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vn','-af','atrim=start=19:duration=33,asetpts=PTS-STARTPTS,atempo=0.92,lowpass=f=3600','-ar','44100','-ac','2','-f','f32le','-']))
n=round(.8*44100)*2
for i in range(n):
 f=i/n;a[i]=a[-n+i]*(1-f)+a[i]*f
a=a[:-n]
rms=math.sqrt(sum(v*v for v in a)/len(a));peak=max(abs(v) for v in a);gain=min(.105/rms,.7/peak)
out=root/'public/assets/audio/music/menu.wav'
with wave.open(str(out),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(44100);f.writeframes(array.array('h',(round(v*gain*32767) for v in a)).tobytes())
m['clips'].append({'id':'menu','file':str(out.relative_to(root)),'source':str(source.relative_to(root)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'origin':'Original Lyria 3.5 / Galionix Pro; calm title-only arrangement','sourceStart':19,'seconds':len(a)/2/44100,'rms':rms*gain,'peak':peak*gain,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'processing':'Later section, 0.92 tempo, gentle 3.6 kHz lowpass, lower RMS, 800 ms circular crossfade'})
m.update(arrangement='Independent gameplay compositions; no inserted menu refrain, 2026-09-09',creativeReview='Signal and provenance verified silently. Listening review remains with owner.',masterBackup=str(backup.relative_to(root)))
(root/'docs/BACKGROUND_MUSIC.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(root/'docs/LEITMOTIF.json').write_text(json.dumps({'authority':'Owner correction 2026-09-09 supersedes recurring melody request','inAllBackgroundTracks':False,'recurrenceSeconds':[],'bossRecurrenceSeconds':[],'menu':'menu','menuSourceStart':19,'gameplay':'Unmodified independent original Lyria loops from score-before-leitmotif; never splice in the title refrain.','unlock':'Approved hero sting remains only for first unlock; no hero/short sting on mission start, respawn or repeat rescue.','playbackDuringWork':False},ensure_ascii=False,indent=2)+'\n')
print('Restored 13 independent gameplay loops and arranged a calmer, later title section silently.')
