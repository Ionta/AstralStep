const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Load only the build rules; Phaser and the DOM are not needed for these checks.
const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const rules=source.slice(0,source.indexOf('class AstralScene'));
const sandbox={Phaser:{Math:{Clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},module:{exports:{}}};
vm.runInNewContext(`${rules}\nmodule.exports={WEAPONS,MODS,MOD_LIMIT,loadout,canEquip,hasMod,toggleMod,SPEAR_BASE_REACH,SPEAR_EXTENDED_REACH,SPEAR_HIT_HALF_WIDTH,profile,characterModLimit,equippedCharacterMods};`,sandbox);
const {WEAPONS,MODS,MOD_LIMIT,loadout,canEquip,hasMod,toggleMod,SPEAR_BASE_REACH,SPEAR_EXTENDED_REACH,SPEAR_HIT_HALF_WIDTH,profile,characterModLimit,equippedCharacterMods}=sandbox.module.exports;

test('each weapon has its own tag compatible mod set',()=>{
  assert.deepEqual(Object.keys(WEAPONS),['sword','spear','hammer']);
  const byId=id=>MODS.find(mod=>mod.id===id);
  for(const weapon of Object.keys(WEAPONS))assert.equal(canEquip(byId('bleed'),weapon),true);
  assert.equal(canEquip(byId('wideArc'),'sword'),true);
  assert.equal(canEquip(byId('wideArc'),'spear'),false);
  assert.equal(canEquip(byId('longThrust'),'spear'),true);
  assert.equal(canEquip(byId('shockwave'),'hammer'),true);
  assert.equal(canEquip(byId('tripleShot'),'bow'),true);
  assert.equal(canEquip(byId('tripleShot'),'hammer'),false);
  for(const weapon of ['sword','spear','hammer','bow'])
    assert.ok(MODS.filter(mod=>canEquip(mod,weapon)).length>MOD_LIMIT);
});

test('spear keeps a narrow attack with its longer base and modified reach',()=>{
  assert.equal(SPEAR_BASE_REACH,155);
  assert.equal(SPEAR_EXTENDED_REACH,184);
  assert.equal(SPEAR_HIT_HALF_WIDTH,17);
});

test('character earns one attack mod slot every two levels while each weapon keeps a six mod cap',()=>{
  profile.level=12;
  const swordMods=MODS.filter(mod=>canEquip(mod,'sword')).map(mod=>mod.id);
  assert.ok(swordMods.length>MOD_LIMIT);
  for(const id of swordMods.slice(0,MOD_LIMIT))assert.equal(toggleMod(id,'sword'),true);
  assert.equal(toggleMod(swordMods[MOD_LIMIT],'sword'),false);
  assert.equal(loadout.modsets.sword.size,MOD_LIMIT);
  assert.equal(characterModLimit(),6);
  assert.equal(equippedCharacterMods(),6);
  assert.equal(toggleMod('tripleShot','bow'),false);
  profile.level=14;
  assert.equal(toggleMod('tripleShot','bow'),true);
  assert.equal(toggleMod('tripleShot','sword'),false);
  assert.equal(loadout.modsets.sword.size,MOD_LIMIT);
});

test('attack mods come from the corresponding weapon set',()=>{
  profile.level=40;
  loadout.weapon='spear';
  assert.equal(hasMod('tripleShot',['projectile']),true);
  assert.equal(hasMod('bleed',['melee','thrust']),false);
  toggleMod('bleed','spear');
  assert.equal(hasMod('bleed',['melee','thrust']),true);
  loadout.weapon='sword';
  assert.equal(hasMod('bleed',['melee','arc']),true);
});
