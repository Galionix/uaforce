"""Generate same-mood callout batches, preserving full raw takes and split provenance."""
import argparse, base64, hashlib, importlib.util, json, re, shutil, subprocess, wave
from pathlib import Path
from dotenv import dotenv_values
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('single',ROOT/'tools/generate-fenrir-pack.py')
single=importlib.util.module_from_spec(spec);spec.loader.exec_module(single)
MODEL='gemini-2.5-flash-preview-tts'
OUT=ROOT/'tools/audio-source/fenrir25-2026-09-12'
GROUPS={
 'heroes':[name for name,(_,mood) in single.LINES.items() if mood=='hero' and name!='zelensky-shout'],
 'routine':[name for name,(_,mood) in single.LINES.items() if mood in ('routine','resolve')],
 'victory':['victory','putin-defeated'],
 'warnings':[name for name,(_,mood) in single.LINES.items() if mood=='warning'],
 'bosses':[name for name,(_,mood) in single.LINES.items() if mood=='boss'],
 'shout':['zelensky-shout'],
 'retakes':['bayraktar','ghost','new-hero','bandera-bro'],
 'retakes-routine':['checkpoint','respawn','plane-alert'],
 'retakes-victory':['putin-defeated'],
}
PERFORMANCES={
 'hero':'ACTING DIRECTION: a bombastic heroic arena entrance. Proud chest projection, broad confident grin, bold punch on the name and an exciting decisive finish. Swagger and larger-than-life enthusiasm.',
 'routine':'ACTING DIRECTION: a composed professional field commander reporting ordinary information. Neutral face, calm firm authority, narrow pitch movement, conversational volume, short clean falling endings. Understated and matter-of-fact. Absolutely no arena showmanship, excitement, grin or victory celebration.',
 'victory':'ACTING DIRECTION: genuine JOY and RELIEF after a hard-won victory. A broad audible delighted smile, proud congratulation to the player, open warm vowels and buoyant expressive inflection. Lift the emotional energy, then land the last word with satisfied triumph. Celebrate! Keep the underlying low resonant voice; this is not a neutral military report.',
 'warning':'ACTING DIRECTION: an urgent controlled tactical warning from a field commander. Sharply attentive and serious; stress the specific incoming danger. Clipped decisive urgency without panicked screaming or celebratory showmanship.',
 'boss':'ACTING DIRECTION: cold, sinister, threatening dread. Present a dangerous enemy in a dark dramatic thriller. Completely serious, hostile, unsmiling, intimidating, heavy ominous resonance, restrained intensity and final downward accents. Let the listener feel danger. Absolutely no cheerful grin, heroic praise, excitement, warmth or congratulation. Stay voiced and human, no whisper or distortion.',
}

