"""Original offline looping score. Generates files only; NEVER plays audio."""
import math,random,wave,struct,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
if (root/'docs/LYRIA_SCORE_SOURCES.json').exists():raise SystemExit('Published Lyria score protected. Use tools/prepare-lyria-score.py; this legacy synthesizer must not replace it.')
out=root/'public/assets/audio/music';out.mkdir(parents=True,exist_ok=True)
sr=24000
settings={'river':(50,100,[0,7,10,12,9,7,5,3]),'city':(45,116,[0,3,7,10,7,5,3,-2]),'coast':(48,108,[0,5,7,12,10,7,3,5]),'mountain':(55,112,[0,2,3,7,9,7,3,2]),'rail':(43,120,[0,0,3,7,6,3,0,-2]),'marsh':(47,96,[0,7,2,3,10,7,5,2]),'boss':(38,128,[0,1,6,7,0,6,3,1])}
clips=[]
for theme,(key,bpm,motif) in settings.items():
 for mode in (['boss'] if theme=='boss' else ['explore','combat']):
  aggressive=mode!='explore';beat=60/bpm;duration=32*beat;n=round(duration*sr);data=[0.0]*n;rng=random.Random(key+(200 if aggressive else 0));progression=[0,-2,3,-5,0,3,-2,-5]
  def note(at,length,midi,amp,instrument):
   hz=440*2**((midi-69)/12);samples=int(length*sr);start=round(at*sr)
   for j in range(samples):
    t=j/sr;attack=min(1,t/.009);tail=min(1,(length-t)/.09)
    if instrument=='pluck':v=(math.sin(2*math.pi*hz*t)+.35*math.sin(2*math.pi*hz*2*t)+.16*math.sin(2*math.pi*hz*3*t))*math.exp(-t*4)*attack*tail
    elif instrument=='bass':v=(math.sin(2*math.pi*hz*t)+.22*math.sin(2*math.pi*hz*2*t))*attack*tail
    elif instrument=='wind':v=(math.sin(2*math.pi*hz*t+math.sin(t*28)*.04)+.1*math.sin(2*math.pi*hz*3*t))*min(1,t/.08)*tail
    else:v=(math.sin(2*math.pi*hz*t)+.24*math.sin(2*math.pi*hz*1.002*t))*min(1,t/.15)*tail
    data[(start+j)%n]+=v*amp
  def drum(at,kind,amp):
   length=.24 if kind=='kick' else .13;start=round(at*sr)
   for j in range(int(length*sr)):
    t=j/sr;noise=rng.random()*2-1
    v=math.sin(2*math.pi*(45*t+2*(1-math.exp(-t*26))))*math.exp(-t*20) if kind=='kick' else noise*math.exp(-t*(35 if kind=='hat' else 24))
    data[(start+j)%n]+=v*amp
  for bar,rootnote in enumerate(progression):
   for interval in [0,7,15]:note(bar*4*beat,4*beat,key+rootnote+interval,.026,'pad')
   for b in range(4):
    at=(bar*4+b)*beat;note(at,beat*.82,key+rootnote-12,.14 if aggressive else .09,'bass')
    if aggressive or b in [0,2]:drum(at,'kick',.22 if aggressive else .10)
    if aggressive and b%2:drum(at,'snare',.14)
    for half in range(2):
     if aggressive:drum(at+half*beat/2,'hat',.044)
     interval=motif[(bar*3+b*2+half)%8]+(12 if bar%4==3 else 0)
     if aggressive or half==0:note(at+half*beat/2,beat*(.8 if aggressive else 1.4),key+12+interval,.12 if aggressive else .10,'pluck')
   if not aggressive and bar%2==0:note(bar*4*beat,beat*2.7,key+24+motif[bar],.055,'wind')
  # Circular note tails make the loop join continuous; normalized once, no playback.
  rms=math.sqrt(sum(v*v for v in data)/n);peak=max(abs(v) for v in data);gain=min(.19/rms,.89/peak)
  pcm=b''.join(struct.pack('<h',round(v*gain*32767)) for v in data)
  name='boss' if theme=='boss' else theme+'-'+mode;path=out/(name+'.wav')
  with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes(pcm)
  clips.append(dict(id=name,file=str(path.relative_to(root)),seconds=n/sr,bpm=bpm,rootMidi=key,motif=motif,mode=mode,rms=round(rms*gain,4),peak=round(peak*gain,4),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
  print('Composed',name,round(n/sr,2),'s',flush=True)
(root/'docs/BACKGROUND_MUSIC.json').write_text(json.dumps({'source':'Original deterministic composition: plucked-string harmonics, sustained harmony, wind-like melody, bass, percussion. Synthesized instruments, not recorded bandura/sopilka. No music-generation quota or service.','playbackDuringGeneration':False,'clips':clips},ensure_ascii=False,indent=2)+'\n')
