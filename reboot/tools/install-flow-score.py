"""Install a complete, verified Flow Music score; archive the previous 23 files.

Run prepare-flow-score.py --prepare first. No playback or generation.
"""
from pathlib import Path
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/FLOW_MUSIC_REPLACEMENT.json'
m = json.loads(MANIFEST.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
replacements = []
for c in m['generated']:
    for part, destination in [('prepared', c['destination']), ('short', 'public/assets/audio/cues/short.wav')]:
        if part not in c:
            if part == 'prepared':
                raise ValueError(f"Not ready: {c['id']}")
            continue
        p = c[part]
        source, edited = ROOT/c['source'], ROOT/p['file']
        assert sha(source) == c['sourceSha256'], 'Changed native source'
        assert sha(edited) == p['sha256'], 'Changed staged edit'
        assert p['rms'] > .035 and p['peak'] < .9, 'Invalid audio levels'
        replacements.append((c, p, destination))
expected = {c['file'] for c in m['previous_assets']}
assert len(replacements) == len(expected) == 23
assert {d for _, _, d in replacements} == expected
assert len({p['sha256'] for _, p, _ in replacements}) == 23
for c in m['preserved_audio']:
    assert sha(ROOT/c['file']) == c['sha256'], 'Voice/SFX changed outside scope'

archive = ROOT/'tools/audio-source/flowmusic-2026-09-12/previous-game-score'
archive.mkdir(parents=True, exist_ok=True)
for c in m['previous_assets']:
    src = ROOT/c['file']; dst = archive/Path(c['file']).parent.name/src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        assert sha(src) == c['sha256'], 'Original changed before backup'
        shutil.copy2(src, dst)
    assert sha(dst) == c['sha256'], 'Backup verification failed'

background, cues = [], []
for c, p, destination in replacements:
    shutil.copy2(ROOT/p['file'], ROOT/destination)
    row = {**p, 'id': Path(destination).stem, 'file': destination,
           'origin': 'Google Flow Music / UAForce Game Score',
           'source': c['source'], 'sourceSha256': c['sourceSha256'],
           'songUrl': c['song_url'], 'requestedBpm': c['requestedBpm']}
    (background if '/music/' in destination else cues).append(row)
def save(name, content):
    (ROOT/'docs'/name).write_text(json.dumps(content, ensure_ascii=False, indent=2)+'\n')
save('BACKGROUND_MUSIC.json', {'origin': 'Google Flow Music', 'sessionUrl': m['session_url'],
    'playbackDuringGeneration': False, 'sampleRate': 44100, 'clips': background})
save('MUSIC_CUES.json', {'origin': 'Google Flow Music', 'sessionUrl': m['session_url'],
    'playbackDuringGeneration': False, 'sampleRate': 44100, 'clips': cues})
boss = json.loads((ROOT/'docs/BOSS_AUDIO_ASSETS.json').read_text())
boss['clips'] = [c for c in boss['clips'] if c['file'] not in expected]
boss['clips'].extend(c for c in cues if c['id'].startswith('boss-'))
save('BOSS_AUDIO_ASSETS.json', boss)
save('LEITMOTIF.json', {'authority': 'Owner 2026-09-12: cohesive Flow Music replacement, retaining separate menu melody',
    'inAllBackgroundTracks': False, 'recurrenceSeconds': [], 'bossRecurrenceSeconds': [],
    'menu': 'menu', 'menuSourceStart': next(c['sourceStart'] for c in background if c['id']=='menu'),
    'gameplay': 'Independent Flow Music masters from one project/session; Ukrainian instrumental and modal continuity, no menu audio spliced into gameplay.',
    'unlock': 'New Flow hero sting only for a first unlock, never familiar rescue, mission start or respawn.',
    'playbackDuringWork': False})
m['status'] = 'installed_locally_pending_release'
m['installed_files'] = [{'file': d, 'sha256': p['sha256']} for _,p,d in replacements]
MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2)+'\n')
print('Installed 14 backgrounds + 9 cues; previous assets archived; voices/SFX unchanged')
