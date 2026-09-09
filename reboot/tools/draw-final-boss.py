"""Owner-authorized hand-drawn pixel artwork, no image model. Deterministic PNG writer."""
from pathlib import Path
import struct,zlib,hashlib,json
root=Path(__file__).resolve().parents[1];W,H=384,256
px=bytearray(bytes.fromhex('101622')*(W*H))
def rect(x,y,w,h,color):
 c=bytes.fromhex(color.lstrip('#'))
 for yy in range(max(0,y),min(H,y+h)):
  for xx in range(max(0,x),min(W,x+w)):px[(yy*W+xx)*3:(yy*W+xx)*3+3]=c
# Bunker shadows and warm light, all hard clusters.
for x in range(0,W,32):
 rect(x,0,2,H,'202834');rect(x+3,13,22,2,'30282a');rect(x+5,17,1,140,'1a202d')
for i in range(18):
 x=155+(i*37)%229;y=18+(i*23)%180;rect(x,y,12,3,'532c29');rect(x+2,y,2,3,'af5634')
# Right-side command chassis, different from the gameplay sprite.
rect(142,180,233,65,'0b1019');rect(146,185,225,47,'3b4647');rect(151,188,215,6,'68716a')
for x in range(154,362,29):rect(x,204,22,28,'171d26');rect(x+4,209,14,18,'536063');rect(x+7,212,8,12,'222c37')
rect(171,152,185,45,'354449');rect(177,155,173,7,'82867a');rect(185,168,147,8,'56645e')
for x in [157,321]:
 rect(x,103,44,61,'202c35');rect(x+3,106,38,6,'728078')
 for y in [116,133,150]:
  for dx in [5,23]:rect(x+dx,y,13,12,'111720');rect(x+dx+3,y+3,7,6,'883f30');rect(x+dx+4,y+3,5,2,'e28448')
# Suit shoulders, white collar, red tie.
rect(220,123,79,15,'172535');rect(208,135,103,37,'1c2a3c');rect(215,134,89,9,'344156');rect(234,124,49,24,'d6d2b8')
rect(225,132,18,22,'334359');rect(275,132,18,22,'334359');rect(247,145,24,28,'202e40')
rect(254,134,9,11,'792c34');rect(256,145,7,25,'92393c');rect(257,145,2,21,'bb6151')
# Recognizable satirical face: receding hair, pale broad forehead, narrow eyes and pursed mouth.
rect(239,46,39,5,'9f917d');rect(232,51,52,9,'b3a38a');rect(228,60,60,41,'cdb697');rect(231,101,55,12,'bd9b80');rect(236,113,44,9,'ae866e');rect(244,121,29,8,'ab836e')
rect(236,53,43,25,'dcc6a6');rect(231,62,7,19,'998d7b');rect(279,61,8,20,'897e70');rect(229,61,4,9,'72736a');rect(283,64,5,14,'6d716a')
rect(227,83,5,16,'bd9f83');rect(287,83,4,16,'b0947c');rect(241,69,30,3,'c6ac8e');rect(239,78,17,3,'aa9079');rect(265,78,16,3,'a58b77')
rect(237,86,18,3,'65594e');rect(265,86,17,3,'65594e');rect(242,89,11,3,'e2d7bc');rect(266,89,11,3,'dbceb3');rect(248,89,3,3,'434b4b');rect(267,89,3,3,'434b4b')
rect(256,87,5,16,'dccaad');rect(258,99,8,4,'9d7f68');rect(254,101,6,2,'b79478');rect(241,97,9,6,'c4a187');rect(272,97,9,6,'bb977e')
rect(247,110,25,2,'836858');rect(252,113,15,2,'b78570');rect(246,119,24,2,'c4a385')
# Hands on control console and Russian flag patch.
rect(218,165,17,7,'c2a384');rect(285,165,18,7,'c2a384');rect(237,168,46,6,'0b1523');rect(244,169,5,2,'d49645');rect(254,169,5,2,'5fa7a8')
for y,c in [(178,'d6d8d4'),(181,'456197'),(184,'a2473c')]:rect(296,y,15,3,c)
# Ground and sparks.
rect(0,242,W,14,'090e17')
for i in range(44):rect((i*67)%384,190+(i*13)%53,2,2,['804d31','c08140','eed083'][i%3])
# Scale with nearest neighbour, lossless PNG; no smoothing.
scale=4;raw=b''.join(b'\0'+b''.join(bytes(px[(y*W+x)*3:(y*W+x)*3+3])*scale for x in range(W)) for y in range(H) for _ in range(scale))
def chunk(t,d):return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',W*scale,H*scale,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
p=root/'public/assets/cinematics/putin.png';p.write_bytes(png)
meta=root/'docs/CINEMATIC_PROMPTS.json';data=json.loads(meta.read_text());data['putin']={'file':'public/assets/cinematics/putin.png','method':'Original pixel artwork rendered by tools/draw-final-boss.py, owner explicitly selected code drawing in Telegram','prompt':'Satirical Putin, pale receding-haired face, dark suit and red tie, Russian command tank, ominous bunker. Coarse pixel art; no raster generation.','sha256':hashlib.sha256(png).hexdigest()};meta.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(p)
