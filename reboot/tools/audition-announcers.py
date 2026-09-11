"""Offline Google voice auditions. Never plays audio or modifies shipped clips."""
import argparse,base64,json,os,urllib.request,urllib.error,wave,subprocess,time,hashlib
from pathlib import Path
from dotenv import dotenv_values
p=argparse.ArgumentParser();p.add_argument('--env-file',required=True);p.add_argument('--voice',required=True,choices=['Kore','Orus','Fenrir']);p.add_argument('--take',choices=['original','deep'],default='original');p.add_argument('--model',choices=['gemini-3.1-flash-tts-preview','gemini-2.5-flash-preview-tts'],default='gemini-3.1-flash-tts-preview');a=p.parse_args()
key=dotenv_values(a.env_file).get('GOOGLE_API_KEY');assert key,'Missing configured Google key'
root=Path(__file__).resolve().parents[1];out=root/'docs/voice-auditions-2026-09-12';out=out if a.take=='original' else out/a.take;out=out if a.model=='gemini-3.1-flash-tts-preview' else out/'gemini-2.5';out.mkdir(parents=True,exist_ok=True)
styles={'Kore':'A confident, charismatic female arena announcer. Brilliant projection, a triumphant smile, firm articulate attack and lively theatrical energy.', 'Orus':'A charismatic male commander and arena announcer. Resonant chest voice, authoritative and victorious, clear powerful delivery, a confident smile.', 'Fenrir':'An exuberant charismatic male action-game announcer. Athletic arena energy, playful heroic swagger, a punchy rising crescendo, clearly spoken rather than screamed.'}
transcript='Перемо́га!\nНовий боєць! Тарас Шевче́нко!\nЛе́ся Украї́нка!\nДо бо́ю!'
delivery=styles[a.voice]
pauses='Brief 0.45 second pauses between the four lines.'
if a.take=='deep':
 delivery={'Kore':'A commanding charismatic female arena announcer in her natural lower chest register, warm dark resonance, powerful confident projection.', 'Orus':'A commanding charismatic male arena announcer with a natural deep resonant baritone, broad chest resonance and immense calm authority.', 'Fenrir':'A charismatic male action-game announcer with a natural low chest register, muscular dramatic arena projection and a dangerous playful grin.'}[a.voice]
 delivery+=' Use a distinctly LOWER vocal pitch and darker richer timbre than your usual bright speaking voice. Full chest resonance, powerful bass presence, dense warm harmonics. Keep NORMAL energetic game-announcer speaking speed, crisp short words and decisive accents. Do not slow the delivery or stretch syllables. Project strongly with clear consonants, no yelling, rasp, growling or whispering. Keep a natural human voice.'
 pauses='Brief 0.45 second pauses between the four lines. Keep the full take around 10 to 12 seconds.'
prompt='Synthesize speech. '+delivery+' Native standard Ukrainian. Crisp Ukrainian consonants, especially the voiced Ukrainian г in перемога; stress перемОга. Do not swallow consonants or change words. Dry clean studio voice, no music, no effects, no pitch processing. '+pauses+' Speak ONLY the transcript once.\nTRANSCRIPT:\n'+transcript

if a.model=='gemini-2.5-flash-preview-tts':
 transcript='Перемо́га!\nНовий боєць! Тарас Шевче́нко!\nУвага! Ворожий танк!\nВалерій Герасімов! Російський генерал! До бою!'
 prompt='Synthesize speech. '+delivery+' Native standard Ukrainian. Dry studio voice, no music or effects. Keep the same deep chest timbre throughout. First line triumphant and congratulatory, second line proud heroic entrance, third line restrained tactical warning, fourth line sinister and ominous announcing a dangerous ENEMY. Normal energetic speaking speed, no stretching. Clearly articulate the voiced Ukrainian г in перемога; stress перемОга. Brief pauses between lines. Speak ONLY the transcript once.\nTRANSCRIPT:\n'+transcript
model=a.model;payload={'contents':[{'parts':[{'text':prompt}]}],'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':a.voice}}}}}
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
meta={'voice':a.voice,'take':a.take,'model':model,'text':transcript,'prompt':prompt,'seconds':seconds,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'playbackDuringGeneration':False}
final.with_suffix('.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'voice':a.voice,'file':str(final),'seconds':seconds},ensure_ascii=False),flush=True)
