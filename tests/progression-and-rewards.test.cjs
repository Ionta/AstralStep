const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const nodes={bossHud:{hidden:false},toast:{textContent:'',classList:{add(){}},style:{}}};
const sandbox={Phaser:{Scene:class{},Math:{Clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Distance:{Between:(x,y,a,b)=>Math.hypot(a-x,b-y)}}},document:{getElementById:id=>nodes[id]||{}},setTimeout:()=>0,clearTimeout:()=>{},notify:()=>{},isOverlayOpen:()=>false,module:{exports:{}}};
vm.runInNewContext(`${source.slice(0,source.indexOf('class CityScene'))}\nmodule.exports={AstralScene,hammerAreaDamage,sphereCoinMultiplier,scaledCoins,grantExperience,xpToNext,mapExperience,MAP_BOSSES,BIOME_BOSS,BIOME_BOSS_COST,JUNK_KING_COOLDOWNS,junkKingSummonTypes,biomeBossStats,prepareJunkyardLayout,createWorldLayout,memoryShardsForEnemy,memoryShardsForMap,controls,bindControl,DEFAULT_CONTROLS,profile,worldBuild,descendBuild,difficultySphereCount,arrowUpgradeCost,POTION_COST,expeditionPrep};`,sandbox);
const {AstralScene,hammerAreaDamage,sphereCoinMultiplier,scaledCoins,grantExperience,xpToNext,mapExperience,MAP_BOSSES,BIOME_BOSS,BIOME_BOSS_COST,JUNK_KING_COOLDOWNS,junkKingSummonTypes,biomeBossStats,prepareJunkyardLayout,createWorldLayout,memoryShardsForEnemy,memoryShardsForMap,controls,bindControl,DEFAULT_CONTROLS,profile,worldBuild,descendBuild,difficultySphereCount,arrowUpgradeCost,POTION_COST,expeditionPrep}=sandbox.module.exports;

test('the ordinary hammer loses 65 percent of base damage at the edge',()=>{
  assert.equal(hammerAreaDamage(100,0,80),100);
  assert.equal(hammerAreaDamage(100,40,80),68);
  assert.equal(hammerAreaDamage(100,80,80),35);
  assert.equal(hammerAreaDamage(100,100,80),35);
  const quickStart=source.indexOf("skill.id==='quickStrike'");
  assert.ok(quickStart>0);
  const quickStrike=source.slice(quickStart,quickStart+1000);
  assert.doesNotMatch(quickStrike,/hammerAreaDamage/);
});

test('difficulty spheres add 10 percent to money and experience while terrain spheres do not',()=>{
  const build={...worldBuild,level:3,empower:2,warrior:true,rocks:true,ruins:true,swamp:true,trees:true,grass:true};
  assert.equal(difficultySphereCount(build),6);
  assert.equal(sphereCoinMultiplier(build),1.6);
  assert.equal(scaledCoins(100,build),160);
  assert.ok(mapExperience(1,build)>mapExperience(1,{...worldBuild}));
  const scene=new AstralScene(),drops=[];
  scene.createDrop=(x,y,reward)=>drops.push(reward);
  scene.dropLoot(100,200);
  assert.equal(drops.length,1);
  assert.equal(typeof drops[0].gold,'number');
  assert.equal(drops[0].item,undefined);
});

test('descending either raises monster level or adds a non-level sphere',()=>{
  const levelBuild={...worldBuild};
  assert.equal(descendBuild(levelBuild,()=>0).type,'level');assert.equal(levelBuild.level,1);
  const sphereBuild={...worldBuild};
  const effect=descendBuild(sphereBuild,()=>.99);
  assert.equal(effect.type,'sphere');assert.notEqual(effect.id,'level');assert.equal(sphereBuild[effect.id],true);
});

test('map experience advances hero levels and carries surplus forward',()=>{
  const hero={level:1,xp:0};
  assert.ok(mapExperience(1,{level:0,empower:0,warrior:false,archer:false,shaman:false,rocks:false,ruins:false,swamp:false})>=xpToNext(1));
  assert.equal(grantExperience(hero,320),2);
  assert.equal(hero.level,3);
  assert.equal(hero.xp,320-xpToNext(1)-xpToNext(2));
});

test('expedition arrows scale to one hundred and a potion heals gradually',()=>{
  assert.equal(arrowUpgradeCost(10),25);assert.ok(arrowUpgradeCost(90)>arrowUpgradeCost(10));assert.equal(POTION_COST,18);
  assert.equal(expeditionPrep.arrows,10);assert.equal('arrowCapacity' in profile,false);
  const scene=new AstralScene();
  Object.assign(scene,{running:true,potions:1,player:{hp:50},potionHealRemaining:0,potionHealRate:0,potionHealCarry:0,updateHud(){}});
  scene.usePotion();assert.equal(scene.potions,0);assert.ok(scene.potionHealRemaining>0);assert.equal(scene.player.hp,50);
  for(let i=0;i<100;i++)scene.updatePotionHealing(.04);
  assert.equal(scene.player.hp,95);assert.equal(scene.potionHealRemaining,0);
});

