/* Глубины астрала: a self-contained Phaser combat slice. */
const W = 2200, H = 1400;
const STARTS = [
  [760,510,'club'],[875,390,'stone'],[1250,420,'club'],[1460,530,'stone'],
  [1510,840,'club'],[1370,1000,'stone'],[890,1010,'club'],[680,850,'stone'],
  [1120,330,'club'],[1730,680,'club']
];
const WORLD_SPHERES=[
  {id:'level',name:'Сфера уровня',glyph:'Ⅰ',description:'Уровень всех монстров +1. Каждая копия занимает слот.',repeat:true,max:6},
  {id:'warrior',name:'Гремлин воин',glyph:'⚔',description:'Добавляет одного бронированного бойца.'},
  {id:'archer',name:'Гремлин стрелок',glyph:'➶',description:'Добавляет одного дальнобойного стрелка.'},
  {id:'shaman',name:'Гремлин шаман',glyph:'✦',description:'Добавляет мага, который стреляет и лечит союзников.'},
  {id:'empower',name:'Сфера усиления',glyph:'✧',description:'Аффиксов у каждого монстра +1. Каждая копия занимает слот.',repeat:true,max:6},
  {id:'ruins',name:'Сфера руин',glyph:'▥',description:'Добавляет разрушенные сооружения на карту.'},
  {id:'rocks',name:'Сфера камней',glyph:'◆',description:'Добавляет камни-препятствия на карту.'},
  {id:'swamp',name:'Сфера болота',glyph:'≈',description:'Добавляет топи, замедляющие героя.'},
  {id:'trees',name:'Сфера деревьев',glyph:'♠',description:'Добавляет деревья и лесные преграды.'},
  {id:'skeletonKnight',name:'Скелеты-рыцари',glyph:'♞',description:'Добавляет трёх бронированных мечников с парированием и кружилкой.'},
  {id:'skeletonMage',name:'Скелеты-маги',glyph:'☠',description:'Добавляет трёх магов холода и крови.'},
  {id:'grass',name:'Сфера травы',glyph:'♧',description:'Добавляет высокую траву, скрывающую стоящих в ней монстров.'},
  {id:'skeletonTank',name:'Скелеты-танки',glyph:'▰',description:'Добавляет трёх бойцов со щитами, перехватывающих стрелы.'}
];
const WORLD_SPHERE_LIMIT=6;
const WORLD_SPHERE_UNLOCK_KEY='astral-unlocked-world-spheres';
const loadUnlockedWorldSpheres=()=>{
  try{
    if(typeof localStorage==='undefined')return [];
    const saved=JSON.parse(localStorage.getItem(WORLD_SPHERE_UNLOCK_KEY)||'[]');
    return Array.isArray(saved)?saved.filter(id=>WORLD_SPHERES.some(sphere=>sphere.id===id)):[];
  }catch{return [];}
};
const unlockedWorldSpheres=new Set(loadUnlockedWorldSpheres());
const saveUnlockedWorldSpheres=()=>{
  try{if(typeof localStorage!=='undefined')localStorage.setItem(WORLD_SPHERE_UNLOCK_KEY,JSON.stringify([...unlockedWorldSpheres]));}catch{}
};
const isWorldSphereUnlocked=id=>unlockedWorldSpheres.has(id);
function discoverWorldSpheres(build,unlocked=unlockedWorldSpheres){
  const discovered=[];
  for(const sphere of WORLD_SPHERES){
    const present=sphere.repeat?build[sphere.id]>0:!!build[sphere.id];
    if(present&&!unlocked.has(sphere.id)){unlocked.add(sphere.id);discovered.push(sphere);}
  }
  if(discovered.length&&unlocked===unlockedWorldSpheres)saveUnlockedWorldSpheres();
  return discovered;
}
const WORLD_TEMPLATES={
  maze:{name:'ЛАБИРИНТ',icon:'▥',description:'Каменные перегородки, обходы и узкие проходы.'},
  open:{name:'ОТКРЫТАЯ МЕСТНОСТЬ',icon:'◇',description:'Просторная карта для свободного манёвра.'},
  corridor:{name:'КОРИДОР',icon:'➜',description:'Длинный путь вперёд, враги стоят по всему маршруту.'}
};
const worldBuild={template:'open',level:0,warrior:false,archer:false,shaman:false,empower:0,ruins:false,rocks:false,swamp:false,trees:false,skeletonKnight:false,skeletonMage:false,grass:false,skeletonTank:false};
const blankWorldBuild=()=>Object.fromEntries(Object.entries(worldBuild).map(([key,value])=>[key,key==='template'?'open':typeof value==='number'?0:false]));
let runBuild=null,runDepth=1;
let runMode='map';
const gameBuild=()=>runBuild||worldBuild;
const worldSphereCount=build=>WORLD_SPHERES.reduce((sum,sphere)=>sum+(sphere.repeat?build[sphere.id]:Number(!!build[sphere.id])),0);
const MAP_ONLY_SPHERES=new Set(['ruins','rocks','swamp','trees','grass']);
const landscapeSphereCount=build=>[...MAP_ONLY_SPHERES].reduce((sum,id)=>sum+Number(!!build[id]),0);
const depthMerchantCount=(build,depth)=>depth>0&&depth%10===0?landscapeSphereCount(build):0;
const difficultySphereCount=build=>WORLD_SPHERES.reduce((sum,sphere)=>sum+(sphere.id!=='level'&&!MAP_ONLY_SPHERES.has(sphere.id)?(sphere.repeat?build[sphere.id]:Number(!!build[sphere.id])):0),0)+build.level;
const sphereCoinMultiplier=build=>1+difficultySphereCount(build)*.1;
const scaledCoins=(amount,build)=>Math.round(amount*sphereCoinMultiplier(build));
const memoryShardsForEnemy=(monsterLevel,sphereCount,depth)=>Math.max(1,Math.round((1+monsterLevel+sphereCount)*(1+Math.max(1,depth)*.1)));
const memoryShardsForMap=build=>100+landscapeSphereCount(build)*10;
const BIOME_BOSS_COST=10000;
const SKELETON_KINDS=new Set(['skeletonKnight','skeletonMage','skeletonTank']);
function enemyLootPlan(kind,level,depth,random=Math.random){
  if(kind==='archer')return [{arrows:1+Math.floor(random()*3)}];
  if(kind==='warrior')return random()<.1?[{potion:1}]:[];
  if(kind==='shaman'&&random()<.2)return random()<.5?[{potion:1}]:[{heal:Math.max(1,level+depth)}];
  if(SKELETON_KINDS.has(kind)){
    const roll=random(),bonus=roll<1/3?{arrows:2+Math.floor(random()*3)}:roll<2/3?{potion:1}:{memory:100};
    return [{equipment:true},bonus];
  }
  return [];
}
function makeDepthMerchantStock(index,depth,random=Math.random){
  const stock=[
    {id:`arrows-${index}`,kind:'arrows',amount:10,price:30+depth*2,label:'10 СТРЕЛ'},
    {id:`potion-${index}`,kind:'potion',amount:1,price:45+depth*2,label:'ЗЕЛЬЕ ЛЕЧЕНИЯ'}
  ];
  if(random()<.5)stock.push({id:`memory-${index}`,kind:'memory',amount:100,price:120+depth*3,label:'100 ОСКОЛКОВ ПАМЯТИ'});
  return stock;
}
const xpToNext=level=>100+level*35;
const itemTierForLevel=level=>Math.floor(Math.max(1,level)/5);
const itemLevelForCharacter=level=>itemTierForLevel(level)*5||1;
const itemStatMultiplier=level=>1.2**itemTierForLevel(level);
const itemPriceMultiplier=level=>1.3**itemTierForLevel(level);
const scaleItemStat=(value,level)=>Math.max(1,Math.round(value*itemStatMultiplier(level)));
const mapExperience=(heroLevel,build)=>Math.round((100+(heroLevel+build.level)*35+worldSphereCount(build)*8)*sphereCoinMultiplier(build));
function grantExperience(character,amount){
  character.xp+=amount;
  let gained=0;
  while(character.xp>=xpToNext(character.level)){
    character.xp-=xpToNext(character.level);
    character.level++;gained++;
  }
  return gained;
}
function hammerAreaDamage(base,distance,radius){
  return Math.round(base*(1-.65*clamp(distance/radius,0,1)));
}
function descendBuild(build,random=Math.random){
  if(random()<.5){build.level++;return {type:'level',name:'Уровень монстров +1'};}
  const candidates=WORLD_SPHERES.filter(s=>s.id!=='level'&&(s.repeat?build[s.id]<s.max:!build[s.id]));
  if(!candidates.length){build.level++;return {type:'level',name:'Уровень монстров +1'};}
  const sphere=candidates[Math.floor(random()*candidates.length)];
  if(sphere.repeat)build[sphere.id]++;else build[sphere.id]=true;
  return {type:'sphere',id:sphere.id,name:sphere.name};
}
function setWorldSphere(build,id,delta=1){
  const sphere=WORLD_SPHERES.find(item=>item.id===id);
  if(!sphere||!isWorldSphereUnlocked(id))return false;
  const current=build[id];
  const next=sphere.repeat?clamp(current+delta,0,sphere.max):!current;
  if(next===current)return false;
  if(worldSphereCount(build)+(sphere.repeat?next-current:Number(next)-Number(current))>WORLD_SPHERE_LIMIT)return false;
  build[id]=next;
  return true;
}
const WORLD_AFFIXES=[
  {id:'sturdy',name:'Крепкий',hp:1.35},
  {id:'armored',name:'Бронированный',armor:12},
  {id:'swift',name:'Проворный',speed:1.32},
  {id:'fierce',name:'Свирепый',damage:1.3},
  {id:'vital',name:'Живучий',hp:1.2},
  {id:'raging',name:'Разъярённый',damage:1.18,speed:1.12}
];
const MAP_BOSSES=[
  {id:'warden',name:'СТРАЖ РАЗЛОМА',color:0xd7a579,hp:720,armor:25,description:'Крушит землю и вызывает каменный дождь.'},
  {id:'mire',name:'МАТЬ ТОПИ',color:0x86bd9c,hp:620,armor:14,description:'Разливает топь и стреляет ядовитыми сгустками.'},
  {id:'hunter',name:'АСТРАЛЬНЫЙ ЛОВЧИЙ',color:0x9ebcdb,hp:570,armor:10,description:'Пускает веер стрел и прицельный выстрел.'},
  {id:'duelist',name:'ПЕПЕЛЬНЫЙ ДУЭЛЯНТ',color:0xe2a4a0,hp:650,armor:17,description:'Рубит широкой дугой и совершает выпад.'}
];
const BIOME_BOSS={id:'junkking',name:'ГРЕМЛИН КОРОЛЬ МУСОРНОЙ КУЧИ',color:0xd5a252,hp:3800,armor:28,baseAttack:52,description:'Повелитель Астральной пустоши, построивший трон из обломков исчезнувших миров.'};
const JUNK_KING_COOLDOWNS={sling:6000,summon:30000,dash:10500};
const junkKingSummonTypes=phase=>phase===1?['club','club']:['warrior','warrior','warrior','shaman'];
const biomeBossStats=heroLevel=>{
  const level=Math.max(1,heroLevel);
  return {hp:Math.round(BIOME_BOSS.hp*(1+(level-1)*.14)),armor:BIOME_BOSS.armor+Math.floor((level-1)*1.15),damageFactor:1+(level-1)*.1,speed:98+(level-1)*1.5};
};
const worldStonePositions=[[410,320],[570,1130],[1620,250],[1800,1090],[370,750],[1860,670],[920,590],[1290,940]];
const ENEMY_MELEE_WEAPONS={
  club:{name:'ДУБИНА',range:74,halfAngle:.72,windup:610,cooldown:1650,damage:17,color:0xd78665},
  sword:{name:'МЕЧ',range:94,halfAngle:1.02,windup:460,cooldown:1330,damage:16,color:0xe2a075},
  spear:{name:'КОПЬЁ',range:155,halfWidth:22,windup:700,cooldown:1750,damage:20,color:0xd56f72},
  hammer:{name:'МОЛОТ',offset:76,radius:68,windup:940,cooldown:2450,damage:29,color:0xeab071}
};
const enemyMeleeWeaponFor=(kind,index)=>kind==='warrior'?'hammer':kind==='club'?['club','sword','spear','hammer'][index%4]:null;
function enemyMeleeContains(weapon,attack,target){
  const spec=ENEMY_MELEE_WEAPONS[weapon];
  if(!spec)return false;
  const dx=target.x-attack.x,dy=target.y-attack.y;
  const along=dx*Math.cos(attack.angle)+dy*Math.sin(attack.angle);
  const sideways=Math.abs(dx*Math.sin(attack.angle)-dy*Math.cos(attack.angle));
  if(weapon==='hammer')return Math.hypot(along-spec.offset,sideways)<=spec.radius;
  if(weapon==='spear')return along>=12&&along<=spec.range&&sideways<=spec.halfWidth;
  const delta=Math.atan2(dy,dx)-attack.angle;
  return Math.hypot(dx,dy)<=spec.range&&along>0&&Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))<=spec.halfAngle;
}
function layoutRandom(seed){
  let state=(seed>>>0)||1;
  return ()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
}
function createWorldLayout(template='open',seed=1){
  if(!WORLD_TEMPLATES[template])template='open';
  const random=layoutRandom(seed),between=(a,b)=>Math.round(a+random()*(b-a));
  const layout={template,seed,spawn:{x:1100,y:805},altar:{x:1100,y:705},walls:[],rocks:[],ruins:[],swamps:[],trees:[],grass:[],enemyPoints:[],patches:[]};
  if(template==='maze'){
    const cols=8,rows=5,cw=235,ch=220,left=160,top=150,seen=new Set([0]),stack=[0],open=new Set();
    while(stack.length){
      const cell=stack[stack.length-1],cx=cell%cols,cy=Math.floor(cell/cols);
      const neighbors=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]].filter(([x,y])=>x>=0&&x<cols&&y>=0&&y<rows&&!seen.has(y*cols+x));
      if(!neighbors.length){stack.pop();continue;}
      const [nx,ny]=neighbors[Math.floor(random()*neighbors.length)],next=ny*cols+nx;
      open.add([Math.min(cell,next),Math.max(cell,next)].join(':'));seen.add(next);stack.push(next);
    }
    const wall=(x,y,w,h)=>layout.walls.push({x,y,w,h});
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const id=y*cols+x,center={x:left+x*cw+cw/2,y:top+y*ch+ch/2};
      layout.enemyPoints.push(center);
      if(x<cols-1&&!open.has(`${id}:${id+1}`))wall(left+(x+1)*cw-18,top+y*ch,36,ch);
      if(y<rows-1&&!open.has(`${id}:${id+cols}`))wall(left+x*cw,top+(y+1)*ch-18,cw,36);
    }
    layout.spawn={...layout.enemyPoints[0]};layout.altar={...layout.enemyPoints[cols*rows-1]};
    layout.enemyPoints=layout.enemyPoints.filter((_,i)=>i!==0&&i!==cols*rows-1);
    layout.rocks=[[left+70,top+60],[left+cw*5+70,top+ch*2+60],[left+cw*3+70,top+ch*4+60]];
    layout.ruins=[[left+cw*4+65,top+ch+55,'ruin-pillar'],[left+cw*6+65,top+ch*3+55,'ruin-wall']];
    layout.swamps=[[left+cw*1.5,top+ch*2.5],[left+cw*4.5,top+ch*3.5]];
  }else if(template==='corridor'){
    const count=12,width=165,first=110,half=190,centers=[700];
    for(let i=1;i<count;i++)centers.push(clamp(centers[i-1]+between(-115,115),430,970));
    for(let i=0;i<count;i++){
      const x=first+i*width,y=centers[i];
      layout.walls.push({x,y:100,w:width,h:y-half-100},{x,y:y+half,w:width,h:1300-y-half});
      for(const offset of [-90,0,90])layout.enemyPoints.push({x:x+width/2,y:y+offset});
    }
    layout.spawn={x:first+width/2,y:centers[0]};layout.altar={x:first+(count-1)*width+width/2,y:centers[count-1]};
    layout.enemyPoints=layout.enemyPoints.slice(3,-3);
    layout.rocks=[2,5,8].map(i=>[first+i*width+82,centers[i]+95]);
    layout.ruins=[3,7].map(i=>[first+i*width+82,centers[i]-105,'ruin-pillar']);
    layout.swamps=[4,9].map(i=>[first+i*width+82,centers[i]]);
    layout.road=centers.map((y,i)=>({x:first+i*width+width/2,y}));
  }else{
    layout.rocks=worldStonePositions;
    layout.ruins=[[430,970,'ruin-pillar'],[1750,420,'ruin-pillar'],[670,310,'ruin-wall'],[1550,1170,'ruin-wall']];
    layout.swamps=[[510,520],[1640,690],[770,1080],[1510,1060]];
    for(let i=0;i<32;i++)layout.patches.push({x:between(160,2040),y:between(160,1240),rx:between(30,115),ry:between(18,70)});
    for(let x=320;x<2000;x+=330)for(let y=300;y<1220;y+=300)layout.enemyPoints.push({x:x+between(-90,90),y:y+between(-75,75)});
  }
  const freePoint=(minDistance=210)=>{
    for(let attempt=0;attempt<100;attempt++){
      const x=between(190,2010),y=between(190,1210);
      if(Math.hypot(x-layout.spawn.x,y-layout.spawn.y)<minDistance||Math.hypot(x-layout.altar.x,y-layout.altar.y)<minDistance)continue;
      if(layout.walls.some(w=>x>w.x-90&&x<w.x+w.w+90&&y>w.y-90&&y<w.y+w.h+90))continue;
      return [x,y];
    }
    return [1100,350];
  };
  layout.trees=Array.from({length:12},()=>freePoint(180));
  layout.grass=Array.from({length:9},()=>freePoint(145));
  layout.chest=layout.enemyPoints[Math.floor(layout.enemyPoints.length/2)]||{x:1100,y:420};
  return layout;
}
function prepareJunkyardLayout(layout){
  layout.template='open';layout.spawn={x:1100,y:1190};layout.altar={x:1100,y:190};layout.patches=[];layout.road=null;
  layout.walls=[{x:120,y:125,w:620,h:34},{x:1460,y:125,w:620,h:34},{x:120,y:1240,w:650,h:34},{x:1430,y:1240,w:650,h:34},{x:120,y:125,w:34,h:1149},{x:2046,y:125,w:34,h:1149}];
  layout.rocks=[];layout.ruins=[];layout.trees=[];layout.grass=[];layout.enemyPoints=[];
  layout.swamps=[[520,690],[1690,650],[785,350],[1440,1010]];
  layout.junkProps=[
    {x:345,y:315,type:'junk-pile',w:120,h:70},{x:635,y:480,type:'junk-car',w:126,h:60},{x:1790,y:325,type:'junk-pile',w:120,h:70},{x:1515,y:500,type:'junk-car',w:126,h:60},
    {x:385,y:930,type:'junk-car',w:126,h:60},{x:690,y:1080,type:'junk-pile',w:120,h:70},{x:1780,y:930,type:'junk-car',w:126,h:60},{x:1510,y:1110,type:'junk-pile',w:120,h:70},
    {x:820,y:690,type:'junk-pile',w:105,h:64},{x:1380,y:710,type:'junk-pile',w:105,h:64},{x:505,y:410,type:'junk-barrels',w:58,h:45},{x:1670,y:430,type:'junk-barrels',w:58,h:45}
  ];
  return layout;
}
function worldEnemyStarts(build,layout=createWorldLayout(build.template,1)){
  const types=[...STARTS.map(([, ,kind])=>kind),...(build.warrior?['warrior']:[]),...(build.archer?['archer']:[]),...(build.shaman?['shaman']:[]),...(build.skeletonKnight?Array(3).fill('skeletonKnight'):[]),...(build.skeletonMage?Array(3).fill('skeletonMage'):[]),...(build.skeletonTank?Array(3).fill('skeletonTank'):[])];
  const random=layoutRandom((layout.seed^0x9e3779b9)>>>0),between=(a,b)=>Math.round(a+random()*(b-a));
  const taken=[];
  const blocked=(x,y)=>{
    if(Math.hypot(x-layout.spawn.x,y-layout.spawn.y)<185||Math.hypot(x-layout.altar.x,y-layout.altar.y)<155)return true;
    if(layout.walls.some(w=>x>w.x-55&&x<w.x+w.w+55&&y>w.y-55&&y<w.y+w.h+55))return true;
    if(build.rocks&&layout.rocks.some(([rx,ry])=>Math.hypot(x-rx,y-ry)<95))return true;
    if(build.ruins&&layout.ruins.some(([rx,ry])=>Math.hypot(x-rx,y-ry)<105))return true;
    if(build.trees&&layout.trees.some(([rx,ry])=>Math.hypot(x-rx,y-ry)<80))return true;
    return taken.some(([tx,ty])=>Math.hypot(x-tx,y-ty)<92);
  };
  const points=[...layout.enemyPoints].sort((a,b)=>a.x-b.x||a.y-b.y);
  for(let i=0;i<types.length;i++){
    let position=null;
    for(let band=0;band<points.length&&!position;band++){
      const center=points[(Math.floor((i+.5)*points.length/types.length)+band)%points.length];
      for(let attempt=0;attempt<70;attempt++){
        const x=clamp(between(center.x-48,center.x+48),155,2045);
        const y=clamp(between(center.y-45,center.y+45),170,1230);
        if(!blocked(x,y)){position=[x,y];break;}
      }
    }
    if(!position)throw new Error(`Нет свободного места для врага на карте ${layout.template}`);
    taken.push(position);
  }
  return types.map((kind,i)=>[taken[i][0],taken[i][1],kind]);
}
const $ = id => document.getElementById(id);
const clamp = Phaser.Math.Clamp;
const APPEARANCES = {
  ash:{name:'Пепельный',swatch:'#476579',cloak:'#344d5a',trim:'#516978',inner:'#1f3445'},
  moss:{name:'Странник',swatch:'#638264',cloak:'#486b58',trim:'#769477',inner:'#284c42'},
  ember:{name:'Багряный',swatch:'#a26360',cloak:'#825052',trim:'#ad7071',inner:'#5d343e'}
};
const WEAPONS = {
  sword: {name:'МЕЧ',icon:'⚔',description:'Быстрый удар широкой дугой.',stats:'52 УРОНА · 0,43 С',tags:['melee','arc']},
  spear: {name:'КОПЬЁ',icon:'➶',description:'Точный выпад, пробивающий двух врагов. Кончик наносит усиленный урон.',stats:'46 УРОНА · 155 ДАЛЬНОСТЬ · 0,60 С',tags:['melee','thrust']},
  hammer: {name:'МОЛОТ',icon:'⚒',description:'Медленный удар по области вокруг точки попадания.',stats:'92 УРОНА · 1,45 С',tags:['melee','impact']}
};
const WEAPON_GENITIVE={sword:'МЕЧА',spear:'КОПЬЯ',hammer:'МОЛОТА'};
const PLAYER_WEAPON_DAMAGE={sword:52,spear:46,hammer:92};
const SPEAR_BASE_REACH=155, SPEAR_EXTENDED_REACH=184, SPEAR_HIT_HALF_WIDTH=17;
const SPEAR_TIP_START=.72, SPEAR_TIP_MULTIPLIER=1.25, SPEAR_VULNERABILITY_MULTIPLIER=1.12;
const HAMMER_QUICK_DAMAGE=Math.round(PLAYER_WEAPON_DAMAGE.hammer*2.5);
const SWORD_SPIN_MOVE_MULTIPLIER=1.4, SWORD_HUNT_RANGE=380, SWORD_HUNT_DAMAGE=Math.round(PLAYER_WEAPON_DAMAGE.sword*1.5);
const TAGS = {melee:'Ближний бой',arc:'Дуга',thrust:'Выпад',impact:'Удар',projectile:'Снаряд',roll:'Перекат'};
const MOD_LIMIT=6;
const MODS = [
  {id:'bleed',name:'Кровавая кромка',description:'Попадания в ближнем бою вызывают кровотечение.',tags:['melee']},
  {id:'echo',name:'Эхо атаки',description:'Повторяет 35% урона по цели через мгновение.',tags:['melee']},
  {id:'fury',name:'Ярость',description:'Урон в ближнем бою увеличен на 20%.',tags:['melee']},
  {id:'quickHands',name:'Быстрые руки',description:'Атаки ближнего боя восстанавливаются быстрее.',tags:['melee']},
  {id:'wideArc',name:'Широкий замах',description:'Расширяет угол дуговой атаки.',tags:['arc']},
  {id:'crescent',name:'Полумесяц',description:'Дуга меча достигает цели на 18 дальше.',tags:['arc']},
  {id:'doubleArc',name:'Вторая дуга',description:'Следом проходит ещё один, более слабый взмах.',tags:['arc']},
  {id:'longThrust',name:'Длинный выпад',description:'Увеличивает дальность выпада на 24.',tags:['thrust']},
  {id:'narrowFocus',name:'Точное остриё',description:'Урон копья увеличен на 30%.',tags:['thrust']},
  {id:'cripple',name:'Подсечка',description:'Укол замедляет противника на короткое время.',tags:['thrust']},
  {id:'shockwave',name:'Ударная волна',description:'Расширяет область удара молота на 24.',tags:['impact']},
  {id:'aftershock',name:'Послезвучие',description:'Через мгновение молот наносит второй удар по области.',tags:['impact']},
  {id:'heavyHead',name:'Тяжёлая головка',description:'Урон молота выше, но удары ещё медленнее.',tags:['impact']},
  {id:'tripleShot',name:'Тройной залп',description:'Три стрелы за один выстрел и одну стрелу из колчана.',tags:['projectile']},
  {id:'piercing',name:'Сквозная стрела',description:'Стрела пронзает ещё одного противника.',tags:['projectile']},
  {id:'quickDraw',name:'Быстрая тетива',description:'Лук стреляет чаще.',tags:['projectile']},
  {id:'powerShot',name:'Тяжёлый наконечник',description:'Каждая стрела наносит больше урона.',tags:['projectile']},
  {id:'longFlight',name:'Дальний полёт',description:'Стрела летит дольше.',tags:['projectile']},
  {id:'venom',name:'Ядовитая стрела',description:'Попадание отравляет цель.',tags:['projectile']},
  {id:'feathered',name:'Лёгкое оперение',description:'Скорость стрелы увеличена.',tags:['projectile']},
  {id:'quickRoll',name:'Лёгкая поступь',description:'Перекат быстрее восстанавливается.',tags:['roll']}
];
const SKILL_TAGS={skill:'Умение',melee:'Ближний бой',thrust:'Выпад',dash:'Рывок',buff:'Усиление',guard:'Защита',impact:'Удар',area:'Область',debuff:'Ослабление',arc:'Дуга',parry:'Парирование',finisher:'Добивание'};
const SKILLS={
  spear:[
    {id:'dash',name:'Пронзающий рывок',cooldown:8,tags:['dash','thrust','melee'],description:'Неуязвимый рывок на 55 урона: вызывает кровотечение и на 2 с ускоряет атаки копьём на 25%.'},
    {id:'chain',name:'Цепь пронзаний',cooldown:5,tags:['finisher','thrust','melee'],description:'Укол двойной дальности. Добивание даёт неуязвимый рывок к ближайшему врагу и +60% к следующему урону.'},
    {id:'frenzy',name:'Стремительность',cooldown:10,tags:['buff'],description:'6 с: атаки в 2 раза быстрее, движение ×1,5, выпады пробивают всех. Убийства продлевают эффект до 3 с.'}
  ],
  hammer:[
    {id:'bastion',name:'Накопленный удар',cooldown:10,tags:['guard','buff'],description:'5 с: сопротивление 60%. Предотвращённый урон накапливается и взрывается вокруг героя.'},
    {id:'quickStrike',name:'Быстрый молот',cooldown:2,tags:['impact','area','melee'],description:'Удар в 2 раза быстрее, на 150% сильнее обычной атаки и с меньшей областью.'},
    {id:'sunder',name:'Раскол брони',cooldown:6,tags:['debuff','impact','area'],description:'Удар без урона, который снижает броню врагов на 80%.'}
  ],
  sword:[
    {id:'parry',name:'Контррывок',cooldown:3,tags:['parry','guard'],description:'0,5 с на парирование. Успех мгновенно переносит героя к атакующему и наносит ответный удар.'},
    {id:'spin',name:'Кровавый вихрь',cooldown:6,tags:['area','arc','melee'],description:'5 с круговых ударов по 80% урона: герой движется быстрее и притягивает ближайших врагов.'},
    {id:'execute',name:'Охота',cooldown:5,tags:['finisher','arc','melee'],description:'Рывок к выбранной цели с мощным ударом. Убийство восстанавливает навык и здоровье.'}
  ]
};
for(const skills of Object.values(SKILLS))for(const skill of skills)skill.tags.push('skill');
const SKILL_MODS=[
  {id:'skillRecovery',name:'Сокращение',tags:['skill'],description:'Перезарядка навыка сокращается на 10%.'},
  {id:'skillVitality',name:'Искра жизни',tags:['skill'],description:'Применение навыка восстанавливает 6 здоровья.'},
  {id:'skillFleet',name:'Порыв',tags:['skill'],description:'После применения скорость движения повышена на 20% в течение 1,5 с.'},
  {id:'skillWard',name:'Покров',tags:['skill'],description:'В течение 2 с после применения входящий урон снижен на 20%.'},
  {id:'skillFocus',name:'Прицел',tags:['skill'],description:'Следующий удар после применения навыка сильнее на 15%.'},
  {id:'skillBleed',name:'Кровавый след',tags:['melee'],description:'Навык накладывает кровотечение.'},
  {id:'skillEcho',name:'Отголосок',tags:['melee'],description:'Через миг повторяет 25% урона навыка.'},
  {id:'dashReach',name:'Дальний рывок',tags:['dash'],description:'Рывок проходит на 80 дальше.'},
  {id:'dashMomentum',name:'Инерция',tags:['dash'],description:'После рывка следующий урон усилен на 25%.'},
  {id:'longBuff',name:'Продление',tags:['buff'],description:'Усиление или защитная стойка длится на 2 с дольше.'},
  {id:'strongGuard',name:'Твёрдая стойка',tags:['guard'],description:'Защита молота поглощает 70%; окно парирования длиннее на 0,25 с.'},
  {id:'wideSkill',name:'Широкий охват',tags:['area'],description:'Увеличивает область навыка на 25.'},
  {id:'execution',name:'Точное добивание',tags:['finisher'],description:'Урон добивающего удара увеличен на 25%.'},
  {id:'deepSunder',name:'Глубокий раскол',tags:['debuff'],description:'Снижение брони достигает 90%.'},
  {id:'heavyImpact',name:'Сильный толчок',tags:['impact'],description:'Урон ударного навыка увеличен на 25%.'}
];
const SKILL_MOD_LIMIT=6;
const loadout={appearance:'ash',weapon:'sword',editing:'sword',modsets:{sword:new Set(),spear:new Set(),hammer:new Set(),bow:new Set()},
  skillMods:{sword:{parry:new Set(),spin:new Set(),execute:new Set()},spear:{dash:new Set(),chain:new Set(),frenzy:new Set()},hammer:{bastion:new Set(),quickStrike:new Set(),sunder:new Set()}},filter:'all'};
