import type {Mission} from './missions.ts';
import type {OperationLayout,Point} from './operation-layout.ts';
const p=(x:number,y:number):Point=>({x,y});
const floor=(left:number,right:number,top:number,permanent=false):OperationLayout['surfaces'][number]=>({left,right,top,kind:permanent?'platform':'stone',permanent});
const ladder=(x:number,bottom:number,top:number)=>({x,bottom,top});
const guard=(x:number,y:number,role:OperationLayout['guards'][number]['role'],commander=false)=>({x,y,role,commander});
const prop=(x:number,y:number,kind:OperationLayout['props'][number]['kind']='barrel')=>({x,y,kind});
const common={bridges:[],forts:[],floorPlans:[],floors:[],ladders:[],allies:[],medkits:[],enemies:[],ammo:[],checkpoint:3,checkpoints:[],mounts:[]};
export const NEW_OPERATIONS:Mission[]=[
 {...common,name:'Вище за наказ',region:'Київ',brief:'Обійдіть заводський двір, підніміться крізь цех і вийдіть на дахи. Захопіть позначені пости та здолайте командира біля евакуації.',theme:'city',score:'city',background:'/assets/kyiv-pixel-background.png',length:154,exit:146,radio:137,
 districts:[{name:'Заводський двір',start:0,end:47,look:'boulevard'},{name:'Вертикальний цех',start:47,end:87,look:'factory'},{name:'Над містом',start:87,end:154,look:'rooftops'}],vehicles:[['shahed',121,38,106]],
 layout:{spawn:p(3,0),exitY:32,radioY:32,checkpoints:[p(42,4),p(76,10),p(58,22),p(106,32)],allies:[p(29,4),p(62,16),p(123,32)],ammo:[p(42,4),p(76,10),p(58,22),p(107,32),p(139,32)],medkits:[p(43,4),p(77,10),p(59,22),p(108,32)],
 surfaces:[floor(20,47,4),floor(48,86,4),floor(48,86,10),floor(48,86,16),floor(48,86,22),floor(48,101,28),floor(97,152,32),
 ...[4,10,16,22,28].flatMap(y=>[floor(48,53,y,true),floor(78,86,y,true)]),floor(54,64,16,true),floor(54,64,22,true),floor(73,79,10,true),floor(39,47,4,true),floor(98,112,32,true),floor(121,126,32,true),floor(135,152,32,true)],
 ladders:[ladder(21,0,4),ladder(46,0,4),ladder(50,4,10),ladder(81,4,10),ladder(51,10,16),ladder(81,16,22),ladder(51,22,28),ladder(99,28,32)],
 props:[prop(12,0,'crate'),prop(34,0,'wall'),prop(35,4),prop(64,4,'crate'),prop(64,10),prop(73,16),prop(66,22,'crate'),prop(92,28),prop(117,32,'crate'),prop(131,32)],
 guards:[guard(15,0,'scout'),guard(24,0,'rifle'),guard(33,0,'shield'),guard(37,4,'gunner'),guard(64,4,'assault'),guard(63,10,'rifle'),guard(71,16,'sniper'),guard(64,22,'assault'),guard(72,28,'shield'),guard(91,28,'rifle'),guard(115,32,'assault'),guard(127,32,'demolition'),guard(136,32,'rifle'),guard(143,32,'gunner',true)],
 rooms:[{left:48,right:86,bottom:0,top:28}],route:[p(21,0),p(21,4),p(42,4),p(81,4),p(81,10),p(76,10),p(51,10),p(51,16),p(81,16),p(81,22),p(58,22),p(51,22),p(51,28),p(99,28),p(99,32),p(106,32),p(146,32)]}},
 {...common,name:'Перевал нескорених',region:'Карпати',brief:'Підніміться уступами до канатної станції. Перетинайте мости, обходьте вогневі точки згори й утримуйте висотні пости.',theme:'mountain',score:'mountain',background:'/assets/mountain-pixel-background.png',length:178,exit:170,radio:161,
 districts:[{name:'Підніжжя',start:0,end:53,look:'pines'},{name:'Високі уступи',start:53,end:121,look:'ridge'},{name:'Верхня станція',start:121,end:178,look:'cableway'}],vehicles:[['shahed',117,32,105]],
 layout:{spawn:p(3,0),exitY:24,radioY:24,checkpoints:[p(43,6),p(84,18),p(131,30)],allies:[p(47,6),p(88,22),p(149,24)],ammo:[p(44,6),p(84,18),p(131,30),p(165,24)],medkits:[p(45,6),p(85,18),p(132,30),p(165,24)],
 surfaces:[...[ [30,52,6],[52,74,12],[74,96,18],[96,120,24],[120,144,30],[144,177,24] ].map(([left,right,top])=>({left,right,top,depth:top,kind:'earth' as const,permanent:true})),floor(62,95,22),floor(62,66,22,true),floor(85,92,22,true),floor(108,143,34),floor(109,113,34,true),floor(134,143,34,true)],
 ladders:[ladder(29,0,6),ladder(51,6,12),ladder(73,12,18),ladder(95,18,24),ladder(119,24,30),ladder(143,24,30),ladder(64,12,22),ladder(89,18,22),ladder(111,24,34),ladder(139,30,34)],
 props:[prop(18,0,'crate'),prop(35,6,'wall'),prop(58,12),prop(69,22),prop(80,18,'crate'),prop(103,24,'wall'),prop(117,34),prop(139,30,'crate'),prop(154,24)],
 guards:[guard(18,0,'rifle'),guard(37,6,'scout'),guard(59,12,'shield'),guard(68,22,'sniper'),guard(80,18,'assault'),guard(102,24,'gunner'),guard(115,24,'rifle'),guard(125,30,'demolition'),guard(138,34,'sniper'),guard(151,24,'assault'),guard(157,24,'shield'),guard(167,24,'gunner',true)],rooms:[],
 route:[p(29,0),p(29,6),p(43,6),p(51,6),p(51,12),p(73,12),p(73,18),p(84,18),p(95,18),p(95,24),p(119,24),p(119,30),p(131,30),p(145,30),p(149,24),p(170,24)]}},
 {...common,name:'Сталева зміна',region:'Дніпровщина',brief:'Рухайтеся танком уздовж колій або обійдіть оборону дахами вагонів. Займіть пости, підніміться до диспетчерської та відкрийте шлях евакуації.',theme:'rail',score:'rail',background:'/assets/rail-pixel-background.png',length:188,exit:181,radio:172,mounts:[9,104],
 districts:[{name:'Вантажний двір',start:0,end:53,look:'station'},{name:'Дахи ешелонів',start:53,end:135,look:'wagons'},{name:'Висотна диспетчерська',start:135,end:188,look:'signals'}],vehicles:[['tank',65,0,49],['shahed',128,14,116]],
 layout:{spawn:p(3,0),exitY:12,radioY:12,checkpoints:[p(40,0),p(95,0),p(148,12)],allies:[p(30,4),p(61,6),p(155,18)],ammo:[p(41,0),p(63,6),p(96,0),p(148,12),p(176,12)],medkits:[p(42,0),p(97,0),p(149,12)],
 surfaces:[floor(20,43,4),floor(48,74,6),floor(79,104,4),floor(110,135,8),floor(133,186,12),floor(141,163,18),
 ...[[20,25,4],[28,33,4],[39,43,4],[48,53,6],[59,65,6],[70,74,6],[79,84,4],[100,104,4],[110,115,8],[129,139,8],[133,141,12],[145,153,12],[152,158,18],[169,186,12]].map(([l,r,y])=>floor(l,r,y,true))],
 ladders:[ladder(22,0,4),ladder(41,0,4),ladder(50,0,6),ladder(72,0,6),ladder(81,0,4),ladder(102,0,4),ladder(112,0,8),ladder(132,0,8),ladder(137,8,12),ladder(154,12,18),ladder(161,12,18)],
 props:[prop(24,0,'crate'),prop(35,4),prop(57,0,'wall'),prop(68,6),prop(88,0,'crate'),prop(119,8),prop(145,12,'crate'),prop(166,12)],
 guards:[guard(17,0,'scout'),guard(31,0,'rifle'),guard(55,0,'shield'),guard(57,6,'gunner'),guard(83,4,'sniper'),guard(88,0,'assault'),guard(117,0,'demolition'),guard(123,8,'rifle'),guard(142,12,'shield'),guard(158,18,'sniper'),guard(164,12,'assault'),guard(178,12,'gunner',true)],
 rooms:[{left:133,right:163,bottom:8,top:18}],route:[p(40,0),p(95,0),p(112,0),p(112,8),p(137,8),p(137,12),p(148,12),p(181,12)]}},
];
