const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const rules=source.slice(0,source.indexOf('class AstralScene'));
const sandbox={Phaser:{Math:{Clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},module:{exports:{}}};
vm.runInNewContext(`${rules}\nmodule.exports={SKILLS,SKILL_MODS,SKILL_MOD_LIMIT,loadout,canSocketSkillMod,socketSkillMod,skillHasMod,profile,skillModLimit};`,sandbox);
const {SKILLS,SKILL_MODS,SKILL_MOD_LIMIT,loadout,canSocketSkillMod,socketSkillMod,skillHasMod,profile,skillModLimit}=sandbox.module.exports;

test('each melee weapon has three skills with cooldowns',()=>{
  for(const weapon of ['sword','spear','hammer']){
    assert.equal(SKILLS[weapon].length,3);
    assert.ok(SKILLS[weapon].every(skill=>skill.cooldown>0&&skill.tags.length>0));
  }
  assert.equal(SKILLS.spear[0].cooldown,8);
  assert.equal(SKILLS.spear[1].cooldown,5);
  assert.equal(SKILLS.hammer[1].cooldown,2);
  assert.equal(SKILLS.sword[0].cooldown,3);
});

test('every skill can accept six compatible mods, independently',()=>{
  profile.level=60;
  assert.equal(SKILL_MOD_LIMIT,6);
  assert.equal(skillModLimit(),6);
  for(const weapon of ['sword','spear','hammer'])for(const skill of SKILLS[weapon]){
    const choices=SKILL_MODS.filter(mod=>canSocketSkillMod(weapon,skill.id,mod.id));
    assert.ok(choices.length>=6,`${weapon}/${skill.id} has too few compatible mods`);
    for(const mod of choices.slice(0,6))assert.equal(socketSkillMod(weapon,skill.id,mod.id),true);
    assert.equal(loadout.skillMods[weapon][skill.id].size,6);
    if(choices[6])assert.equal(socketSkillMod(weapon,skill.id,choices[6].id),false);
  }
  assert.equal(skillHasMod('spear','dash','skillRecovery'),true);
  assert.equal(canSocketSkillMod('spear','dash','dashReach'),true);
  assert.equal(canSocketSkillMod('sword','parry','dashReach'),false);
});

test('skill slots unlock once every ten levels',()=>{
  profile.level=9;assert.equal(skillModLimit(),0);
  profile.level=10;assert.equal(skillModLimit(),1);
  profile.level=37;assert.equal(skillModLimit(),3);
  profile.level=80;assert.equal(skillModLimit(),6);
});
