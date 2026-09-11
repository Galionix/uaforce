"""Ingest manually downloaded Flow masters and prepare quiet, loopable game audio.

No network, generation, or playback. Requires numpy and ffmpeg. Source originals
stay untouched. Outputs are staged until the complete replacement is reviewed.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/FLOW_MUSIC_REPLACEMENT.json'
SOURCE = ROOT / 'tools/audio-source/flowmusic-2026-09-12'
STAGE = SOURCE / 'prepared'
RATE = 44100
CUE_SECONDS = {'hero': 8.4, 'victory': 3.4, 'defeat': 2.5,
               'checkpoint': 1.3, 'evac': 1.8, 'boss-iron': 7.5,
               'boss-swarm': 7.5, 'boss-putin': 7.5}

def write_clip(out, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.rint(out*32767), -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(RATE); wav.writeframes(pcm.tobytes())
    return {'file': str(path.relative_to(ROOT)), 'sha256': sha(path),
            'seconds': len(out)/RATE, 'rms': float(np.sqrt(np.mean(out*out))),
            'peak': float(np.max(np.abs(out)))}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-vn', '-ac', '2', '-ar', str(RATE), '-f', 'f32le', '-'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).copy()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--register', nargs=4, metavar=('NUMBER', 'ID', 'SONG_UUID', 'BPM'))
    parser.add_argument('--cue', action='store_true')
    parser.add_argument('--prepare', action='store_true')
    args = parser.parse_args()
    m = json.loads(MANIFEST.read_text())
    if args.register:
        number, ident, song, bpm = args.register
        row = {'id': ident, 'song_url': 'https://www.flowmusic.app/song/' + song,
               'source': f'tools/audio-source/flowmusic-2026-09-12/{int(number):02d}-{ident}.m4a',
               'requestedBpm': float(bpm),
               'destination': f'public/assets/audio/{"cues" if args.cue else "music"}/{ident}.wav'}
        previous = next((c for c in m['generated'] if c['destination'] == row['destination']), None)
        if previous and previous['song_url'] != row['song_url']:
            raise ValueError('Existing source differs; review before replacing')
        if not previous:
            m['generated'].append(row)
    for c in m['generated']:
        src = ROOT / c['source']
        number = src.name.split('-')[0]
        files = sorted(Path.home().joinpath('Downloads').glob(f'UAForce_{number}_*.m4a'))
        if not src.exists() and len(files) == 1:
            shutil.copy2(files[0], src)
        c['downloaded'] = src.exists()
        if not src.exists():
            continue
        data = decode(src)
        c.update(sourceSha256=sha(src), sourceSeconds=len(data)/RATE)
        if not args.prepare:
            continue
        is_cue = '/cues/' in c['destination']
        if is_cue:
            # Generated briefs explicitly request an immediate, self-contained
            # opening phrase. Remove only leading silence, then preserve attack.
            window = 441
            bins = data[:len(data)//window*window].reshape(-1, window, 2)
            energy = np.sqrt(np.mean(bins*bins, axis=(1, 2)))
            active = np.flatnonzero(energy > .008)
            if not len(active):
                raise ValueError(f'{src.name}: no audible cue')
            length = int(CUE_SECONDS[c['id']] * RATE)
            # Some generations begin with an isolated pluck followed by silence.
            # Find the first actual musical phrase rather than amplifying that
            # transient and shipping a mostly empty cue. Record the exact edit.
            phrase_bins = int(np.ceil(length/window))
            usable = [int(i) for i in active if i < 2000 and
                      len(energy[i:i+phrase_bins]) == phrase_bins and
                      np.mean(energy[i:i+phrase_bins] > .008) >= .55]
            if not usable:
                raise ValueError(f'{src.name}: no sufficiently sustained cue phrase in first 20s')
            start = max(0, (usable[0]-1)*window)
            out = data[start:start+length].copy()
            if len(out) != length:
                raise ValueError('Cue source incomplete')
            attack, tail = int(.006*RATE), int(.25*RATE)
            out[:attack] *= np.linspace(0, 1, attack)[:, None]
            out[-tail:] *= np.linspace(1, 0, tail)[:, None]
            out *= min(.17/max(float(np.sqrt(np.mean(out*out))), 1e-8), .86/max(float(np.max(np.abs(out))), 1e-8))
            c['prepared'] = write_clip(out, STAGE/'cues'/(c['id']+'.wav'))
            c['prepared'].update(sourceStart=start/RATE, sourceLength=length/RATE,
                                processing='First sustained generated phrase (at least 55% active 10ms windows), 6ms attack and 250ms release; RMS/peak-limited gain')
            if c['id'] == 'hero':
                short = out[:int(.85*RATE)].copy()
                short[-int(.18*RATE):] *= np.linspace(1, 0, int(.18*RATE))[:, None]
                c['short'] = write_clip(short, STAGE/'cues/short.wav')
                c['short'].update(sourceStart=start/RATE, sourceLength=.85,
                                  processing='Short variant of the new hero cue; 180ms release')
            continue
        # One-bar overlap with a 32-bar result, using the requested compositional
        # grid. This is not a claim that the model obeyed the exact requested BPM.
        bar = 4 * 60 / c['requestedBpm']
        start = int(4 * bar * RATE)
        overlap = int(bar * RATE)
        count = int(33 * bar * RATE)
        if start + count > len(data):
            raise ValueError(f'{src.name}: too short for intended loop')
        segment = data[start:start+count]
        weight = np.linspace(0, 1, overlap, dtype=np.float32)[:, None]
        blend = segment[-overlap:] * (1-weight) + segment[:overlap] * weight
        out = np.concatenate((segment[overlap:-overlap], blend))
        target = .080 if c['id'] == 'menu' else .125 if 'combat' in c['id'] else .135 if c['id'] == 'boss' else .095
        gain = min(target / max(float(np.sqrt(np.mean(out*out))), 1e-8), .84 / max(float(np.max(np.abs(out))), 1e-8))
        out *= gain
        path = STAGE / 'music' / (c['id'] + '.wav')
        c['prepared'] = {**write_clip(out, path), 'sourceStart': start/RATE,
            'sourceLength': count/RATE, 'overlapSeconds': overlap/RATE,
            'seamStep': float(np.max(np.abs(out[-1]-out[0]))),
            'processing': 'Stereo PCM 44.1kHz, one-bar circular linear overlap, constant RMS/peak-limited gain; no synthesis or inserted melody'}
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n')
    print(f"{sum(c.get('downloaded', False) for c in m['generated'])}/{len(m['generated'])} masters decoded; originals retained")

if __name__ == '__main__':
    main()
