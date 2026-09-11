"""Resumable, sequential, silent announcer generation. Stages assets; never installs them."""
import argparse, base64, hashlib, json, shutil, subprocess, time, urllib.error, urllib.request, wave
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/audio-source/fenrir-2026-09-12'
MODEL = 'gemini-3.1-flash-tts-preview'
LINES = {
 'shevchenko': ('Тарас Шевченко!', 'hero'),
 'lesya': ('Леся Українка!', 'hero'),
 'franko': ('Іван Франко!', 'hero'),
 'bandera': ('Степан Бандера!', 'hero'),
 'bandera-bro': ('Бандер-Бро!', 'hero'),
 'mamai': ('Козак Мамай!', 'hero'),
 'bayraktar': ('Байрактарчик!', 'hero'),
 'ghost': ('Привид Києва!', 'hero'),
 'zelensky': ('Володимир Зеленський!', 'hero'),
 'bilozerska': ('Олена Білозерська!', 'hero'),
 'it-army': ('Айті-армія!', 'hero'),
 'skovoroda': ('Григорій Сковорода!', 'hero'),
 'new-hero': ('Новий боєць!', 'hero'),
 'mission-start': ('До бою!', 'routine'),
 'checkpoint': ('Тримаємо рубіж!', 'routine'),
 'evac-called': ('Евакуація! Гелікоптер у дорозі!', 'routine'),
 'boarded': ('На борт!', 'routine'),
 'victory': ('Перемога!', 'victory'),
 'defeat': ('Бій ще не закінчено!', 'resolve'),
 'respawn': ('Повертаємось у бій!', 'routine'),
 'tank-alert': ('Увага! Ворожий танк!', 'warning'),
 'plane-alert': ('Ракетний авіаналіт! В укриття!', 'warning'),
 'drone-alert': ('Увага! Ударний дрон!', 'warning'),
 'iron-warden': ('Валерій Герасімов! Російський генерал! До бою!', 'boss'),
 'swarm-master': ('Сергій Суровікін! Російський генерал! Повітряна загроза!', 'boss'),
 'putin': ('Хуйло! Головний ворог! Здолайте агресора!', 'boss'),
 'putin-defeated': ('Хуйло переможено! Командний бункер знищено!', 'victory'),
 'zelensky-shout': ('Слава Україні!', 'hero'),
}
MOODS = {
 'hero': 'Announce a heroic entrance with proud muscular arena projection and charismatic swagger. Punchy, exciting, concise.',
 'routine': 'A standard professional battlefield callout. Restrained, clear and matter-of-fact, still with firm deep chest authority. No theatrical crescendo.',
 'warning': 'An urgent tactical warning: focused, commanding, alert and clear, with controlled intensity.',
 'resolve': 'Steadfast reassuring determination after a setback. Rally the player with firm confidence.',
 'boss': 'Introduce a dangerous ENEMY with a sinister, ominous, darkly menacing dramatic tone. Cold heavy chest resonance and intimidating accents. No admiration, no comedy, no whispering or monstrous distortion.',
 'victory': 'Congratulate the player on victory. Triumphant, warm, proud and jubilant, with an audible confident smile and powerful chest projection.',
}
BASE = ('Synthesize speech. A charismatic male action-game announcer with a natural low chest register, muscular dramatic arena projection and a dangerous playful grin. '
 'Use a distinctly LOWER vocal pitch and darker richer timbre than your usual bright speaking voice. Full chest resonance, powerful bass presence, dense warm harmonics. '
 'Keep NORMAL energetic game-announcer speaking speed, crisp short words and decisive accents. Do not slow the delivery or stretch syllables. '
 'Project strongly with clear consonants, no yelling, rasp, growling or whispering. Keep a natural human voice. '
 'Native standard Ukrainian. Crisp Ukrainian consonants, especially the voiced Ukrainian г in перемога; stress перемОга. '
 'Do not swallow consonants or change words. Dry clean studio voice, no music, no effects, no pitch processing. ')

