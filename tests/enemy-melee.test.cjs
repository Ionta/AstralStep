const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const classSource=source.slice(0,source.indexOf('class CityScene'));
const sandbox={Phaser:{Scene:class{},Math:{Clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Distance:{Between:(x,y,a,b)=>Math.hypot(a-x,b-y)}}},module:{exports:{}}};
vm.runInNewContext(`${classSource}\nmodule.exports={AstralScene,ENEMY_MELEE_WEAPONS,enemyMeleeWeaponFor,enemyMeleeContains};`,sandbox);
const {AstralScene,ENEMY_MELEE_WEAPONS,enemyMeleeWeaponFor,enemyMeleeContains}=sandbox.module.exports;

test('the regular melee gremlins include all four weapon types',()=>{
  assert.deepEqual(Array.from({length:8},(_,i)=>enemyMeleeWeaponFor('club',i)),
    ['club','sword','spear','hammer','club','sword','spear','hammer']);
  assert.equal(enemyMeleeWeaponFor('warrior',0),'hammer');
  assert.equal(enemyMeleeWeaponFor('stone',0),null);
  assert.ok(Object.values(ENEMY_MELEE_WEAPONS).every(weapon=>weapon.windup>=400));
});

test('each attack only hits inside its visible shape',()=>{
  const attack={x:0,y:0,angle:0};
  assert.equal(enemyMeleeContains('club',attack,{x:55,y:0}),true);
  assert.equal(enemyMeleeContains('club',attack,{x:0,y:65}),false);
  assert.equal(enemyMeleeContains('sword',attack,{x:55,y:35}),true);
  assert.equal(enemyMeleeContains('sword',attack,{x:-45,y:0}),false);
  assert.equal(enemyMeleeContains('spear',attack,{x:130,y:10}),true);
  assert.equal(enemyMeleeContains('spear',attack,{x:90,y:55}),false);
  assert.equal(enemyMeleeContains('hammer',attack,{x:76,y:0}),true);
  assert.equal(enemyMeleeContains('hammer',attack,{x:76,y:100}),false);
});

test('the player can leave a telegraphed area before the hit resolves',()=>{
  const scene=new AstralScene(),calls=[];
  const graphics={setPosition(){return this;},setRotation(){return this;},setDepth(){return this;},fillStyle(){return this;},lineStyle(){return this;},fillRect(){return this;},strokeRect(){return this;},lineBetween(){return this;},fillCircle(){return this;},strokeCircle(){return this;},slice(){return this;},fillPath(){return this;},beginPath(){return this;},arc(){return this;},strokePath(){return this;},destroy(){this.destroyed=true;}};
  scene.add={graphics:()=>graphics};scene.tweens={add:()=>{},killTweensOf:()=>{}};
  scene.time={delayedCall:(delay,callback)=>calls.push({delay,callback})};
  scene.player={x:120,y:0};scene.runId=1;scene.running=true;
  scene.damagePlayer=()=>{throw new Error('Player escaped the marked area');};
  scene.playSkillFx=()=>{};
  const enemy={x:0,y:0,active:true,meleeWeapon:'spear',damageFactor:1,setVelocity(){return this;}};
  scene.beginEnemyMelee(enemy,1000);
  assert.equal(calls[0].delay,ENEMY_MELEE_WEAPONS.spear.windup);
  assert.equal(enemy.telegraph,graphics);
  scene.player.y=90;
  calls[0].callback();
  assert.equal(graphics.destroyed,true);
  assert.equal(enemy.telegraph,null);
});

test('tank shield windup uses its own timing instead of reading a missing weapon',()=>{
  const scene=new AstralScene();
  const bar={setAlpha(){return this;},clear(){return this;},fillStyle(){return this;},fillRect(){return this;}};
  const label={setAlpha(){return this;},setPosition(){return this;}};
  const tank={active:true,kind:'skeletonTank',x:0,y:0,hp:200,maxHp:200,unique:true,windupUntil:2000,specialWindupDuration:1300,specialWindupColor:0xe6cd91,nextSpecial:9999,slowUntil:0,body:{velocity:{x:0,y:0}},bar,affixLabel:label,
    setVelocity(){return this;},setFlipX(){return this;},setAlpha(){return this;}};
  Object.assign(scene,{player:{x:100,y:0},enemies:{getChildren:()=>[tank]},arrows:{getChildren:()=>[]},grassZones:[]});
  assert.doesNotThrow(()=>scene.updateEnemies(1500,.016));
});

test('tank intercepts nearby arrows with its shield radius',()=>{
  const scene=new AstralScene();let intercepted=0;
  const bar={setAlpha(){return this;},clear(){return this;},fillStyle(){return this;},fillRect(){return this;}};
  const label={setAlpha(){return this;},setPosition(){return this;}};
  const aura={setPosition(){return this;},setAlpha(){return this;}};
  const tank={active:true,kind:'skeletonTank',x:0,y:0,hp:120,maxHp:120,unique:true,windupUntil:0,nextSpecial:9999,slowUntil:0,shieldRadius:105,shieldAura:aura,body:{velocity:{x:0,y:0}},bar,affixLabel:label,
    setVelocity(){return this;},setFlipX(){return this;},setAlpha(){return this;}};
  const near={active:true,x:90,y:0},far={active:true,x:130,y:0};
  Object.assign(scene,{player:{x:300,y:0},enemies:{getChildren:()=>[tank]},arrows:{getChildren:()=>[near,far]},grassZones:[],arrowHit(arrow){intercepted++;arrow.active=false;}});
  scene.updateEnemies(1000,.016);assert.equal(intercepted,1);
  assert.match(source,/collider\(this\.player,this\.enemies[\s\S]{0,120}skeletonTank/);
});
