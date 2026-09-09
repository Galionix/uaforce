"""Mix recorded game audio and generated commentary, with speech ducking. No playback."""
import argparse,json,subprocess,wave
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('capture',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'docs/marketing/captures/narrated';meta=json.loads((out/'narration.json').read_text());rate=48000
track=bytearray(rate*2*37)
for i,line in enumerate(meta['clips']):
 source=out/line['file'];normalized=out/f'voice-{i}-mix.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af','silenceremove=start_periods=1:start_threshold=-48dB,highpass=f=80,loudnorm=I=-16:TP=-2:LRA=7','-ar',str(rate),'-ac','1',str(normalized)],check=True)
 with wave.open(str(normalized)) as w:raw=w.readframes(w.getnframes())
 offset=round(line['start']*rate)*2
 assert offset+len(raw)<=len(track),'Narration exceeds video'
 track[offset:offset+len(raw)]=raw;line['mixedSeconds']=len(raw)/rate/2
with wave.open(str(out/'narration-track.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(track)
filter='[0:a]aresample=48000,volume=0.9[game];[1:a]asplit=2[voice][control];[game][control]sidechaincompress=threshold=0.025:ratio=5:attack=15:release=240[ducked];[ducked][voice]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,afade=t=out:st=36.6:d=0.4[a]'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(args.capture),'-i',str(out/'narration-track.wav'),'-filter_complex',filter,'-map','0:v:0','-map','[a]','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-t','37','-movflags','+faststart',str(out/'UA-Force-gameplay-uk.mp4')],check=True)
def stamp(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
(out/'UA-Force-gameplay-uk.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(x['start'])} --> {stamp(x['start']+x['mixedSeconds'])}\n{x['text'].replace('Ю Ей Форс','UA Force')}" for i,x in enumerate(meta['clips']))+'\n')
meta['capture']='Real World/View/Sound simulation; scripted inputs and invulnerability for capture; four 8-second shots, then CTA. No audio connected to speakers.'
meta['resolution']='1920x1080';meta['seconds']=37
(out/'narration.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(out/'UA-Force-gameplay-uk.mp4')
