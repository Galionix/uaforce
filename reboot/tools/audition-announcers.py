"""Offline Google voice auditions. Never plays audio or modifies shipped clips."""
import argparse,base64,json,os,urllib.request,urllib.error,wave,subprocess,time,hashlib
from pathlib import Path
from dotenv import dotenv_values
p=argparse.ArgumentParser();p.add_argument('--env-file',required=True);p.add_argument('--voice',required=True,choices=['Kore','Orus','Fenrir']);a=p.parse_args()
key=dotenv_values(a.env_file).get('GOOGLE_API_KEY');assert key,'Missing configured Google key'
root=Path(__file__).resolve().parents[1];out=root/'docs/voice-auditions-2026-09-12';out.mkdir(exist_ok=True)
styles={'Kore':'A confident, charismatic female arena announcer. Brilliant projection, a triumphant smile, firm articulate attack and lively theatrical energy.', 'Orus':'A charismatic male commander and arena announcer. Resonant chest voice, authoritative and victorious, clear powerful delivery, a confident smile.', 'Fenrir':'An exuberant charismatic male action-game announcer. Athletic arena energy, playful heroic swagger, a punchy rising crescendo, clearly spoken rather than screamed.'}
transcript='Перемо́га!\nНовий боєць! Тарас Шевче́нко!\nЛе́ся Украї́нка!\nДо бо́ю!'
prompt='Synthesize speech. '+styles[a.voice]+' Native standard Ukrainian. Crisp Ukrainian consonants, especially the voiced Ukrainian г in перемога; stress перемОга. Do not swallow consonants or change words. Dry clean studio voice, no music, no effects, no pitch processing. Brief 0.45 second pauses between the four lines. Speak ONLY the transcript once.\nTRANSCRIPT:\n'+transcript
model='gemini-3.1-flash-tts-preview';payload={'contents':[{'parts':[{'text':prompt}]}],'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':a.voice}}}}}
req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',data=json.dumps(payload).encode(),headers={'x-goog-api-key':key,'Content-Type':'application/json'})
try:
 with urllib.request.urlopen(req,timeout=180) as r:data=json.load(r)
except urllib.error.HTTPError as e:
 data=json.loads(e.read());err=data.get('error',{});print(json.dumps({'http':e.code,'status':err.get('status'),'message':err.get('message','').replace(key,'[redacted]')},ensure_ascii=False));raise SystemExit(1)
parts=data.get('candidates',[{}])[0].get('content',{}).get('parts',[]);audio=b''.join(base64.b64decode(v['inlineData']['data']) for v in parts if 'inlineData' in v);assert audio,'No audio returned'
raw=out/(a.voice.lower()+'-raw.wav')
with wave.open(str(raw),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(audio)
final=out/(a.voice.lower()+'.wav')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af','highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=9','-ar','24000','-ac','1',str(final)],check=True)
with wave.open(str(final)) as f:seconds=f.getnframes()/f.getframerate()
meta={'voice':a.voice,'model':model,'text':transcript,'prompt':prompt,'seconds':seconds,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'playbackDuringGeneration':False}
final.with_suffix('.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'voice':a.voice,'file':str(final),'seconds':seconds},ensure_ascii=False),flush=True)
