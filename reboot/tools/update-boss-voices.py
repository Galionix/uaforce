"""Render only Ukrainian boss announcements, no playback; preserve approved hero announcer."""
from pathlib import Path
import subprocess,json,hashlib,wave,shutil
root=Path(__file__).resolve().parents[1]
path=root/'docs/BOSS_AUDIO_ASSETS.json';m=json.loads(path.read_text())
lines={'putin':'Хуйло! Головний ворог! Здолайте агресора!', 'iron-warden':'Валерій Герасімов! Російський генерал! До бою!', 'swarm-master':'Сергій Суровікін! Російський генерал! Повітряна загроза!', 'putin-defeated':'Хуйло переможено! Командний бункер знищено!'}
backup=root/'tools/audio-source/boss-before-real-commanders';backup.mkdir(exist_ok=True)
for name,text in lines.items():
 out=root/'public/assets/audio/announcer'/f'{name}.wav';raw=root/'tools/audio-source'/f'{name}-real-commanders.aiff'
 if out.exists() and not (backup/out.name).exists():shutil.copy2(out,backup/out.name)
 subprocess.run(['say','-v','Lesya','-r','185','-o',str(raw),text],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','asetrate=22050*0.68,aresample=24000,atempo=1.2,highpass=f=75,lowpass=f=3400,acompressor=threshold=0.07:ratio=5:attack=4:release=90,asoftclip=type=tanh:threshold=0.7,aecho=0.8:0.65:95:0.19,loudnorm=I=-18:TP=-2:LRA=5','-ar','24000','-ac','1',str(out)],check=True)
 with wave.open(str(out)) as f:seconds=f.getnframes()/f.getframerate()
 m['clips']=[c for c in m['clips'] if c['file']!=str(out.relative_to(root))]+[{'file':str(out.relative_to(root)),'text':text,'source':'Offline macOS Lesya Ukrainian TTS, lowered pitch, compressed with short echo; synthetic boss announcer','seconds':seconds,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}]
out=root/'public/assets/audio/cues/boss-putin.wav'
subprocess.run(['ffmpeg','-v','error','-y','-ss','3','-i',str(root/'public/assets/audio/music/boss.wav'),'-t','7.5','-af','afade=t=in:d=0.03,afade=t=out:st=6.8:d=0.7','-ar','44100',str(out)],check=True)
m['clips']=[c for c in m['clips'] if c['file']!=str(out.relative_to(root))]+[{'file':str(out.relative_to(root)),'source':'Shared UaForce Lyria motif / dark boss arrangement','seconds':7.5,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}]
m['playbackDuringGeneration']=False;path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Updated boss introductions and victory line and final boss sting silently.')
