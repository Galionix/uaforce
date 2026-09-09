"""Original deterministic folk-inspired synthesis, not recordings of folk instruments."""
import math,wave,json,hashlib,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/audio/cues';OUT.mkdir(parents=True,exist_ok=True)
if (ROOT/'tools/audio-source/lyria-generation.json').exists() and '--replace-published' not in sys.argv:
 raise SystemExit('Published hero cues use Lyria. Draft synthesis is archived in tools/audio-source. Use --replace-published only to deliberately restore all synthesized cues.')
SR=44100;rng=np.random.default_rng(20260908)
def note(freq,length,kind):
 t=np.arange(int(SR*length))/SR;x=np.zeros_like(t)
 if kind=='pluck':
  for h in range(1,13):x+=np.sin(2*np.pi*freq*h*t+.12*h)*np.exp(-t*(3+h*.75))/h**1.2
  x*=np.minimum(1,t/.001)
 elif kind=='dulcimer':
  for h in range(1,10):x+=np.sin(2*np.pi*freq*h*(1+.0006*h*h)*t)*np.exp(-t*(2+h*.8))/h**1.1
  x*=np.minimum(1,t/.002)
 elif kind=='horn':
  for h in range(1,9):x+=np.sin(2*np.pi*freq*h*t+np.sin(t*32)*.025*h)/h**1.5
  x*=np.minimum(1,t/.025)*np.minimum(1,(length-t)/.15)*np.exp(-t*.5)
 else:
  x=np.sin(2*np.pi*(freq*t+2*(1-np.exp(-t*22))))*np.exp(-t*15)+rng.normal(0,.17,len(t))*np.exp(-t*35)
 return x/max(1,np.max(np.abs(x)))
def make(name,notes,length):
 out=np.zeros((int(SR*length),2))
 for when,midi,kind,vol,duration,pan in notes:
  a=note(440*2**((midi-69)/12),duration,kind)*vol;i=int(when*SR);n=min(len(a),len(out)-i)
  out[i:i+n,0]+=a[:n]*math.sqrt((1-pan)/2);out[i:i+n,1]+=a[:n]*math.sqrt((1+pan)/2)
 # Small room echo, then gentle saturation and 100ms tail fade.
 echo=int(SR*.047);out[echo:]+=out[:-echo].copy()*.13
 out=np.tanh(out*1.4);out*=.83/max(.83,np.max(np.abs(out)));fade=int(SR*.1);out[-fade:]*=np.linspace(1,0,fade)[:,None]
 p=OUT/(name+'.wav')
 with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((out*32767).astype('<i2').tobytes())
 return {'file':str(p.relative_to(ROOT)),'seconds':length,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'notes':notes}
# D dorian ascending flourish, octave response; common identity across all fighters.
phrase=[62,65,67,69,72,74,77,74]
hero=[(i*.085,n,'pluck',.34,.65,-.22) for i,n in enumerate(phrase)]
hero += [(i*.085,n+12,'dulcimer',.12,.7,.3) for i,n in enumerate(phrase)]
hero += [(0,38,'drum',.5,.35,0),(.34,38,'drum',.35,.3,0),(.68,38,'drum',.6,.5,0),(.69,50,'horn',.3,.55,-.1),(.69,57,'horn',.16,.55,.1),(.69,62,'pluck',.35,1.3,-.2)]
clips=[make('hero',hero,2.15),make('short',[(0,74,'pluck',.3,.55,-.2),(.08,77,'dulcimer',.2,.5,.2),(.16,74,'horn',.2,.35,0),(.16,38,'drum',.35,.3,0)],.85)]
clips += [make('victory',[(i*.16,n,'dulcimer',.3,1,.1) for i,n in enumerate([62,66,69,74])]+[(.48,50,'horn',.32,.8,0),(.48,38,'drum',.4,.4,0)],1.8)]
clips += [make('defeat',[(i*.2,n,'horn',.25,.55,0) for i,n in enumerate([62,60,57,50])],1.5)]
clips += [make('checkpoint',[(0,74,'pluck',.25,.5,-.2),(.12,81,'dulcimer',.2,.65,.2)],.85)]
clips += [make('evac',[(i*.13,n,'horn',.18,.22,0) for i,n in enumerate([62,69,74,69])]+[(0,38,'drum',.3,.3,0)],.9)]
(ROOT/'docs/MUSIC_CUES.json').write_text(json.dumps({'origin':'Original score composed for UaForce; physical/additive synthesis with folk-inspired timbres, not sampled live bandura/tsymbaly/trembita. Draft synthesis; production may use separately generated music.','sampleRate':SR,'clips':clips},indent=2)+'\n')
print('Composed',len(clips),'cues')
