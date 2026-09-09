"""Generate offline game assets; API credentials never enter the browser bundle.
Run with GOOGLE_API_KEY in environment; optional --env-file for existing local setup.
"""
import argparse,base64,json,os,urllib.request,urllib.error,wave,subprocess,hashlib,time,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LINES={
'shevchenko':'Тарас Шевченко!', 'lesya':'Леся Українка!', 'franko':'Іван Франко!',
'bandera':'Степан Бандера!', 'bandera-bro':'Бандер-Бро!',
'mamai':'Козак Мамай!', 'sirko':'Сірко!', 'bayraktar':'Байрактарчик!',
'ghost':'Привид Києва!', 'zelensky':'Володимир Зеленський!', 'bilozerska':'Олена Білозерська!', 'it-army':'Айті-армія!',
'zelensky-shout':'Слава Україні!', 'skovoroda':'Григорій Сковорода!', 'new-hero':'Новий боєць!', 'mission-start':'До бою!', 'checkpoint':'Тримаємо рубіж!',
'evac-called':'Евакуація! Гелікоптер у дорозі!', 'boarded':'На борт!', 'victory':'Перемога!',
'defeat':'Бій ще не закінчено!', 'respawn':'Повертаємось у бій!'}
STYLE='''Audio profile: One original male Ukrainian action-game ring announcer. Deep chesty baritone, gritty resonant bass, powerful theatrical arena projection and a confident smile. Native Ukrainian pronunciation, clear vowels and consonants. Strong rising punch on the name and decisive final syllable. Energetic, not slow narration. Speak exactly the transcript ONCE, no introductions, no added words, no music, no sound effects, no long silence, dry studio recording. Aim for 1 to 2 seconds for a name. Keep the same voice and timbre across this game pack.\nTranscript: '''
MUSIC='''Instrumental-only Ukrainian folk-action arcade hero entrance stinger pack, 30 seconds. Repeated very short triumphant 2.5-second motifs separated by 1.5 seconds of silence. The VERY FIRST sound at time zero is a punchy fast virtuosic bandura plucked-string run doubled by sparkling Ukrainian tsymbaly hammered dulcimer, deep bubon frame-drum accents, short heroic trembita wooden-horn answer. At 2.3 seconds a strong final tonic hit, natural short decay then silence. Repeat this compact motif at 4, 8, 12, 16, 20, 24 seconds. 150 BPM, D minor with heroic raised sixth folk flavor. Over-the-top heroic entrance, tight and muscular, crunchy acoustic attack, no electric guitar, no modern drum kit, no synth pads, NO vocals, no singing, no words, no background crowd. Dry close instruments, a tiny room tail. Original composition, not a traditional song quotation. Suitable for a short fighting-game announcer intro.'''
parser=argparse.ArgumentParser();parser.add_argument('--env-file');parser.add_argument('--only',nargs='*');parser.add_argument('--music',action='store_true');parser.add_argument('--model',default='gemini-3.1-flash-tts-preview');args=parser.parse_args()
if args.env_file:
 from dotenv import dotenv_values
 key=dotenv_values(args.env_file).get('GOOGLE_API_KEY')
else:key=os.environ.get('GOOGLE_API_KEY')
if not key:raise SystemExit('GOOGLE_API_KEY missing')
def request(path,payload):
 req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/'+path,data=json.dumps(payload).encode(),headers={'x-goog-api-key':key,'Content-Type':'application/json'})
 for attempt in range(5):
  try:return json.load(urllib.request.urlopen(req,timeout=180))
  except urllib.error.HTTPError as e:
   body=json.loads(e.read());message=body.get('error',{}).get('message','API error')
   quota_ids=[v.get('quotaId','') for d in body.get('error',{}).get('details',[]) for v in d.get('violations',[])]
   if any('PerDay' in q for q in quota_ids):raise RuntimeError('Daily generation limit reached: '+', '.join(quota_ids)) from None
   if e.code==429 and 'limit: 0' not in message and attempt<4:
    match=re.search(r'retry in ([0-9.]+)s',message);delay=min(65,float(match.group(1))+2 if match else 25)
    print('Rate limit: retry in',round(delay),'seconds',flush=True);time.sleep(delay);continue
   raise RuntimeError(str(e.code)+' '+message) from None

def generate(item):
 slug,line=item;raw=ROOT/'tools/audio-source'/f'{slug}.wav';out=ROOT/'public/assets/audio/announcer'/f'{slug}.wav'
 if not raw.exists():
  r=request('models/'+args.model+':generateContent',{'contents':[{'parts':[{'text':STYLE+line}]}],'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Algenib'}}}}})
  parts=r.get('candidates',[{}])[0].get('content',{}).get('parts',[]);chunks=[base64.b64decode(p['inlineData']['data']) for p in parts if 'inlineData' in p]
  if not chunks:raise RuntimeError('No audio for '+slug)
  with wave.open(str(raw),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(b''.join(chunks))
  raw.with_suffix('.json').write_text(json.dumps({'model':args.model,'voice':'Algenib','text':line},ensure_ascii=False,indent=2))
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB,areverse,highpass=f=70,equalizer=f=160:t=q:w=1:g=2,acompressor=threshold=0.12:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=7','-ar','24000','-ac','1',str(out)],check=True)
 with wave.open(str(out)) as f:duration=f.getnframes()/f.getframerate()
 print(json.dumps({'file':out.name,'duration':round(duration,2)},ensure_ascii=False),flush=True)
 return {'id':slug,'text':line,'file':str(out.relative_to(ROOT)),'raw':str(raw.relative_to(ROOT)),'seconds':duration,'model':json.loads(raw.with_suffix('.json').read_text())['model'] if raw.with_suffix('.json').exists() else 'gemini-3.1-flash-tts-preview','voice':'Algenib','sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
if args.music:
 r=request('interactions',{'model':'lyria-3-clip-preview','input':MUSIC})
 def find_audio(v):
  if isinstance(v,dict):
   if v.get('type')=='audio' and v.get('data'):return v
   for x in v.values():
    a=find_audio(x)
    if a:return a
  elif isinstance(v,list):
   for x in v:
    a=find_audio(x)
    if a:return a
 a=find_audio(r)
 if not a:
  print('Music response shape:',list(r));raise SystemExit('No music audio')
 out=ROOT/'tools/audio-source/hero-riff-full.mp3';out.write_bytes(base64.b64decode(a['data']));print('Music saved:',out,flush=True)
 (ROOT/'tools/audio-source/music-prompt.json').write_text(json.dumps({'model':'lyria-3-clip-preview','prompt':MUSIC,'mime':a.get('mime_type',a.get('mimeType'))},indent=2))
else:
 selected=[(k,v) for k,v in LINES.items() if not args.only or k in args.only]
 path=ROOT/'docs/ANNOUNCER_ASSETS.json';old=json.loads(path.read_text()) if path.exists() else {'style':STYLE,'clips':[]}
 for item in selected:
  result=generate(item)
  old['clips']=[c for c in old['clips'] if c['id']!=result['id']]+[result]
  path.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