const skillById=(weapon,id)=>SKILLS[weapon]?.find(skill=>skill.id===id);
const skillModById=id=>SKILL_MODS.find(mod=>mod.id===id);
const canSocketSkillMod=(weapon,skillId,modId)=>{
  const skill=skillById(weapon,skillId),mod=skillModById(modId);
  return !!skill&&!!mod&&mod.tags.some(tag=>skill.tags.includes(tag));
};
const characterModLimit=()=>Math.floor(profile.level/2);
const equippedCharacterMods=()=>Object.values(loadout.modsets).reduce((sum,set)=>sum+set.size,0);
const skillModLimit=()=>Math.min(SKILL_MOD_LIMIT,Math.floor(profile.level/10));
function socketSkillMod(weapon,skillId,modId){
  if(!skillById(weapon,skillId)||!(weapon in loadout.skillMods))return false;
  if(!canSocketSkillMod(weapon,skillId,modId))return false;
  const chosen=loadout.skillMods[weapon][skillId];
  if(chosen.has(modId))chosen.delete(modId);
  else if(chosen.size<skillModLimit())chosen.add(modId);
  else return false;
  return true;
}
const skillHasMod=(weapon,skillId,modId)=>loadout.skillMods[weapon]?.[skillId]?.has(modId)||false;
const tagsFor=weapon=>weapon==='bow'?['projectile']:[...WEAPONS[weapon].tags,'roll'];
const canEquip=(mod,weapon=loadout.editing)=>mod.tags.some(tag=>tagsFor(weapon).includes(tag));
const hasMod=(id,tags)=>{
  const weapon=tags.includes('projectile')?'bow':loadout.weapon;
  return loadout.modsets[weapon].has(id)&&MODS.find(mod=>mod.id===id).tags.some(tag=>tags.includes(tag));
};
function toggleMod(id,weapon) {
  const mod=MODS.find(item=>item.id===id);
  if(!mod||!loadout.modsets[weapon]||!canEquip(mod,weapon))return false;
  const chosen=loadout.modsets[weapon];
  if(chosen.has(id)){chosen.delete(id);return true;}
  if(chosen.size>=MOD_LIMIT||equippedCharacterMods()>=characterModLimit())return false;
  chosen.add(id);return true;
}

const INVENTORY_LIMIT=40;
const SLOT_NAMES={mainHand:'Оружие',bow:'Лук',head:'Шлем',chest:'Доспех',gloves:'Перчатки',boots:'Сапоги',ring1:'Кольцо I',ring2:'Кольцо II',amulet:'Амулет'};
const ITEM_BASES=[
  {name:'Железный меч',slot:'mainHand',weapon:'sword',kind:'weapon',base:{damage:2}},
  {name:'Астральный клинок',slot:'mainHand',weapon:'sword',kind:'weapon',base:{damage:6}},
  {name:'Охотничье копьё',slot:'mainHand',weapon:'spear',kind:'weapon',base:{damage:3}},
  {name:'Копьё хранителя',slot:'mainHand',weapon:'spear',kind:'weapon',base:{damage:7}},
  {name:'Кузнечный молот',slot:'mainHand',weapon:'hammer',kind:'weapon',base:{damage:4}},
  {name:'Молот разлома',slot:'mainHand',weapon:'hammer',kind:'weapon',base:{damage:9}},
  {name:'Короткий лук',slot:'bow',weapon:'bow',kind:'weapon',base:{damage:2}},
  {name:'Астральный лук',slot:'bow',weapon:'bow',kind:'weapon',base:{damage:7}},
  {name:'Кожаный капюшон',slot:'head',kind:'armor',base:{armor:2}},
  {name:'Шлем стража',slot:'head',kind:'armor',base:{armor:5}},
  {name:'Плащ путника',slot:'chest',kind:'armor',base:{armor:3}},
  {name:'Панцирь бездны',slot:'chest',kind:'armor',base:{armor:8}},
  {name:'Кожаные перчатки',slot:'gloves',kind:'armor',base:{armor:2}},
  {name:'Перчатки охотника',slot:'gloves',kind:'armor',base:{armor:4}},
  {name:'Сапоги странника',slot:'boots',kind:'armor',base:{armor:2}},
  {name:'Сапоги стража',slot:'boots',kind:'armor',base:{armor:5}},
  {name:'Кольцо искры',slot:'ring',kind:'jewelry',base:{}},
  {name:'Кольцо сумрака',slot:'ring',kind:'jewelry',base:{}},
  {name:'Амулет идеи',slot:'amulet',kind:'jewelry',base:{}},
  {name:'Оберег глубин',slot:'amulet',kind:'jewelry',base:{}}
];
const AFFIXES=[
  {name:'Мощный',stat:'power',min:1,max:4,label:'Сила'},
  {name:'Живучий',stat:'vitality',min:1,max:4,label:'Живучесть'},
  {name:'Защитный',stat:'armor',min:1,max:5,label:'Броня'},
  {name:'Стремительный',stat:'haste',min:1,max:4,label:'Скорость атаки'},
  {name:'Меткий',stat:'crit',min:1,max:4,label:'Крит. шанс'},
  {name:'Лёгкий',stat:'speed',min:1,max:3,label:'Скорость движения'}
];
const RARITIES=[{name:'Обычный',className:'common',count:0},{name:'Волшебный',className:'magic',count:1},{name:'Редкий',className:'rare',count:3}];
let nextItemId=1;
const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
function makeItem(base,forcedRarity=null,itemLevel=1) {
  itemLevel=itemLevelForCharacter(itemLevel);
  const rarity=forcedRarity??(Math.random()<.18?2:Math.random()<.57?1:0);
  const pool=[...AFFIXES].sort(()=>Math.random()-.5);
  const rolledAffixes=pool.slice(0,RARITIES[rarity].count).map(a=>({...a,value:randomInt(a.min,a.max)}));
  const affixes=rolledAffixes.map(a=>({...a,value:scaleItemStat(a.value,itemLevel)}));
  const name=affixes.length?`${affixes[0].name} ${base.name.toLowerCase()}`:base.name;
  const score=Object.values(base.base).reduce((n,v)=>n+v,0);
  const basePrice=18+score*3+rarity*28+rolledAffixes.reduce((n,a)=>n+a.value*3,0);
  return {id:nextItemId++,name,baseName:base.name,slot:base.slot,weapon:base.weapon||null,kind:base.kind,
    itemLevel,base:Object.fromEntries(Object.entries(base.base).map(([stat,value])=>[stat,scaleItemStat(value,itemLevel)])),
    rarity,affixes,price:Math.round(basePrice*itemPriceMultiplier(itemLevel))};
}
const starter=name=>makeItem(ITEM_BASES.find(base=>base.name===name),0);
const profile={gold:35,memoryShards:0,biomeBossDefeated:false,level:1,xp:0,mapsCleared:0,location:'city',seenIntro:false,inventory:[starter('Охотничье копьё'),starter('Кузнечный молот')],
  equipment:{mainHand:starter('Железный меч'),bow:starter('Короткий лук'),head:null,chest:null,gloves:null,boots:null,ring1:null,ring2:null,amulet:null},
  shops:{smith:[],jeweler:[]},rerolls:{smith:0,jeweler:0},shopTier:-1};
function gearStats() {
  const result={damage:0,armor:0,power:0,vitality:0,haste:0,crit:0,speed:0};
  for(const item of Object.values(profile.equipment)){
    if(!item)continue;
    for(const [key,value] of Object.entries(item.base)){
      if(key!=='damage')result[key]+=value;
    }
    for(const affix of item.affixes)result[affix.stat]+=affix.value;
  }
  return result;
}
const maxHp=()=>100+gearStats().vitality*8+(profile.level-1)*8;
function rollShop(kind) {
  const pool=ITEM_BASES.filter(base=>kind==='jeweler'?base.kind==='jewelry':base.kind!=='jewelry');
  profile.shops[kind]=Array.from({length:4},()=>makeItem(pool[randomInt(0,pool.length-1)],null,profile.level));
}
function syncShopsToHeroLevel(force=false){
  const tier=itemTierForLevel(profile.level);
  if(!force&&profile.shopTier===tier)return false;
  profile.shopTier=tier;profile.rerolls.smith=0;profile.rerolls.jeweler=0;
  rollShop('smith');rollShop('jeweler');return true;
}
syncShopsToHeroLevel(true);
const expeditionPrep={arrows:10,potions:0};
let runSupplies=null,runResources=null;
const arrowUpgradeCost=capacity=>25+(capacity-10)*2;
const POTION_COST=18;
const CONTROL_LABELS={up:'Вверх',down:'Вниз',left:'Влево',right:'Вправо',melee:'Удар оружием',bow:'Выстрел из лука',roll:'Перекат',potion:'Зелье лечения',skill1:'Навык 1',skill2:'Навык 2',skill3:'Навык 3',interact:'Взаимодействие',character:'Персонаж'};
const DEFAULT_CONTROLS={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',melee:'MouseRight',bow:'MouseLeft',roll:'Space',potion:'KeyQ',skill1:'Digit1',skill2:'Digit2',skill3:'Digit3',interact:'KeyE',character:'KeyC'};
let savedControls={};try{savedControls=JSON.parse(localStorage.getItem('astral-controls')||'{}')||{};}catch{}
const controls={...DEFAULT_CONTROLS};
const restoredControls={...controls};
for(const [action,code] of Object.entries(savedControls))if(action in restoredControls&&typeof code==='string')restoredControls[action]=code;
if(new Set(Object.values(restoredControls)).size===Object.keys(restoredControls).length)Object.assign(controls,restoredControls);
const heldControls=new Set();
const controlDown=action=>heldControls.has(controls[action]);
const controlName=code=>code==='MouseLeft'?'ЛКМ':code==='MouseRight'?'ПКМ':code==='MouseMiddle'?'СКМ':code==='Space'?'ПРОБЕЛ':code?.replace(/^Key/,'').replace(/^Digit/,'')||'';
function bindControl(action,code){
  if(!(action in controls)||!code||code==='Escape')return false;
  const other=Object.keys(controls).find(key=>key!==action&&controls[key]===code);
  if(other)controls[other]=controls[action];
  controls[action]=code;heldControls.clear();
  try{localStorage.setItem('astral-controls',JSON.stringify(controls));}catch{}
  return true;
}
function dispatchControl(code){
  if(isOverlayOpen())return;
  const action=Object.keys(controls).find(key=>controls[key]===code);
  const scene=activeScene();
  if(action==='character')toggleCharacterMenu();
  else if(action==='interact')scene?.interact?.()||scene?.rest?.();
  else if(profile.location==='arena'){
    if(action==='melee')scene?.meleeAttack();
    else if(action==='bow')scene?.bowAttack();
    else if(action==='roll')scene?.roll();
    else if(action==='potion')scene?.usePotion();
    else if(action?.startsWith('skill'))scene?.castSkill(Number(action.slice(-1))-1);
  }
}

let audioContext=null;
function ensureAudio(){
  const AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioCtor)return null;
  if(!audioContext)audioContext=new AudioCtor();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  return audioContext;
}
function synthTone(frequency,duration=.16,{type='sine',volume=.022,delay=0,endFrequency=frequency}={}){
  const ctx=ensureAudio();if(!ctx)return;
  const start=ctx.currentTime+delay,stop=start+duration,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFrequency),stop);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+Math.min(.018,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,stop);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(stop+.015);
}
function playSound(name){
  const tone=(f,d,type='sine',v=.022,delay=0,end=f)=>synthTone(f,d,{type,volume:v,delay,endFrequency:end});
  if(name==='ui')tone(520,.055,'sine',.009,0,610);
  else if(name==='sword'){tone(390,.11,'triangle',.025,0,620);tone(780,.07,'sine',.009,.025,540);}
  else if(name==='spear'){tone(310,.13,'triangle',.022,0,720);tone(880,.06,'sine',.008,.055,660);}
  else if(name==='hammer'){tone(118,.22,'triangle',.035,0,72);tone(236,.16,'sine',.012,.025,150);}
  else if(name==='bow'){tone(620,.12,'triangle',.019,0,330);tone(930,.07,'sine',.008,.015,650);}
  else if(name==='roll'){tone(230,.18,'sine',.015,0,390);}
  else if(name==='skill'){tone(330,.16,'triangle',.02);tone(495,.2,'sine',.014,.045);tone(660,.23,'sine',.009,.08);}
  else if(name==='hit'){tone(185,.09,'triangle',.018,0,135);}
  else if(name==='hurt'){tone(145,.2,'sine',.025,0,92);}
  else if(name==='parry'){tone(740,.08,'triangle',.022);tone(1110,.16,'sine',.014,.045,820);}
  else if(name==='gold'){tone(660,.11,'sine',.018);tone(825,.14,'sine',.015,.075);}
  else if(name==='potion'){tone(440,.16,'sine',.016);tone(554,.2,'triangle',.013,.06,660);}
  else if(name==='chest'){tone(262,.18,'triangle',.018);tone(392,.22,'sine',.012,.08);}
  else if(name==='boss'){tone(110,.35,'triangle',.03);tone(165,.38,'sine',.018,.07);tone(220,.4,'sine',.012,.14);}
  else if(name==='level'){[523,659,784,1047].forEach((f,i)=>tone(f,.2,'sine',.018,i*.09));}
  else if(name==='victory'){[392,523,659,784].forEach((f,i)=>tone(f,.28,'triangle',.017,i*.075));}
}

class AstralScene extends Phaser.Scene {
  constructor() { super('astral'); }

