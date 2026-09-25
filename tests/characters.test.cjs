const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Load only the build rules; Phaser and the DOM are not needed for these checks.
const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const rules=source.slice(0,source.indexOf('class AstralScene'));
const sandbox={Phaser:{Math:{Clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},module:{exports:{}}};
vm.runInNewContext(`${rules}\nmodule.exports={APPEARANCES,HERO_STYLES,drawHeroSkin,freshProfile,freshLoadout,serializeLoadout,deserializeLoadout,serializeFreshLoadout,loadout,profile};`,sandbox);
const exported=sandbox.module.exports;

test('six appearances are available with distinct drawing styles',()=>{
  assert.equal(Object.keys(exported.APPEARANCES).length,6);
  for(const [id,look] of Object.entries(exported.APPEARANCES)){
    assert.ok(look.name,`name for ${id}`);
    assert.ok(look.swatch,`swatch for ${id}`);
    assert.ok(exported.HERO_STYLES[look.style],`style ${look.style} for ${id}`);
  }
});

test('every skin can be drawn onto a stub canvas context without throwing',()=>{
  const ctx={fillStyle:'',fillRect(){},scale(){},imageSmoothingEnabled:false};
  for(const look of Object.values(exported.APPEARANCES))exported.drawHeroSkin(ctx,look);
  assert.ok(true);
});

test('fresh characters get starter gear and an empty build',()=>{
  const character=exported.freshProfile();
  assert.equal(character.level,1);
  assert.equal(character.gold,35);
  assert.equal(character.inventory.length,2);
  assert.ok(character.equipment.mainHand&&character.equipment.bow);
  const build=exported.freshLoadout('knight');
  assert.equal(build.appearance,'knight');
  assert.equal(build.modsets.sword.size,0);
  assert.equal(build.skillMods.sword.parry.size,0);
});

test('loadout serialization round-trips sets through plain data',()=>{
  exported.loadout.modsets.sword.add('bleed');
  exported.loadout.skillMods.sword.parry.add('skillRecovery');
  const data=JSON.parse(JSON.stringify(exported.serializeLoadout()));
  assert.ok(Array.isArray(data.modsets.sword));
  assert.deepEqual(data.modsets.sword,['bleed']);
  exported.deserializeLoadout(data);
  assert.equal(typeof exported.loadout.modsets.sword.add,'function');
  assert.ok(exported.loadout.modsets.sword.has('bleed'));
  assert.equal(exported.loadout.modsets.sword.size,1);
  assert.equal(exported.loadout.skillMods.sword.parry.size,1);
  assert.ok(exported.loadout.skillMods.sword.parry.has('skillRecovery'));
  assert.equal(exported.loadout.appearance,'ash');
});

test('a fresh serialized loadout restores cleanly into an empty build',()=>{
  const data=JSON.parse(JSON.stringify(exported.serializeFreshLoadout('mage')));
  exported.deserializeLoadout(data);
  assert.equal(exported.loadout.appearance,'mage');
  assert.equal(exported.loadout.weapon,'sword');
  for(const weapon of ['sword','spear','hammer','bow'])assert.equal(exported.loadout.modsets[weapon].size,0);
  for(const weapon of ['sword','spear','hammer'])
    for(const skill of ['parry','spin','execute','dash','chain','frenzy','bastion','quickStrike','sunder'])
      if(exported.loadout.skillMods[weapon]?.[skill])assert.equal(exported.loadout.skillMods[weapon][skill].size,0);
});