"""Original boss cues and Ukrainian processed speech. File output only: NEVER playback."""
import hashlib,json,math,random,struct,subprocess,wave
from pathlib import Path
root=Path(__file__).resolve().parents[1]
if (root/'docs/LYRIA_SCORE_SOURCES.json').exists():raise SystemExit('Published Lyria score protected. Use tools/prepare-lyria-score.py; this legacy synthesizer must not replace it.')
lines={'iron-warden':'Залізний Наглядач! Вам не пройти!','swarm-master':'Володар Рою! Небо належить мені!'}
clips=[]
def record(path,source,text=None):
 with wave.open(str(path)) as f: duration=f.getnframes()/f.getframerate()
 clips.append(dict(file=str(path.relative_to(root)),source=source,text=text,seconds=duration,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
for name,text in lines.items():
 raw=root/'tools/audio-source'/f'{name}.aiff';out=root/'public/assets/audio/announcer'/f'{name}.wav'
 subprocess.run(['say','-v','Lesya','-r','165','-o',str(raw),text],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','asetrate=22050*0.64,aresample=24000,atempo=1.22,highpass=f=75,lowpass=f=3800,acompressor=threshold=0.07:ratio=5:attack=4:release=90,asoftclip=type=tanh:threshold=0.7,aecho=0.8:0.65:95:0.19,loudnorm=I=-18:TP=-2:LRA=5','-ar','24000','-ac','1',str(out)],check=True)
 record(out,'macOS Lesya uk_UA, lowered pitch, saturation and short sinister echo; synthetic placeholder for final actor performance',text)
for index,name in enumerate(['boss-iron','boss-swarm']):
 sr=24000;duration=7.5;rng=random.Random(441+index);samples=[];low=0
 for i in range(int(sr*duration)):
  t=i/sr;beat=int(t/.375);phase=t% .375;note=[55,55,58.27,51.91,55,77.78,58.27,51.91][beat%8]*(1 if index==0 else 1.25)
  chord=sum(math.sin(2*math.pi*note*r*t) for r in [1,1.5,2])/3
  distortion=math.tanh(4*chord)*math.exp(-phase*5)*.23
  low=.9*low+.1*(rng.random()*2-1)
  hit=(math.sin(2*math.pi*(42+60*math.exp(-phase*20))*phase)*.2+low*.4)*math.exp(-phase*23)
  ominous=math.sin(2*math.pi*note*.5*t)*.12+math.sin(2*math.pi*note*math.sqrt(2)*t)*.035
  tremolo=(.65+.35*math.sin(t*(28 if index else 12)))
  envelope=min(1,t*25,max(0,(duration-t)/1.4))
  samples.append(struct.pack('<h',round(max(-.92,min(.92,(distortion*tremolo+hit+ominous)*envelope))*32767)))
 out=root/'public/assets/audio/cues'/f'{name}.wav'
 with wave.open(str(out),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(b''.join(samples))
 record(out,'Original deterministic synthesis: distorted bass/fifths, tritone tension, industrial percussion; different pulse and register per boss')
(root/'docs/BOSS_AUDIO_ASSETS.json').write_text(json.dumps({'playbackDuringGeneration':False,'clips':clips},ensure_ascii=False,indent=2)+'\n')
print('Generated 2 boss voices and 2 sinister music cues without playback.')
