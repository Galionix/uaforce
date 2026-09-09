"""Offline Ukrainian radio callouts. Writes audio files; NEVER plays them."""
import hashlib,json,subprocess,wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
lines={'tank-alert':'Увага! Ворожий танк!','plane-alert':'Ракетний авіаналіт! В укриття!','drone-alert':'Увага! Ударний дрон!'}
clips=[]
for name,text in lines.items():
 raw=root/'tools/audio-source'/f'{name}.aiff';out=root/'public/assets/audio/announcer'/f'{name}.wav'
 subprocess.run(['say','-v','Lesya','-r','205','-o',str(raw),text],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','highpass=f=350,lowpass=f=3200,acompressor=threshold=0.10:ratio=4:attack=4:release=70,loudnorm=I=-18:TP=-2:LRA=5','-ar','24000','-ac','1',str(out)],check=True)
 with wave.open(str(out)) as f:seconds=f.getnframes()/f.getframerate()
 clips.append({'id':name,'text':text,'file':str(out.relative_to(root)),'source':'macOS speech synthesis, Lesya uk_UA; radio dispatcher distinct from the Algenib hero announcer','seconds':seconds,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()})
(root/'docs/THREAT_VOICES.json').write_text(json.dumps({'playbackDuringGeneration':False,'clips':clips},ensure_ascii=False,indent=2)+'\n')
print('Generated three offline radio callouts without playback.')
