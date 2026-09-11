"""Three native vertical gameplay clips; file-only encode/mix, never playback."""
from pathlib import Path
import subprocess, json

root=Path(__file__).resolve().parents[1]
out=root/'docs/marketing/captures/tiktok-mobile-2026-09-11'
source=out/'source.webm'
clips=[('01-mobile',.1,6.7),('02-coop',12.1,7.7),('03-shevchenko',24.1,7.7)]
covers={'01-mobile':2.3,'02-coop':.9,'03-shevchenko':2.5}
receipt=[]
for name,start,duration in clips:
    target=out/(name+'.mp4')
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(source),'-t',str(duration),
        '-vf','fps=30','-af',f'loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=in:d=0.06,afade=t=out:st={duration-.2}:d=0.2',
        '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-b:a','192k','-movflags','+faststart',str(target)],check=True)
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(covers[name]),'-i',str(target),'-frames:v','1',str(out/(name+'-cover.jpg'))],check=True)
    subprocess.run(['ffmpeg','-v','error','-i',str(target),'-f','null','-'],check=True)
    meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate','-of','json',str(target)]))
    receipt.append({'file':target.name,'source_start':start,**meta})
(out/'media-check.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(receipt,ensure_ascii=False),flush=True)