def request(key, prompt, model=MODEL):
 payload = {'contents':[{'parts':[{'text':prompt}]}], 'generationConfig':{'responseModalities':['AUDIO'], 'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Fenrir'}}}}}
 for attempt in range(4):
  req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(payload).encode(), headers={'x-goog-api-key':key,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req, timeout=180) as response: return json.load(response)
  except urllib.error.HTTPError as error:
   message = error.read().decode(errors='replace').replace(key, '[redacted]')
   details = json.loads(message).get('error',{}).get('details',[])
   daily = any('PerDay' in violation.get('quotaId','') for detail in details for violation in detail.get('violations',[]))
   if daily:
    (OUT/'quota-status.json').write_text(json.dumps({'status':'daily_quota_exhausted','model':model,'message':message,'completed':[name for name in LINES if (OUT/f'{name}.json').exists()]},ensure_ascii=False,indent=2)+'\n')
    raise RuntimeError('Daily free generation quota exhausted; staged recordings preserved. Resume after provider reset.') from None
   if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
    raise RuntimeError(f'Google HTTP {error.code}: {message[:1500]}') from None
   delay = 30 * (attempt + 1)
   print(f'Transient HTTP {error.code}; waiting {delay}s before retry', flush=True)
   time.sleep(delay)

def main():
 global OUT, MODEL
 p = argparse.ArgumentParser(); p.add_argument('--env-file', required=True); p.add_argument('--only');p.add_argument('--model',default=MODEL,choices=[MODEL,'gemini-2.5-flash-preview-tts']);p.add_argument('--out'); args = p.parse_args()
 MODEL=args.model
 if args.out:OUT=Path(args.out)
 key = dotenv_values(args.env_file).get('GOOGLE_API_KEY'); assert key, 'Missing configured Google key'
 OUT.mkdir(parents=True, exist_ok=True)
 backup = OUT / 'previous'; backup.mkdir(exist_ok=True)
 for index, (name, (text, mood)) in enumerate(LINES.items(), 1):
  if args.only and name != args.only: continue
  meta_path = OUT / f'{name}.json'; final = OUT / f'{name}.wav'
  if meta_path.exists() and final.exists():
   assert hashlib.sha256(final.read_bytes()).hexdigest() == json.loads(meta_path.read_text())['sha256']
   print(f'{index}/{len(LINES)} {name}: already staged', flush=True); continue
  old = ROOT / f'public/assets/audio/announcer/{name}.wav'
  if not (backup / old.name).exists(): shutil.copy2(old, backup / old.name)
  prompt = BASE + MOODS[mood] + ' A short single game callout. No leading or trailing pause. Speak ONLY the following transcript once.\nTRANSCRIPT:\n' + text
  if MODEL=='gemini-2.5-flash-preview-tts':
   prompt='Read the Ukrainian text below exactly once. A charismatic male game announcer, Fenrir, in a LOW powerful resonant bass-baritone chest voice, at normal energetic speaking speed. Clear native Ukrainian articulation. Dry studio voice only. '+MOODS[mood]+'\n\n'+text
  print(f'{index}/{len(LINES)} Generating {name} ({mood})', flush=True)
  data = request(key, prompt, MODEL)
  parts = data.get('candidates',[{}])[0].get('content',{}).get('parts',[])
  pcm = b''.join(base64.b64decode(v['inlineData']['data']) for v in parts if 'inlineData' in v)
  if not pcm:
   (OUT/f'{name}-failed-response.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  assert pcm, f'No audio returned for {name}'
  raw = OUT / f'{name}-raw.wav'
  with wave.open(str(raw), 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(24000); f.writeframes(pcm)
  # Trim edge silence only (reverse/start trim/reverse preserves pauses within speech).
  trim = 'silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB:start_silence=0.06'
  filters = f'{trim},areverse,{trim},areverse,highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=9,apad=pad_dur=0.1'
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',filters,'-ar','24000','-ac','1',str(final)],check=True)
  with wave.open(str(final)) as f: seconds = f.getnframes()/f.getframerate()
  assert .3 < seconds < 10, f'Unexpected duration {name}: {seconds}'
  meta = {'id':name,'file':str(old.relative_to(ROOT)), 'text':text,'mood':mood,'voice':'Fenrir','model':MODEL,'prompt':prompt,'processing':filters,'seconds':seconds,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'previousSha256':hashlib.sha256((backup/old.name).read_bytes()).hexdigest(),'rawSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'playbackDuringGeneration':False}
  meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
  print(f'{index}/{len(LINES)} STAGED {name}: {seconds:.3f}s',flush=True)
  time.sleep(2)

if __name__ == '__main__': main()