test('memory shards scale with monster level, spheres and expedition depth',()=>{
  assert.equal(memoryShardsForEnemy(5,3,2),11);
  const landscape={...worldBuild,ruins:true,rocks:true,trees:true,warrior:true,level:4};
  assert.equal(memoryShardsForMap(landscape),130);
});

test('the biome boss unlocks at ten thousand shards and has both summon stages',()=>{
  assert.equal(BIOME_BOSS_COST,10000);assert.equal(BIOME_BOSS.id,'junkking');
  assert.deepEqual(Array.from(junkKingSummonTypes(1)),['club','club']);
  assert.deepEqual(Array.from(junkKingSummonTypes(2)),['warrior','warrior','warrior','shaman']);
  assert.equal(JUNK_KING_COOLDOWNS.sling,6000);assert.equal(JUNK_KING_COOLDOWNS.summon,30000);
});

test('the junk king scales aggressively with hero level',()=>{
  const first=biomeBossStats(1),tenth=biomeBossStats(10),twentieth=biomeBossStats(20);
  assert.equal(first.hp,BIOME_BOSS.hp);assert.equal(first.armor,BIOME_BOSS.armor);assert.equal(first.damageFactor,1);
  assert.ok(tenth.hp>first.hp*2);assert.ok(tenth.armor>first.armor);assert.ok(tenth.damageFactor>1.8);
  assert.ok(twentieth.hp>tenth.hp&&twentieth.speed>tenth.speed);
});

test('the biome boss receives a dedicated junkyard arena',()=>{
  const layout=prepareJunkyardLayout(createWorldLayout('open',17));
  assert.ok(layout.junkProps.length>=12);assert.equal(layout.swamps.length,4);assert.ok(layout.walls.length>=6);
  assert.ok(Math.hypot(layout.spawn.x-layout.altar.x,layout.spawn.y-layout.altar.y)>900);
});

test('four distinct map bosses and rebindable controls are available',()=>{
  assert.equal(MAP_BOSSES.length,4);
  assert.equal(new Set(MAP_BOSSES.map(boss=>boss.id)).size,4);
  assert.equal(bindControl('skill1','KeyQ'),true);
  assert.equal(controls.skill1,'KeyQ');
  assert.equal(bindControl('melee','KeyQ'),true);
  assert.equal(controls.melee,'KeyQ');
  assert.equal(controls.skill1,DEFAULT_CONTROLS.melee);
  const restored={...DEFAULT_CONTROLS,melee:'Digit1',skill1:'MouseRight'};
  const reload={...sandbox,localStorage:{getItem:()=>JSON.stringify(restored)},module:{exports:{}}};
  vm.runInNewContext(`${source.slice(0,source.indexOf('class AstralScene'))}\nmodule.exports={controls};`,reload);
  assert.equal(reload.module.exports.controls.melee,'Digit1');
  assert.equal(reload.module.exports.controls.skill1,'MouseRight');
});

test('boss telegraph can be dodged before it resolves',()=>{
  const pending=[];let hits=0;
  const mark={setStrokeStyle(){return this;},setDepth(){return this;},destroy(){}};
  const scene=new AstralScene();
  Object.assign(scene,{add:{circle:()=>mark},time:{delayedCall:(delay,callback)=>pending.push(callback)},runId:1,running:true,
    player:{x:0,y:0},playSkillFx(){},flash(){},damagePlayer(){hits++;}});
  const boss={active:true};
  scene.bossCircle(boss,0,0,70,500,30,0xff0000);
  scene.player.x=180;pending.shift()();assert.equal(hits,0);
  scene.bossCircle(boss,0,0,70,500,30,0xff0000);
  scene.player.x=10;pending.shift()();assert.equal(hits,1);
});

test('boss death completes the map, grants experience and drops six money piles',()=>{
  const scene=new AstralScene(),drops=[];
  const boss={x:500,y:500,bossSpec:MAP_BOSSES[0],bar:{destroy(){}},affixLabel:{destroy(){}},destroy(){this.active=false;}};
  const previous={level:profile.level,xp:profile.xp,maps:profile.mapsCleared};
  Object.assign(scene,{bossState:'fighting',boss,player:{hp:60},altarHint:{setText(){}},createDrop:(x,y,reward)=>drops.push(reward),flash(){},updateHud(){}});
  scene.defeatBoss(boss);
  assert.equal(scene.bossState,'complete');assert.equal(scene.victory,true);
  assert.equal(profile.mapsCleared,previous.maps+1);
  assert.ok(profile.level>previous.level||profile.xp>previous.xp);
  assert.equal(drops.length,6);assert.ok(drops.every(reward=>reward.gold>0&&reward.item===undefined));
  assert.equal(nodes.bossHud.hidden,true);
  Object.assign(profile,{level:previous.level,xp:previous.xp,mapsCleared:previous.maps});
  Object.assign(worldBuild,{level:0,empower:0,warrior:false,archer:false,shaman:false,rocks:false,ruins:false,swamp:false});
});