  create() {
    this.makeTextures();
    const build=gameBuild();
    this.layout=createWorldLayout(build.template,Date.now()>>>0);
    if(runMode==='biomeBoss')prepareJunkyardLayout(this.layout);
    this.makeWorld();
    this.physics.world.setBounds(95, 95, W-190, H-190);
    this.cameras.main.setBounds(0,0,W,H);
    this.cameras.main.setBackgroundColor('#0d1420');
    this.cameras.main.setZoom(1);

    this.obstacles = this.physics.add.staticGroup();
    this.createObstacles();
    this.enemies = this.physics.add.group({runChildUpdate:false});
    this.arrows = this.physics.add.group({runChildUpdate:false});
    this.stones = this.physics.add.group({runChildUpdate:false});
    this.player = this.physics.add.sprite(this.layout.spawn.x,this.layout.spawn.y,'hero-ash');
    this.player.setDepth(10).setCollideWorldBounds(true);
    this.setPlayerBody(false);
    this.player.hp = 100;
    this.physics.add.collider(this.player,this.obstacles);
    this.physics.add.collider(this.enemies,this.obstacles);
    this.physics.add.collider(this.enemies,this.enemies);
    this.physics.add.collider(this.player,this.enemies,()=>{},(player,enemy)=>enemy.kind==='skeletonTank',this);
    this.physics.add.overlap(this.arrows,this.enemies,(arrow,enemy)=>this.arrowHit(arrow,enemy));
    this.physics.add.overlap(this.stones,this.player,(player,stone)=>this.stoneHit(stone));
    this.physics.add.collider(this.arrows,this.obstacles,arrow=>arrow.destroy());
    this.physics.add.collider(this.stones,this.obstacles,stone=>stone.destroy());
    this.cameras.main.startFollow(this.player,true,.1,.1);

    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown',pointer=>{
      if(!this.running)return;
      dispatchControl(pointer.rightButtonDown()?'MouseRight':pointer.middleButtonDown()?'MouseMiddle':'MouseLeft');
    });

    this.running=false;
    window.astralScene=this;
    this.startRun();
  }

  makeTextures() {
    if(this.textures.exists('hero-ash'))return;
    const texture=(name,w,h,draw)=>{
      const tex=this.textures.createCanvas(name,w,h),c=tex.getContext();
      c.imageSmoothingEnabled=false; draw(c); tex.refresh();
    };
    const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
    for(const [id,look] of Object.entries(APPEARANCES))texture(`hero-${id}`,48,48,c=>{
      rect(c,8,38,34,5,'#101a27'); rect(c,12,34,25,5,'#1a2b37');
      rect(c,17,30,7,9,'#29394c');rect(c,27,30,7,9,'#29394c');
      rect(c,14,18,24,18,look.cloak);rect(c,10,22,6,15,look.trim);rect(c,36,22,5,15,look.trim);
      rect(c,17,16,18,20,look.inner);rect(c,20,22,12,12,'#b47c50');
      rect(c,17,9,18,14,'#d3a579');rect(c,14,7,24,8,'#e3d8c3');rect(c,16,4,20,6,'#d3d1c5');
      rect(c,17,14,7,3,'#263a48');rect(c,29,14,6,3,'#263a48');
      rect(c,15,6,3,4,'#f3e8d7');rect(c,35,6,3,4,'#e7dcc8');
      rect(c,8,24,5,12,'#b07d57');rect(c,40,24,4,11,'#b07d57');
      rect(c,20,31,11,4,'#bc9869');rect(c,18,20,16,3,'#aab8b8');
    });
    texture('club',48,48,c=>{
      rect(c,9,38,31,5,'#17201c');rect(c,14,32,8,8,'#384b36');rect(c,27,32,8,8,'#384b36');
      rect(c,12,18,28,18,'#5d7c47');rect(c,16,22,20,14,'#364e35');
      rect(c,12,7,29,18,'#72914f');rect(c,8,10,8,8,'#69854c');rect(c,40,10,5,8,'#69854c');
      rect(c,17,14,7,5,'#cfbc7b');rect(c,30,14,7,5,'#cfbc7b');rect(c,19,15,3,3,'#152019');rect(c,32,15,3,3,'#152019');
      rect(c,23,23,12,4,'#253727');rect(c,11,29,6,8,'#719052');rect(c,38,28,5,8,'#719052');
      rect(c,3,9,4,25,'#6a4b31');rect(c,1,6,9,10,'#76634a');rect(c,3,5,6,3,'#a0956e');
    });
    texture('stone',48,48,c=>{
      rect(c,9,38,31,5,'#17201c');rect(c,14,31,8,9,'#343e3b');rect(c,28,31,8,9,'#343e3b');
      rect(c,12,18,29,18,'#667f5e');rect(c,17,20,20,15,'#4c6350');
      rect(c,11,8,30,17,'#79915d');rect(c,7,10,8,8,'#6c8454');rect(c,40,10,5,8,'#6c8454');
      rect(c,17,14,7,5,'#e2d7a2');rect(c,30,14,7,5,'#e2d7a2');rect(c,19,15,3,3,'#222d2b');rect(c,32,15,3,3,'#222d2b');
      rect(c,18,4,19,6,'#775a69');rect(c,14,7,27,4,'#a27880');rect(c,22,24,10,4,'#2f493d');
      rect(c,40,28,5,6,'#90a075');rect(c,40,26,7,6,'#777d70');
    });
    texture('arrow',24,8,c=>{rect(c,0,3,17,2,'#c7b395');rect(c,15,1,6,6,'#cce0dd');rect(c,0,1,3,2,'#9baeb2');rect(c,0,5,3,2,'#9baeb2')});
    texture('rockshot',16,16,c=>{rect(c,3,3,10,10,'#a19a83');rect(c,5,1,6,3,'#b9aa92');rect(c,1,6,3,5,'#797b72');rect(c,6,5,4,3,'#cec0a6')});
    texture('rock',72,54,c=>{rect(c,4,43,65,7,'#101d27');rect(c,9,29,55,15,'#283e49');rect(c,15,15,46,17,'#40575c');rect(c,23,7,32,12,'#667576');rect(c,19,20,15,5,'#829089');rect(c,47,18,8,7,'#82948a');rect(c,30,37,23,4,'#182d39');rect(c,15,32,5,9,'#546b65');rect(c,37,9,4,4,'#9aa49a');rect(c,53,29,7,3,'#365850');rect(c,10,44,12,3,'#486854')});
    texture('junk-pile',132,86,c=>{rect(c,4,73,124,9,'#171a1b');rect(c,9,55,112,20,'#51483d');rect(c,17,38,43,21,'#75644e');rect(c,68,43,46,18,'#665846');rect(c,29,20,35,21,'#91674d');rect(c,72,17,24,30,'#53666a');rect(c,97,31,20,18,'#8e815e');rect(c,13,48,25,6,'#a77452');rect(c,54,55,12,15,'#35494d');rect(c,79,24,9,6,'#b0a47c');c.strokeStyle='#b67a50';c.lineWidth=4;c.beginPath();c.arc(46,62,14,0,Math.PI*2);c.stroke();c.beginPath();c.arc(91,63,13,0,Math.PI*2);c.stroke()});
    texture('junk-car',142,78,c=>{rect(c,5,61,132,10,'#171b1c');rect(c,14,38,116,28,'#665248');rect(c,30,21,70,21,'#725f55');rect(c,39,25,25,15,'#32494d');rect(c,69,25,24,15,'#273b40');rect(c,101,42,24,6,'#9b7657');rect(c,14,47,20,5,'#a69068');rect(c,39,57,20,17,'#202729');rect(c,101,57,20,17,'#202729');rect(c,43,61,12,7,'#7b8175');rect(c,105,61,12,7,'#7b8175');c.strokeStyle='#c28a5c';c.lineWidth=3;c.beginPath();c.moveTo(8,34);c.lineTo(132,26);c.stroke()});
    texture('junk-barrels',72,62,c=>{rect(c,5,50,62,8,'#171c1c');rect(c,8,14,25,40,'#6e6750');rect(c,38,7,25,47,'#526969');rect(c,9,20,23,4,'#a58d62');rect(c,39,16,23,4,'#81a09a');rect(c,9,43,23,4,'#3f4941');rect(c,39,42,23,4,'#33494c');rect(c,15,29,11,9,'#b5a76c');rect(c,45,25,11,11,'#8fc0aa')});
    texture('junk-throne',184,166,c=>{rect(c,8,151,168,11,'#151a1b');rect(c,28,112,130,42,'#55483c');rect(c,48,47,90,72,'#665647');rect(c,59,20,69,39,'#796048');rect(c,71,4,47,28,'#96724b');rect(c,42,42,12,78,'#8a7858');rect(c,133,39,12,81,'#8a7858');rect(c,16,88,42,15,'#725b45');rect(c,130,86,39,16,'#725b45');rect(c,76,66,35,36,'#3f4e4c');rect(c,81,73,25,5,'#a99b70');rect(c,72,12,9,17,'#d0ae62');rect(c,96,3,10,25,'#e1c575');rect(c,119,12,8,17,'#c89d58');c.strokeStyle='#9a7952';c.lineWidth=5;c.beginPath();c.moveTo(20,140);c.lineTo(166,34);c.moveTo(19,35);c.lineTo(164,139);c.stroke()});
    texture('ruin-pillar',78,100,c=>{rect(c,5,89,68,8,'#172932');rect(c,9,82,61,9,'#384e55');rect(c,19,25,42,59,'#536970');rect(c,24,14,34,70,'#778482');rect(c,19,18,43,9,'#a2957b');rect(c,14,10,52,9,'#6f7774');rect(c,17,5,46,8,'#9b9d89');rect(c,29,24,6,54,'#40565e');rect(c,48,24,5,49,'#435960');rect(c,36,30,10,5,'#b7aa8d');rect(c,11,79,15,5,'#6d8778');rect(c,56,77,12,4,'#6d8778')});
    texture('ruin-wall',118,74,c=>{rect(c,3,61,112,10,'#172932');rect(c,9,22,100,43,'#52676c');rect(c,13,12,46,49,'#76827d');rect(c,64,26,43,34,'#697a79');rect(c,9,9,52,9,'#9c9d88');rect(c,65,22,43,7,'#9b9b83');rect(c,54,33,5,28,'#344c56');rect(c,25,37,21,4,'#adb4a0');rect(c,76,43,22,4,'#9cae9b');rect(c,14,55,11,4,'#7e9a82');rect(c,84,57,10,4,'#83a389')});
    texture('swamp-pool',174,112,c=>{c.fillStyle='#172d32';c.beginPath();c.ellipse(87,61,82,44,0,0,Math.PI*2);c.fill();c.fillStyle='#31514b';c.beginPath();c.ellipse(87,58,76,38,0,0,Math.PI*2);c.fill();c.fillStyle='#426961';c.beginPath();c.ellipse(92,58,62,29,0,0,Math.PI*2);c.fill();rect(c,30,53,28,4,'#659185');rect(c,74,76,40,3,'#77a69a');rect(c,112,45,21,3,'#71978b');rect(c,45,37,10,3,'#9bc6ad');rect(c,130,68,9,3,'#9bc6ad');rect(c,64,57,7,6,'#243f3a');rect(c,117,61,11,7,'#284941');rect(c,20,31,4,15,'#647f53');rect(c,152,39,4,17,'#6a875b')});
    texture('warrior',48,48,c=>{rect(c,9,38,30,5,'#13221e');rect(c,12,19,28,19,'#536e4a');rect(c,10,17,32,8,'#899181');rect(c,15,5,24,18,'#719056');rect(c,12,7,28,6,'#aaa18a');rect(c,17,15,7,4,'#e9c98b');rect(c,31,15,7,4,'#e9c98b');rect(c,24,25,13,5,'#314934');rect(c,1,5,6,34,'#8b6647');rect(c,0,2,10,12,'#b2a17a');rect(c,35,24,10,14,'#8c7663')});
    texture('archer',48,48,c=>{rect(c,10,38,29,5,'#13221e');rect(c,14,19,26,19,'#54725a');rect(c,10,6,30,17,'#526a58');rect(c,13,4,25,8,'#84785e');rect(c,17,14,7,4,'#e1d69a');rect(c,31,14,7,4,'#e1d69a');rect(c,21,25,12,4,'#2e4737');c.strokeStyle='#c6b794';c.lineWidth=2;c.beginPath();c.arc(41,24,11,-1.4,1.4);c.stroke();rect(c,37,23,10,2,'#b6a17a');rect(c,8,26,5,10,'#8c765b')});
    texture('shaman',48,48,c=>{rect(c,9,39,31,4,'#142424');rect(c,12,19,28,20,'#456466');rect(c,9,9,32,15,'#5c7971');rect(c,16,3,20,11,'#9a84a0');rect(c,20,15,6,4,'#b5e6cd');rect(c,30,15,6,4,'#b5e6cd');rect(c,22,25,13,5,'#294647');rect(c,3,8,4,30,'#8d7786');rect(c,0,4,10,10,'#a6d9c0');rect(c,39,25,6,9,'#8eb5a0')});
    for(const weapon of Object.keys(ENEMY_MELEE_WEAPONS))for(const armored of [false,true])texture(`gremlin-${weapon}${armored?'-warrior':''}`,48,48,c=>{
      rect(c,9,39,32,5,'#14231f');rect(c,14,32,8,8,'#394f38');rect(c,28,32,8,8,'#394f38');
      rect(c,12,19,29,18,armored?'#465e48':'#5b7c4c');rect(c,16,21,21,14,armored?'#334a3e':'#3f603d');
      rect(c,11,7,30,18,armored?'#79906a':'#73965b');rect(c,9,10,8,8,'#5d7848');rect(c,40,10,5,8,'#5d7848');
      rect(c,17,14,7,5,'#d8c38b');rect(c,30,14,7,5,'#d8c38b');rect(c,19,15,3,3,'#17251d');rect(c,32,15,3,3,'#17251d');
      rect(c,21,25,14,4,'#29452e');rect(c,39,28,5,8,'#719454');
      if(armored){rect(c,10,18,10,8,'#9c9c86');rect(c,35,18,9,8,'#9c9c86');rect(c,16,5,22,5,'#b1a586');}
      if(weapon==='club'){rect(c,3,11,4,25,'#715039');rect(c,0,5,10,11,'#8b7856');rect(c,2,4,7,3,'#b0a27b');}
      if(weapon==='sword'){rect(c,3,12,3,25,'#8a6548');rect(c,0,26,10,4,'#c5a77a');rect(c,2,5,5,20,'#c7d9d5');rect(c,3,2,3,6,'#f0f1da');}
      if(weapon==='spear'){rect(c,5,7,3,35,'#77553f');rect(c,3,2,7,8,'#becdc7');rect(c,5,0,3,5,'#f1e7cf');rect(c,2,33,10,3,'#bba37b');}
      if(weapon==='hammer'){rect(c,4,8,4,32,'#73513d');rect(c,0,3,14,11,'#8c8b80');rect(c,1,2,13,4,'#c5b799');rect(c,9,7,4,8,'#596f70');}
    });
    texture('magicshot',18,18,c=>{rect(c,5,2,8,14,'#628eab');rect(c,2,5,14,8,'#628eab');rect(c,5,5,8,8,'#a5e3de');rect(c,7,7,4,4,'#f0fff1')});
    texture('enemy-arrow',22,8,c=>{rect(c,3,3,15,2,'#b7a982');rect(c,0,1,5,6,'#d4d6ad');rect(c,18,1,3,2,'#819a80');rect(c,18,5,3,2,'#819a80')});
    texture('altar',90,98,c=>{
      rect(c,7,75,76,12,'#213845');rect(c,13,65,64,14,'#344d54');rect(c,18,52,54,17,'#51616a');
      rect(c,28,24,34,33,'#57656d');rect(c,33,13,24,26,'#73807b');rect(c,40,2,10,16,'#72babb');
      rect(c,42,0,6,13,'#b9eee1');rect(c,36,18,18,10,'#8ccac5');rect(c,26,40,8,14,'#92a5a0');rect(c,57,40,6,14,'#84978f');
      rect(c,10,80,70,3,'#a78d69');rect(c,24,67,43,3,'#9b9a7b');
    });
    for(const boss of MAP_BOSSES)texture(`boss-${boss.id}`,96,96,c=>{
      const cloth={warden:'#776a59',mire:'#42695d',hunter:'#546b7e',duelist:'#78515b'}[boss.id];
      rect(c,15,84,68,8,'#11232a');rect(c,22,68,18,19,'#28383b');rect(c,57,68,18,19,'#28383b');
      rect(c,16,37,65,37,cloth);rect(c,25,20,47,29,'#667d73');rect(c,29,12,39,31,cloth);
      rect(c,35,31,10,6,'#f3d29c');rect(c,54,31,10,6,'#f3d29c');rect(c,38,33,5,4,'#2c3736');rect(c,57,33,5,4,'#2c3736');
      rect(c,31,7,37,8,'#c1ac8e');rect(c,25,16,10,13,'#a99b7d');rect(c,65,16,9,13,'#a99b7d');
      if(boss.id==='warden'){rect(c,5,23,16,51,'#806657');rect(c,0,13,30,21,'#b3a28a');rect(c,7,13,16,5,'#e5d3a6');rect(c,77,40,16,30,'#7a8a87');}
      if(boss.id==='mire'){rect(c,4,15,10,66,'#584b47');rect(c,0,7,20,18,'#92c7aa');rect(c,78,20,15,47,'#698a67');rect(c,20,51,59,6,'#9bd2ad');}
      if(boss.id==='hunter'){c.strokeStyle='#d2b99c';c.lineWidth=4;c.beginPath();c.arc(82,49,17,-1.4,1.4);c.stroke();rect(c,82,46,14,3,'#e2d6bc');rect(c,17,4,60,7,'#849dab');}
      if(boss.id==='duelist'){rect(c,3,13,6,62,'#c7d7d2');rect(c,0,55,19,5,'#e6c596');rect(c,5,6,4,11,'#f1e5c9');rect(c,78,31,16,34,'#a87a68');}
      c.strokeStyle=boss.id==='mire'?'#a2dabe':'#d7be94';c.lineWidth=3;c.strokeRect(20,45,55,22);
    });
    texture('boss-junkking',112,112,c=>{
      rect(c,13,98,88,9,'#111d20');rect(c,21,83,24,18,'#374634');rect(c,69,83,23,18,'#374634');
      rect(c,14,44,84,43,'#657640');rect(c,23,51,65,34,'#435d35');rect(c,22,20,70,37,'#819653');
      rect(c,13,25,17,19,'#6e8648');rect(c,88,25,15,19,'#6e8648');rect(c,35,31,14,9,'#f0cf7f');rect(c,69,31,14,9,'#f0cf7f');
      rect(c,40,34,6,5,'#1c281e');rect(c,73,34,6,5,'#1c281e');rect(c,45,47,33,7,'#293a29');
      rect(c,25,12,68,10,'#9b7945');rect(c,35,4,11,15,'#d1b15e');rect(c,57,1,12,18,'#e3c76f');rect(c,81,7,9,14,'#b9914e');
      rect(c,2,24,10,68,'#6e4c31');rect(c,0,11,28,26,'#8b7752');rect(c,4,7,20,10,'#b3a174');rect(c,91,56,17,25,'#705741');
      rect(c,17,59,15,10,'#92917d');rect(c,84,66,14,9,'#9c7661');
    });
    texture('tree',88,116,c=>{rect(c,37,67,17,43,'#5d4434');rect(c,27,84,35,8,'#765841');rect(c,10,42,67,40,'#274d43');rect(c,18,22,56,45,'#356356');rect(c,29,6,39,39,'#477b64');rect(c,34,13,10,7,'#75a077');rect(c,12,52,14,8,'#527e64');rect(c,58,36,12,7,'#6a9674')});
    texture('grass',126,74,c=>{for(let x=4;x<122;x+=8){c.strokeStyle=x%16?'#4e7855':'#739462';c.lineWidth=3;c.beginPath();c.moveTo(x,72);c.lineTo(x+(x%3-1)*8,12+(x%5)*7);c.stroke();}rect(c,0,66,126,8,'#31533f')});
    texture('chest',64,48,c=>{rect(c,5,20,54,24,'#583d2f');rect(c,8,8,48,17,'#795740');rect(c,11,4,42,8,'#9a7350');rect(c,4,20,56,6,'#b09161');rect(c,28,17,10,17,'#d4b66f');rect(c,31,21,4,8,'#4b3c34')});
    texture('skeletonKnight',56,56,c=>{rect(c,14,48,31,5,'#152128');rect(c,18,32,8,18,'#6e7475');rect(c,34,32,8,18,'#6e7475');rect(c,14,19,34,20,'#9a9a8e');rect(c,18,4,26,22,'#d6d0b8');rect(c,22,11,6,5,'#392d34');rect(c,35,11,6,5,'#392d34');rect(c,27,21,10,4,'#6e5a50');rect(c,3,7,5,38,'#b5c8c2');rect(c,0,34,14,5,'#d2ad76')});
    texture('skeletonMage',56,56,c=>{rect(c,14,49,31,4,'#142126');rect(c,12,24,37,25,'#4b506d');rect(c,17,5,27,23,'#d2cbb4');rect(c,21,12,6,5,'#659dca');rect(c,35,12,6,5,'#b85a62');rect(c,5,6,4,41,'#6d5360');rect(c,0,2,15,13,'#9cc8db');rect(c,22,28,17,5,'#816875')});
    texture('skeletonTank',64,64,c=>{rect(c,18,56,32,5,'#121f25');rect(c,23,39,9,19,'#737b79');rect(c,41,39,9,19,'#737b79');rect(c,17,20,39,26,'#898d83');rect(c,22,5,28,23,'#d4cdb6');rect(c,26,13,6,5,'#3c3034');rect(c,41,13,6,5,'#3c3034');rect(c,0,13,22,44,'#526a70');rect(c,3,17,16,35,'#819092');rect(c,7,29,8,8,'#c4ad7a')});
    texture('depth-merchant',64,72,c=>{rect(c,13,63,39,5,'#101d22');rect(c,17,43,12,22,'#475647');rect(c,38,43,11,22,'#475647');rect(c,11,24,46,27,'#725f48');rect(c,17,8,35,24,'#758a5a');rect(c,20,3,30,9,'#b09768');rect(c,22,14,8,5,'#e7d191');rect(c,40,14,8,5,'#e7d191');rect(c,6,29,12,24,'#8f7048');rect(c,49,28,11,26,'#53706c');rect(c,2,49,18,12,'#b28b55')});
    texture('tile',64,64,c=>{rect(c,0,0,64,64,'#1a2b35');rect(c,0,0,63,1,'#21343e');rect(c,0,0,1,63,'#21343e');rect(c,12,21,5,1,'#29404a');rect(c,43,44,8,1,'#263b45');rect(c,33,7,2,2,'#30474c')});
    texture('wall-body',64,64,c=>{rect(c,0,0,64,64,'#53676a')});
    // Hand-drawn pixel frames shared by ordinary attacks and weapon skills.
    for(const [kind,color] of [['slash','#f4dec0'],['thrust','#a9e2d9'],['burst','#e7bd80'],['guard','#98d6d5']]){
      for(let frame=0;frame<4;frame++)texture(`fx-${kind}-${frame}`,96,96,c=>{
        const r=17+frame*10;c.strokeStyle=color;c.lineWidth=5-frame*.65;c.lineCap='square';
        c.beginPath();
        if(kind==='slash')c.arc(48,48,r,-1.35,1.25);
        else if(kind==='thrust'){c.moveTo(10+frame*4,48);c.lineTo(55+frame*9,48);c.moveTo(65+frame*6,42);c.lineTo(77+frame*4,48);c.lineTo(65+frame*6,54);}
        else if(kind==='guard')c.arc(48,48,r,0,Math.PI*2);
        else {c.arc(48,48,r,0,Math.PI*2);for(let a=0;a<8;a++){const t=a*Math.PI/4;c.moveTo(48+Math.cos(t)*(r+3),48+Math.sin(t)*(r+3));c.lineTo(48+Math.cos(t)*(r+10),48+Math.sin(t)*(r+10));}}
        c.stroke();rect(c,46,46,4,4,'#fff2d5');
      });
      this.anims.create({key:`fx-${kind}`,frames:[0,1,2,3].map(i=>({key:`fx-${kind}-${i}`})),frameRate:20,repeat:0});
    }
  }

  makeWorld() {
    const floor=this.add.tileSprite(0,0,W,H,'tile').setOrigin(0).setDepth(-20);
    floor.setTint(runMode==='biomeBoss'?0x8d795f:this.layout.template==='corridor'?0xa3b0aa:this.layout.template==='maze'?0xa9b8ba:0xb3c2c2);
    const g=this.add.graphics().setDepth(-18);
    if(runMode==='biomeBoss'){
      g.fillStyle(0x503f31,.42).fillRect(100,100,W-200,H-200);
      g.lineStyle(150,0x312c27,.24).beginPath().moveTo(1100,1220).lineTo(1060,920).lineTo(1170,650).lineTo(1100,260).strokePath();
      for(let i=0;i<34;i++){const a=i*.91,r=210+(i%7)*115;g.fillStyle(i%3?0x8c6948:0x52615b,.2).fillRect(1100+Math.cos(a)*r,700+Math.sin(a)*r*.62,18+(i%4)*7,5+(i%3)*3);}
    }
    for(const patch of this.layout.patches){
      g.fillStyle(0x42665d,.17).fillEllipse(patch.x,patch.y,patch.rx*2,patch.ry*2);
      g.lineStyle(1,0x82a58d,.13).strokeEllipse(patch.x,patch.y,patch.rx*2,patch.ry*2);
    }
    if(this.layout.road){
      g.lineStyle(300,0x455e5c,.3).beginPath();
      this.layout.road.forEach((point,i)=>i?g.lineTo(point.x,point.y):g.moveTo(point.x,point.y));g.strokePath();
      g.lineStyle(4,0x9aac8a,.2).beginPath();
      this.layout.road.forEach((point,i)=>i?g.lineTo(point.x,point.y):g.moveTo(point.x,point.y));g.strokePath();
    }
    g.fillStyle(0x101b28,.45).fillRect(0,0,W,100).fillRect(0,H-100,W,100).fillRect(0,0,100,H).fillRect(W-100,0,100,H);
    g.lineStyle(2,0x66817f,.18).strokeRect(108,108,W-216,H-216);
    g.lineStyle(1,0x6e8c89,.11).strokeCircle(this.layout.altar.x,this.layout.altar.y,214).strokeCircle(this.layout.altar.x,this.layout.altar.y,264);
    g.lineStyle(2,0xb4a47e,.15).strokeCircle(this.layout.altar.x,this.layout.altar.y,102);
    const rand=new Phaser.Math.RandomDataGenerator([String(this.layout.seed),this.layout.template]);
    for(let i=0;i<300;i++){
      const x=rand.between(115,W-115),y=rand.between(115,H-115);
      g.fillStyle(i%7===0?0x78b7b4:0x4f6a6c,i%7===0?.3:.13);
      g.fillRect(x,y,rand.between(2,7),rand.between(1,2));
    }
    for(let i=0;i<42;i++){
      const x=rand.between(145,W-145),y=rand.between(145,H-145);
      if (Phaser.Math.Distance.Between(x,y,this.layout.altar.x,this.layout.altar.y)<230) continue;
      g.lineStyle(1,0x66777a,.2).strokeCircle(x,y,rand.between(8,24));
      g.fillStyle(0x5d867e,.2).fillCircle(x,y,2);
    }
    const walls=this.add.graphics().setDepth(-3);
    for(const wall of this.layout.walls){
      walls.fillStyle(0x101d27,.92).fillRect(wall.x+6,wall.y+8,wall.w,wall.h);
      walls.fillStyle(runMode==='biomeBoss'?0x574a3e:0x425b62,1).fillRect(wall.x,wall.y,wall.w,wall.h);
      walls.fillStyle(runMode==='biomeBoss'?0x9a7955:0x778582,1).fillRect(wall.x+4,wall.y+4,wall.w-8,Math.min(12,wall.h-8));
      walls.lineStyle(2,0x99a59a,.48).strokeRect(wall.x+2,wall.y+2,wall.w-4,wall.h-4);
      for(let row=wall.y+27;row<wall.y+wall.h-8;row+=36){
        walls.lineStyle(2,0x243d48,.7).lineBetween(wall.x+5,row,wall.x+wall.w-5,row);
        if(wall.w>90)for(let col=wall.x+36+(Math.floor(row/36)%2)*20;col<wall.x+wall.w-10;col+=70)walls.lineBetween(col,row-30,col,row);
      }
    }
    this.swamps=[];
    if(gameBuild().swamp||runMode==='biomeBoss')for(const [x,y] of this.layout.swamps){
      this.add.image(x,y,'swamp-pool').setDepth(-9).setTint(runMode==='biomeBoss'?0xb7a54c:0xffffff).setAlpha(runMode==='biomeBoss'?.88:1);
      this.swamps.push({x,y,rx:75,ry:39});
    }
    if(runMode==='biomeBoss'){
      for(const prop of this.layout.junkProps)this.add.image(prop.x,prop.y,prop.type).setDepth(4);
      this.add.image(this.layout.altar.x,this.layout.altar.y+28,'junk-throne').setDepth(3);
      this.add.text(this.layout.altar.x,this.layout.altar.y-93,'ТРОН МУСОРНОЙ КУЧИ',{fontFamily:'Georgia',fontSize:'18px',color:'#e1bd7d',backgroundColor:'#191813bb',padding:{x:10,y:5}}).setOrigin(.5).setDepth(5);
    }
    this.grassZones=[];
    if(gameBuild().grass)for(const [x,y] of this.layout.grass){this.add.image(x,y,'grass').setDepth(5).setAlpha(.86);this.grassZones.push({x,y,rx:58,ry:30});}
    if(gameBuild().trees)for(const [x,y] of this.layout.trees)this.add.image(x,y,'tree').setDepth(4);
    this.chest=null;this.chestChallenge=false;this.chestMobsLeft=0;
    if(gameBuild().ruins){
      const {x,y}=this.layout.chest;
      const ruins=this.add.graphics().setDepth(1);ruins.fillStyle(0x34474a,.95).fillRect(x-115,y-95,230,18).fillRect(x-115,y+77,75,18).fillRect(x+40,y+77,75,18).fillRect(x-115,y-95,18,190).fillRect(x+97,y-95,18,190);
      this.chest=this.add.image(x,y,'chest').setDepth(6).setInteractive({useHandCursor:true});
      this.chest.on('pointerdown',()=>this.openRuinChest());
      this.chestHint=this.add.text(x,y+48,`${controlName(controls.interact)} · ОТКРЫТЬ СУНДУК`,{fontFamily:'Arial',fontSize:'10px',color:'#f1d3a0',backgroundColor:'#14232bdd',padding:{x:7,y:4}}).setOrigin(.5).setDepth(12).setVisible(false);
    }
    const altar=this.layout.altar;
    this.add.ellipse(altar.x,altar.y,133,40,0x7ac7b7,.07).setDepth(-1);
    this.add.image(altar.x,altar.y-31,'altar').setDepth(2);
    this.add.ellipse(altar.x,altar.y+16,170,80,0x85d9ce,.06).setDepth(-2);
    this.add.text(altar.x,altar.y-111,runMode==='biomeBoss'?'ВЫХОД ИЗ ЛОГОВА':'АСТРАЛЬНЫЙ АЛТАРЬ',{fontFamily:'Arial',fontSize:'12px',color:'#d2c7a8',letterSpacing:3}).setOrigin(.5).setDepth(4);
    this.altarHint=this.add.text(altar.x,altar.y+45,`${controlName(controls.interact)} — АЛТАРЬ`,{fontFamily:'Arial',fontSize:'11px',color:'#d7e7d8',backgroundColor:'#15232bdd',padding:{x:9,y:5}}).setOrigin(.5).setDepth(12).setVisible(false);
  }

  createObstacles() {
    for(const wall of this.layout.walls){
      const body=this.obstacles.create(wall.x+wall.w/2,wall.y+wall.h/2,'wall-body').setDepth(3).setVisible(false);
      body.setDisplaySize(wall.w,wall.h).refreshBody();
    }
    if(gameBuild().rocks)this.layout.rocks.forEach(([x,y])=>{
      const rock=this.obstacles.create(x,y,'rock').setDepth(3);
      rock.setSize(56,28).setOffset(8,22).refreshBody();
    });
    if(gameBuild().ruins){
      const {x,y}=this.layout.chest;
      for(const [bx,by,bw,bh] of [[x,y-86,230,18],[x-77,y+86,75,18],[x+77,y+86,75,18],[x-106,y,18,190],[x+106,y,18,190]]){
        const body=this.obstacles.create(bx,by,'wall-body').setVisible(false);body.setDisplaySize(bw,bh).refreshBody();
      }
    }
    if(gameBuild().trees)this.layout.trees.forEach(([x,y])=>{
      const tree=this.obstacles.create(x,y+25,'wall-body').setVisible(false);tree.setDisplaySize(48,42).refreshBody();
    });
    if(runMode==='biomeBoss')for(const prop of this.layout.junkProps){
      const body=this.obstacles.create(prop.x,prop.y+10,'wall-body').setVisible(false);body.setDisplaySize(prop.w,prop.h).refreshBody();
    }
  }

  playSkillFx(kind,x,y,rotation=0,scale=1){
    if(!this.add?.sprite)return;
    const fx=this.add.sprite(x,y,`fx-${kind}-0`).setDepth(18).setRotation(rotation).setScale(scale);
    fx.play(`fx-${kind}`);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE,()=>fx.destroy());
  }

  setPlayerBody(rolling) {
    const r=rolling?9:15;
    this.player.body.setCircle(r,24-r,30-r);
  }

  startRun() {
    this.physics.resume();
    this.runId=(this.runId||0)+1;
    this.running=true;
    const sphereDiscoveries=runMode==='map'?discoverWorldSpheres(gameBuild()):[];
    sphereDiscoveries.forEach((sphere,index)=>this.time.delayedCall(450+index*1250,()=>{
      playSound('level');
      notify(`ОТКРЫТА СФЕРА КАРТЫ · ${sphere.name.toUpperCase()}`,2400);
    }));
    this.player.setPosition(this.layout.spawn.x,this.layout.spawn.y).setVelocity(0).setAlpha(1).setTint(0xffffff);
    this.player.setTexture(`hero-${loadout.appearance}`);
    this.player.hp=maxHp();this.ammo=runResources?.ammo??runSupplies?.arrows??10;this.potions=runResources?.potions??runSupplies?.potions??0;
    this.killCount=0;this.victory=false;this.bossState=runMode==='biomeBoss'?'fighting':'mobs';this.boss=null;this.depthMerchants=[];
    this.potionHealRemaining=0;this.potionHealRate=0;this.potionHealCarry=0;
    this.rolling=false;this.rollUntil=0;this.rollReady=0;this.immuneUntil=0;this.stunnedUntil=0;this.stunMoveUntil=0;
    this.swordReady=0;this.bowReady=0;
    this.skillReady={};
    this.skillCastVersion=0;
    this.skillDashUntil=0;this.skillDashTargets=new Set();this.skillDashPendingBoost=0;
    this.frenzyUntil=0;this.frenzyMaxUntil=0;this.spearDashHasteUntil=0;this.guardUntil=0;this.guardStored=0;
    this.utilityMoveUntil=0;this.castGuardUntil=0;
    this.parryUntil=0;this.spinUntil=0;this.nextSpinTick=0;this.nextDamageBoost=1;
    this.weapon=loadout.weapon;
    profile.location='arena';
    $('weaponHud').textContent=WEAPONS[this.weapon].name;
    $('locationName').textContent=runMode==='biomeBoss'?'АСТРАЛЬНАЯ ПУСТОШЬ · ТРОН МУСОРНОЙ КУЧИ':`АСТРАЛ · ГЛУБИНА ${runDepth} · ${WORLD_TEMPLATES[this.layout.template].name}`;
    this.setPlayerBody(false);
    for(const e of this.enemies.getChildren()){e.bar?.destroy();e.affixLabel?.destroy();this.clearEnemyTelegraph(e);}
    this.enemies.clear(true,true);this.arrows.clear(true,true);this.stones.clear(true,true);
    this.drops=[];
    if(runMode==='biomeBoss')this.summonBiomeBoss();else this.spawnEnemies();
    $('bossHud').hidden=true;
    $('skillBar').hidden=false;
    renderSkillBar(this);
    this.updateHud();
    this.toast(runMode==='biomeBoss'?'БОСС БИОМА · ПОБЕДИТЕ КОРОЛЯ МУСОРНОЙ КУЧИ':'ЗАДАНИЕ КАРТЫ · УБИТЬ ВСЕХ ГРЕМЛИНОВ',2600);
  }

  spawnEnemies() {
    const build=gameBuild(),starts=worldEnemyStarts(build,this.layout);
    this.enemyTotal=starts.length;
    let meleeIndex=0;
    starts.forEach(([x,y,type],index)=>{
      const meleeWeapon=type==='skeletonKnight'?'sword':type==='skeletonTank'?null:enemyMeleeWeaponFor(type,meleeIndex);
      if(type==='club')meleeIndex++;
      const texture=['skeletonKnight','skeletonMage','skeletonTank'].includes(type)?type:meleeWeapon?`gremlin-${meleeWeapon}${type==='warrior'?'-warrior':''}`:type;
      const e=this.enemies.create(x,y,texture);
      e.setDepth(8).setCollideWorldBounds(true);
      e.body.setCircle(15,9,19);
      e.kind=type;e.level=profile.level+build.level;e.unique=['warrior','archer','shaman','skeletonKnight','skeletonMage','skeletonTank'].includes(type);
      e.meleeWeapon=meleeWeapon;e.windupUntil=0;e.telegraph=null;
      e.hp=({club:72,stone:54,warrior:150,archer:75,shaman:90,skeletonKnight:128,skeletonMage:72,skeletonTank:120})[type]*(1+(e.level-1)*.18);
      e.armor=({club:14,stone:8,warrior:25,archer:6,shaman:10,skeletonKnight:34,skeletonMage:8,skeletonTank:25})[type]+(e.level-1)*2;
      e.damageFactor=1+(e.level-1)*.13;e.speedFactor=1;
      e.affixes=[];
      const choices=[...WORLD_AFFIXES];
      for(let i=0;i<Math.min(build.empower,choices.length);i++){
        const pick=choices.splice((index+i*3+build.level)%choices.length,1)[0];
        e.affixes.push(pick.name);
        if(pick.hp)e.hp*=pick.hp;
        if(pick.armor)e.armor+=pick.armor;
        if(pick.damage)e.damageFactor*=pick.damage;
        if(pick.speed)e.speedFactor*=pick.speed;
      }
      e.hp=Math.round(e.hp);e.maxHp=e.hp;e.nextAttack=0;e.nextThink=0;e.nextHeal=0;e.spawnedAt=this.time.now;e.nextSpecial=0;e.nextParry=this.time.now+6000;e.attackNumber=0;
      e.strafe=Math.random()<.5?-1:1;
      e.slowUntil=0;
      e.bar=this.add.graphics().setDepth(20);
      if(type==='skeletonTank'){
        e.body.setCircle(24,8,16);e.setPushable(false);e.shieldRadius=105;
        e.shieldAura=this.add.circle(x,y,e.shieldRadius,0x9fbdbb,.055).setStrokeStyle(2,0xc9d6c3,.28).setDepth(6);
      }
      e.affixLabel=this.add.text(x,y-47,`${meleeWeapon?ENEMY_MELEE_WEAPONS[meleeWeapon].name+' · ':''}УР ${e.level}${e.affixes.length?' · '+e.affixes.join(', '):''}`,{fontFamily:'Arial',fontSize:'9px',color:e.unique?'#edc58c':'#b4d5cb',backgroundColor:'#122029bb',padding:{x:3,y:1}}).setOrigin(.5).setDepth(21);
    });
  }

  update(time,delta) {
    if(!this.running||isOverlayOpen())return;
    const dt=Math.min(delta/1000,.04),p=this.player;
    this.updatePotionHealing(dt);
    if(this.stunnedUntil>time){if(time>=this.stunMoveUntil)p.setVelocity(0);this.updateEnemies(time,dt);return;}
    if(this.skillDashUntil&&time>=this.skillDashUntil){
      this.skillDashUntil=0;
      if(this.skillDashPendingBoost){this.nextDamageBoost=this.skillDashPendingBoost;this.skillDashPendingBoost=0;}
      if(this.skillDashSource==='dash')this.spearDashHasteUntil=time+2000;
      this.setPlayerBody(false);
      p.clearTint();
    }
    if(this.guardUntil&&time>=this.guardUntil)this.releaseGuard();
    if(this.spinUntil&&time<this.spinUntil&&time>=this.nextSpinTick){
      this.nextSpinTick=time+550;
      this.spinTick();
    }
    let x=Number(controlDown('right'))-Number(controlDown('left'));
    let y=Number(controlDown('down'))-Number(controlDown('up'));
    const len=Math.hypot(x,y)||1;x/=len;y/=len;
    if(this.skillDashUntil>time){
      p.setVelocity(this.skillDashX*this.skillDashSpeed,this.skillDashY*this.skillDashSpeed);
      this.checkDashHits();
    }else if(this.rolling){
      if(time>=this.rollUntil){this.rolling=false;this.setPlayerBody(false);p.clearTint();}
      else{p.setVelocity(this.rollX*455,this.rollY*455);p.setAngle(Math.sin((this.rollUntil-time)*.055)*13);}
    }
    if(!this.rolling&&this.skillDashUntil<=time){
      const inSwamp=this.swamps.some(pool=>((p.x-pool.x)/pool.rx)**2+((p.y-pool.y)/pool.ry)**2<1);
      const speed=(205+gearStats().speed*5)*(this.frenzyUntil>time?1.5:1)*(this.utilityMoveUntil>time?1.2:1)*(this.spinUntil>time?SWORD_SPIN_MOVE_MULTIPLIER:1)*(inSwamp?.55:1);
      p.setAngle(0);p.setVelocity(x*speed,y*speed);
    }
    if(x!==0)p.setFlipX(x<0);
    this.altarHint.setVisible(Phaser.Math.Distance.Between(p.x,p.y,this.layout.altar.x,this.layout.altar.y)<125);
    if(this.chestHint)this.chestHint.setVisible(!this.chestChallenge&&this.chest?.active&&Phaser.Math.Distance.Between(p.x,p.y,this.layout.chest.x,this.layout.chest.y)<105);
    for(const merchant of this.depthMerchants)merchant.hint.setVisible(Phaser.Math.Distance.Between(p.x,p.y,merchant.x,merchant.y)<95);
    this.updateEnemies(time,dt);
    for(const obj of [...this.arrows.getChildren(),...this.stones.getChildren()]){
      if(!obj.active)continue;
      if(time>obj.expiry)obj.destroy();
    }
    this.collectNearbyDrops();
    if(!this.lastSkillHud||time-this.lastSkillHud>100){this.lastSkillHud=time;renderSkillBar(this);}
  }

  updateEnemies(time,dt) {
    for(const e of this.enemies.getChildren()){
      if(!e.active)continue;
      if(e.isBoss){this.updateBoss(e,time);continue;}
      const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;
      const ux=dx/d,uy=dy/d;
      if(e.kind==='skeletonKnight'){
        if(time>=e.nextParry){e.nextParry=time+10000;e.parryUntil=time+1200;this.playSkillFx('guard',e.x,e.y,0,.8);e.setTint(0x9ee3dc);this.time.delayedCall(1200,()=>{if(e.active)e.clearTint();});}
        if(time-e.spawnedAt>=20000&&time>=e.nextSpecial){e.nextSpecial=time+30000;this.skeletonSpin(e);}
        const weapon=ENEMY_MELEE_WEAPONS.sword;
        if(e.windupUntil>time)e.setVelocity(0);else if(d>weapon.range-10)e.setVelocity(ux*82,uy*82);else e.setVelocity(0);
        if(d<weapon.range+10&&time>=e.nextAttack&&e.windupUntil<=time)this.beginEnemyMelee(e,time);
      }else if(e.kind==='skeletonMage'){
        if(d<210)e.setVelocity(-ux*72,-uy*72);else if(d>360)e.setVelocity(ux*65,uy*65);else e.setVelocity(-uy*30,ux*30);
        if(time>=e.nextAttack){e.nextAttack=time+5000;this.skeletonMageCast(e,e.attackNumber++%2?'blood':'cold');}
      }else if(e.kind==='skeletonTank'){
        e.shieldAura?.setPosition(e.x,e.y);
        for(const arrow of [...this.arrows.getChildren()]){
          if(arrow.active&&Phaser.Math.Distance.Between(e.x,e.y,arrow.x,arrow.y)<e.shieldRadius)this.arrowHit(arrow,e);
          if(!e.active)break;
        }
        if(!e.active)continue;
        if(e.windupUntil>time)e.setVelocity(0);
        else{
          e.setVelocity(d>105?ux*58:0,d>105?uy*58:0);
          if(d<170&&time>=e.nextSpecial){e.nextSpecial=time+20000;this.tankShieldBash(e);}
        }
      }else if(e.meleeWeapon){
        const weapon=ENEMY_MELEE_WEAPONS[e.meleeWeapon];
        const reach=e.meleeWeapon==='hammer'?weapon.offset+weapon.radius:weapon.range;
        if(e.windupUntil>time)e.setVelocity(0);
        else if(d>Math.max(38,reach-13)&&d<650)e.setVelocity(ux*(e.unique?90:105)*e.speedFactor,uy*(e.unique?90:105)*e.speedFactor);
        else e.setVelocity(0);
        if(d<reach+10&&time>=e.nextAttack&&e.windupUntil<=time)this.beginEnemyMelee(e,time);
      }else{
        const shaman=e.kind==='shaman',archer=e.kind==='archer';
        if(d<170)e.setVelocity(-ux*88*e.speedFactor,-uy*88*e.speedFactor);
        else if(d>300&&d<700)e.setVelocity(ux*76*e.speedFactor,uy*76*e.speedFactor);
        else e.setVelocity(-uy*e.strafe*28*e.speedFactor,ux*e.strafe*28*e.speedFactor);
        if(d<600&&time>e.nextAttack){
          e.nextAttack=time+(shaman?2300:archer?1500:2200)+Math.random()*400;
          this.attackTell(e,shaman?0x9bbbd9:0xa4c7b2);
          this.time.delayedCall(shaman?470:390,()=>{if(e.active&&this.running)this.throwStone(e);});
        }
        if(shaman&&time>e.nextHeal){e.nextHeal=time+4200;this.healAlly(e);}
      }
      if(e.slowUntil>time)e.setVelocity(e.body.velocity.x*.55,e.body.velocity.y*.55);
      e.setFlipX(dx<0);
      const hidden=this.grassZones?.some(zone=>((e.x-zone.x)/zone.rx)**2+((e.y-zone.y)/zone.ry)**2<1);
      e.setAlpha(hidden?.12:1);e.affixLabel.setAlpha(hidden?.12:1);e.bar.setAlpha(hidden?.12:1);e.shieldAura?.setAlpha(hidden?.04:.18);
      e.bar.clear().fillStyle(0x081218,.75).fillRect(e.x-20,e.y-34,40,5)
        .fillStyle(e.unique?0xe1b982:e.kind==='club'?0xcb8069:0x95b89e,1).fillRect(e.x-19,e.y-33,38*e.hp/e.maxHp,3);
      if(e.windupUntil>time){
        const spec=ENEMY_MELEE_WEAPONS[e.meleeWeapon];
        const duration=spec?.windup||e.specialWindupDuration||1;
        const progress=1-(e.windupUntil-time)/duration;
        e.bar.fillStyle(spec?.color||e.specialWindupColor||0xe6cd91,1).fillRect(e.x-20,e.y-27,40*clamp(progress,0,1),3);
      }
      e.affixLabel.setPosition(e.x,e.y-47);
    }
  }

  clearEnemyTelegraph(e){
    if(!e.telegraph)return;
    this.tweens.killTweensOf(e.telegraph);
    e.telegraph.destroy();e.telegraph=null;
  }

  beginEnemyMelee(e,time){
    const spec=ENEMY_MELEE_WEAPONS[e.meleeWeapon];
    const attack={x:e.x,y:e.y,angle:Math.atan2(this.player.y-e.y,this.player.x-e.x)};
    e.nextAttack=time+spec.cooldown;e.windupUntil=time+spec.windup;
    e.setVelocity(0);
    const g=this.add.graphics().setPosition(attack.x,attack.y).setRotation(attack.angle).setDepth(6);
    g.fillStyle(spec.color,.32);g.lineStyle(3,spec.color,.9);
    if(e.meleeWeapon==='hammer'){
      g.fillCircle(spec.offset,0,spec.radius).strokeCircle(spec.offset,0,spec.radius);
      g.lineStyle(2,0xffe2b2,.7).lineBetween(spec.offset-17,0,spec.offset+17,0).lineBetween(spec.offset,-17,spec.offset,17);
    }else if(e.meleeWeapon==='spear'){
      g.fillRect(12,-spec.halfWidth,spec.range-12,spec.halfWidth*2).strokeRect(12,-spec.halfWidth,spec.range-12,spec.halfWidth*2);
      g.lineStyle(2,0xffd1cb,.75).lineBetween(12,0,spec.range,0);
    }else{
      g.slice(0,0,spec.range,-spec.halfAngle,spec.halfAngle,false).fillPath();
      g.beginPath().arc(0,0,spec.range,-spec.halfAngle,spec.halfAngle).strokePath();
      g.lineBetween(0,0,Math.cos(spec.halfAngle)*spec.range,Math.sin(spec.halfAngle)*spec.range);
      g.lineBetween(0,0,Math.cos(-spec.halfAngle)*spec.range,Math.sin(-spec.halfAngle)*spec.range);
    }
    e.telegraph=g;
    this.tweens.add({targets:g,alpha:.43,duration:170,yoyo:true,repeat:-1});
    const runId=this.runId;
    this.time.delayedCall(spec.windup,()=>{
      this.clearEnemyTelegraph(e);e.windupUntil=0;
      if(!e.active||!this.running||this.runId!==runId)return;
      const fx=e.meleeWeapon==='spear'?'thrust':e.meleeWeapon==='sword'?'slash':'burst';
      this.playSkillFx(fx,attack.x+Math.cos(attack.angle)*(e.meleeWeapon==='hammer'?spec.offset:48),attack.y+Math.sin(attack.angle)*(e.meleeWeapon==='hammer'?spec.offset:48),attack.angle,e.meleeWeapon==='hammer'?1.35:.9);
      if(enemyMeleeContains(e.meleeWeapon,attack,this.player))
        this.damagePlayer(Math.round(spec.damage*e.damageFactor*(e.unique?1.25:1)),attack.x,attack.y,e);
    });
  }

  healAlly(shaman){
    const target=this.enemies.getChildren().filter(e=>e.active&&e!==shaman&&e.hp<e.maxHp&&Phaser.Math.Distance.Between(e.x,e.y,shaman.x,shaman.y)<360).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(!target)return;
    target.hp=Math.min(target.maxHp,target.hp+Math.round(28+gameBuild().level*4));
    this.playSkillFx('guard',target.x,target.y,0,.6);
    this.flash(target.x,target.y,0x8ad9a6,45);
  }

  skeletonSpin(e){
    if(!e.active)return;
    e.windupUntil=this.time.now+650;const mark=this.add.circle(e.x,e.y,105,0xbfd8d2,.12).setStrokeStyle(3,0xe4eee4,.8).setDepth(3);
    this.time.delayedCall(650,()=>{
      mark.destroy();if(!e.active||!this.running)return;
      this.playSkillFx('slash',e.x,e.y,0,1.8);
      if(Phaser.Math.Distance.Between(e.x,e.y,this.player.x,this.player.y)<120)this.damagePlayer(Math.round(28*e.damageFactor),e.x,e.y,e);
    });
  }

  skeletonMageCast(e,effect){
    if(!e.active)return;
    const color=effect==='cold'?0x8bd8ed:0xc85e6a;this.attackTell(e,color);
    this.time.delayedCall(520,()=>{
      if(!e.active||!this.running)return;
      const a=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);
      const shot=this.stones.create(e.x+Math.cos(a)*25,e.y+Math.sin(a)*25,'magicshot');
      shot.setDepth(14).setTint(color).setVelocity(Math.cos(a)*285,Math.sin(a)*285);shot.body.setCircle(6,2,2);
      shot.expiry=this.time.now+2800;shot.owner=e;shot.damage=Math.round((effect==='cold'?12:9)*e.damageFactor);shot.effect=effect;
    });
  }

  tankShieldBash(e){
    if(!e.active)return;
    const a=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y),g=this.add.graphics().setDepth(3),length=155,width=54;
    g.lineStyle(width*2,0xd6c291,.24).lineBetween(e.x,e.y,e.x+Math.cos(a)*length,e.y+Math.sin(a)*length);
    g.lineStyle(3,0xead8a8,.9).lineBetween(e.x,e.y,e.x+Math.cos(a)*length,e.y+Math.sin(a)*length);
    e.specialWindupDuration=1300;e.specialWindupColor=0xe6cd91;e.windupUntil=this.time.now+e.specialWindupDuration;
    this.time.delayedCall(1300,()=>{
      g.destroy();if(!e.active||!this.running)return;e.windupUntil=0;
      const dx=this.player.x-e.x,dy=this.player.y-e.y,along=dx*Math.cos(a)+dy*Math.sin(a),side=Math.abs(dx*Math.sin(a)-dy*Math.cos(a));
      if(along>0&&along<length&&side<width){
        this.damagePlayer(Math.round(22*e.damageFactor),e.x,e.y,e);this.stunnedUntil=this.time.now+1000;this.stunMoveUntil=this.time.now+220;
        this.player.setVelocity(Math.cos(a)*620,Math.sin(a)*620);notify('ОГЛУШЕНИЕ · 1 СЕКУНДА',1000);
      }
    });
  }

  aim() {
    const pointer=this.input.activePointer;
    const world=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
    return Math.atan2(world.y-this.player.y,world.x-this.player.x);
  }

  castSkill(index){
    if(!this.running||isOverlayOpen()||this.rolling||this.skillDashUntil>this.time.now)return;
    const skill=SKILLS[this.weapon]?.[index];
    if(!skill||this.time.now<(this.skillReady[skill.id]||0))return;
    const t=this.time.now,a=this.aim(),runId=this.runId,castVersion=this.skillCastVersion;
    playSound('skill');
    const cooldownFactor=skillHasMod(this.weapon,skill.id,'skillRecovery')?.9:1;
    this.skillReady[skill.id]=t+skill.cooldown*1000*cooldownFactor;
    if(skillHasMod(this.weapon,skill.id,'skillVitality')){
      this.player.hp=Math.min(maxHp(),this.player.hp+6);refreshHud();
    }
    if(skillHasMod(this.weapon,skill.id,'skillFleet'))this.utilityMoveUntil=t+1500;
    if(skillHasMod(this.weapon,skill.id,'skillWard'))this.castGuardUntil=t+2000;
    if(skillHasMod(this.weapon,skill.id,'skillFocus'))this.nextDamageBoost=Math.max(this.nextDamageBoost,1.15);
    if(skill.id==='dash')this.beginSkillDash(false,'dash');
    else if(skill.id==='chain')this.finisherStrike('chain',50,a);
    else if(skill.id==='frenzy'){
      this.frenzyUntil=t+6000+(skillHasMod('spear','frenzy','longBuff')?2000:0);
      this.frenzyMaxUntil=this.frenzyUntil+3000;
      this.playSkillFx('thrust',this.player.x,this.player.y,a,1.1);
      this.flash(this.player.x,this.player.y,0xa8d9c1,75);
      notify('СТРЕМИТЕЛЬНОСТЬ · ПРОБИВАНИЕ ВСЕХ · АТАКА ×2 · ДВИЖЕНИЕ ×1,5',1900);
    }else if(skill.id==='bastion'){
      this.guardUntil=t+5000+(skillHasMod('hammer','bastion','longBuff')?2000:0);
      this.guardStored=0;
      this.playSkillFx('guard',this.player.x,this.player.y,0,1.3);
      this.flash(this.player.x,this.player.y,0xd8b380,82);
      notify('НАКОПЛЕННЫЙ УДАР · ПОГЛОЩЕНИЕ УРОНА',1700);
    }else if(skill.id==='quickStrike'){
      const cx=this.player.x+Math.cos(a)*75,cy=this.player.y+Math.sin(a)*75;
      const radius=45+(skillHasMod('hammer','quickStrike','wideSkill')?25:0);
      const tell=this.add.circle(cx,cy,radius,0xe9bd81,.18).setStrokeStyle(2,0xf2d39d,.7).setDepth(14);
      this.time.delayedCall(195,()=>{
        tell.destroy();
        if(!this.running||this.runId!==runId||this.skillCastVersion!==castVersion)return;
        this.playSkillFx('burst',cx,cy,0,.85);
        this.flash(cx,cy,0xe9bc80,radius);
        for(const e of this.enemies.getChildren())if(Phaser.Math.Distance.Between(cx,cy,e.x,e.y)<radius+14)
          this.skillHit(e,HAMMER_QUICK_DAMAGE,a,'quickStrike',skill.tags);
      });
    }else if(skill.id==='sunder'){
      const cx=this.player.x+Math.cos(a)*80,cy=this.player.y+Math.sin(a)*80;
      const radius=76+(skillHasMod('hammer','sunder','wideSkill')?25:0);
      this.time.delayedCall(390,()=>{
        if(!this.running||this.runId!==runId||this.skillCastVersion!==castVersion)return;
        this.playSkillFx('burst',cx,cy,0,1.1);
        this.flash(cx,cy,0x9baec6,radius);
        for(const e of this.enemies.getChildren())if(Phaser.Math.Distance.Between(cx,cy,e.x,e.y)<radius+14){
          e.armor*=skillHasMod('hammer','sunder','deepSunder')?.1:.2;
          e.setTint(0x9ab8d9);
        }
        notify('БРОНЯ ГРЕМЛИНОВ РАСКОЛОТА',1300);
      });
    }else if(skill.id==='parry'){
      this.parryUntil=t+(skillHasMod('sword','parry','strongGuard')?750:500);
      this.playSkillFx('guard',this.player.x,this.player.y,0,.65);
      this.flash(this.player.x,this.player.y,0xa8cedb,40);
    }else if(skill.id==='spin'){
      this.spinUntil=t+5000;
      this.nextSpinTick=t;
      notify('КРОВАВЫЙ ВИХРЬ · СКОРОСТЬ И ПРИТЯЖЕНИЕ · 5 С',1400);
    }else if(skill.id==='execute')this.huntStrike(a);
    renderSkillBar(this);
  }

  skillHit(e,amount,a,skillId,tags){
    if(skillHasMod(this.weapon,skillId,'execution'))amount=Math.round(amount*1.25);
    if(skillHasMod(this.weapon,skillId,'heavyImpact'))amount=Math.round(amount*1.25);
    const result=this.damageEnemy(e,amount,a,tags);
    if(skillId==='dash'&&result.dealt>0)for(let i=1;i<=3;i++)this.time.delayedCall(i*1000,()=>{
      if(e.active&&this.running)this.damageEnemy(e,5,a,[],true);
    });
    if(skillHasMod(this.weapon,skillId,'skillBleed'))for(let i=1;i<=3;i++)this.time.delayedCall(i*500,()=>{
      if(e.active&&this.running)this.damageEnemy(e,5,a,[],true);
    });
    if(skillHasMod(this.weapon,skillId,'skillEcho'))this.time.delayedCall(220,()=>{
      if(e.active&&this.running)this.damageEnemy(e,Math.round(result.dealt*.25),a,[],true);
    });
    return result;
  }

  beginSkillDash(fromChain,skillId,target=null){
    const a=target?.active?Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y):this.aim();
    const targetDistance=target?.active?Phaser.Math.Distance.Between(this.player.x,this.player.y,target.x,target.y)+24:300;
    const distance=Math.min(430,targetDistance)+(skillHasMod('spear',skillId,'dashReach')?80:0);
    this.skillDashX=Math.cos(a);this.skillDashY=Math.sin(a);
    this.skillDashSpeed=710;
    this.skillDashUntil=this.time.now+distance/this.skillDashSpeed*1000;
    this.skillDashTargets=new Set();
    this.skillDashDamage=fromChain?31:55;
    this.skillDashSource=skillId;
    this.skillDashPendingBoost=fromChain?1.6:(skillHasMod('spear',skillId,'dashMomentum')?1.25:0);
    this.setPlayerBody(true);
    this.player.setTint(0x8fe3d9);
    this.playSkillFx('thrust',this.player.x,this.player.y,a,1.2);
    this.flash(this.player.x,this.player.y,0x8fe3d9,38);
  }

  checkDashHits(){
    const a=Math.atan2(this.skillDashY,this.skillDashX);
    for(const e of this.enemies.getChildren()){
      if(!e.active||this.skillDashTargets.has(e))continue;
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y)<39){
        this.skillDashTargets.add(e);
        this.skillHit(e,this.skillDashDamage,a,this.skillDashSource,SKILLS.spear.find(skill=>skill.id===this.skillDashSource).tags);
      }
    }
  }

  nearestEnemy(exclude=null){
    let target=null,best=Infinity;
    for(const e of this.enemies.getChildren()){
      if(!e.active||e===exclude)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);
      if(distance<best){best=distance;target=e;}
    }
    return target;
  }

  finisherStrike(skillId,amount,a){
    const tags=skillById(this.weapon,skillId).tags;
    const baseReach=this.weapon==='spear'?(hasMod('longThrust',WEAPONS.spear.tags)?SPEAR_EXTENDED_REACH:SPEAR_BASE_REACH):92;
    const reach=skillId==='chain'?baseReach*2:baseReach;
    let target=null,best=Infinity;
    for(const e of this.enemies.getChildren()){
      const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);
      const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,e.x,e.y);
      const aligned=this.weapon==='spear'?Math.abs(Math.sin(angle-a)*d)<22:Math.abs(Phaser.Math.Angle.Wrap(angle-a))<.8;
      if(d<reach&&aligned&&d<best){target=e;best=d;}
    }
    this.flash(this.player.x+Math.cos(a)*reach*.65,this.player.y+Math.sin(a)*reach*.65,0xe9d2af,35);
    this.playSkillFx(this.weapon==='spear'?'thrust':'slash',this.player.x+Math.cos(a)*45,this.player.y+Math.sin(a)*45,a,.95);
    if(!target)return;
    const result=this.skillHit(target,amount,a,skillId,tags);
    if(!result.killed){
      if(skillId==='chain')this.skillReady.chain=this.time.now+3000*(skillHasMod('spear','chain','skillRecovery')?.9:1);
      return;
    }
    this.skillReady[skillId]=0;
    if(skillId==='chain'){
      const nextTarget=this.nearestEnemy(target);
      if(nextTarget)this.beginSkillDash(true,'chain',nextTarget);
      else this.nextDamageBoost=Math.max(this.nextDamageBoost,1.6);
      notify(nextTarget?'ЦЕПЬ ПРОНЗАНИЙ · РЫВОК К ЦЕЛИ · 100% УКЛОНЕНИЕ':'ЦЕПЬ ПРОНЗАНИЙ · СЛЕДУЮЩИЙ УРОН +60%',1600);
    }else{
      const healing=Math.ceil(result.dealt*.5);
      this.player.hp=Math.min(maxHp(),this.player.hp+healing);
      refreshHud();notify(`ДОБИВАНИЕ · +${healing} ЗДОРОВЬЯ`,1200);
    }
  }

  huntStrike(a){
    let target=null,bestScore=Infinity;
    for(const e of this.enemies.getChildren()){
      if(!e.active)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);
      const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,e.x,e.y);
      const offset=Math.abs(Phaser.Math.Angle.Wrap(angle-a));
      if(distance>SWORD_HUNT_RANGE||offset>1.05)continue;
      const score=distance+offset*140;
      if(score<bestScore){bestScore=score;target=e;}
    }
    if(!target){notify('ОХОТА · НЕТ ЦЕЛИ В НАПРАВЛЕНИИ КУРСОРА',1100);return;}
    const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y);
    const destinationX=clamp(target.x-Math.cos(angle)*42,130,W-130);
    const destinationY=clamp(target.y-Math.sin(angle)*42,110,H-110);
    this.playSkillFx('thrust',this.player.x,this.player.y,angle,1.45);
    this.flash((this.player.x+target.x)/2,(this.player.y+target.y)/2,0xdca2a2,42);
    if(this.player.setPosition)this.player.setPosition(destinationX,destinationY);else{this.player.x=destinationX;this.player.y=destinationY;}
    this.immuneUntil=Math.max(this.immuneUntil||0,this.time.now+320);
    const result=this.skillHit(target,SWORD_HUNT_DAMAGE,angle,'execute',SKILLS.sword[2].tags);
    if(!result.killed)return;
    this.skillReady.execute=0;
    const healing=Math.ceil(result.dealt*.5);
    this.player.hp=Math.min(maxHp(),this.player.hp+healing);
    refreshHud();notify(`ОХОТА ПРОДОЛЖАЕТСЯ · +${healing} ЗДОРОВЬЯ`,1300);
  }

  spinTick(){
    const radius=90+(skillHasMod('sword','spin','wideSkill')?25:0);
    const pullRadius=radius+90;
    this.playSkillFx('slash',this.player.x,this.player.y,this.time.now*.01,1.8);
    this.flash(this.player.x,this.player.y,0xe4cda8,radius);
    for(const e of this.enemies.getChildren()){
      if(!e.active)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);
      if(distance<pullRadius&&distance>38){
        const pull=Math.min(18,distance-38),angle=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);
        const x=e.x+Math.cos(angle)*pull,y=e.y+Math.sin(angle)*pull;
        if(e.setPosition)e.setPosition(x,y);else{e.x=x;e.y=y;}
      }
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y)<radius+14)
        this.skillHit(e,Math.round(PLAYER_WEAPON_DAMAGE.sword*.8),this.aim(),'spin',SKILLS.sword[1].tags);
    }
  }

  releaseGuard(){
    this.guardUntil=0;
    const stored=Math.round(this.guardStored);
    this.guardStored=0;
    this.playSkillFx('burst',this.player.x,this.player.y,0,2.3);
    this.flash(this.player.x,this.player.y,0xf0ca8f,145);
    if(stored>0)for(const e of this.enemies.getChildren())if(Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y)<145)
      this.damageEnemy(e,stored,0,[],true,true);
    notify(`ВЗРЫВ НАКОПЛЕННОГО УРОНА · ${stored}`,1500);
  }

  meleeAttack() {
    const t=this.time.now;
    if(t<this.swordReady||this.rolling||this.skillDashUntil>t)return;
    const runId=this.runId;
    const tags=WEAPONS[this.weapon].tags;
    let cooldown=({sword:430,spear:600,hammer:1450})[this.weapon];
    if(hasMod('quickHands',tags))cooldown*=.82;
    if(hasMod('heavyHead',tags))cooldown*=1.2;
    if(this.frenzyUntil>t)cooldown*=.5;
    if(this.weapon==='spear'&&this.spearDashHasteUntil>t)cooldown*=.8;
    cooldown*=1-Math.min(.4,gearStats().haste*.03);
    this.swordReady=t+cooldown;
    playSound(this.weapon);
    const a=this.aim(),p=this.player;
    const gfx=this.add.graphics().setDepth(15);
    if(this.weapon==='sword'){
      const half=hasMod('wideArc',tags)?1.2:.77;
      const reach=hasMod('crescent',tags)?108:90;
      const sx=p.x,sy=p.y;
      this.playSkillFx('slash',sx+Math.cos(a)*48,sy+Math.sin(a)*48,a,1.1);
      gfx.fillStyle(0xe8d9b6,.21).slice(sx,sy,reach,a-half,a+half,false).fillPath();
      gfx.lineStyle(4,0xf5e5c6,.95).beginPath().arc(sx,sy,reach-6,a-half,a+half).strokePath();
      for(const e of this.enemies.getChildren()){
        const d=Phaser.Math.Distance.Between(sx,sy,e.x,e.y);
        const angle=Phaser.Math.Angle.Between(sx,sy,e.x,e.y);
        if(d<reach&&Math.abs(Phaser.Math.Angle.Wrap(angle-a))<half)this.damageEnemy(e,PLAYER_WEAPON_DAMAGE.sword,a,tags);
      }
      if(hasMod('doubleArc',tags))this.time.delayedCall(180,()=>{
        if(!this.running||this.runId!==runId)return;
        this.flash(sx+Math.cos(a)*55,sy+Math.sin(a)*55,0xe7d4ae,36);
        for(const e of this.enemies.getChildren()){
          const d=Phaser.Math.Distance.Between(sx,sy,e.x,e.y);
          const angle=Phaser.Math.Angle.Between(sx,sy,e.x,e.y);
          if(d<reach&&Math.abs(Phaser.Math.Angle.Wrap(angle-a))<half)this.damageEnemy(e,19,a,[],true);
        }
      });
    }else if(this.weapon==='spear'){
      const reach=hasMod('longThrust',tags)?SPEAR_EXTENDED_REACH:SPEAR_BASE_REACH;
      this.playSkillFx('thrust',p.x+Math.cos(a)*55,p.y+Math.sin(a)*55,a,1);
      gfx.lineStyle(11,0xb5d6d0,.2).beginPath().moveTo(p.x,p.y).lineTo(p.x+Math.cos(a)*reach,p.y+Math.sin(a)*reach).strokePath();
      gfx.lineStyle(4,0xf4e5ca,.95).beginPath().moveTo(p.x+Math.cos(a)*24,p.y+Math.sin(a)*24).lineTo(p.x+Math.cos(a)*reach,p.y+Math.sin(a)*reach).strokePath();
      const targets=[];
      for(const e of this.enemies.getChildren()){
        const dx=e.x-p.x,dy=e.y-p.y;
        const along=dx*Math.cos(a)+dy*Math.sin(a);
        const sideways=Math.abs(dx*Math.sin(a)-dy*Math.cos(a));
        if(e.active&&along>8&&along<reach&&sideways<SPEAR_HIT_HALF_WIDTH)targets.push({e,along});
      }
      targets.sort((left,right)=>left.along-right.along);
      const hitLimit=this.frenzyUntil>t?targets.length:2;
      for(const {e,along} of targets.slice(0,hitLimit)){
        const tipHit=along>=reach*SPEAR_TIP_START;
        const baseDamage=hasMod('narrowFocus',tags)?55:PLAYER_WEAPON_DAMAGE.spear;
        const result=this.damageEnemy(e,Math.round(baseDamage*(tipHit?SPEAR_TIP_MULTIPLIER:1)),a,tags);
        if(tipHit&&e.active&&!result.parried){
          e.spearVulnerableUntil=t+5000;
          this.flash(e.x,e.y,0x8fe3d9,25);
        }
      }
    }else{
      const cx=p.x+Math.cos(a)*82,cy=p.y+Math.sin(a)*82;
      const radius=hasMod('shockwave',tags)?110:86;
      gfx.lineStyle(3,0xf2c790,.8).strokeCircle(cx,cy,radius);
      gfx.fillStyle(0xe8b46e,.12).fillCircle(cx,cy,radius);
      this.time.delayedCall(390,()=>{
        if(!this.running||this.runId!==runId)return;
        this.playSkillFx('burst',cx,cy,0,1.7);
        this.flash(cx,cy,0xe9bc80,radius);
        this.cameras.main.shake(180,.006);
        for(const e of this.enemies.getChildren()){
          const distance=Phaser.Math.Distance.Between(cx,cy,e.x,e.y);
          if(distance<radius+14)this.damageEnemy(e,hammerAreaDamage(hasMod('heavyHead',tags)?120:PLAYER_WEAPON_DAMAGE.hammer,distance,radius),a,tags);
        }
        if(hasMod('aftershock',tags))this.time.delayedCall(240,()=>{
          if(!this.running||this.runId!==runId)return;
          this.flash(cx,cy,0xe9bc80,radius*.7);
          for(const e of this.enemies.getChildren()){
            if(Phaser.Math.Distance.Between(cx,cy,e.x,e.y)<radius+14)this.damageEnemy(e,36,a,[],true);
          }
        });
      });
    }
    this.tweens.add({targets:gfx,alpha:0,duration:this.weapon==='hammer'?390:170,onComplete:()=>gfx.destroy()});
    if(this.weapon!=='hammer')this.cameras.main.shake(65,.0017);
  }

  bowAttack() {
    const t=this.time.now;
    if(t<this.bowReady||this.rolling||this.skillDashUntil>t)return;
    if(this.ammo<=0){this.toast('СТРЕЛЫ ЗАКОНЧИЛИСЬ · ВЕРНИТЕСЬ К АЛТАРЮ',1400);return;}
    const bowCooldown=(hasMod('quickDraw',['projectile'])?410:570)*(1-Math.min(.4,gearStats().haste*.03))*(this.frenzyUntil>t?.5:1);
    this.bowReady=t+bowCooldown;this.ammo--;this.updateHud();playSound('bow');
    const a=this.aim(),p=this.player;
    const spread=hasMod('tripleShot',['projectile'])?[-.19,0,.19]:[0];
    for(const delta of spread){
      const angle=a+delta;
      const arrow=this.arrows.create(p.x+Math.cos(angle)*25,p.y+Math.sin(angle)*25,'arrow');
      const speed=hasMod('feathered',['projectile'])?820:650;
      arrow.setDepth(13).setRotation(angle).setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);
      arrow.body.setSize(18,7).setOffset(3,0);arrow.expiry=t+(hasMod('longFlight',['projectile'])?2000:1400);
      arrow.pierceLeft=hasMod('piercing',['projectile'])?1:0;
      arrow.hitTargets=new Set();
      arrow.damage=(spread.length===3?32:45)+(hasMod('powerShot',['projectile'])?18:0);
    }
    this.flash(p.x+Math.cos(a)*30,p.y+Math.sin(a)*30,0xe7e3c9,12);
  }

  arrowHit(arrow,e) {
    if(!arrow.active||!e.active||arrow.hitTargets.has(e))return;
    const a=arrow.rotation;
    arrow.hitTargets.add(e);
    this.damageEnemy(e,arrow.damage,a,['projectile']);
    if(arrow.pierceLeft>0)arrow.pierceLeft--;
    else arrow.destroy();
  }

  damageEnemy(e,amount,a,tags=[],secondary=false,ignoreArmor=false) {
    if(!e.active)return {killed:false,dealt:0};
    if(e.kind==='skeletonKnight'&&e.parryUntil>this.time.now&&!secondary){
      e.parryUntil=0;e.clearTint();this.playSkillFx('guard',e.x,e.y,0,1.15);
      playSound('parry');this.damagePlayer(Math.max(1,Math.round(amount)),e.x,e.y,e);notify('СКЕЛЕТ ПАРИРОВАЛ УДАР',1100);return {killed:false,dealt:0,parried:true};
    }
    if(e.kind==='skeletonTank'&&!ignoreArmor){
      const playerInFront=(this.player.x<e.x)===e.flipX;
      if(playerInFront){amount=Math.max(1,Math.round(amount*.5));this.playSkillFx('guard',e.x,e.y,0,.65);}
    }
    if(!secondary&&hasMod('fury',tags))amount=Math.round(amount*1.2);
    if(!secondary){
      if(tags.includes('thrust')&&e.spearVulnerableUntil>this.time.now){
        amount=Math.round(amount*SPEAR_VULNERABILITY_MULTIPLIER);e.spearVulnerableUntil=0;
        this.flash(e.x,e.y,0x8fe3d9,28);
      }
      const item=tags.includes('projectile')?profile.equipment.bow:profile.equipment.mainHand;
      const stats=gearStats();
      amount+=Math.round((item?.base.damage||0)+stats.power*2+(profile.level-1)*3);
      if(Math.random()<stats.crit*.025)amount=Math.round(amount*1.5);
      if(this.nextDamageBoost>1){amount=Math.round(amount*this.nextDamageBoost);this.nextDamageBoost=1;}
    }
    if(!ignoreArmor)amount=Math.max(1,Math.round(amount*(1-Math.min(.75,e.armor*.01))));
    const dealt=Math.min(e.hp,amount);
    e.hp-=amount;e.setTintFill(0xf6e5c7);
    if(!secondary)playSound('hit');
    this.time.delayedCall(105,()=>{if(e.active)e.clearTint();});
    e.setVelocity(Math.cos(a)*160,Math.sin(a)*160);
    this.flash(e.x,e.y,0xd3bca1,18);
    if(!secondary&&hasMod('bleed',tags)){
      for(let i=1;i<=3;i++)this.time.delayedCall(i*550,()=>{
        if(e.active&&this.running)this.damageEnemy(e,5,a,[],true);
      });
    }
    if(!secondary&&hasMod('echo',tags))this.time.delayedCall(220,()=>{
      if(e.active&&this.running)this.damageEnemy(e,Math.round(amount*.35),a,[],true);
    });
    if(!secondary&&hasMod('cripple',tags))e.slowUntil=this.time.now+1100;
    if(!secondary&&hasMod('venom',tags)){
      for(let i=1;i<=3;i++)this.time.delayedCall(i*650,()=>{
        if(e.active&&this.running)this.damageEnemy(e,6,a,[],true);
      });
    }
    if(e.hp<=0){
      if(this.weapon==='spear'&&tags.includes('thrust')&&this.frenzyUntil>this.time.now)
        this.frenzyUntil=Math.min(this.frenzyMaxUntil||this.frenzyUntil,this.frenzyUntil+500);
      if(e.isBoss){this.defeatBoss(e);return {killed:true,dealt};}
      const shards=memoryShardsForEnemy(e.level,worldSphereCount(gameBuild()),runDepth);profile.memoryShards+=shards;
      this.dropLoot(e);
      if(e.chestMob){
        this.chestMobsLeft=Math.max(0,this.chestMobsLeft-1);
        if(this.chestMobsLeft===0){const reward=scaledCoins(150,gameBuild());this.createDrop(this.layout.chest.x,this.layout.chest.y+35,{gold:reward});notify(`ЗАСАДА ПОБЕЖДЕНА · НАГРАДА ${reward} МОНЕТ`,2200);}
      }
      this.flash(e.x,e.y,0x97c6a0,34);this.clearEnemyTelegraph(e);e.bar.destroy();e.affixLabel.destroy();e.shieldAura?.destroy();e.destroy();this.killCount++;this.updateHud();
      if(this.enemies.countActive()===0){
        this.bossState='ready';
        this.altarHint.setText(`${controlName(controls.interact)} — ПРИЗВАТЬ БОССА ИЛИ ВЕРНУТЬСЯ`);
        this.toast('ВСЕ ГРЕМЛИНЫ ПОВЕРЖЕНЫ · ПОДОЙДИТЕ К АЛТАРЮ',4500);
        this.updateHud();
      }
    }
    return {killed:e.hp<=0,dealt};
  }

  dropLoot(enemyOrX,y) {
    const enemy=typeof enemyOrX==='object'?enemyOrX:null,x=enemy?.x??enemyOrX,dropY=(enemy?.y??y)+7;
    const rewards=[{gold:scaledCoins(randomInt(9,24),gameBuild())}];
    if(enemy)for(const reward of enemyLootPlan(enemy.kind,enemy.level,runDepth)){
      if(reward.equipment){
        const bases=ITEM_BASES.filter(base=>['weapon','armor','jewelry'].includes(base.kind));
        rewards.push({item:makeItem(bases[randomInt(0,bases.length-1)],null,enemy.level)});
      }else rewards.push(reward);
    }
    rewards.forEach((reward,index)=>{
      const angle=index*Math.PI*2/Math.max(1,rewards.length),radius=index?28:0;
      this.createDrop(x+Math.cos(angle)*radius,dropY+Math.sin(angle)*radius,reward);
    });
  }

  openRuinChest(){
    if(!this.running||!this.chest?.active||this.chestChallenge)return;
    if(Phaser.Math.Distance.Between(this.player.x,this.player.y,this.layout.chest.x,this.layout.chest.y)>125)return;
    this.chestChallenge=true;this.chest.setTint(0x77685b);this.chestHint?.setVisible(false);playSound('chest');
    if(this.bossState==='ready')this.bossState='mobs';
    const {x,y}=this.layout.chest,types=['club','stone','club','stone'];this.chestMobsLeft=types.length;
    types.forEach((type,i)=>{
      const a=i*Math.PI/2,px=x+Math.cos(a)*145,py=y+Math.sin(a)*125,weapon=type==='club'?['sword','spear','hammer','club'][i]:null;
      const e=this.enemies.create(px,py,weapon?`gremlin-${weapon}`:type).setDepth(8).setCollideWorldBounds(true);e.body.setCircle(15,9,19);
      e.kind=type;e.level=profile.level+gameBuild().level;e.unique=false;e.meleeWeapon=weapon;e.windupUntil=0;e.telegraph=null;e.chestMob=true;
      e.hp=Math.round((type==='club'?78:60)*(1+(e.level-1)*.18));e.maxHp=e.hp;e.armor=12+(e.level-1)*2;e.damageFactor=1+(e.level-1)*.13;e.speedFactor=1;e.affixes=[];
      e.nextAttack=0;e.nextHeal=0;e.nextParry=Infinity;e.nextSpecial=Infinity;e.slowUntil=0;e.strafe=i%2?1:-1;
      e.bar=this.add.graphics().setDepth(20);e.affixLabel=this.add.text(px,py-47,`СТРАЖ СУНДУКА · УР ${e.level}`,{fontFamily:'Arial',fontSize:'9px',color:'#edc58c',backgroundColor:'#122029bb',padding:{x:3,y:1}}).setOrigin(.5).setDepth(21);
    });
    this.enemyTotal+=types.length;notify('СУНДУК ОКАЗАЛСЯ ЛОВУШКОЙ · ПОБЕДИТЕ СТРАЖЕЙ',2300);this.updateHud();
  }

  createDrop(x,y,reward) {
    const color=reward.gold?0xe1bd6c:reward.item?(reward.item.rarity===2?0xd7a86d:reward.item.rarity===1?0x87b6cf:0xc5c6b5):reward.arrows?0x9fcbd2:reward.potion?0xd88f86:reward.heal?0x8dd7a4:0xb39cdb;
    const labelText=reward.gold?`${reward.gold} ◈`:reward.item?reward.item.name:reward.arrows?`${reward.arrows} СТРЕЛ${reward.arrows===1?'А':'Ы'}`:reward.potion?'ЗЕЛЬЕ ЛЕЧЕНИЯ':reward.heal?`СФЕРА ВОССТАНОВЛЕНИЯ +${reward.heal}`:`КНИГА ПАМЯТИ +${reward.memory}`;
    const glow=this.add.circle(0,0,20,color,.14);
    const core=this.add.circle(0,0,reward.gold?7:9,color,.9).setStrokeStyle(2,0xf0e7cf,.7);
    const label=this.add.text(0,20,labelText,{fontFamily:'Arial',fontSize:'11px',color:'#e8e7da',backgroundColor:'#101a22cc',padding:{x:4,y:2}}).setOrigin(.5,0);
    const visual=this.add.container(x,y,[glow,core,label]).setDepth(24);
    this.tweens.add({targets:glow,scale:1.35,alpha:.06,duration:700,yoyo:true,repeat:-1});
    this.drops.push({x,y,reward,visual,nextTry:0});
  }

  collectNearbyDrops() {
    for(const drop of this.drops){
      if(!drop.visual.active||this.time.now<drop.nextTry)continue;
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,drop.x,drop.y)>42)continue;
      if(drop.reward.gold){
        profile.gold+=drop.reward.gold;
        playSound('gold');
        notify(`+${drop.reward.gold} ЗОЛОТА`,950);
      }else if(drop.reward.arrows){
        if(this.ammo>=100){notify('МАКСИМУМ СТРЕЛ · 100',1000);drop.nextTry=this.time.now+1500;continue;}
        const amount=Math.min(drop.reward.arrows,100-this.ammo);this.ammo+=amount;playSound('gold');notify(`+${amount} СТРЕЛ`,950);
      }else if(drop.reward.potion){
        if(this.potions>=10){notify('МАКСИМУМ ЗЕЛИЙ · 10',1000);drop.nextTry=this.time.now+1500;continue;}
        this.potions++;playSound('potion');notify('+1 ЗЕЛЬЕ ЛЕЧЕНИЯ',1000);
      }else if(drop.reward.heal){
        if(this.player.hp>=maxHp()){notify('ЗДОРОВЬЕ УЖЕ ПОЛНОЕ',1000);drop.nextTry=this.time.now+1500;continue;}
        const amount=Math.min(drop.reward.heal,maxHp()-this.player.hp);this.player.hp+=amount;playSound('potion');notify(`СФЕРА ВОССТАНОВЛЕНИЯ · +${amount} ЗДОРОВЬЯ`,1200);
      }else if(drop.reward.memory){
        profile.memoryShards+=drop.reward.memory;playSound('level');notify(`КНИГА ПАМЯТИ · +${drop.reward.memory} ОСКОЛКОВ`,1300);
      }else if(profile.inventory.length<INVENTORY_LIMIT){
        profile.inventory.push(drop.reward.item);
        notify(`НАЙДЕНО: ${drop.reward.item.name.toUpperCase()}`,1400);
      }else{
        notify('РЮКЗАК ПОЛОН · ВЕРНИТЕСЬ В ГОРОД',1500);
        drop.nextTry=this.time.now+1800;
        continue;
      }
      drop.visual.destroy();
      refreshHud();
    }
    this.drops=this.drops.filter(drop=>drop.visual.active);
  }

  spawnDepthMerchants(){
    const count=depthMerchantCount(gameBuild(),runDepth);if(!count)return;
    const {x,y}=this.layout.altar;
    for(let index=0;index<count;index++){
      const angle=-Math.PI*.85+(count===1?0:index/(count-1)*Math.PI*.7),distance=185;
      const mx=x+Math.cos(angle)*distance,my=y+Math.sin(angle)*distance;
      const sprite=this.add.image(mx,my,'depth-merchant').setDepth(8).setInteractive({useHandCursor:true});
      const hint=this.add.text(mx,my-53,`${controlName(controls.interact)} · ТОРГОВЕЦ ГЛУБИНЫ`,{fontFamily:'Arial',fontSize:'9px',color:'#f0d4a0',backgroundColor:'#14232bdd',padding:{x:6,y:4}}).setOrigin(.5).setDepth(20).setVisible(false);
      const merchant={index,x:mx,y:my,sprite,hint,stock:makeDepthMerchantStock(index,runDepth)};
      sprite.on('pointerdown',()=>showDepthMerchant(index));this.depthMerchants.push(merchant);
    }
    notify(`ТОРГОВЦЫ ГЛУБИНЫ ПРИБЫЛИ · ${count}`,2200);
  }

  throwStone(e) {
    const a=Phaser.Math.Angle.Between(e.x,e.y,this.player.x,this.player.y);
    const projectile=e.kind==='shaman'?'magicshot':e.kind==='archer'?'enemy-arrow':'rockshot';
    const stone=this.stones.create(e.x+Math.cos(a)*22,e.y+Math.sin(a)*22,projectile);
    const speed=e.kind==='archer'?400:e.kind==='shaman'?260:290;
    stone.setDepth(14).setRotation(a).setVelocity(Math.cos(a)*speed,Math.sin(a)*speed);
    stone.body.setCircle(6,2,2);stone.expiry=this.time.now+2600;stone.owner=e;
    stone.damage=Math.round((e.kind==='archer'?16:e.kind==='shaman'?20:12)*e.damageFactor);
  }

  stoneHit(stone) {
    if(!stone.active)return;
    const x=stone.x,y=stone.y,source=stone.owner,damage=stone.damage,effect=stone.effect;stone.destroy();this.damagePlayer(damage,x,y,source);
    if(effect==='cold'&&this.player.hp>0){this.stunnedUntil=Math.max(this.stunnedUntil,this.time.now+1200);this.stunMoveUntil=0;notify('СКОВАН ХОЛОДОМ · 1,2 С',1100);}
    if(effect==='blood'&&this.player.hp>0)for(let i=1;i<=4;i++)this.time.delayedCall(i*650,()=>{if(this.running&&this.player.hp>0)this.damagePlayer(4,this.player.x,this.player.y,source);});
  }

  damagePlayer(amount,fromX,fromY,source=null) {
    const t=this.time.now;
    if(!this.running||isOverlayOpen()||t<this.immuneUntil)return;
    if(this.skillDashUntil>t){this.flash(this.player.x,this.player.y,0x8fe3d9,25);return;}
    if(this.parryUntil>t){
      this.parryUntil=0;
      this.skillReady.parry=0;
      if(source?.active){
        const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,source.x,source.y);
        const destinationX=clamp(source.x-Math.cos(angle)*42,130,W-130),destinationY=clamp(source.y-Math.sin(angle)*42,110,H-110);
        this.playSkillFx('thrust',this.player.x,this.player.y,angle,1.35);
        this.flash((this.player.x+source.x)/2,(this.player.y+source.y)/2,0xa6d8e4,48);
        if(this.player.setPosition)this.player.setPosition(destinationX,destinationY);else{this.player.x=destinationX;this.player.y=destinationY;}
        this.immuneUntil=Math.max(this.immuneUntil||0,t+280);
        this.damageEnemy(source,Math.max(PLAYER_WEAPON_DAMAGE.sword,Math.round(amount*1.25)),angle,SKILLS.sword[0].tags);
      }
      this.flash(this.player.x,this.player.y,0xa6d8e4,55);
      notify('КОНТРРЫВОК · ОТВЕТНЫЙ УДАР',1100);
      return;
    }
    if(this.rolling&&Math.random()<.8){
      this.flash(this.player.x,this.player.y,0x92d5d9,26);
      this.toast('УКЛОНЕНИЕ',550);this.immuneUntil=t+160;return;
    }
    const reduction=Math.min(.55,gearStats().armor*.015);
    let damage=Math.max(1,Math.round(amount*(1-reduction)));
    if(this.castGuardUntil>t)damage=Math.max(1,Math.round(damage*.8));
    if(this.guardUntil>t){
      const resistance=skillHasMod('hammer','bastion','strongGuard')?.7:.6;
      const prevented=Math.round(damage*resistance);
      this.guardStored+=prevented;
      damage=Math.max(0,damage-prevented);
    }
    this.player.hp=Math.max(0,this.player.hp-damage);
    if(damage>0)playSound('hurt');
    this.immuneUntil=t+480;
    this.player.setTintFill(0xff8d83);
    this.time.delayedCall(120,()=>{if(this.player.active)this.player.clearTint();});
    const a=Phaser.Math.Angle.Between(fromX,fromY,this.player.x,this.player.y);
    this.player.setVelocity(Math.cos(a)*260,Math.sin(a)*260);
    this.cameras.main.shake(160,.006);
    this.updateHud();
    if(this.player.hp<=0)this.die();
  }

  roll() {
    if(!this.running||isOverlayOpen()||this.rolling||this.skillDashUntil>this.time.now||this.time.now<this.rollReady)return;
    let x=Number(controlDown('right'))-Number(controlDown('left'));
    let y=Number(controlDown('down'))-Number(controlDown('up'));
    if(x===0&&y===0){const a=this.aim();x=Math.cos(a);y=Math.sin(a);}
    const d=Math.hypot(x,y);this.rollX=x/d;this.rollY=y/d;
    this.rolling=true;this.rollUntil=this.time.now+420;
    this.rollReady=this.time.now+(hasMod('quickRoll',['roll'])?680:1050);
    this.setPlayerBody(true);this.player.setTint(0x9de2dc);
    playSound('roll');
    this.flash(this.player.x,this.player.y,0x79cfc5,25);
  }

  usePotion(){
    if(!this.running||isOverlayOpen()||this.potions<=0||this.player.hp>=maxHp()||this.potionHealRemaining>0)return;
    this.potions--;this.potionHealRemaining=Math.max(1,Math.round(maxHp()*.45));this.potionHealRate=this.potionHealRemaining/4;this.potionHealCarry=0;
    playSound('potion');notify('ЗЕЛЬЕ ЛЕЧЕНИЯ · ВОССТАНОВЛЕНИЕ В ТЕЧЕНИЕ 4 С',1400);this.updateHud();
  }

  updatePotionHealing(dt){
    if(this.potionHealRemaining<=0)return;
    if(this.player.hp>=maxHp()){this.potionHealRemaining=0;this.potionHealCarry=0;return;}
    this.potionHealCarry+=this.potionHealRate*dt;
    const heal=Math.min(this.potionHealRemaining,Math.floor(this.potionHealCarry+1e-6),maxHp()-this.player.hp);
    if(heal>0){this.potionHealCarry-=heal;this.potionHealRemaining-=heal;this.player.hp+=heal;this.updateHud();}
  }

  summonBoss(){
    if(!this.running||this.bossState!=='ready')return;
    this.bossState='fighting';
    const spec=MAP_BOSSES[this.layout.seed%MAP_BOSSES.length];
    const {x,y}=this.layout.altar;
    const e=this.enemies.create(x,y,`boss-${spec.id}`);
    e.setDepth(9).setCollideWorldBounds(true);e.body.setCircle(34,14,24);
    const build=gameBuild();e.isBoss=true;e.bossSpec=spec;e.kind=spec.id;e.level=profile.level+build.level;
    e.hp=Math.round(spec.hp*(1+(e.level-1)*.2));e.maxHp=e.hp;e.armor=spec.armor+(e.level-1)*2;
    e.damageFactor=1+(e.level-1)*.12;e.nextAttack=this.time.now+1200;e.attackNumber=0;e.slowUntil=0;
    e.bar=this.add.graphics().setDepth(20);e.affixLabel=this.add.text(x,y-67,`БОСС · УР ${e.level}`,{fontFamily:'Arial',fontSize:'11px',color:'#f7d9ac',backgroundColor:'#122029cc',padding:{x:5,y:2}}).setOrigin(.5).setDepth(21);
    this.boss=e;$('bossHud').hidden=false;$('bossName').textContent=spec.name;playSound('boss');
    this.altarHint.setText('БОСС ПРИЗВАН · ВОЗВРАТ');
    this.playSkillFx('burst',x,y,0,2.2);this.flash(x,y,spec.color,95);
    notify(`${spec.name} · ${spec.description.toUpperCase()}`,2900);this.updateHud();
  }

  summonBiomeBoss(){
    const spec=BIOME_BOSS,x=1100,y=370,stats=biomeBossStats(profile.level);
    const e=this.enemies.create(x,y,'boss-junkking');
    e.setDepth(9).setCollideWorldBounds(true).setScale(1.08);e.body.setCircle(39,17,19);
    e.isBoss=true;e.isBiomeBoss=true;e.bossSpec=spec;e.kind=spec.id;e.level=profile.level;
    e.hp=stats.hp;e.maxHp=e.hp;e.armor=stats.armor;e.damageFactor=stats.damageFactor;e.moveSpeed=stats.speed;
    e.nextAttack=this.time.now+900;e.nextSling=0;e.nextSummon=this.time.now+6500;e.nextDash=this.time.now+5500;e.attackNumber=0;e.phase=1;e.windupUntil=0;e.slowUntil=0;
    e.bar=this.add.graphics().setDepth(20);e.affixLabel=this.add.text(x,y-78,'БОСС БИОМА · СТАДИЯ 1',{fontFamily:'Arial',fontSize:'11px',color:'#f7d9ac',backgroundColor:'#122029dd',padding:{x:5,y:2}}).setOrigin(.5).setDepth(21);
    this.enemyTotal=1;this.boss=e;$('bossHud').hidden=false;$('bossName').textContent=spec.name;playSound('boss');
    this.playSkillFx('burst',x,y,0,2.7);this.flash(x,y,spec.color,120);notify(`${spec.name} · ВЛАДЫКА АСТРАЛЬНОЙ ПУСТОШИ`,3200);this.updateHud();
  }

  spawnBossMinion(type,x,y,index=0){
    const meleeWeapon=type==='warrior'?'hammer':type==='club'?'club':null;
    const texture=meleeWeapon?`gremlin-${meleeWeapon}${type==='warrior'?'-warrior':''}`:type;
    const e=this.enemies.create(clamp(x,140,W-140),clamp(y,140,H-140),texture);
    e.setDepth(8).setCollideWorldBounds(true);e.body.setCircle(15,9,19);
    e.kind=type;e.level=profile.level;e.unique=type!=='club';e.meleeWeapon=meleeWeapon;e.windupUntil=0;e.telegraph=null;
    e.hp=Math.round(({club:58,warrior:112,shaman:76})[type]*(1+(e.level-1)*.12));e.maxHp=e.hp;
    e.armor=({club:10,warrior:20,shaman:8})[type]+Math.floor((e.level-1)*1.3);e.damageFactor=1+(e.level-1)*.09;e.speedFactor=1;e.affixes=[];
    e.nextAttack=this.time.now+900+index*180;e.nextThink=0;e.nextHeal=0;e.spawnedAt=this.time.now;e.nextSpecial=0;e.nextParry=0;e.attackNumber=0;e.strafe=index%2?-1:1;e.slowUntil=0;
    e.bar=this.add.graphics().setDepth(20);e.affixLabel=this.add.text(e.x,e.y-47,`${type==='shaman'?'ШАМАН':type==='warrior'?'ВОИН':'ДУБИНА'} · УР ${e.level}`,{fontFamily:'Arial',fontSize:'9px',color:'#edc58c',backgroundColor:'#122029bb',padding:{x:3,y:1}}).setOrigin(.5).setDepth(21);
    return e;
  }

  summonJunkKingMinions(e){
    const types=junkKingSummonTypes(e.phase);
    types.forEach((type,index)=>{
      const angle=index/Math.max(1,types.length)*Math.PI*2;
      this.spawnBossMinion(type,e.x+Math.cos(angle)*125,e.y+Math.sin(angle)*105,index);
    });
    this.playSkillFx('burst',e.x,e.y,0,1.8);this.flash(e.x,e.y,0x8eb768,90);
    notify(e.phase===1?'КОРОЛЬ ПРИЗЫВАЕТ ДВУХ ДУБИНЩИКОВ':'КОРОЛЬ ПРИЗЫВАЕТ ТРЁХ ВОИНОВ И ШАМАНА',2200);
  }

  bossProjectile(e,angle,speed,damage,texture='magicshot'){
    const shot=this.stones.create(e.x+Math.cos(angle)*38,e.y+Math.sin(angle)*38,texture);
    shot.setDepth(14).setRotation(angle).setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);
    shot.body.setCircle(6,2,2);shot.expiry=this.time.now+3000;shot.owner=e;shot.damage=Math.round(damage*e.damageFactor);
  }

  bossCircle(e,x,y,radius,windup,damage,color,after,knockback=260){
    const mark=this.add.circle(x,y,radius,color,.15).setStrokeStyle(3,color,.85).setDepth(3);
    const runId=this.runId;
    this.time.delayedCall(windup,()=>{
      mark.destroy();if(!e.active||!this.running||this.runId!==runId)return;
      this.playSkillFx('burst',x,y,0,radius/45);this.flash(x,y,color,radius);
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,x,y)<radius+15){
        this.damagePlayer(Math.round(damage*e.damageFactor),x,y,e);
        const push=Math.atan2(this.player.y-y,this.player.x-x);this.player.setVelocity?.(Math.cos(push)*knockback,Math.sin(push)*knockback);
      }
      after?.();
    });
  }

  bossLine(e,angle,length,width,windup,damage,color,lunge=false,knockback=260){
    const x=e.x,y=e.y,g=this.add.graphics().setDepth(3);
    g.lineStyle(width*2,color,.33).lineBetween(x,y,x+Math.cos(angle)*length,y+Math.sin(angle)*length);
    g.lineStyle(2,color,.9).lineBetween(x,y,x+Math.cos(angle)*length,y+Math.sin(angle)*length);
    const runId=this.runId;
    this.time.delayedCall(windup,()=>{
      g.destroy();if(!e.active||!this.running||this.runId!==runId)return;
      if(lunge)e.setPosition(clamp(x+Math.cos(angle)*length*.8,130,W-130),clamp(y+Math.sin(angle)*length*.8,130,H-130));
      this.playSkillFx('thrust',x+Math.cos(angle)*length*.5,y+Math.sin(angle)*length*.5,angle,length/140);
      const dx=this.player.x-x,dy=this.player.y-y,along=dx*Math.cos(angle)+dy*Math.sin(angle),side=Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle));
      if(along>0&&along<length&&side<width+14){this.damagePlayer(Math.round(damage*e.damageFactor),x,y,e);this.player.setVelocity?.(Math.cos(angle)*knockback,Math.sin(angle)*knockback);}
    });
  }

  updateJunkKing(e,time,d,a,dx,dy){
    const phase=e.hp<=e.maxHp*.5?2:1;
    if(phase!==e.phase){e.phase=phase;e.affixLabel.setText('БОСС БИОМА · СТАДИЯ 2');notify('СТАДИЯ 2 · КОРОЛЬ В ЯРОСТИ',2600);playSound('boss');}
    if(e.windupUntil>time)e.setVelocity(0);
    else e.setVelocity(d>135&&d<820?dx/d*e.moveSpeed*(phase===2?1.22:1):0,d>135&&d<820?dy/d*e.moveSpeed*(phase===2?1.22:1):0);
    e.setFlipX(dx<0);
    if(time>=e.nextSummon){e.nextSummon=time+JUNK_KING_COOLDOWNS.summon;e.nextAttack=time+1800;this.summonJunkKingMinions(e);}
    else if(phase===2&&time>=e.nextDash){e.nextDash=time+JUNK_KING_COOLDOWNS.dash;e.nextAttack=time+1800;e.windupUntil=time+1250;this.bossLine(e,a,520,34,1250,72,e.bossSpec.color,true,720);notify('КОРОЛЬ ГОТОВИТ СОКРУШИТЕЛЬНЫЙ РЫВОК',1200);}
    else if(d>270&&time>=e.nextSling){e.nextSling=time+JUNK_KING_COOLDOWNS.sling;e.nextAttack=time+900;this.bossProjectile(e,a,390,e.bossSpec.baseAttack*.7,'rockshot');notify('РОГАТКА · 70% УРОНА АТАКИ',900);}
    else if(d<195&&time>=e.nextAttack){
      e.nextAttack=time+(phase===2?1750:2200);e.windupUntil=time+760;
      const cx=e.x+Math.cos(a)*72,cy=e.y+Math.sin(a)*72;
      this.bossCircle(e,cx,cy,102,760,e.bossSpec.baseAttack,e.bossSpec.color,null,600);
    }
    e.bar.clear().fillStyle(0x081218,.8).fillRect(e.x-52,e.y-70,104,9).fillStyle(e.bossSpec.color,1).fillRect(e.x-51,e.y-69,102*Math.max(0,e.hp)/e.maxHp,7);
    e.affixLabel.setPosition(e.x,e.y-88);$('bossFill').style.width=`${Math.max(0,e.hp/e.maxHp*100)}%`;
  }

  updateBoss(e,time){
    const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
    if(e.bossSpec.id==='junkking'){this.updateJunkKing(e,time,d,a,dx,dy);return;}
    e.setVelocity(d>140&&d<650?dx/d*95:0,d>140&&d<650?dy/d*95:0);e.setFlipX(dx<0);
    if(time>=e.nextAttack){
      const second=e.attackNumber++%2===1;e.nextAttack=time+(second?2350:2900);
      const id=e.bossSpec.id,c=e.bossSpec.color;
      if(id==='warden'){
        if(second)for(let i=0;i<4;i++)this.bossCircle(e,this.player.x+(i-1.5)*55,this.player.y+(i%2?70:-65),33,800+i*180,13,c);
        else this.bossCircle(e,this.player.x,this.player.y,95,1000,32,c);
      }else if(id==='mire'){
        if(second)for(const offset of [-.28,0,.28])this.bossProjectile(e,a+offset,260,17);
        else {
          const targetX=this.player.x,targetY=this.player.y;
          this.bossCircle(e,targetX,targetY,78,860,20,c,()=>{
          const pool=this.add.image(targetX,targetY,'swamp-pool').setDepth(-7).setAlpha(.8);
          const zone={x:pool.x,y:pool.y,rx:75,ry:39};this.swamps.push(zone);
          this.time.delayedCall(5000,()=>{pool.destroy();this.swamps=this.swamps.filter(item=>item!==zone);});
          });
        }
      }else if(id==='hunter'){
        if(second)this.bossLine(e,a,520,19,850,31,c);
        else for(const offset of [-.42,-.21,0,.21,.42])this.bossProjectile(e,a+offset,420,13,'enemy-arrow');
      }else if(second)this.bossLine(e,a,245,28,670,30,c,true);
      else this.bossCircle(e,e.x,e.y,130,770,25,c);
    }
    e.bar.clear().fillStyle(0x081218,.8).fillRect(e.x-43,e.y-58,86,8).fillStyle(e.bossSpec.color,1).fillRect(e.x-42,e.y-57,84*Math.max(0,e.hp)/e.maxHp,6);
    e.affixLabel.setPosition(e.x,e.y-75);
    $('bossFill').style.width=`${Math.max(0,e.hp/e.maxHp*100)}%`;
  }

  defeatBoss(e){
    const x=e.x,y=e.y,name=e.bossSpec.name;
    if(e.isBiomeBoss){
      e.bar.destroy();e.affixLabel.destroy();e.destroy();this.boss=null;this.bossState='complete';this.victory=true;this.running=false;profile.biomeBossDefeated=true;$('bossHud').hidden=true;
      for(const minion of this.enemies.getChildren()){minion.bar?.destroy();minion.affixLabel?.destroy();this.clearEnemyTelegraph(minion);minion.destroy();}
      this.flash(x,y,0xf0c56f,180);playSound('victory');this.updateHud();
      this.time.delayedCall(900,()=>showCredits());return;
    }
    e.bar.destroy();e.affixLabel.destroy();e.destroy();this.boss=null;
    this.bossState='complete';this.victory=true;$('bossHud').hidden=true;
    const build=gameBuild();for(let i=0;i<6;i++)this.createDrop(x+Math.cos(i*Math.PI/3)*55,y+Math.sin(i*Math.PI/3)*55,{gold:scaledCoins(randomInt(65,95),build)});
    const shardBonus=memoryShardsForMap(build);profile.memoryShards+=shardBonus;
    const xp=mapExperience(profile.level,build),levels=grantExperience(profile,xp);profile.mapsCleared++;
    if(levels)syncShopsToHeroLevel();
    if(levels)this.player.hp=Math.min(maxHp(),this.player.hp+levels*8);
    this.altarHint.setText(`${controlName(controls.interact)} — ВЕРНУТЬСЯ В ГОРОД`);
    this.flash(x,y,0xe9c28a,130);this.updateHud();playSound(levels?'level':'victory');
    this.spawnDepthMerchants();
    notify(`${name} ПОВЕРЖЕН · +${xp} ОП · +${shardBonus} ОСКОЛКОВ${levels?` · НОВЫЙ УРОВЕНЬ ${profile.level}`:''}`,4200);
  }

  rest() {
    if(!this.running||isOverlayOpen()||Phaser.Math.Distance.Between(this.player.x,this.player.y,this.layout.altar.x,this.layout.altar.y)>125)return;
    showAltarMenu();
  }

  interact(){
    if(this.chest?.active&&!this.chestChallenge&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.layout.chest.x,this.layout.chest.y)<125){this.openRuinChest();return true;}
    const merchant=this.depthMerchants.find(item=>Phaser.Math.Distance.Between(this.player.x,this.player.y,item.x,item.y)<105);
    if(merchant){showDepthMerchant(merchant.index);return true;}
    if(Phaser.Math.Distance.Between(this.player.x,this.player.y,this.layout.altar.x,this.layout.altar.y)<125){this.rest();return true;}
    return false;
  }

  die() {
    this.running=false;this.player.setVelocity(0);this.player.setTint(0x9b6b72);
    runBuild=null;runDepth=1;runMode='map';runSupplies=null;runResources=null;this.scene.start('city');
    notify(`ВЫ ПАЛИ · ПОБЕЖДЕНО ГРЕМЛИНОВ: ${this.killCount} · ДОБЫЧА СОХРАНЕНА`,3800);
  }

  attackTell(e,color) {
    const r=this.add.circle(e.x,e.y,34,color,.13).setStrokeStyle(2,color,.65).setDepth(2);
    this.tweens.add({targets:r,scale:1.25,alpha:0,duration:360,onComplete:()=>r.destroy()});
  }

  flash(x,y,color,size) {
    const r=this.add.circle(x,y,size,color,.3).setDepth(16);
    this.tweens.add({targets:r,scale:1.8,alpha:0,duration:210,onComplete:()=>r.destroy()});
  }

  toast(message,duration=1400) {
    const el=$('toast');el.textContent=message;el.classList.add('show');
    clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('show'),duration);
  }

  updateHud() {
    refreshHud();
  }
}

