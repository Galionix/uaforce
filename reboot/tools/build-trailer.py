"""Reproducible trailer voice and offline mix. Never connects audio to speakers."""
import argparse, base64, hashlib, json, os, subprocess, urllib.request, urllib.error, wave
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('stage', choices=['voice', 'mix'])
p.add_argument('--env-file', type=Path)
p.add_argument('--reuse-video', action='store_true', help='Remix audio without re-encoding an existing video')
args = p.parse_args()
out = Path(__file__).resolve().parents[1] / 'docs/marketing/captures/trailer-v2'
meta = json.loads((out / 'script.json').read_text())

if args.stage == 'voice':
    key = os.environ.get('GOOGLE_API_KEY')
    if args.env_file:
        for line in args.env_file.read_text().splitlines():
            if line.startswith('GOOGLE_API_KEY='):
                key = line.split('=', 1)[1].strip().strip('\"\'')
    if not key:
        raise SystemExit('GOOGLE_API_KEY required')
    for i, clip in enumerate(meta['clips']):
        model = clip.get('model', meta['model'])
        signature = hashlib.sha256((model + meta['voice'] + meta['style'] + clip['text']).encode()).hexdigest()
        dest = out / f'voice-{i}.wav'
        stamp = out / f'voice-{i}.sha256'
        if not (dest.exists() and stamp.exists() and stamp.read_text() == signature):
            body = {'contents': [{'parts': [{'text': meta['style'] + clip['text']}]}], 'generationConfig': {
                'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': meta['voice']}}}}}
            request = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                data=json.dumps(body).encode(), headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    data = json.load(response)
            except urllib.error.HTTPError as error:
                try:
                    detail = json.loads(error.read()).get('error', {})
                    for item in detail.get('details', []):
                        if item.get('retryDelay'):
                            print('Provider retry delay:', item['retryDelay'])
                        for violation in item.get('violations', []):
                            print('Provider limit:', violation.get('quotaMetric'), violation.get('quotaId'), violation.get('quotaValue'))
                except (ValueError, TypeError):
                    pass
                raise SystemExit(f'TTS failed: HTTP {error.code}')
            chunks = [base64.b64decode(part['inlineData']['data']) for candidate in data.get('candidates', [])
                for part in candidate.get('content', {}).get('parts', []) if 'inlineData' in part]
            if not chunks:
                raise SystemExit('No audio returned')
            with wave.open(str(dest), 'wb') as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000); wav.writeframes(b''.join(chunks))
            stamp.write_text(signature)
        with wave.open(str(dest)) as wav:
            seconds = wav.getnframes() / wav.getframerate()
        print(f'Kore clip {i}: {seconds:.2f}s; slot {clip["end"] - clip["start"]:.2f}s', flush=True)
    raise SystemExit(0)

rate = 48000
track = bytearray(rate * 2 * meta['seconds'])
for i, clip in enumerate(meta['clips']):
    dest = out / f'voice-{i}-mix.wav'
    filters = 'silenceremove=start_periods=1:start_threshold=-48dB,highpass=f=80,loudnorm=I=-16:TP=-2:LRA=7'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / f'voice-{i}.wav'), '-af', filters,
        '-ar', str(rate), '-ac', '1', str(dest)], check=True)
    with wave.open(str(dest)) as wav:
        raw = wav.readframes(wav.getnframes())
    seconds = len(raw) / rate / 2
    available = clip['end'] - clip['start']
    if seconds > available:
        speed = seconds / available * 1.005
        if speed > 1.25:
            raise SystemExit(f'Clip {i} is too long: revise the copy ({seconds:.2f}s for {available:.2f}s)')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / f'voice-{i}.wav'), '-af', filters + f',atempo={speed}',
            '-ar', str(rate), '-ac', '1', str(dest)], check=True)
        with wave.open(str(dest)) as wav:
            raw = wav.readframes(wav.getnframes())
        clip['tempo'] = round(speed, 4)
    offset = round(clip['start'] * rate) * 2
    assert offset + len(raw) <= len(track)
    track[offset:offset + len(raw)] = raw
    clip['mixedSeconds'] = len(raw) / rate / 2
with wave.open(str(out / 'narration-track.wav'), 'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(track)
mix = ('[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.9[game];'
    '[1:a]aformat=channel_layouts=stereo,asplit=2[voice][control];'
    '[game][control]sidechaincompress=threshold=0.025:ratio=5:attack=15:release=240[ducked];'
    '[ducked][voice]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8,'
    f'afade=t=out:st={meta["seconds"]-.5}:d=0.5[a]')
final = out / 'UA-Force-trailer-Kore-uk.mp4'
temporary = out / 'UA-Force-trailer-Kore-uk.tmp.mp4'
command = ['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'gameplay-source.webm'), '-i', str(out / 'narration-track.wav')]
if args.reuse_video:
    command += ['-i', str(final), '-filter_complex', mix, '-map', '2:v:0', '-map', '[a]', '-c:v', 'copy']
else:
    command += ['-filter_complex', mix, '-map', '0:v:0', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30']
command += ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', str(meta['seconds']), '-movflags', '+faststart', str(temporary)]
subprocess.run(command, check=True)
temporary.replace(final)
def timecode(t):
    n = round(t * 1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
(out / 'UA-Force-trailer-Kore-uk.srt').write_text('\n\n'.join(
    f"{i+1}\n{timecode(c['start'])} --> {timecode(c['start'] + c['mixedSeconds'])}\n{c['text'].replace('Ю Ей Форс', 'UA Force')}"
    for i, c in enumerate(meta['clips'])) + '\n')
meta['playbackDuringProduction'] = False
(out / 'narration.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
print(out / 'UA-Force-trailer-Kore-uk.mp4')
