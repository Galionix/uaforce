import type {Mission} from './missions.ts';
import type {OperationLayout,Point} from './operation-layout.ts';
const p=(x:number,y=0):Point=>({x,y});
const floor=(left:number,right:number,top:number):OperationLayout['surfaces'][number]=>({left,right,top,kind:'stone'});
const ladder=(x:number,top:number,bottom=0)=>({x,bottom,top});
const guard=(x:number,y:number,role:OperationLayout['guards'][number]['role'],commander=false)=>({x,y,role,commander});
const group=(x:number,y=0)=>[0,2.6,5.2].map(dx=>({x:x+dx,y,kind:'barrel' as const}));
const target=(x:number,skin:'ammo'|'fuel'|'jet',required=true,y=0)=>({x,y,skin,required});
const common={bridges:[],forts:[],floorPlans:[],floors:[],ladders:[],allies:[],medkits:[],enemies:[],ammo:[],checkpoint:3,checkpoints:[],mounts:[]};
export const RAID_OPERATIONS:Mission[]=[
 {...common,name:'Планове займання',region:'Росія · тилові склади',brief:'За кордоном — склад, який живить наступ. Знищіть три арсенали. Бийте по опорах настилу над другим арсеналом: уламки підривають боєзапас. Обходьте бій по землі, настилу або верхніх містках. Наступна ціль — аеродром.',atmosphere:'ash',theme:'rail',score:'rail',background:'/assets/raids/depot-pixel-background.png',length:184,exit:177,radio:166,mounts:[10,122],
 districts:[{name:'Периметр складу',start:0,end:53,look:'depot'},{name:'Арсенали',start:53,end:130,look:'wagons'},{name:'Вузол постачання',start:130,end:184,look:'factory'}],vehicles:[['tank',76,0,61],['shahed',133,12,116]],
 layout:{spawn:p(3),exitY:0,radioY:0,checkpoints:[p(26),p(72),p(128)],allies:[p(34,6),p(123,6)],ammo:[p(26),p(72),p(128),p(169)],medkits:[p(27),p(73),p(129)],
 supports:[{x:90.5,y:0,w:1,h:4.5,hp:45},{x:103.5,y:0,w:1,h:4.5,hp:45}],
 surfaces:[floor(29,62,6),{...floor(82,111,8),fragile:true},floor(117,157,6),{...floor(89,105,5),fragile:true}],ladders:[ladder(30,6),ladder(60,6),ladder(83,8),ladder(110,8),ladder(118,6),ladder(156,6),{...ladder(91.5,5),fragile:true},{...ladder(103.5,5),fragile:true}],
 props:[...group(39),...group(88),...group(140),...group(97,8),...group(145,6)],targets:[target(47,'ammo'),target(96,'ammo'),target(148,'ammo')],
 guards:[guard(16,0,'scout'),guard(37,0,'rifle'),guard(52,6,'gunner'),guard(65,0,'shield'),guard(86,0,'assault'),guard(94,5,'assault'),guard(101,5,'rifle'),guard(104,8,'sniper'),guard(115,0,'demolition'),guard(136,0,'shield'),guard(143,6,'gunner'),guard(159,0,'assault'),guard(173,0,'gunner',true)],
 rooms:[{left:29,right:62,bottom:0,top:6},{left:82,right:111,bottom:0,top:8},{left:117,right:157,bottom:0,top:6}],route:[p(26),p(30),p(30,6),p(60,6),p(60),p(72),p(118),p(118,6),p(128,6),p(156,6),p(156),p(128),p(177)]}},
 {...common,name:'Нельотна погода',region:'Росія · військовий аеродром',brief:'Знищіть три літаки на стоянках, перш ніж вони злетять. Паливні резервуари й боєзапас підсилюють вибухи. Пройдіть ангари та вежу керування. Після аеродрому — Москва.',atmosphere:'storm',theme:'rail',score:'city',background:'/assets/raids/depot-pixel-background.png',length:210,exit:203,radio:190,mounts:[10,143],
 districts:[{name:'Стоянки авіації',start:0,end:78,look:'depot'},{name:'Паливний сектор',start:78,end:150,look:'factory'},{name:'Вежа керування',start:150,end:210,look:'signals'}],vehicles:[['plane',93,13,78],['tank',146,0,132],['plane',182,14,164]],
 layout:{spawn:p(3),exitY:0,radioY:0,checkpoints:[p(28),p(88),p(152)],allies:[p(40,6),p(187,12)],ammo:[p(28),p(88),p(152),p(198)],medkits:[p(29),p(89),p(153)],
 surfaces:[floor(34,72,6),floor(97,132,6),floor(160,195,6),floor(179,198,12)],ladders:[ladder(35,6),ladder(71,6),ladder(98,6),ladder(131,6),ladder(161,6),ladder(194,6),ladder(181,12,6),ladder(196,12)],
 props:[...group(46),...group(103),...group(164),...group(122,6)],targets:[target(57,'jet'),target(115,'jet'),target(174,'jet'),target(51,'fuel',false),target(109,'fuel',false),target(168,'fuel',false)],
 guards:[guard(16,0,'scout'),guard(44,6,'sniper'),guard(61,0,'rifle'),guard(80,0,'shield'),guard(103,6,'gunner'),guard(123,0,'assault'),guard(139,0,'demolition'),guard(162,6,'shield'),guard(183,12,'sniper'),guard(185,0,'assault'),guard(200,0,'gunner',true)],
 rooms:[{left:34,right:72,bottom:0,top:6},{left:97,right:132,bottom:0,top:6},{left:160,right:195,bottom:0,top:6}],route:[p(28),p(35),p(35,6),p(71,6),p(71),p(88),p(98),p(98,6),p(131,6),p(131),p(152),p(161),p(161,6),p(194,6),p(194),p(203)]}},
 {...common,name:'Кінець бункерної казки',region:'Москва · Кремль',brief:'Шлях до джерела наказів відкрито. Прорвіть зовнішню оборону, знищіть два вузли постачання й увійдіть до Кремля. Остання ціль — Хуйло. Здолайте його та завершіть операцію.',atmosphere:'firestorm',theme:'kremlin',score:'marsh',background:'/assets/raids/kremlin-pixel-background.png',boss:'putin',length:284,exit:277,radio:219,mounts:[10,176],
 districts:[{name:'Підступи до Кремля',start:0,end:83,look:'boulevard'},{name:'Зовнішній мур',start:83,end:171,look:'bunkers'},{name:'Кремлівський двір',start:171,end:284,look:'kremlin'}],vehicles:[['tank',69,0,53],['shahed',135,12,118],['plane',188,14,164],['tank',205,0,187]],
 layout:{spawn:p(3),exitY:0,radioY:0,checkpoints:[p(35),p(117),p(224)],allies:[p(52,6),p(151,12)],ammo:[p(35),p(117),p(177),p(224)],medkits:[p(36),p(118),p(225)],
 surfaces:[floor(43,80,6),floor(88,114,8),floor(131,168,6),floor(141,161,12),floor(180,215,6)],ladders:[ladder(44,6),ladder(79,6),ladder(89,8),ladder(113,8),ladder(132,6),ladder(167,6),ladder(143,12,6),ladder(160,12,6),ladder(181,6),ladder(214,6)],
 props:[...group(91),...group(156),...group(193),...group(100,8)],targets:[target(99,'ammo'),target(164,'fuel')],
 guards:[guard(17,0,'scout'),guard(49,6,'gunner'),guard(62,0,'shield'),guard(85,0,'assault'),guard(106,8,'sniper'),guard(125,0,'demolition'),guard(146,6,'shield'),guard(156,12,'sniper'),guard(172,0,'assault'),guard(196,6,'gunner'),guard(215,0,'shield')],
 rooms:[{left:43,right:80,bottom:0,top:6},{left:131,right:168,bottom:0,top:12}],route:[p(35),p(44),p(44,6),p(79,6),p(79),p(89),p(89,8),p(113,8),p(113),p(117),p(181),p(181,6),p(214,6),p(214),p(224),p(236),p(277)]}},
];
