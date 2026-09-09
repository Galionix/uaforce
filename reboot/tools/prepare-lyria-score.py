"""Master downloaded Lyria music for local playback. No synthesis or audio playback."""
from pathlib import Path
import array, hashlib, json, math, subprocess, sys, wave
ROOT=Path(__file__).resolve().parents[1]
SR=44100
SOURCE=ROOT/'tools/audio-source/lyria-score'

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pcm(name,start,length):
    raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(SOURCE/(name+'.mp4')),'-t',str(length),'-vn','-af','acompressor=threshold=0.12:ratio=3:attack=8:release=180:makeup=1','-ar',str(SR),'-ac','2','-f','f32le','-'])
    a=array.array('f');a.frombytes(raw)
    if sys.byteorder!='little':a.byteswap()
    return a

def master(name,source,start,length,loop=False,target=.16):
    a=pcm(source,start,length)
    if len(a)<int(length*SR*2)-10:raise ValueError('Source too short: '+source)
    if loop:
        n=round(.25*SR)*2
        seam=array.array('f',(a[len(a)-n+i]*(1-i//2/(n//2-1))+a[i]*(i//2/(n//2-1)) for i in range(n)))
        a=a[n:-n]+seam
    else:
        attack=round(.012*SR);release=round(.22*SR);frames=len(a)//2
        for i in range(frames):
            envelope=min(1,i/attack,(frames-1-i)/release)
            a[2*i]*=envelope;a[2*i+1]*=envelope
    rms=math.sqrt(sum(x*x for x in a)/len(a));peak=max(abs(x) for x in a)
    gain=min(target/rms,.89/peak)
    data=array.array('h',(round(max(-.99,min(.99,x*gain))*32767) for x in a))
    if sys.byteorder!='little':data.byteswap()
    path=ROOT/'public/assets/audio'/name;path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(data.tobytes())
    return {'file':str(path.relative_to(ROOT)),'source':str((SOURCE/(source+'.mp4')).relative_to(ROOT)),'sourceSha256':digest(SOURCE/(source+'.mp4')),'origin':'Lyria 3.5 / Gemini Apps, Galionix Pro','seconds':len(a)/2/SR,'rms':rms*gain,'peak':peak*gain,'sha256':digest(path),'sourceStart':start,'sourceLength':length,'processing':'Stereo 44.1 kHz PCM; gentle 3:1 peak compression and RMS/peak normalization; '+('250 ms circular crossfade, no pitch or tempo changes' if loop else '12 ms attack and 220 ms tail fade')}

if __name__=='__main__':
    themes=['river','city','coast','mountain','rail','marsh']
    # Validate every original before replacing any published score.
    for theme in themes+['boss']:
        info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(SOURCE/(theme+'.mp4'))]))
        if float(info['format']['duration'])<59:raise ValueError('Incomplete source: '+theme)
    clips=[]
    for theme in themes:
        for mood,start,target in [('explore',2,.15),('combat',32,.2)]:
            clip=master(f'music/{theme}-{mood}.wav',theme,start,26.25,True,target);clip['id']=f'{theme}-{mood}';clips.append(clip)
    clip=master('music/boss.wav','boss',10,42.25,True,.2);clip['id']='boss';clips.append(clip)
    manifest={'origin':'Original Lyria 3.5 generations through Gemini Apps / existing Galionix Pro subscription, 2026-09-09','playbackDuringGeneration':False,'creativeReview':'Prompts request acoustic Ukrainian instruments and contrasting exploration/action sections. Files and signal verified silently; instrumental fidelity and musical phrasing await owner listening.','sourceManifest':'docs/LYRIA_SCORE_SOURCES.json','clips':clips}
    (ROOT/'docs/BACKGROUND_MUSIC.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    cues=json.loads((ROOT/'docs/MUSIC_CUES.json').read_text())
    replacements={name:master('cues/'+name+'.wav',src,start,length,target=.18) for name,src,start,length in [('checkpoint','river',7,1.3),('victory','mountain',44,3),('evac','coast',38,1.8),('defeat','boss',8,2.2)]}
    cues['clips']=[replacements.get(Path(c['file']).stem,c) for c in cues['clips']];cues['origin']='All musical cues derive from Lyria 3.5 / Gemini Apps. Approved hero and short riff preserved; event cues from the new folk score.'
    (ROOT/'docs/MUSIC_CUES.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n')
    bosses=json.loads((ROOT/'docs/BOSS_AUDIO_ASSETS.json').read_text())
    replacements={name:master('cues/'+name+'.wav','boss',start,7.5,target=.2) for name,start in [('boss-iron',1.7),('boss-swarm',32)]}
    bosses['clips']=[replacements.get(Path(c['file']).stem,c) for c in bosses['clips']]
    (ROOT/'docs/BOSS_AUDIO_ASSETS.json').write_text(json.dumps(bosses,ensure_ascii=False,indent=2)+'\n')
    print('Prepared 13 background loops and 6 event/boss music cues from Lyria; no playback.')