class CityScene extends Phaser.Scene {
  constructor(){super('city');}

  create(){
    AstralScene.prototype.makeTextures.call(this);
    profile.location='city';
    this.physics.world.setBounds(26,32,1228,650);
    const floor=this.add.tileSprite(0,0,1280,720,'tile').setOrigin(0).setTint(0xc6bba3);
    floor.setDepth(-20);
    const g=this.add.graphics().setDepth(-18);
    g.fillStyle(0x253940,.83).fillRect(0,0,1280,720);
    g.fillStyle(0x334d51,.95).fillRect(90,95,1100,535);
    g.fillStyle(0x3a5354,1).fillRect(515,105,250,540);
    g.lineStyle(2,0xbfa885,.21).strokeRect(90,95,1100,535);
    g.lineStyle(1,0x94aca2,.15).strokeRect(510,100,260,545);
    for(let x=115;x<1180;x+=48)for(let y=120;y<625;y+=48){
      if((x+y)%144===0)g.fillStyle(0xa3b8a9,.1).fillRect(x,y,22,2);
    }
    // The city is a safe, compact hub with two vendors and one portal.
    const stall=(x,y,roof,sign)=>{
      g.fillStyle(0x172830,.85).fillRect(x-110,y-70,220,120);
      g.fillStyle(0x6f514b,1).fillRect(x-105,y-100,210,48);
      g.fillStyle(roof,.95).fillRect(x-98,y-96,196,38);
      g.fillStyle(0x9d8468,.8).fillRect(x-110,y+35,220,13);
      this.add.text(x,y-116,sign,{fontFamily:'Georgia',fontSize:'19px',color:'#f1d7a9'}).setOrigin(.5);
    };
    stall(345,325,0x865a50,'КУЗНЕЦ');
    stall(935,325,0x546d6d,'ЮВЕЛИР');
    this.add.circle(345,375,24,0xd2aa76,.17).setStrokeStyle(2,0xd8bf94,.65);
    this.add.circle(935,375,24,0x92c4bf,.17).setStrokeStyle(2,0xb9d9cb,.65);
    this.add.text(345,369,'⚒',{fontFamily:'Arial',fontSize:'26px',color:'#f0d9b5'}).setOrigin(.5);
    this.add.text(935,369,'✧',{fontFamily:'Arial',fontSize:'28px',color:'#c9e2dc'}).setOrigin(.5);
    this.add.ellipse(640,204,190,92,0x70c7c4,.13);
    this.add.circle(640,185,67,0x3e8f99,.22).setStrokeStyle(4,0x9bd7cf,.85);
    this.add.circle(640,185,40,0x7bd0d1,.16).setStrokeStyle(2,0xc8efdf,.7);
    this.add.text(640,182,'✦',{fontFamily:'Arial',fontSize:'39px',color:'#d3f3e5'}).setOrigin(.5);
    this.add.text(640,103,'ПОРТАЛ В АСТРАЛ',{fontFamily:'Georgia',fontSize:'21px',color:'#d6e7dc'}).setOrigin(.5);
    this.add.text(640,648,'ТИХАЯ ГАВАНЬ · БЕЗОПАСНАЯ ЗОНА',{fontFamily:'Arial',fontSize:'12px',color:'#c4b697',letterSpacing:3}).setOrigin(.5);
    this.player=this.physics.add.sprite(640,530,`hero-${loadout.appearance}`).setDepth(10).setCollideWorldBounds(true);
    this.player.body.setCircle(15,9,15);
    this.prompt=this.add.text(640,455,'',{fontFamily:'Arial',fontSize:'12px',color:'#f8e7c8',backgroundColor:'#14232bdc',padding:{x:10,y:6}}).setOrigin(.5).setDepth(20).setVisible(false);
    this.near=null;
    $('locationName').textContent='ГОРОД · ТИХАЯ ГАВАНЬ';
    $('skillBar').hidden=true;
    $('enemyCount').textContent='БЕЗОПАСНАЯ ЗОНА';
    $('weaponHud').textContent=WEAPONS[loadout.weapon].name;
    refreshHud();
    if(!profile.seenIntro){profile.seenIntro=true;this.time.delayedCall(1,()=>showCharacterMenu('gear'));}
    else notify('ГОРОД · ТОРГОВЦЫ, РЮКЗАК И ПОРТАЛ В АСТРАЛ',2300);
  }

