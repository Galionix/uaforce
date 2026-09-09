"""Generate Ukrainian female commentary as files only. Never plays audio."""
import argparse,base64,json,os,urllib.request,urllib.error,wave,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--env-file',type=Path);args=p.parse_args()
key=os.environ.get('GOOGLE_API_KEY')
if args.env_file:
 for line in args.env_file.read_text().splitlines():
  if line.startswith('GOOGLE_API_KEY='):key=line.split('=',1)[1].strip().strip('"\'')
if not key:raise SystemExit('GOOGLE_API_KEY required')
root=Path(__file__).resolve().parents[1];out=root/'docs/marketing/captures/narrated';out.mkdir(parents=True,exist_ok=True)
lines=[
 {'start':.3,'text':'Це Ю Ей Форс. Шевченко б’є булавою, а його ульта викликає блискавки.'},
 {'start':8.3,'text':'Леся Українка стріляє з арбалета, викликає ворон і перетворюється на бойову Мавку.'},
 {'start':16.3,'text':'У Бандери — автомат, вогняний коктейль і бандермобіль. Укриття тут довго не живуть.'},
 {'start':24.3,'text':'Привид Києва викликає авіаналіт. У кожного бійця — своя зброя, спецприйом та ульта.'},
 {'start':32.2,'text':'Грай безкоштовно. З клавіатурою або геймпадом.'}]
style='One female Ukrainian gameplay presenter, confident, lively, warm and clear. Natural native Ukrainian pronunciation. Conversational fairly brisk pace, about 170 words per minute. No theatrical shouting. Speak ONLY the exact transcript once. No music, sound effects, commentary, introductions or extra words. Dry studio voice. Keep the voice stable across clips. Transcript: '
for i,line in enumerate(lines):
 dest=out/f'voice-{i}.wav'
 if not dest.exists():
  body={'contents':[{'parts':[{'text':style+line['text']}]}],'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Kore'}}}}}
  req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent',data=json.dumps(body).encode(),headers={'x-goog-api-key':key,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req,timeout=120) as r:data=json.load(r)
  except urllib.error.HTTPError as e:raise SystemExit('TTS request failed: HTTP '+str(e.code))
  chunks=[base64.b64decode(part['inlineData']['data']) for c in data.get('candidates',[]) for part in c.get('content',{}).get('parts',[]) if 'inlineData' in part]
  if not chunks:raise SystemExit('No TTS audio returned')
  with wave.open(str(dest),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(b''.join(chunks))
 with wave.open(str(dest)) as f:line['seconds']=round(f.getnframes()/f.getframerate(),3)
 line['file']=dest.name;print('clip',i,'seconds',line['seconds'],flush=True)
(out/'narration.json').write_text(json.dumps({'model':'gemini-3.1-flash-tts-preview','voice':'Kore','language':'uk','playbackDuringGeneration':False,'clips':lines},ensure_ascii=False,indent=2)+'\n')
