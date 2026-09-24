const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const classSource=source.slice(0,source.indexOf('class CityScene'));
const math={Clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Distance:{Between:(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1)},Angle:{Between:(x1,y1,x2,y2)=>Math.atan2(y2-y1,x2-x1),Wrap:a=>Math.atan2(Math.sin(a),Math.cos(a))}};
const sandbox={Phaser:{Scene:class{},Math:math},module:{exports:{}}};
vm.runInNewContext(`${classSource}\nfunction isOverlayOpen(){return false;}\nfunction notify(){}\nfunction renderSkillBar(){}\nfunction refreshHud(){}\nmodule.exports={AstralScene,loadout,PLAYER_WEAPON_DAMAGE,SPEAR_BASE_REACH,SPEAR_EXTENDED_REACH,HAMMER_QUICK_DAMAGE,SWORD_SPIN_MOVE_MULTIPLIER,SWORD_HUNT_DAMAGE};`,sandbox);
const {AstralScene,PLAYER_WEAPON_DAMAGE,SPEAR_BASE_REACH,SPEAR_EXTENDED_REACH,HAMMER_QUICK_DAMAGE,SWORD_SPIN_MOVE_MULTIPLIER,SWORD_HUNT_DAMAGE}=sandbox.module.exports;

function sceneFor(weapon){
  const scene=new AstralScene();
  scene.weapon=weapon;scene.running=true;scene.runId=1;
  scene.time={now:1000,delayedCall:()=>{}};
  scene.skillReady={};scene.nextDamageBoost=1;
  scene.player={x:100,y:100,hp:100,setTint(){return this;},setTintFill(){return this;},clearTint(){return this;},setVelocity(){return this;}};
  scene.flash=()=>{};scene.aim=()=>0;scene.setPlayerBody=()=>{};scene.updateHud=()=>{};
  scene.cameras={main:{shake:()=>{}}};
  scene.enemies={getChildren:()=>[]};
  return scene;
}

test('spear dash avoids all incoming damage and has an eight second cooldown',()=>{
  const scene=sceneFor('spear');
  scene.castSkill(0);
  assert.ok(scene.skillDashUntil>scene.time.now);
  assert.equal(scene.skillReady.dash,9000);
  assert.equal(scene.skillDashDamage,55);
  scene.damagePlayer(25,0,0);
  assert.equal(scene.player.hp,100);
});

test('basic spear thrust pierces two targets and rewards tip distance',()=>{
  const scene=sceneFor('spear');
  scene.swordReady=0;scene.rolling=false;scene.skillDashUntil=0;scene.frenzyUntil=0;scene.spearDashHasteUntil=0;
  const graphics={setDepth(){return this;},lineStyle(){return this;},beginPath(){return this;},moveTo(){return this;},lineTo(){return this;},strokePath(){return this;},destroy(){}};
  scene.add={graphics:()=>graphics};scene.tweens={add:()=>{}};
  const enemies=[50,120,145].map(x=>({active:true,x:100+x,y:100}));
  scene.enemies={getChildren:()=>enemies};
  const hits=[];scene.damageEnemy=(enemy,amount)=>{hits.push([enemy,amount]);return {killed:false,dealt:amount};};
  scene.meleeAttack();
  assert.deepEqual(hits.map(([,amount])=>amount),[46,58]);
  assert.equal(enemies[1].spearVulnerableUntil,6000);
  assert.equal(hits.some(([enemy])=>enemy===enemies[2]),false);
});

test('successful sword parry counterdashes and returns a strong sword hit',()=>{
  const scene=sceneFor('sword');
  const reflected=[];
  scene.damageEnemy=(enemy,amount)=>{reflected.push(amount);return {killed:false,dealt:amount};};
  scene.castSkill(0);
  assert.equal(scene.parryUntil,1500);
  const attacker={active:true,x:300,y:100};
  scene.damagePlayer(17,attacker.x,attacker.y,attacker);
  assert.equal(scene.player.hp,100);
  assert.deepEqual(reflected,[PLAYER_WEAPON_DAMAGE.sword]);
  assert.equal(scene.player.x,258);
  assert.ok(scene.immuneUntil>scene.time.now);
  assert.equal(scene.skillReady.parry,0);
});