  update(){
    if(isOverlayOpen()){this.player.setVelocity(0);return;}
    const x=Number(controlDown('right'))-Number(controlDown('left'));
    const y=Number(controlDown('down'))-Number(controlDown('up'));
    const len=Math.hypot(x,y)||1;
    const speed=190+gearStats().speed*5;
    this.player.setVelocity(x/len*speed,y/len*speed);
    if(x!==0)this.player.setFlipX(x<0);
    const key=controlName(controls.interact);
    const points=[['portal',640,200,`${key} · СОЗДАТЬ МИР`],['smith',345,375,`${key} · ТОРГОВАТЬ С КУЗНЕЦОМ`],['jeweler',935,375,`${key} · ТОРГОВАТЬ С ЮВЕЛИРОМ`]];
    const nearby=points.find(([,px,py])=>Phaser.Math.Distance.Between(this.player.x,this.player.y,px,py)<93);
    this.near=nearby?.[0]||null;
    this.prompt.setVisible(!!nearby);
    if(nearby)this.prompt.setText(nearby[3]).setPosition(this.player.x,this.player.y-49);
  }

  interact(){
    if(isOverlayOpen())return;
    if(this.near==='portal')showWorldBuilder();
    else if(this.near==='smith'||this.near==='jeweler')showShop(this.near);
  }
}