def main():
 p=argparse.ArgumentParser();p.add_argument('--env-file',required=True);p.add_argument('--group',choices=GROUPS);args=p.parse_args()
 key=dotenv_values(args.env_file)['GOOGLE_API_KEY'];OUT.mkdir(parents=True,exist_ok=True);single.OUT=OUT
 for group,ids in GROUPS.items():
  if group.startswith('retakes') and args.group!=group:continue
  if args.group and args.group!=group:continue
  raw=OUT/f'batch-{group}-raw.wav';batch_meta=raw.with_suffix('.json')
  mood=single.LINES[ids[0]][1]
  transcript='\n'.join(single.LINES[name][0] for name in ids)
  if group=='retakes':transcript='Байракта́рчик!\nПри́вид Ки́єва!\nНовий боє́ць!\nБа́ндер-Бро!'
  if group=='retakes-routine':transcript='Трима́ємо рубі́ж!\nПоверта́ємось у бій!\nРаке́тний авіаналі́т! В укриття́!'
  # A batch has one acting task; never ask the model to switch emotions mid-take.
  identity=single.BASE.replace('muscular dramatic arena projection and a dangerous playful grin','full resonant chest projection')
  performance=PERFORMANCES.get(mood,PERFORMANCES['routine'])
  prompt=identity+performance+f' Record exactly {len(ids)} separate short callouts, ALL in this single emotional delivery. Between EACH line leave 1.2 seconds of complete silence to allow editing. Within a line keep a compact fluent delivery and do not pause more than 0.3 seconds. Maintain the SAME vocal identity, register and timbre throughout. Read each line once, no numbers or labels.\nTRANSCRIPT:\n'+transcript
  if group=='retakes':
   prompt=prompt.replace('TRANSCRIPT:', 'Pronunciation is critical: Байрактарчик includes the complete diminutive suffix ЧИК, never omit it. Привид means GHOST, not the greeting Привіт; articulate the final voiced Д and both syllables of Києва. Боєць begins with a clear rounded O vowel, never баєць. Бро uses Ukrainian pronunciation, not an English accent.\nTRANSCRIPT:')
  if group=='retakes-routine':
   prompt=prompt.replace('TRANSCRIPT:', 'Pronunciation is critical: рубіж is pronounced ru-BIZH, with a clear initial РУ syllable and final Ж. Do not replace it with бій. In the second line pronounce every word, including the standalone vowel word У before бій. The third line must include its final command В укриття! No omissions or contractions.\nTRANSCRIPT:')
  if group=='retakes-victory':
   prompt=prompt.replace('TRANSCRIPT:', 'The game is WON! You are extremely happy and congratulating the heroes, smiling broadly. The enemy is defeated and the command bunker destroyed: this is glorious GOOD NEWS, a joyful celebration, absolutely not a grim or somber report. Make the delight clearly audible.\nTRANSCRIPT:')
  if not raw.exists():
   print(f'Generating batch {group}: {len(ids)} lines',flush=True)
   data=single.request(key,prompt,MODEL)
   pcm=b''.join(base64.b64decode(part['inlineData']['data']) for c in data.get('candidates',[]) for part in c.get('content',{}).get('parts',[]) if 'inlineData' in part)
   assert pcm,'No audio returned'
   with wave.open(str(raw),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(24000);f.writeframes(pcm)
   batch_meta.write_text(json.dumps({'ids':ids,'model':MODEL,'voice':'Fenrir','prompt':prompt,'sha256':hashlib.sha256(raw.read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n')
  with wave.open(str(raw)) as f:duration=f.getnframes()/f.getframerate()
  detect=subprocess.run(['ffmpeg','-hide_banner','-i',str(raw),'-af','silencedetect=noise=-42dB:d=0.15','-f','null','-'],capture_output=True,text=True,check=True).stderr
  pauses=[(float(end)-float(length),float(end),float(length)) for end,length in re.findall(r'silence_end: ([\d.]+) \| silence_duration: ([\d.]+)',detect)]
  merged=[]
  for a,b,length in pauses:
   if merged and a-merged[-1][1]<.02:
    start=merged.pop()[0];merged.append((start,b,b-start))
   else:merged.append((a,b,length))
  pauses=merged
  interior=[pause for pause in pauses if pause[0]>.15 and pause[1]<duration-.15]
  boundaries=sorted(interior,key=lambda p:p[2],reverse=True)[:len(ids)-1]
  assert len(boundaries)==len(ids)-1,f'{group}: missing line pauses; manual split review needed'
  cuts=[0]+sorted((a+b)/2 for a,b,_ in boundaries)+[duration]
  print(f'{group}: {duration:.2f}s, {len(interior)} pauses; splitting {len(ids)} lines',flush=True)
  for i,name in enumerate(ids):
   final=OUT/f'{name}.wav';meta=OUT/f'{name}.json'
   if group.startswith('retakes') and meta.exists() and json.loads(meta.read_text()).get('batchSource')!=str(raw.relative_to(ROOT)):
    rejected=OUT/'rejected';rejected.mkdir(exist_ok=True)
    shutil.move(str(final),str(rejected/final.name));shutil.move(str(meta),str(rejected/meta.name))
   if meta.exists() and final.exists():continue
   old=ROOT/f'public/assets/audio/announcer/{name}.wav';backup=OUT/'previous';backup.mkdir(exist_ok=True)
   if not (backup/old.name).exists():shutil.copy2(old,backup/old.name)
   trim='silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB:start_silence=0.06'
   filters=f'{trim},areverse,{trim},areverse,highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=9,apad=pad_dur=0.1'
   subprocess.run(['ffmpeg','-v','error','-y','-ss',str(cuts[i]),'-t',str(cuts[i+1]-cuts[i]),'-i',str(raw),'-af',filters,'-ar','24000','-ac','1',str(final)],check=True)
   with wave.open(str(final)) as f:seconds=f.getnframes()/f.getframerate()
   assert .3<seconds<10,f'{name}: suspicious duration {seconds}'
   text,mood=single.LINES[name]
   item={'id':name,'file':str(old.relative_to(ROOT)),'text':text,'mood':mood,'voice':'Fenrir','model':MODEL,'prompt':prompt,'processing':filters,'seconds':seconds,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'previousSha256':hashlib.sha256((backup/old.name).read_bytes()).hexdigest(),'batchSource':str(raw.relative_to(ROOT)),'batchSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'sourceStart':cuts[i],'sourceEnd':cuts[i+1],'playbackDuringGeneration':False}
   meta.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');print(f'STAGED {name}: {seconds:.3f}s',flush=True)

if __name__=='__main__':main()
