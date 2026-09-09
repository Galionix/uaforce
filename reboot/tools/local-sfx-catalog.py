"""Build the complete zero-service-cost SFX production list. Does not play audio."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STYLE=' Dry close-mic sound effect, punchy attack and short decay, no music.'
HERO={
 'shevchenko':('A low powerful whoosh of air','thick paper pages bursting open with a powerful gust','massive lightning crack and rolling thunder','thick paper and leather coat'),
 'lesya':('a single crossbow string snapping and bolt releasing','A raven cawing loudly','thick tree roots tearing through soil and twisting wood','soft cloth and feathers'),
 'franko':('A fast powerful swoosh through the air','stone blocks grinding and slamming together','massive rock smashing with a deep earth-shaking crack','heavy boots and gritty stone'),
 'bandera':('one single submachine gun shot, a short dry sharp report','glass bottle whipping through the air','old powerful car engine starting with a throaty roar','leather belt and military boots'),
 'mamai':('one flintlock pistol shot, deep powder bang','one bright pluck of bandura strings with a woody spinning whoosh','horses charging, pounding hooves and rattling harness','leather boots and loose chainmail'),
 'bayraktar':('one short mounted machine gun shot with metallic clack','small propeller drone motor starting','several rockets launching with rushing air and powerful thrust','compact mechanical joints'),
 'ghost':('one single assault rifle shot, dry sharp crack','fast rush of air vanishing into a soft gust','fighter jet roaring overhead with powerful air turbulence','flight jacket and light boots'),
 'zelensky':('one single pistol gunshot, crisp dry report','radio switch clicking and military equipment moving','large drone rotor accelerating with cloth flag flapping','cloth and light leather boots'),
 'bilozerska':('one heavy sniper rifle shot, powerful sharp crack with brief low tail','small metal mine placed on dirt, short latch click','massive armor-piercing rifle shot with tearing air','soft tactical fabric and quiet boots'),
 'it-army':('short electrical spark discharge and relay snap','mechanical relay switches engaging with motor starting','electrical transformer power surge, sparking and heavy mechanical shutdown','small metal switches and cloth'),
 'skovoroda':('iron frying pan swinging through air','thick book opening and pages whipping past','resonant struck bronze with soft rushing air','book pages and soft leather shoes'),
}
WORLD={
 'ricochet':'one bullet ricocheting off iron with a short metallic ping',
 'explosion':'one powerful explosion with sharp crack, deep boom and falling rubble',
 'glass-fire':'glass bottle shattering followed by a brief whoosh of fire',
 'roots':'thick wooden roots cracking and tearing from soil',
 'stone-hit':'one heavy stone impact, gritty crack and falling chips',
 'thunder':'one massive lightning crack, deep thunder tail',
 'rail-shot':'one massive rifle blast with ripping air',
 'bolt':'rifle bolt pulled and locked, two dry metal clicks',
 'mine-arm':'one crisp mechanical mine latch snapping shut',
 'rocket':'one rocket igniting with a short explosive hiss and air rush',
 'support-infantry':'one single dry rifle gunshot',
 'support-turret':'one single heavy turret gunshot with metallic recoil',
 'turret-step':'one heavy robot footstep, metal joint clack',
 'follower-hurt':'short dull body impact with equipment rattle',
 'follower-down':'a compact mechanical collapse and armor falling onto dirt',
 'barrel-lift':'metal barrel lifted, hollow metal scrape and cloth strain',
 'barrel-throw':'metal barrel thrown with quick whoosh and hollow clank',
 'armor-hit':'one hard bullet impact on thick tank armor',
 'tank-land':'heavy tank suspension landing, deep metal clunk and dirt crunch',
 'tank-jump':'heavy suspension spring releasing with engine grunt',
 'hatch':'heavy tank hatch opening and clanking shut',
 'tank-shot':'one massive tank cannon shot, concussive boom and short metal recoil',
 'tank-engine':'steady low diesel tank engine rumble with track rattle',
 'plane-engine':'jet engine rushing overhead, steady low air roar',
 'drone-engine':'small propeller engine whirring steadily',
 'drone-dive':'small propeller engine rapidly approaching with rising air rush',
 'enemy-alert':'one sharp attention whistle and crisp metallic tap',
 'enemy-fuse':'short sputtering burning fuse, accelerating dry crackles',
 'pickup':'small ammo box latch opening, satisfying clean metal click',
 'debris':'brief shower of small stone and wood fragments landing',
 'legacy-shot':'one single dry rifle gunshot',
 'legacy-hurt':'short nonverbal startled grunt, exaggerated cartoon character',
 'legacy-reload':'rifle magazine inserted with a short mechanical clack',
 'legacy-rescue':'A mechanical button clicking once',
}
FOLEY={'step':'one footstep on dry earth','climb':'one hand gripping a wooden ladder rung','jump':'quick takeoff scuff and cloth movement','land':'one body landing on earth with a dull thud','hurt':'one dull body impact and brief nonverbal grunt','ready':'one small crisp equipment latch click'}
def describe(key):
 if key in WORLD:return WORLD[key]
 if key.startswith('foley-'):
  for h in HERO:
   if key.startswith('foley-'+h+'-'):
    kind=key[len('foley-'+h+'-'):].rsplit('-',1)[0]
    return FOLEY[kind]+', '+HERO[h][3]
 if key.startswith('mamai-melee-weapon'):return 'one sharp curved sword swishing through air'
 for h in HERO:
  if not key.startswith(h+'-'):continue
  suffix=key[len(h)+1:];weapon,special,ultimate,material=HERO[h]
  if suffix.startswith('weapon-'):return weapon
  if suffix=='hit':return {'franko':'iron hammer smashing rock','skovoroda':'iron frying pan smacking with a short comic clang','lesya':'crossbow bolt hitting with wet squelch','shevchenko':'heavy wooden mace smacking with a low crack'}.get(h,'short crunchy impact with '+material)
  if suffix=='reload':return 'weapon reloading, deliberate separated mechanical handling and clicks, '+('crossbow string drawn and bolt inserted' if h=='lesya' else 'flintlock powder and ramrod handling' if h=='mamai' else 'sniper rifle magazine removed and inserted' if h=='bilozerska' else material)
  if suffix=='reload-end':return 'one final crisp weapon latch snapping into place, '+material
  if suffix in ['special','ultimate']:return special if suffix=='special' else ultimate
  if suffix.endswith('-loop'):return 'sustained even texture of '+(special if suffix.startswith('special') else ultimate)+', no discrete opening impact'
  if suffix.endswith('-end'):return 'brief fading movement and settling of '+material
 raise ValueError('Missing explicit SFX description: '+key)
def catalog():
 old=json.loads((ROOT/'docs/LOCAL_SFX_BASELINE.json').read_text())
 jobs=[dict(id=c['id'],seconds=c['seconds'],loop=c['loop'],prompt=describe(c['id'])+STYLE) for c in old]
 for key in ['legacy-shot','legacy-hurt','legacy-reload','legacy-rescue']:
  jobs.append(dict(id=key,seconds=.5,loop=False,prompt=WORLD[key]+STYLE))
 roles={'rifle':'short startled male yelp','assault':'short rough breathy grunt','gunner':'deep heavy male grunt','sniper':'short sharp breathy gasp','scout':'muffled surprised grunt and radio click','shield':'low grunt and metal shield clatter','demolition':'high goofy descending yelp'}
 for role,desc in roles.items():
  for v in range(3):jobs.append(dict(id=f'death-{role}-{v}',seconds=.8,loop=False,prompt=desc+', nonverbal theatrical cartoon defeat.'+STYLE))
 for kind,desc in {'splat':'Water splashing loudly','croak':'A frog croaking with a low wet gurgle','gib-land':'A single water drop plopping into water','blood-burst':'A watermelon being smashed'}.items():
  for v in range(3):jobs.append(dict(id=f'gore-{kind}-{v}',seconds=.5,loop=False,prompt=desc+STYLE))
 for boss,desc in {'iron-warden':'heavy armored vehicle collapsing with deep metal crunch, bolts falling and a final low thud','swarm-master':'propellers breaking, motor sputtering to a halt and multiple compact explosive pops','putin':'huge explosive blast with collapsing machinery, low theatrical nonverbal croak and wet splatter'}.items():
  jobs.append(dict(id='death-boss-'+boss,seconds=2.5,loop=False,prompt=desc+STYLE))
 for i,j in enumerate(jobs):j['seed']=909000+i;j['generateSeconds']=max(6,j['seconds']+.4);j['dtype']='fp32'
 extra=ROOT/'docs/ENEMY_PANIC_SFX.json'
 if extra.exists():jobs.extend(json.loads(extra.read_text())['jobs'])
 assert len({j['id'] for j in jobs})==len(jobs)
 return dict(model='Stable Audio 3 Small SFX',runtime='official MLX',style='docs/SFX_STYLE.md',serviceCostUSD=0,jobs=jobs)
if __name__=='__main__':
 p=ROOT/'docs/LOCAL_SFX_CATALOG.json';data=catalog();p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(f'{len(data["jobs"])} effects catalogued: {p}')