const game=new Phaser.Game({
  type:Phaser.AUTO,parent:'game',width:1280,height:720,
  backgroundColor:'#0c1620',pixelArt:true,roundPixels:true,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{debug:false}},scene:[CityScene,AstralScene]
});

let currentShop=null;
let currentDepthMerchant=null;
let selectedItemId=null;
const isOverlayOpen=()=>!$('screen').hidden||!$('shopScreen').hidden||!$('depthMerchantScreen').hidden||!$('worldScreen').hidden||!$('controlsScreen').hidden||!$('altarScreen').hidden||!$('creditsScreen').hidden;
const activeScene=()=>game.scene.getScenes(true)[0];
function showAltarMenu(){
  const scene=activeScene();if(!scene||profile.location!=='arena')return;
  $('altarScreen').hidden=false;
  const ready=scene.bossState==='ready',complete=scene.bossState==='complete';
  $('altarStatus').textContent=ready?'Все обычные враги побеждены. Можно вызвать босса карты или вернуться в город.':complete?'Босс побеждён. Можно вернуться в город или спуститься глубже. Следующая карта получит уровень монстров либо случайную сферу.':scene.bossState==='fighting'?'Босс ещё жив. Можно покинуть карту, но награда за её прохождение не будет выдана.':'Сначала победите всех врагов, чтобы вызвать босса. Вернуться в город можно сейчас.';
  $('summonBoss').disabled=!ready;
  $('descendWorld').disabled=!complete;
  pauseScene();
}
function hideAltarMenu(){
  $('altarScreen').hidden=true;if(!isOverlayOpen())resumeScene();
}
function returnFromAltar(){
  const scene=activeScene();if(!scene||profile.location!=='arena')return;
  hideAltarMenu();scene.runId++;scene.running=false;runBuild=null;runDepth=1;runMode='map';runSupplies=null;runResources=null;scene.scene.start('city');
  if(scene.victory)notify('КАРТА ПРОЙДЕНА · БОСС ПОБЕЖДЁН',2600);
}
function descendFromAltar(){
  const scene=activeScene();if(!scene||scene.bossState!=='complete'||!runBuild)return;
  const effect=descendBuild(runBuild);runDepth++;runResources={ammo:scene.ammo,potions:scene.potions};
  hideAltarMenu();scene.runId++;scene.running=false;scene.scene.restart();
  notify(`СПУСК НА ГЛУБИНУ ${runDepth} · ${effect.name.toUpperCase()}`,3200);
}
let listeningControl=null;
function renderControls(){
  $('controlBindings').innerHTML=Object.entries(CONTROL_LABELS).map(([action,label])=>`<button type="button" data-bind="${action}" class="${listeningControl===action?'listening':''}"><span>${label}</span><b>${listeningControl===action?'НАЖМИТЕ КЛАВИШУ':controlName(controls[action])}</b></button>`).join('');
  $('characterKey').textContent=controlName(controls.character);
  $('potionKey').textContent=controlName(controls.potion);
  const scene=activeScene();if(scene?.running){
    renderSkillBar(scene);
    if(scene.altarHint)scene.altarHint.setText(`${controlName(controls.interact)} — ${scene.bossState==='ready'?'ПРИЗВАТЬ БОССА ИЛИ ВЕРНУТЬСЯ':scene.bossState==='complete'?'ВЕРНУТЬСЯ В ГОРОД':'АЛТАРЬ'}`);
  }
}
function showControls(){
  $('screen').hidden=true;$('shopScreen').hidden=true;$('depthMerchantScreen').hidden=true;$('worldScreen').hidden=true;$('altarScreen').hidden=true;
  $('controlsScreen').hidden=false;listeningControl=null;renderControls();pauseScene();
}
function hideControls(){
  listeningControl=null;$('controlsScreen').hidden=true;if(!isOverlayOpen())resumeScene();
}
function notify(message,duration=1500){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),duration);
}
function showCredits(){
  $('hud').hidden=true;$('creditsScreen').hidden=false;pauseScene();
}
function closeCredits(){
  const scene=activeScene();$('creditsScreen').hidden=true;$('hud').hidden=false;
  runBuild=null;runDepth=1;runMode='map';runSupplies=null;runResources=null;
  if(scene){scene.runId=(scene.runId||0)+1;scene.running=false;scene.scene.start('city');}
}
function refreshHud(){
  const city=profile.location==='city';
  const cap=maxHp();
  const hp=city?cap:(window.astralScene?.player?.hp??cap);
  const ammoCap=runSupplies?.arrows||expeditionPrep.arrows;
  const ammo=city?expeditionPrep.arrows:(window.astralScene?.ammo??ammoCap);
  const potions=city?expeditionPrep.potions:(window.astralScene?.potions??0);
  $('goldText').textContent=`${profile.gold} ◈`;
  $('memoryText').textContent=`${profile.memoryShards} / ${BIOME_BOSS_COST}`;
  $('levelText').textContent=`УРОВЕНЬ ${profile.level}`;
  $('xpText').textContent=`${profile.xp} / ${xpToNext(profile.level)} ОП`;
  $('xpFill').style.width=`${profile.xp/xpToNext(profile.level)*100}%`;
  $('hpText').textContent=`${hp} / ${cap}`;
  $('hpFill').style.width=`${Math.max(0,Math.min(100,hp/cap*100))}%`;
  $('ammoText').textContent=`${ammo} / ${city?expeditionPrep.arrows:ammoCap}`;
  $('ammoFill').style.width=`${Math.max(0,Math.min(100,ammo/(city?expeditionPrep.arrows:ammoCap)*100))}%`;
  $('potionText').textContent=`${potions} / 10`;
  $('potionKey').textContent=controlName(controls.potion);
  $('weaponHud').textContent=WEAPONS[loadout.weapon].name;
  $('mapQuest').hidden=city;
  if(city){$('enemyCount').textContent='БЕЗОПАСНАЯ ЗОНА';$('mapQuest').classList.remove('complete');$('bossHud').hidden=true;}
  else if(window.astralScene?.enemies){
    const scene=window.astralScene,total=scene.enemyTotal||STARTS.length;
    $('enemyCount').textContent=scene.bossState==='fighting'?`БОСС: ${scene.boss?.bossSpec.name||''}`:scene.bossState==='complete'?(runMode==='biomeBoss'?'КОРОЛЬ ПОВЕРЖЕН':'КАРТА ПРОЙДЕНА'):`ОСТАЛОСЬ ВРАГОВ: ${total-(scene.killCount||0)}`;
    $('questTitle').textContent=runMode==='biomeBoss'?'БОСС БИОМА · ПОБЕДИТЬ КОРОЛЯ':scene.bossState==='ready'?'ЗАДАНИЕ · ВЫЗВАТЬ БОССА':scene.bossState==='fighting'?'ЗАДАНИЕ · ПОБЕДИТЬ БОССА':scene.bossState==='complete'?'КАРТА ПРОЙДЕНА':'ЗАДАНИЕ КАРТЫ · УБИТЬ ВСЕХ';
    $('questProgress').textContent=runMode==='biomeBoss'?(scene.boss?`СТАДИЯ ${scene.boss.phase||1}`:'✓'):scene.bossState==='mobs'?`${scene.killCount||0} / ${total}`:scene.bossState==='complete'?'✓':'АЛТАРЬ';
    $('mapQuest').classList.toggle('complete',!!scene.victory);
  }
  $('shopGold').textContent=`${profile.gold} ◈`;
}
function renderSkillBar(scene){
  if(!scene?.running||profile.location!=='arena')return;
  const now=scene.time.now;
  $('skillBar').innerHTML=SKILLS[scene.weapon].map((skill,index)=>{
    const remaining=Math.max(0,(scene.skillReady[skill.id]||0)-now);
    const seconds=(remaining/1000).toFixed(1);
    return `<button type="button" class="skill-hotkey ${remaining?'cooling':''}" data-skill-index="${index}" title="${skill.description}">
      <span class="skill-key">${controlName(controls[`skill${index+1}`])}</span><span class="skill-name">${skill.name}</span><span class="skill-timer">${remaining?`${seconds} с`:'ГОТОВО'}</span></button>`;
  }).join('');
}
function pauseScene(){const scene=activeScene();if(scene?.physics)scene.physics.pause();}
function resumeScene(){const scene=activeScene();if(scene?.physics)scene.physics.resume();}
function renderWorldBuilder(){
  const used=worldSphereCount(worldBuild);
  $('worldTemplates').innerHTML=Object.entries(WORLD_TEMPLATES).map(([id,template])=>
    `<button type="button" class="world-template ${worldBuild.template===id?'selected':''}" data-world-template="${id}" aria-pressed="${worldBuild.template===id}"><span class="template-icon">${template.icon}</span><span><b>${template.name}</b><small>${template.description}</small></span></button>`).join('');
  $('worldSpheres').innerHTML=WORLD_SPHERES.map(sphere=>{
    const value=worldBuild[sphere.id],selected=!!value;
    if(!isWorldSphereUnlocked(sphere.id))return `<div class="world-sphere locked" aria-label="Неизвестная сфера ещё не открыта"><span class="sphere-glyph">?</span><span class="sphere-copy"><b>НЕИЗВЕСТНАЯ СФЕРА</b><small>Встретьте этот эффект или существо во время спуска в Астрал.</small></span><span class="sphere-lock">●</span></div>`;
    return `<div class="world-sphere ${selected?'selected':''}"><span class="sphere-glyph">${sphere.glyph}</span><span class="sphere-copy"><b>${sphere.name}</b><small>${sphere.description}</small></span>${sphere.repeat?`<span class="sphere-controls"><button type="button" data-world-sphere="${sphere.id}" data-world-step="-1" aria-label="Убрать ${sphere.name}" ${value===0?'disabled':''}>−</button><strong>× ${value}</strong><button type="button" data-world-sphere="${sphere.id}" data-world-step="1" aria-label="Добавить ${sphere.name}" ${used>=WORLD_SPHERE_LIMIT?'disabled':''}>+</button></span>`:`<button type="button" class="sphere-toggle" data-world-sphere="${sphere.id}" aria-pressed="${selected}" aria-label="${sphere.name}" ${!selected&&used>=WORLD_SPHERE_LIMIT?'disabled':''}>${selected?'✓':'+'}</button>`}</div>`;
  }).join('');
  $('worldSphereCount').textContent=`${used} / ${WORLD_SPHERE_LIMIT}`;
  const extraEnemies=['warrior','archer','shaman'].reduce((sum,id)=>sum+Number(!!worldBuild[id]),0)+['skeletonKnight','skeletonMage','skeletonTank'].reduce((sum,id)=>sum+Number(!!worldBuild[id])*3,0);
  $('worldSummary').textContent=`${WORLD_TEMPLATES[worldBuild.template].name} · монстры: ${STARTS.length+extraEnemies} · уровень: ${profile.level+worldBuild.level} · аффиксов на монстра: до ${worldBuild.empower} · бонус монет и опыта: +${Math.round((sphereCoinMultiplier(worldBuild)-1)*100)}%`;
  renderExpeditionSupplies();renderBiomeBossPane();
}
function renderExpeditionSupplies(){
  const arrowCost=arrowUpgradeCost(expeditionPrep.arrows),maxArrows=expeditionPrep.arrows>=100;
  $('expeditionSupplies').innerHTML=`<div class="supply-card"><span class="supply-icon">➶</span><span class="supply-copy"><strong>СТРЕЛЫ НА ЭКСПЕДИЦИЮ · ${expeditionPrep.arrows}</strong><small>Добавляет 10 стрел только к следующей экспедиции. После возвращения запас снова станет 10. Максимум 100.</small></span><button type="button" data-buy-supply="arrows" ${maxArrows||profile.gold<arrowCost?'disabled':''}>${maxArrows?'МАКСИМУМ':`КУПИТЬ 10 · ${arrowCost} ◈`}</button></div><div class="supply-card"><span class="supply-icon">✚</span><span class="supply-copy"><strong>ЗЕЛЬЯ ЛЕЧЕНИЯ · ${expeditionPrep.potions} / 10</strong><small>Каждое восстанавливает 45% максимального здоровья постепенно в течение 4 секунд. Запас действует одну экспедицию.</small></span><button type="button" data-buy-supply="potion" ${expeditionPrep.potions>=10||profile.gold<POTION_COST?'disabled':''}>ВЗЯТЬ ЗЕЛЬЕ · ${POTION_COST} ◈</button></div><div class="world-summary">ДОСТУПНО ЗОЛОТА: ${profile.gold} ◈ · СТРЕЛЫ: ${expeditionPrep.arrows} · ЗЕЛЬЯ: ${expeditionPrep.potions}</div>`;
}
function renderBiomeBossPane(){
  const unlocked=profile.memoryShards>=BIOME_BOSS_COST;
  $('biomeBossTab').disabled=!unlocked;
  $('biomeBossProgress').textContent=unlocked?`ДОСТУП ОТКРЫТ · ${profile.memoryShards} ОСКОЛКОВ · ОСКОЛКИ НЕ РАСХОДУЮТСЯ`:`НУЖНО ${BIOME_BOSS_COST} ОСКОЛКОВ ПАМЯТИ · СОБРАНО ${profile.memoryShards}`;
  $('startBiomeBoss').disabled=!unlocked;
  $('startBiomeBoss').textContent=profile.biomeBossDefeated?'СРАЗИТЬСЯ СНОВА':'НАЧАТЬ БИТВУ';
}
function buyExpeditionSupply(kind){
  if(kind==='arrows'){
    if(expeditionPrep.arrows>=100)return;
    const cost=arrowUpgradeCost(expeditionPrep.arrows);if(profile.gold<cost)return;
    profile.gold-=cost;expeditionPrep.arrows=Math.min(100,expeditionPrep.arrows+10);notify(`КУПЛЕНО ДЛЯ ЭКСПЕДИЦИИ · ${expeditionPrep.arrows} СТРЕЛ`,1400);
  }else if(kind==='potion'){
    if(expeditionPrep.potions>=10||profile.gold<POTION_COST)return;
    profile.gold-=POTION_COST;expeditionPrep.potions++;notify('ЗЕЛЬЕ ДОБАВЛЕНО В ЭКСПЕДИЦИЮ',1100);
  }
  renderExpeditionSupplies();refreshHud();
}
function selectWorldPane(pane){
  if(pane==='boss'&&profile.memoryShards<BIOME_BOSS_COST)pane='map';
  $('worldMapPane').hidden=pane!=='map';$('expeditionPane').hidden=pane!=='supplies';$('biomeBossPane').hidden=pane!=='boss';$('enterWorld').hidden=pane==='boss';
  document.querySelectorAll('.world-tab').forEach(button=>button.classList.toggle('active',button.dataset.worldPane===pane));
}
function showWorldBuilder(){
  if(profile.location!=='city')return;
  $('screen').hidden=true;$('shopScreen').hidden=true;$('worldScreen').hidden=false;
  selectWorldPane('map');renderWorldBuilder();pauseScene();
}
function hideWorldBuilder(){
  $('worldScreen').hidden=true;
  if(!isOverlayOpen())resumeScene();
}
function changeWorldSphere(id,delta=1){
  if(!setWorldSphere(worldBuild,id,delta))return;
  renderWorldBuilder();
}
function selectPane(pane){
  $('gearPane').hidden=pane!=='gear';$('modsPane').hidden=pane!=='mods';
  document.querySelectorAll('.menu-tab').forEach(button=>button.classList.toggle('active',button.dataset.pane===pane));
}
function showCharacterMenu(pane='gear'){
  $('shopScreen').hidden=true;
  $('screen').hidden=false;
  selectPane(pane);
  renderGear();renderLoadout();
  pauseScene();
}
function hideCharacterMenu(){
  $('screen').hidden=true;
  if(!isOverlayOpen())resumeScene();
}
function toggleCharacterMenu(){
  if(!$('screen').hidden)hideCharacterMenu();
  else showCharacterMenu('gear');
}
function itemStatsText(item){
  const base=Object.entries(item.base).map(([key,value])=>`${key==='damage'?'Урон':'Броня'} +${value}`);
  const affixes=item.affixes.map(a=>`${a.label} +${a.value}`);
  return [...base,...affixes].join(' · ')||'Без аффиксов';
}
function itemButton(item,mode){
  const rarity=RARITIES[item.rarity];
  return `<button type="button" class="item-card ${rarity.className}" data-${mode}="${item.id}">
    <span class="item-name">${item.name}</span><span class="item-meta">${rarity.name} · УР. ${item.itemLevel||1} · ${SLOT_NAMES[item.slot]||'Кольцо'}</span>
    <span class="item-stats">${itemStatsText(item)}</span>${mode==='buy'?`<span class="item-price">${item.price} ◈</span>`:''}</button>`;
}
function renderGear(){
  const stats=gearStats();
  $('statSummary').innerHTML=`<span>ЗДОРОВЬЕ <b>${maxHp()}</b></span><span>БРОНЯ <b>${stats.armor}</b></span><span>СИЛА <b>${stats.power}</b></span><span>СКОРОСТЬ АТАКИ <b>+${stats.haste*3}%</b></span><span>КРИТ. ШАНС <b>+${Math.round(stats.crit*2.5)}%</b></span><span>ЗОЛОТО <b>${profile.gold} ◈</b></span>`;
  $('equipmentSlots').innerHTML=Object.entries(SLOT_NAMES).map(([slot,name])=>{
    const item=profile.equipment[slot];
    return `<button type="button" class="equip-slot ${item?RARITIES[item.rarity].className:''}" data-slot="${slot}"><span class="slot-label">${name}</span><span class="slot-item">${item?`${item.name} · УР. ${item.itemLevel||1}`:'Пусто'}</span></button>`;
  }).join('');
  $('inventory').innerHTML=profile.inventory.length?profile.inventory.map(item=>itemButton(item,'equip')).join(''):'<div class="empty-state">Рюкзак пуст. Снаряжение продаётся у торговцев в городе.</div>';
  $('inventoryCount').textContent=`${profile.inventory.length} / ${INVENTORY_LIMIT}`;
  refreshHud();
}
function afterGearChange(previousMax){
  const scene=activeScene();
  if(profile.location==='arena'&&scene?.player){
    scene.player.hp=Math.max(1,Math.min(maxHp(),scene.player.hp+maxHp()-previousMax));
    if(scene.weapon!==loadout.weapon){
      scene.skillCastVersion++;
      scene.skillDashUntil=0;scene.guardUntil=0;scene.parryUntil=0;scene.spinUntil=0;scene.frenzyUntil=0;scene.frenzyMaxUntil=0;scene.spearDashHasteUntil=0;
      scene.skillDashPendingBoost=0;scene.setPlayerBody(false);scene.player.clearTint();
    }
    scene.weapon=loadout.weapon;
    renderSkillBar(scene);
  }
  renderGear();renderLoadout();refreshHud();
}
function equipItem(id){
  const index=profile.inventory.findIndex(item=>item.id===id);
  if(index<0)return;
  const item=profile.inventory[index];
  const slot=item.slot==='ring'?(profile.equipment.ring1?'ring2':'ring1'):item.slot;
  const old=profile.equipment[slot];
  const oldMax=maxHp();
  profile.inventory.splice(index,1);
  profile.equipment[slot]=item;
  if(old)profile.inventory.push(old);
  if(slot==='mainHand'){
    loadout.weapon=item.weapon;
    loadout.editing=item.weapon;
    loadout.filter='all';
  }
  selectedItemId=item.id;
  $('itemDetail').textContent=`Надето: ${item.name}, уровень ${item.itemLevel||1}. ${itemStatsText(item)}`;
  afterGearChange(oldMax);
}
function unequipSlot(slot){
  if(slot==='mainHand'||slot==='bow')return;
  const item=profile.equipment[slot];
  if(!item)return;
  if(profile.inventory.length>=INVENTORY_LIMIT){notify('РЮКЗАК ПОЛОН',1300);return;}
  const oldMax=maxHp();
  profile.equipment[slot]=null;profile.inventory.push(item);
  $('itemDetail').textContent=`Снято: ${item.name}`;
  afterGearChange(oldMax);
}
function selectWeaponType(id){
  if(profile.equipment.mainHand?.weapon===id){loadout.weapon=id;return true;}
  const item=profile.inventory.find(candidate=>candidate.slot==='mainHand'&&candidate.weapon===id);
  if(!item){notify('НЕТ ОРУЖИЯ ЭТОГО ВИДА В РЮКЗАКЕ',1700);return false;}
  equipItem(item.id);
  loadout.weapon=id;
  return true;
}
function showShop(kind){
  if(profile.location!=='city')return;
  syncShopsToHeroLevel();
  currentShop=kind;
  $('screen').hidden=true;$('shopScreen').hidden=false;
  $('shopTitle').textContent=kind==='smith'?'КУЗНЕЦ':'ЮВЕЛИР';
  $('shopDescription').textContent=kind==='smith'?'Оружие и броня для следующего похода в Астрал.':'Кольца и амулеты с аффиксами для вашего билда.';
  renderShop();pauseScene();
}
function hideShop(){
  $('shopScreen').hidden=true;currentShop=null;
  if(!isOverlayOpen())resumeScene();
}
function showDepthMerchant(index){
  const scene=activeScene(),merchant=scene?.depthMerchants?.find(item=>item.index===index);
  if(!merchant||profile.location!=='arena'||scene.bossState!=='complete')return;
  currentDepthMerchant=merchant;$('depthMerchantScreen').hidden=false;renderDepthMerchant();pauseScene();
}
function hideDepthMerchant(){
  currentDepthMerchant=null;$('depthMerchantScreen').hidden=true;if(!isOverlayOpen())resumeScene();
}
function renderDepthMerchant(){
  if(!currentDepthMerchant)return;
  const scene=activeScene();$('depthMerchantGold').textContent=`${profile.gold} ◈`;
  $('depthMerchantItems').innerHTML=currentDepthMerchant.stock.map(item=>{
    const full=item.kind==='arrows'?scene.ammo>=100:item.kind==='potion'?scene.potions>=10:false;
    const description=item.kind==='arrows'?'Пополняет запас текущей экспедиции. Максимум 100.':item.kind==='potion'?'Добавляет одно постепенное лечебное зелье. Максимум 10.':'Сразу добавляет осколки памяти к запасу героя.';
    return `<button type="button" class="depth-merchant-item" data-depth-buy="${item.id}" ${item.sold||full||profile.gold<item.price?'disabled':''}><b>${item.sold?'ПРОДАНО':item.label}</b><small>${description}</small><span>${item.sold?'ТОВАР КУПЛЕН':`${item.price} ◈`}</span></button>`;
  }).join('');
}
function buyDepthMerchantItem(id){
  const scene=activeScene(),item=currentDepthMerchant?.stock.find(entry=>entry.id===id);
  if(!scene||!item||item.sold||profile.gold<item.price)return;
  if(item.kind==='arrows'&&scene.ammo>=100)return;if(item.kind==='potion'&&scene.potions>=10)return;
  profile.gold-=item.price;item.sold=true;
  if(item.kind==='arrows')scene.ammo=Math.min(100,scene.ammo+item.amount);
  else if(item.kind==='potion')scene.potions=Math.min(10,scene.potions+item.amount);
  else profile.memoryShards+=item.amount;
  playSound(item.kind==='memory'?'level':'gold');notify(`КУПЛЕНО: ${item.label}`,1200);renderDepthMerchant();refreshHud();
}
function rerollCost(kind){return 20+profile.rerolls[kind]*10;}
const affixRollCost=item=>18+item.rarity*15;
const merchantAccepts=(kind,item)=>kind==='jeweler'?item.kind==='jewelry':item.kind!=='jewelry';
function renderShop(){
  if(!currentShop)return;
  $('shopGold').textContent=`${profile.gold} ◈`;
  $('shopItems').innerHTML=profile.shops[currentShop].map(item=>itemButton(item,'buy')).join('');
  const eligible=[...profile.inventory,...Object.values(profile.equipment).filter(Boolean)]
    .filter(item=>item.rarity>0&&merchantAccepts(currentShop,item));
  $('rerollItemList').innerHTML=eligible.length?eligible.map(item=>
    `<button type="button" class="item-card ${RARITIES[item.rarity].className}" data-reroll-item="${item.id}">
      <span class="item-name">${item.name}</span><span class="item-meta">УР. ${item.itemLevel||1}</span><span class="item-stats">${itemStatsText(item)}</span>
      <span class="item-price">ПЕРЕКОВАТЬ · ${affixRollCost(item)} ◈</span></button>`).join(''):
    '<div class="empty-state">У вас пока нет подходящих волшебных или редких предметов.</div>';
  $('rerollPrice').textContent=rerollCost(currentShop);
  $('rerollShop').disabled=profile.gold<rerollCost(currentShop);
  refreshHud();
}
function buyItem(id){
  const index=profile.shops[currentShop].findIndex(item=>item.id===id);
  if(index<0)return;
  const item=profile.shops[currentShop][index];
  if(profile.inventory.length>=INVENTORY_LIMIT){notify('РЮКЗАК ПОЛОН',1400);return;}
  if(profile.gold<item.price){notify('НЕ ХВАТАЕТ ЗОЛОТА',1400);return;}
  profile.gold-=item.price;profile.inventory.push(item);
  profile.shops[currentShop].splice(index,1);
  notify(`КУПЛЕНО: ${item.name.toUpperCase()}`,1400);
  renderShop();renderGear();
}
function rerollItemAffixes(id){
  const item=[...profile.inventory,...Object.values(profile.equipment).filter(Boolean)].find(candidate=>candidate.id===id);
  if(!item||!currentShop||item.rarity===0||!merchantAccepts(currentShop,item))return;
  const cost=affixRollCost(item);
  if(profile.gold<cost){notify('НЕ ХВАТАЕТ ЗОЛОТА',1400);return;}
  const base=ITEM_BASES.find(candidate=>candidate.name===item.baseName);
  if(!base)return;
  const oldMax=maxHp();
  const rolled=makeItem(base,item.rarity,item.itemLevel||1);
  profile.gold-=cost;
  item.name=rolled.name;item.affixes=rolled.affixes;item.price=rolled.price;item.itemLevel=rolled.itemLevel;item.base=rolled.base;
  afterGearChange(oldMax);renderShop();
  notify(`НОВЫЕ АФФИКСЫ: ${item.name.toUpperCase()}`,1600);
}

