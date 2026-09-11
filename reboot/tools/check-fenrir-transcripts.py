"""Blind audio transcription, without the intended text. Never plays audio."""
import argparse, base64, hashlib, json, urllib.request
from pathlib import Path
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
folder = root / 'tools/audio-source/fenrir-2026-09-12'
p = argparse.ArgumentParser(); p.add_argument('--env-file', required=True); p.add_argument('--folder'); p.add_argument('ids', nargs='+'); args = p.parse_args()
if args.folder: folder=Path(args.folder)
key = dotenv_values(args.env_file)['GOOGLE_API_KEY']
parts = [{'text':'Transcribe these short Ukrainian game-announcer recordings exactly as heard. Do not infer intended words or correct apparent pronunciation errors. For each numbered recording give the verbatim Ukrainian transcript and note any unclear or incorrect consonants. Also independently describe the audible emotion/delivery in each recording, without assuming intent. Return plain text. Do not generate audio.'}]
for i, name in enumerate(args.ids):
 parts.extend([{'text':f'Recording {i+1}'}, {'inlineData':{'mimeType':'audio/wav','data':base64.b64encode((folder/f'{name}.wav').read_bytes()).decode()}}])
req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', data=json.dumps({'contents':[{'parts':parts}]}).encode(), headers={'x-goog-api-key':key,'Content-Type':'application/json'})
with urllib.request.urlopen(req, timeout=180) as response: data = json.load(response)
text = '\n'.join(part.get('text','') for candidate in data.get('candidates',[]) for part in candidate.get('content',{}).get('parts',[]))
assert text, 'No transcription returned'
out = folder / ('check-'+'-'.join(args.ids)+'.json')
out.write_text(json.dumps({'ids':args.ids,'clipHashes':{name:hashlib.sha256((folder/f'{name}.wav').read_bytes()).hexdigest() for name in args.ids},'model':'gemini-2.5-flash','method':'Blind automatic transcription, not human listening approval','result':text},ensure_ascii=False,indent=2)+'\n')
print(text)
