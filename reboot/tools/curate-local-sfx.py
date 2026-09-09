"""Assemble explicit edits from newly generated, PCM-screened materials only.

This is offline sound design, not oscillator synthesis. The written edits retain
every source hash, selected interval, pitch variation, and composite layer.
"""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'tools/audio-source/local-sfx'
clips={c['id']:c for c in json.loads((RAW/'edited/manifest.json').read_text())['clips']}
anchors=json.loads((ROOT/'docs/LOCAL_SFX_SOURCE_ANCHORS.json').read_text())
windows=json.loads((RAW/'clap/window-proposals.json').read_text())
path=ROOT/'docs/LOCAL_SFX_EDITS.json';edits=json.loads(path.read_text())
def material(name):
 w=windows['material-'+name]
 return dict(sourceId=w['sourceId'],masterSha256=w['masterSha256'],start=w['best'][0]['start'],rate=1,
  reason='Selected from a newly generated material using actual PCM similarity screening.',screen=w['best'][0],description=w['description'])
def existing(key):
 return copy.deepcopy(anchors[key])
def put(key,base,seconds=None,rate=1,mix=()):
 value=copy.deepcopy(base);value['rate']=round(value.get('rate',1)*rate,5)
 if seconds is not None:value['seconds']=seconds
 value['mix']=[copy.deepcopy(x) for x in mix];edits[key]=value
def layer(base,gain=.4,cut=.4,at=0):
 return {**{k:base[k] for k in ['sourceId','masterSha256','start','rate']},'gain':gain,'cut':cut,'at':at}
paper,wood,rock,metal,air=[material(x) for x in ['paper','wood','rock','metal']]+[existing('shevchenko-weapon-0')]
crow,wings,fire,jet,rotor,horse,pluck,electric=[material(x) for x in ['crow','wings','fire','jet','rotor','horse','pluck','electric']]
engine=material('engine')
click=existing('bolt');boom=existing('explosion');sniper=existing('bilozerska-weapon-0')
for v,rate in enumerate([.97,1,1.03]):
 put(f'it-army-weapon-{v}',electric,.5,rate)
 put(f'skovoroda-weapon-{v}',existing('mamai-melee-weapon-1'),.3,rate)
 put(f'lesya-weapon-{v}',existing('lesya-weapon-0'),.36,rate)
put('bayraktar-weapon-2',existing('bayraktar-weapon-1'),.34,.97)
put('franko-hit',rock,.55,mix=[layer(metal,.35)])
put('skovoroda-hit',metal,.5)
put('roots',wood,.8,mix=[layer(rock,.4,.6,.1)])
put('stone-hit',rock,.55)
put('mine-arm',click,.22)
put('glass-fire',metal,.7,mix=[layer(fire,.7,.65,.05)])
put('shevchenko-special',paper,1.2,mix=[layer(air,.5,.4)])
put('lesya-special',crow,.8,mix=[layer(wings,.2,.5)])
put('lesya-ultimate',wood,1.1,mix=[layer(rock,.7,.75,.15)])
put('franko-special',rock,.8,mix=[layer(metal,.3,.45)])
put('bandera-special',air,.34)
put('bandera-ultimate',engine,1.3,1.05,mix=[layer(metal,.15,.3)])
put('bandera-ultimate-loop',engine,1.75,1.05)
put('mamai-special',pluck,.45,mix=[layer(air,.2,.25)])
put('mamai-ultimate',horse,1.3,mix=[layer(metal,.1,.4)])
put('bayraktar-special',rotor,.7,1.04)
put('ghost-ultimate',jet,1.8)
put('zelensky-special',click,.25)
put('zelensky-ultimate',rotor,1,1.08,mix=[layer(paper,.25,.5)])
put('bilozerska-special',click,.25,.96)
put('bilozerska-ultimate',sniper,1.1,mix=[layer(air,.5,.4),layer(boom,.3,.9,.06)])
put('it-army-special',click,.4,mix=[layer(electric,.3,.35)])
put('it-army-ultimate',electric,1.2,mix=[layer(boom,.45,.8,.15)])
put('skovoroda-special',paper,.6,mix=[layer(air,.2,.3)])
put('skovoroda-ultimate',metal,.9,mix=[layer(air,.45,.5)])
loops={'lesya-special-loop':wings,'lesya-ultimate-loop':wood,'franko-special-loop':rock,
 'bandera-special-loop':fire,'mamai-special-loop':air,'mamai-ultimate-loop':horse,
 'bayraktar-special-loop':rotor,'bayraktar-ultimate-loop':jet,'ghost-ultimate-loop':jet,
 'zelensky-ultimate-loop':rotor,'it-army-ultimate-loop':electric,'skovoroda-special-loop':paper,'skovoroda-ultimate-loop':air}