function renderLoadout() {
  const editing=loadout.editing;
  const chosen=loadout.modsets[editing];
  $('appearances').innerHTML=Object.entries(APPEARANCES).map(([id,look])=>
    `<button type="button" class="appearance-card ${loadout.appearance===id?'selected':''}" data-appearance="${id}" aria-pressed="${loadout.appearance===id}">
      <span class="appearance-swatch" style="background:${look.swatch}"></span>${look.name}</button>`).join('');
  $('weapons').innerHTML=Object.entries(WEAPONS).map(([id,w])=>
    `<button type="button" class="weapon-card ${loadout.weapon===id?'selected':''} ${editing===id?'editing':''}" data-weapon="${id}" aria-pressed="${loadout.weapon===id}">
      <span class="weapon-name">${w.name}<span class="weapon-icon">${w.icon}</span></span>
      <span class="weapon-desc">${w.description}</span><span class="weapon-stats">${w.stats}</span>
      <span class="weapon-modcount">${loadout.modsets[id].size} / ${MOD_LIMIT} МОДОВ</span>
    </button>`).join('');
  $('bowConfig').classList.toggle('editing',editing==='bow');
  $('bowSlots').textContent=`${loadout.modsets.bow.size} / ${MOD_LIMIT} модов`;
  $('modHeading').textContent=`МОДЫ ${editing==='bow'?'ЛУКА':WEAPON_GENITIVE[editing]}`;
  $('tagFilters').innerHTML=[['all','Все'],...tagsFor(editing).map(id=>[id,TAGS[id]])].map(([id,name])=>
    `<button type="button" class="tag-filter ${loadout.filter===id?'active':''}" data-filter="${id}" aria-pressed="${loadout.filter===id}">${name}</button>`).join('');
  const order=Object.keys(TAGS);
  const filtered=MODS.filter(mod=>canEquip(mod,editing)&&(loadout.filter==='all'||mod.tags.includes(loadout.filter)))
    .sort((a,b)=>order.indexOf(a.tags[0])-order.indexOf(b.tags[0]));
  $('mods').innerHTML=filtered.map(mod=>{
    const selected=chosen.has(mod.id);
    return `<button type="button" class="mod-card ${selected?'selected':''}" data-mod="${mod.id}" aria-pressed="${selected}">
      <span class="mod-name">${mod.name}<span class="mod-tag">${TAGS[mod.tags[0]]}</span></span>
      <span class="mod-desc">${mod.description}</span></button>`;
  }).join('');
  $('modSlots').textContent=`${equippedCharacterMods()} / ${characterModLimit()} доступно герою · ${chosen.size} / ${MOD_LIMIT} в этом оружии`;
  renderSkillLoadout();
}