test('hammer guard stores the prevented damage for its explosion',()=>{
  const scene=sceneFor('hammer');
  scene.castSkill(0);
  scene.damagePlayer(20,0,0);
  assert.equal(scene.player.hp,92);
  assert.equal(scene.guardStored,12);
  const enemy={active:true,x:120,y:100};
  scene.enemies={getChildren:()=>[enemy]};
  const hits=[];
  scene.damageEnemy=(target,amount)=>{hits.push([target,amount]);return {killed:false,dealt:amount};};
  scene.releaseGuard();
  assert.equal(hits.length,1);
  assert.equal(hits[0][1],12);
});

test('spear finisher has double reach and dashes toward the nearest remaining enemy',()=>{
  const scene=sceneFor('spear');
  const enemy={active:true,x:300,y:100};
  const nextEnemy={active:true,x:100,y:250};
  scene.enemies={getChildren:()=>[enemy,nextEnemy]};
  scene.skillHit=()=>({killed:true,dealt:50});
  scene.castSkill(1);
  assert.equal(scene.skillReady.chain,0);
  assert.ok(scene.skillDashUntil>scene.time.now);
  assert.ok(scene.skillDashY>.9);
  assert.equal(scene.skillDashPendingBoost,1.6);
  scene.damagePlayer(25,0,0);
  assert.equal(scene.player.hp,100);
});

test('spear chain only waits three seconds when the struck target survives',()=>{
  const scene=sceneFor('spear');
  scene.enemies={getChildren:()=>[{active:true,x:300,y:100}]};
  scene.skillHit=()=>({killed:false,dealt:25});
  scene.castSkill(1);
  assert.equal(scene.skillReady.chain,4000);
});

test('spear frenzy lasts six seconds and can gain three more seconds from kills',()=>{
  const scene=sceneFor('spear');
  scene.castSkill(2);
  assert.equal(scene.frenzyUntil,7000);
  assert.equal(scene.frenzyMaxUntil,10000);
});

test('sword hunt dashes to its target and a kill heals and resets it',()=>{
  const scene=sceneFor('sword');
  scene.player.hp=50;
  const enemy={active:true,x:240,y:100};
  scene.enemies={getChildren:()=>[enemy]};
  let damage=0;
  scene.skillHit=(target,amount)=>{damage=amount;return {killed:true,dealt:40};};
  scene.castSkill(2);
  assert.equal(damage,SWORD_HUNT_DAMAGE);
  assert.equal(scene.player.x,198);
  assert.equal(scene.player.hp,70);
  assert.equal(scene.skillReady.execute,0);
});

test('bloody whirlwind pulls nearby enemies and grants its movement multiplier',()=>{
  const scene=sceneFor('sword');
  const enemy={active:true,x:260,y:100};
  scene.enemies={getChildren:()=>[enemy]};
  scene.skillHit=()=>({killed:false,dealt:0});
  scene.spinTick();
  assert.equal(enemy.x,242);
  assert.equal(SWORD_SPIN_MOVE_MULTIPLIER,1.4);
});

test('hammer sunder deals no damage and removes eighty percent of armor',()=>{
  const scene=sceneFor('hammer');
  const enemy={active:true,x:180,y:100,armor:20,hp:72,setTint(){return this;}};
  scene.enemies={getChildren:()=>[enemy]};
  scene.time.delayedCall=(delay,callback)=>callback();
  scene.castSkill(2);
  assert.equal(enemy.hp,72);
  assert.equal(enemy.armor,4);
  assert.equal(scene.skillReady.sunder,7000);
});

test('weapon balance uses the longer spear, stronger sword and 150 percent more quick hammer damage',()=>{
  assert.equal(SPEAR_BASE_REACH,155);assert.equal(SPEAR_EXTENDED_REACH,184);
  assert.equal(PLAYER_WEAPON_DAMAGE.spear,46);
  assert.equal(PLAYER_WEAPON_DAMAGE.sword,52);
  assert.equal(HAMMER_QUICK_DAMAGE,PLAYER_WEAPON_DAMAGE.hammer*2.5);
});
