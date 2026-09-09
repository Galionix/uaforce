"""Reframe the approved trailer for mobile. Offline file rendering; no playback."""
from pathlib import Path
import subprocess, json, math, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/marketing/captures/instagram-2026-09-09'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'docs/marketing/captures/trailer-v2/UA-Force-trailer-Kore-uk.mp4'
CUTS = [(6, 18), (18, 36), (50, 59.2), (80, 89)]
FPS, W, H = 30, 1080, 1920
DURATION = sum(b-a for a,b in CUTS)
FF = '/opt/homebrew/bin/ffmpeg'
def run(args):
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)
filters=[]
for i,(a,b) in enumerate(CUTS):
    filters += [f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]',
                f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b-a-.012}:d=0.012[a{i}]']
filters.append(''.join(f'[v{i}][a{i}]' for i in range(len(CUTS)))+f'concat=n={len(CUTS)}:v=1:a=1[v][a]')
montage=OUT/'montage.mp4'
run(['-i',str(SOURCE),'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]',
     '-c:v','libx264','-preset','fast','-crf','18','-c:a','aac','-b:a','192k',str(montage)])

fontroot=Path('/System/Library/Fonts/Supplemental')
def font(n, title=False):
    return ImageFont.truetype(str(fontroot/('Courier New Bold.ttf' if title else 'Arial Bold.ttf')), n)
bg=Image.new('RGB',(W,H)); draw=ImageDraw.Draw(bg)
for y in range(H):
    k=1-abs(y-H/2)/(H/2)
    draw.line((0,y,W,y),fill=(5+int(3*k),18+int(12*k),28+int(17*k)))
for x in range(-H,W,90): draw.line((x,0,x+H,H),fill=(10,32,46),width=2)
def center(draw,text,y,size=56,color='#fff3cd',title=False):
    f=font(size,title)
    draw.text((W/2-20,y),text,font=f,fill=color,anchor='mt',stroke_width=0)

# Phrase timing follows the already verified Kore narration, split for phone readability.
captions=[
 (0.3,3.7,'Шевченко тут переконує\nбулавою.'),
 (3.7,8.0,'А коли аргументів замало —\nвикликає блискавки.'),
 (8.0,10.8,'Дуже дохідлива поезія.'),
 (12.3,14.5,'Леся Українка.'),
 (14.5,18.4,'Арбалет, ворони\nі бойова Мавка.'),
 (18.4,20.5,'Література кусається.'),
 (21.4,25.8,'У кожного героя — своя зброя,\nспецприйом та ульта.'),
 (25.8,29.5,'Тут є чим здивувати\nокупантів.'),
 (30.3,33.6,'Кооп на двох\nуже можна спробувати.'),
 (33.6,35.6,'Створюй кімнату,\nклич друга —'),
 (35.6,38.6,'і влаштовуйте хаос разом.'),
 (39.5,42.7,'Грай безкоштовно\nпросто в браузері.'),
 (42.7,45.6,'Бери клавіатуру\nабо геймпад.'),
 (45.6,47.4,'UA Force. Твій вихід!')]
def stage(t):
    if t<12:return ('ШЕВЧЕНКО ВИЙШОВ','ІЗ ПІДРУЧНИКА','01 / БУЛАВА + БЛИСКАВКИ')
    if t<30:return ('ЛІТЕРАТУРА','КУСАЄТЬСЯ','02 / ЛЕСЯ УКРАЇНКА')
    if t<39.2:return ('КЛИЧ ДРУГА.','ХАОСУ ВИСТАЧИТЬ.','03 / КООП НА ДВОХ · РАННІЙ ТЕСТ')
    return ('ТВІЙ ВИХІД!','','04 / РАННІЙ БЕЗКОШТОВНИЙ ПРОТОТИП')

reader=subprocess.Popen([FF,'-hide_banner','-loglevel','error','-i',str(montage),'-vf','scale=1080:608:flags=lanczos',
                         '-f','rawvideo','-pix_fmt','rgb24','-an','-'],stdout=subprocess.PIPE)
final=OUT/'UA-Force-Instagram-Reel-uk.mp4'
writer=subprocess.Popen([FF,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24',
                         '-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','-', '-i',str(montage),
                         '-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','19',
                         '-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-shortest',str(final)],stdin=subprocess.PIPE)
frames=round(DURATION*FPS)
try:
 for n in range(frames):
    data=reader.stdout.read(W*608*3)
    if len(data)!=W*608*3: raise RuntimeError(f'Incomplete source frame {n}')
    t=n/FPS; frame=bg.copy(); d=ImageDraw.Draw(frame)
    # Moving blue/yellow bands and pixel flecks preserve the trailer's visual identity.
    offset=int(16*math.sin(t*1.2))
    d.polygon([(0,97+offset),(W,22+offset),(W,52+offset),(0,127+offset)],fill='#1385ba')
    d.polygon([(0,128+offset),(W,53+offset),(W,74+offset),(0,149+offset)],fill='#f5cc52')
    center(d,'UA FORCE',178,88,'#ffdd65',True)
    a,b,kicker=stage(t)
    center(d,a,318,61,'#fff3cd',True)
    if b:center(d,b,386,61,'#fff3cd',True)
    center(d,kicker,478,29,'#74d1ed')
    frame.paste(Image.frombytes('RGB',(W,608),data),(0,550))
    d=ImageDraw.Draw(frame)
    d.rectangle((0,544,W,549),fill='#168cbc');d.rectangle((0,1158,W,1163),fill='#f6d264')
    for start,end,caption in captions:
      if start<=t<end:
        for i,line in enumerate(caption.split('\n')):center(d,line,1220+i*68,52)
    center(d,'ГРАЙ БЕЗКОШТОВНО',1430,47,'#ffdd65',True)
    center(d,'uaforce.thedimas.com',1500,49,'#7bd7ef')
    center(d,'НА ПК · КЛАВІАТУРА АБО ГЕЙМПАД',1585,30,'#c3d8d9')
    d.rectangle((90,1680,940,1685),fill='#174456')
    d.rectangle((90,1680,90+int(850*t/DURATION),1685),fill='#eacc62')
    for i in range(16):
      x=int((i*89+t*(15+i%3*8))%1080);y=1740+(i*43)%150
      d.rectangle((x,y,x+5,y+5),fill='#22516a' if i%2 else '#746534')
    if n in (45,435,990,1305):frame.resize((540,960)).save(OUT/f'preview-{n}.jpg',quality=92)
    if n==45:frame.save(OUT/'cover.jpg',quality=95)
    writer.stdin.write(frame.tobytes())
    if n%300==0:print(f'Render {n}/{frames}',flush=True)
finally:
 writer.stdin.close();reader.stdout.close()
if reader.wait()!=0 or writer.wait()!=0:raise RuntimeError('ffmpeg failed')
(OUT/'edit.json').write_text(json.dumps({'source':str(SOURCE.relative_to(ROOT)),'cuts':CUTS,'seconds':DURATION,
 'resolution':[W,H],'fps':FPS,'audio':'Approved Google Kore narration + original game mix; no new voice generation',
 'subtitles':'Ukrainian phrase captions burned into vertical frame','file':final.name},ensure_ascii=False,indent=2))
print(final,flush=True)