function renderSkillLoadout(){
  const weapon=loadout.editing;
  if(weapon==='bow'){
    $('skillLoadout').innerHTML='<div class="empty-state">У лука пока есть базовый выстрел и его моды выше. Три активных навыка доступны мечу, копью и молоту.</div>';
    return;
  }
  $('skillLoadout').innerHTML=SKILLS[weapon].map((skill,index)=>{
    const chosen=loadout.skillMods[weapon][skill.id],limit=skillModLimit();
    const compatible=SKILL_MODS.filter(mod=>canSocketSkillMod(weapon,skill.id,mod.id))
      .sort((a,b)=>Number(chosen.has(b.id))-Number(chosen.has(a.id)));
    const socketed=[...chosen].map(id=>skillModById(id)?.name).filter(Boolean);
    return `<div class="skill-card"><div class="skill-card-head"><span class="skill-number">${index+1}</span><div><strong>${skill.name}</strong><small>${skill.tags.map(tag=>SKILL_TAGS[tag]).join(' · ')}</small></div><span class="skill-cooldown">${skill.cooldown} С</span></div>
      <p>${skill.description}</p><div class="skill-slot-count">МОДЫ В НАВЫКЕ: ${chosen.size} / ${limit} <small>+1 слот каждые 10 уровней</small></div>
      <div class="socketed-mods">${socketed.length?socketed.join(' · '):'Слоты свободны'}</div>
      <div class="skill-mod-list">${compatible.map(mod=>`<button type="button" class="skill-mod ${chosen.has(mod.id)?'selected':''}" data-skill="${skill.id}" data-skill-mod="${mod.id}" title="${mod.description}" aria-pressed="${chosen.has(mod.id)}"><b>${chosen.has(mod.id)?'✓ ':''}${mod.name}</b><small>${mod.tags.map(tag=>SKILL_TAGS[tag]).join(' · ')}</small><span>${mod.description}</span></button>`).join('')}</div></div>`;
  }).join('');
}

$('appearances').addEventListener('click',event=>{
  const card=event.target.closest('[data-appearance]');
  if(!card)return;
  loadout.appearance=card.dataset.appearance;
  const scene=activeScene();
  if(scene?.player)scene.player.setTexture(`hero-${loadout.appearance}`);
  renderLoadout();
});
$('weapons').addEventListener('click',event=>{
  const card=event.target.closest('[data-weapon]');
  if(!card)return;
  if(!selectWeaponType(card.dataset.weapon))return;
  loadout.editing=loadout.weapon;
  loadout.filter='all';
  renderLoadout();
});
$('bowConfig').addEventListener('click',()=>{
  loadout.editing='bow';
  loadout.filter='all';
  renderLoadout();
});
$('tagFilters').addEventListener('click',event=>{
  const filter=event.target.closest('[data-filter]');
  if(!filter)return;
  loadout.filter=filter.dataset.filter;
  renderLoadout();
});
$('mods').addEventListener('click',event=>{
  const card=event.target.closest('[data-mod]');
  if(!card)return;
  if(!toggleMod(card.dataset.mod,loadout.editing))notify(`ЛИМИТ ГЕРОЯ: ${characterModLimit()} МОДОВ · +1 КАЖДЫЕ 2 УРОВНЯ`,1700);
  renderLoadout();
});
$('skillLoadout').addEventListener('click',event=>{
  const card=event.target.closest('[data-skill-mod]');
  if(!card||loadout.editing==='bow')return;
  const changed=socketSkillMod(loadout.editing,card.dataset.skill,card.dataset.skillMod);
  if(!changed)notify(`ДОСТУПНО МОДОВ В НАВЫКЕ: ${skillModLimit()}`,1400);
  renderSkillLoadout();
});
$('skillBar').addEventListener('click',event=>{
  const card=event.target.closest('[data-skill-index]');
  const scene=activeScene();
  if(card&&scene?.castSkill)scene.castSkill(Number(card.dataset.skillIndex));
});
renderLoadout();
$('characterButton').addEventListener('click',()=>toggleCharacterMenu());
$('controlsButton').addEventListener('click',showControls);
$('closeControls').addEventListener('click',hideControls);
$('controlBindings').addEventListener('click',event=>{const button=event.target.closest('[data-bind]');if(button){listeningControl=button.dataset.bind;renderControls();}});
$('resetControls').addEventListener('click',()=>{Object.assign(controls,DEFAULT_CONTROLS);heldControls.clear();try{localStorage.setItem('astral-controls',JSON.stringify(controls));}catch{}renderControls();});
$('closeAltar').addEventListener('click',hideAltarMenu);
$('summonBoss').addEventListener('click',()=>{const scene=activeScene();hideAltarMenu();scene?.summonBoss?.();});
$('descendWorld').addEventListener('click',descendFromAltar);
$('returnCity').addEventListener('click',returnFromAltar);
$('closeCharacter').addEventListener('click',()=>hideCharacterMenu());
$('closeShop').addEventListener('click',()=>hideShop());
$('closeDepthMerchant').addEventListener('click',hideDepthMerchant);
$('depthMerchantItems').addEventListener('click',event=>{const button=event.target.closest('[data-depth-buy]');if(button)buyDepthMerchantItem(button.dataset.depthBuy);});
$('closeWorld').addEventListener('click',()=>hideWorldBuilder());
$('closeCredits').addEventListener('click',closeCredits);
$('expeditionSupplies').addEventListener('click',event=>{const button=event.target.closest('[data-buy-supply]');if(button)buyExpeditionSupply(button.dataset.buySupply);});
document.querySelectorAll('.world-tab').forEach(button=>button.addEventListener('click',()=>selectWorldPane(button.dataset.worldPane)));
$('enterWorld').addEventListener('click',()=>{
  if(profile.location!=='city')return;
  runBuild={...worldBuild};runDepth=1;runMode='map';runSupplies={arrows:expeditionPrep.arrows,potions:expeditionPrep.potions};runResources=null;expeditionPrep.arrows=10;expeditionPrep.potions=0;
  $('worldScreen').hidden=true;
  activeScene().scene.start('astral');
});
$('startBiomeBoss').addEventListener('click',()=>{
  if(profile.location!=='city'||profile.memoryShards<BIOME_BOSS_COST)return;
  runBuild=blankWorldBuild();runDepth=1;runMode='biomeBoss';runSupplies={arrows:expeditionPrep.arrows,potions:expeditionPrep.potions};runResources=null;expeditionPrep.arrows=10;expeditionPrep.potions=0;
  $('worldScreen').hidden=true;activeScene().scene.start('astral');
});
$('worldSpheres').addEventListener('click',event=>{
  const control=event.target.closest('[data-world-sphere]');
  if(control)changeWorldSphere(control.dataset.worldSphere,Number(control.dataset.worldStep||1));
});
$('worldTemplates').addEventListener('click',event=>{
  const card=event.target.closest('[data-world-template]');
  if(!card)return;
  worldBuild.template=card.dataset.worldTemplate;
  renderWorldBuilder();
});
document.querySelectorAll('.menu-tab').forEach(button=>button.addEventListener('click',()=>selectPane(button.dataset.pane)));
$('inventory').addEventListener('click',event=>{
  const card=event.target.closest('[data-equip]');
  if(card)equipItem(Number(card.dataset.equip));
});
$('inventory').addEventListener('mouseover',event=>{
  const card=event.target.closest('[data-equip]');
  const item=card&&profile.inventory.find(candidate=>candidate.id===Number(card.dataset.equip));
  if(item)$('itemDetail').textContent=`${item.name} · ${itemStatsText(item)} · Нажмите, чтобы надеть`;
});
$('equipmentSlots').addEventListener('click',event=>{
  const card=event.target.closest('[data-slot]');
  if(!card)return;
  const item=profile.equipment[card.dataset.slot];
  if(item)$('itemDetail').textContent=`${item.name} · ${itemStatsText(item)}${['mainHand','bow'].includes(card.dataset.slot)?' · оружие всегда должно быть надето':' · снято в рюкзак'}`;
  unequipSlot(card.dataset.slot);
});
$('shopItems').addEventListener('click',event=>{
  const card=event.target.closest('[data-buy]');
  if(card)buyItem(Number(card.dataset.buy));
});
$('rerollItemList').addEventListener('click',event=>{
  const card=event.target.closest('[data-reroll-item]');
  if(card)rerollItemAffixes(Number(card.dataset.rerollItem));
});
$('rerollShop').addEventListener('click',()=>{
  if(!currentShop)return;
  const cost=rerollCost(currentShop);
  if(profile.gold<cost){notify('НЕ ХВАТАЕТ ЗОЛОТА',1400);return;}
  profile.gold-=cost;profile.rerolls[currentShop]++;
  rollShop(currentShop);renderShop();
  notify('АССОРТИМЕНТ ОБНОВЛЁН',1300);
});
document.addEventListener('keydown',event=>{
  if(listeningControl){
    event.preventDefault();event.stopPropagation();
    if(event.code==='Escape'){listeningControl=null;renderControls();return;}
    if(bindControl(listeningControl,event.code)){listeningControl=null;renderControls();}
    return;
  }
  if(event.code==='Backquote'&&!event.repeat){
    event.preventDefault();profile.memoryShards=Math.max(profile.memoryShards,BIOME_BOSS_COST);
    refreshHud();if(!$('worldScreen').hidden){renderBiomeBossPane();selectWorldPane('boss');}
    notify(`ОТЛАДКА · ОСКОЛКИ ПАМЯТИ ЗАПОЛНЕНЫ: ${profile.memoryShards}`,1800);return;
  }
  if(event.key==='Escape'){
    if(!$('screen').hidden)hideCharacterMenu();
    else if(!$('shopScreen').hidden)hideShop();
    else if(!$('depthMerchantScreen').hidden)hideDepthMerchant();
    else if(!$('worldScreen').hidden)hideWorldBuilder();
    else if(!$('controlsScreen').hidden)hideControls();
    else if(!$('altarScreen').hidden)hideAltarMenu();
    return;
  }
  if(event.repeat||event.target?.closest?.('input,textarea'))return;
  heldControls.add(event.code);
  if(Object.values(controls).includes(event.code)){event.preventDefault();dispatchControl(event.code);}
});
document.addEventListener('keyup',event=>heldControls.delete(event.code));
window.addEventListener('blur',()=>heldControls.clear());
document.addEventListener('mousedown',event=>{
  const code=['MouseLeft','MouseMiddle','MouseRight'][event.button];
  if(!listeningControl){if(code&&event.target?.closest?.('#game'))heldControls.add(code);return;}
  if(code&&bindControl(listeningControl,code)){event.preventDefault();listeningControl=null;renderControls();}
},true);
document.addEventListener('mouseup',event=>heldControls.delete(['MouseLeft','MouseMiddle','MouseRight'][event.button]));
document.addEventListener('contextmenu',event=>{if(listeningControl)event.preventDefault();});
document.addEventListener('click',event=>{if(event.target.closest('button'))playSound('ui');});
renderGear();refreshHud();