for key,value in loops.items():put(key,value,clips[key]['seconds'])
endings={'shevchenko':paper,'lesya':wood,'franko':rock,'bandera':metal,'mamai':metal,
 'bayraktar':rotor,'ghost':air,'zelensky':paper,'bilozerska':click,'it-army':click,'skovoroda':paper}
for hero,base in endings.items():
 for kind in ['special','ultimate']:put(f'{hero}-{kind}-end',base,.35)
for hero in ['lesya','bandera','mamai','bayraktar','ghost','zelensky','bilozerska','it-army']:
 put(hero+'-reload-end',click,.2,.96 if hero in ['mamai','bilozerska'] else 1.03)
put('plane-engine',jet,1.8)
put('tank-engine',engine,2.5,.94)
put('tank-jump',engine,.6,mix=[layer(metal,.2,.3)])
put('drone-engine',rotor,1.75,1.08)
put('drone-dive',rotor,.65,1.1,mix=[layer(air,.6,.5)])
put('enemy-fuse',fire,.75)
put('barrel-throw',air,.35,mix=[layer(metal,.3,.2,.12)])
put('armor-hit',metal,.3)
put('follower-down',metal,.6,mix=[layer(rock,.4,.45)])
put('legacy-hurt',existing('death-rifle-2'),.55)
# Reuse clean vocal takes with restrained pitch differences where a generated
# "grunt plus equipment" take accidentally contains only equipment.
for v,rate in enumerate([.94,1,1.06]):
 put(f'death-assault-{v}',existing('death-assault-0'),.8,rate)
 put(f'death-scout-{v}',existing('death-sniper-2'),.8,rate,mix=[layer(click,.09,.18,.12)])
 put(f'death-shield-{v}',existing('death-gunner-1'),.8,.94+v*.025,mix=[layer(metal,.12,.45,.1)])
 put(f'death-demolition-{v}',existing('death-demolition-1'),.8,rate)
# Window screening exposed bad peak-only crops of otherwise valid frog takes.
for v in range(3):
 for kind in ['splat','croak']:
  key=f'gore-{kind}-{v}';w=windows[key]
  edits[key]=dict(sourceId=w['sourceId'],masterSha256=w['masterSha256'],start=w['best'][0]['start'],seconds=w['seconds'],reason='PCM-screened material-bearing interval, not the loudest unrelated transient.',screen=w['best'][0])
 wet=edits[f'gore-splat-{v}']
 put(f'gore-gib-land-{v}',wet,.5,.97+v*.03)
 put(f'gore-blood-burst-{v}',wet,.65,mix=[layer(existing('shevchenko-hit'),.22,.3)])
# Take 1 retains the clearest wet character after final resampling. Keep three
# restrained variations rather than the dry incidental clicks in takes 0/2.
wet=copy.deepcopy(edits['gore-splat-1'])
for v,rate in enumerate([.96,1,1.04]):
 put(f'gore-splat-{v}',wet,.5,rate)
 put(f'gore-gib-land-{v}',wet,.5,rate)
 put(f'gore-blood-burst-{v}',wet,.65,rate,mix=[layer(existing('shevchenko-hit'),.12,.3)])
put('death-boss-iron-warden',boom,2.5,mix=[layer(metal,.5,.5,.2),layer(rock,.6,.75,1)])
put('death-boss-swarm-master',rotor,2.5,mix=[layer(boom,.9,1.2,.55),layer(metal,.5,.5,1.7)])
put('death-boss-putin',existing('death-boss-putin'),2.5,mix=[layer(rock,.3,.75,1.4)])
path.write_text(json.dumps(edits,indent=2)+'\n')
print('Wrote',len(edits),'explicit generated-material edits. All remain subject to final PCM review.')
