const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const rules=source.slice(0,source.indexOf('class AstralScene'));
const sandbox={Phaser:{Math:{Clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},module:{exports:{}}};
vm.runInNewContext(`${rules}\nmodule.exports={ITEM_BASES,profile,makeItem,rollShop,gearStats,maxHp,enemyLootPlan,depthMerchantCount,makeDepthMerchantStock,worldBuild};`,sandbox);
const {ITEM_BASES,profile,makeItem,rollShop,gearStats,maxHp,enemyLootPlan,depthMerchantCount,makeDepthMerchantStock,worldBuild}=sandbox.module.exports;

test('weapons, armor and jewelry can roll distinct affixes',()=>{
  for(const kind of ['weapon','armor','jewelry']){
    const base=ITEM_BASES.find(item=>item.kind===kind);
    const rare=makeItem(base,2);
    assert.equal(rare.kind,kind);
    assert.equal(rare.affixes.length,3);
    assert.equal(new Set(rare.affixes.map(affix=>affix.stat)).size,3);
    assert.equal(makeItem(base,1).affixes.length,1);
    assert.equal(makeItem(base,0).affixes.length,0);
  }
});

test('the two city merchants stock their own item categories',()=>{
  rollShop('smith');rollShop('jeweler');
  assert.equal(profile.shops.smith.length,4);
  assert.equal(profile.shops.jeweler.length,4);
  assert.ok(profile.shops.smith.every(item=>item.kind==='weapon'||item.kind==='armor'));
  assert.ok(profile.shops.jeweler.every(item=>item.kind==='jewelry'));
});

test('shop item level, stats and price rise at each five-level milestone',()=>{
  const base=ITEM_BASES.find(item=>item.name==='Шлем стража');
  const levelOne=makeItem(base,0,1),levelFive=makeItem(base,0,5),levelTen=makeItem(base,0,10);
  assert.equal(levelOne.itemLevel,1);assert.equal(levelFive.itemLevel,5);assert.equal(levelTen.itemLevel,10);
  assert.equal(levelOne.base.armor,5);assert.equal(levelFive.base.armor,6);assert.equal(levelTen.base.armor,7);
  assert.equal(levelFive.price,Math.round(levelOne.price*1.3));
  assert.equal(levelTen.price,Math.round(levelOne.price*1.3**2));

  profile.level=12;rollShop('smith');
  assert.ok(profile.shops.smith.every(item=>item.itemLevel===10));
  profile.level=1;rollShop('smith');
});

test('equipped affixes contribute to character statistics',()=>{
  const armor=makeItem(ITEM_BASES.find(item=>item.slot==='chest'),0);
  armor.affixes.push({stat:'vitality',value:3});
  profile.equipment.chest=armor;
  assert.equal(gearStats().armor,armor.base.armor);
  assert.equal(maxHp(),124);
});

test('unique gremlins use their own consumable drop tables',()=>{
  assert.equal(enemyLootPlan('archer',4,2,()=>.99)[0].arrows,3);
  assert.equal(enemyLootPlan('warrior',4,2,()=>.09)[0].potion,1);
  assert.equal(enemyLootPlan('warrior',4,2,()=>.1).length,0);
  const rolls=[.19,.75],healing=enemyLootPlan('shaman',7,3,()=>rolls.shift());
  assert.equal(healing[0].heal,10);
});

test('every skeleton drops equipment and one survival bonus',()=>{
  const arrowRolls=[.1,.99],arrows=enemyLootPlan('skeletonKnight',5,4,()=>arrowRolls.shift());
  assert.equal(arrows[0].equipment,true);assert.equal(arrows[1].arrows,4);
  const book=enemyLootPlan('skeletonMage',5,4,()=>.9);
  assert.equal(book[0].equipment,true);assert.equal(book[1].memory,100);
});

test('environment spheres create traders on each tenth depth',()=>{
  const build={...worldBuild,ruins:true,rocks:true,trees:true,warrior:true};
  assert.equal(depthMerchantCount(build,9),0);assert.equal(depthMerchantCount(build,10),3);assert.equal(depthMerchantCount(build,20),3);
  assert.equal(makeDepthMerchantStock(0,10,()=>.4).length,3);
  assert.equal(makeDepthMerchantStock(0,10,()=>.6).length,2);
});
