const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
const classSource=source.slice(0,source.indexOf('class CityScene'));
const sandbox={Phaser:{Scene:class{},Math:{Clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Distance:{Between:(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1)}}},module:{exports:{}}};
vm.runInNewContext(`${classSource}\nmodule.exports={AstralScene,WORLD_SPHERES,WORLD_SPHERE_LIMIT,WORLD_TEMPLATES,worldBuild,worldSphereCount,setWorldSphere,createWorldLayout,worldEnemyStarts,worldStonePositions,unlockedWorldSpheres,discoverWorldSpheres,isWorldSphereUnlocked};`,sandbox);
const {AstralScene,WORLD_SPHERES,WORLD_SPHERE_LIMIT,WORLD_TEMPLATES,worldBuild,worldSphereCount,setWorldSphere,createWorldLayout,worldEnemyStarts,worldStonePositions,unlockedWorldSpheres,discoverWorldSpheres,isWorldSphereUnlocked}=sandbox.module.exports;

test('gremlin spheres add one enemy and skeleton spheres add three',()=>{
  assert.equal(WORLD_SPHERES.length,13);
  const build={...worldBuild,warrior:true,archer:true,shaman:true,skeletonKnight:true,skeletonMage:true,skeletonTank:true};
  const enemies=worldEnemyStarts(build);
  assert.equal(enemies.length,22);
  for(const kind of ['warrior','archer','shaman'])assert.equal(enemies.filter(e=>e[2]===kind).length,1);
  for(const kind of ['skeletonKnight','skeletonMage','skeletonTank'])assert.equal(enemies.filter(e=>e[2]===kind).length,3);
  assert.equal(WORLD_SPHERES.find(s=>s.id==='level').max,6);
  assert.equal(WORLD_SPHERES.find(s=>s.id==='empower').max,6);
});

test('repeatable spheres each consume one of six shared slots',()=>{
  const build={...worldBuild};
  unlockedWorldSpheres.clear();
  for(const id of ['empower','warrior','archer','level','shaman'])unlockedWorldSpheres.add(id);
  assert.equal(WORLD_SPHERE_LIMIT,6);
  for(let i=0;i<3;i++)assert.equal(setWorldSphere(build,'empower',1),true);
  assert.equal(build.empower,3);
  assert.equal(worldSphereCount(build),3);
  assert.equal(setWorldSphere(build,'warrior'),true);
  assert.equal(setWorldSphere(build,'archer'),true);
  assert.equal(setWorldSphere(build,'level',1),true);
  assert.equal(worldSphereCount(build),6);
  assert.equal(setWorldSphere(build,'shaman'),false);
  assert.equal(setWorldSphere(build,'empower',1),false);
  assert.equal(setWorldSphere(build,'empower',-1),true);
  assert.equal(setWorldSphere(build,'shaman'),true);
  assert.equal(worldSphereCount(build),6);
});

test('map spheres stay locked until their effect is first encountered',()=>{
  unlockedWorldSpheres.clear();
  const build={...worldBuild};
  assert.equal(isWorldSphereUnlocked('rocks'),false);
  assert.equal(setWorldSphere(build,'rocks'),false);
  const discoveries=discoverWorldSpheres({...build,rocks:true,empower:1});
  assert.equal(discoveries.map(sphere=>sphere.id).join(','),'empower,rocks');
  assert.equal(isWorldSphereUnlocked('rocks'),true);
  assert.equal(setWorldSphere(build,'rocks'),true);
  assert.equal(discoverWorldSpheres({...build,rocks:true}).length,0);
});

test('the stone sphere adds obstacles without a six-stone setting',()=>{
  worldBuild.rocks=true;worldBuild.ruins=false;
  const placed=[];
  const scene=new AstralScene();
  scene.layout=createWorldLayout('open',1);
  scene.obstacles={create:(x,y,key)=>{
    placed.push([x,y,key]);
    return {setDepth(){return this;},setSize(){return this;},setOffset(){return this;},refreshBody(){return this;}};
  }};
  scene.createObstacles();
  assert.equal(placed.length,worldStonePositions.length);
  assert.ok(placed.length>6);
  worldBuild.rocks=false;
  placed.length=0;
  scene.createObstacles();
  assert.equal(placed.length,0);
});

test('the shaman restores health to a nearby wounded ally',()=>{
  const scene=new AstralScene();
  const shaman={active:true,x:0,y:0,hp:50,maxHp:50};
  const ally={active:true,x:40,y:0,hp:20,maxHp:100};
  scene.enemies={getChildren:()=>[shaman,ally]};
  scene.playSkillFx=()=>{};scene.flash=()=>{};
  scene.healAlly(shaman);
  assert.ok(ally.hp>20);
  assert.ok(ally.hp<=100);
});

test('each template spreads every enemy across free parts of the map',()=>{
  assert.equal(Object.keys(WORLD_TEMPLATES).length,3);
  for(const template of Object.keys(WORLD_TEMPLATES))for(let seed=1;seed<=30;seed++){
    const layout=createWorldLayout(template,seed);
    const build={...worldBuild,template,warrior:true,archer:true,shaman:true,rocks:true,ruins:true};
    const starts=worldEnemyStarts(build,layout);
    assert.equal(starts.length,13,`${template}/${seed}`);
    assert.ok(Math.max(...starts.map(e=>e[0]))-Math.min(...starts.map(e=>e[0]))>1200,`${template}/${seed}: distribution`);
    for(const [x,y] of starts){
      assert.ok(!layout.walls.some(w=>x>w.x-45&&x<w.x+w.w+45&&y>w.y-45&&y<w.y+w.h+45),`${template}/${seed}: enemy inside wall`);
    }
  }
});

test('all generated routes keep the altar reachable',()=>{
  for(const template of Object.keys(WORLD_TEMPLATES))for(let seed=1;seed<=30;seed++){
    const layout=createWorldLayout(template,seed);
    const blocked=(x,y)=>layout.walls.some(w=>x>w.x-26&&x<w.x+w.w+26&&y>w.y-26&&y<w.y+w.h+26)
      ||layout.rocks.some(([rx,ry])=>Math.hypot(x-rx,y-ry)<56)
      ||layout.ruins.some(([rx,ry])=>Math.hypot(x-rx,y-ry)<68);
    const snap=value=>Math.round(value/40)*40;
    const queue=[[snap(layout.spawn.x),snap(layout.spawn.y)]],seen=new Set();
    for(let head=0;head<queue.length;head++){
      const [x,y]=queue[head],key=`${x},${y}`;
      if(seen.has(key)||x<140||x>2060||y<140||y>1260||blocked(x,y))continue;
      seen.add(key);
      queue.push([x+40,y],[x-40,y],[x,y+40],[x,y-40]);
    }
    const nearVisited=(x,y)=>[...seen].some(key=>{
      const [px,py]=key.split(',').map(Number);
      return Math.hypot(px-x,py-y)<85;
    });
    assert.ok(nearVisited(layout.altar.x,layout.altar.y),`${template}/${seed}: altar unreachable`);
    const build={...worldBuild,template,warrior:true,archer:true,shaman:true,rocks:true,ruins:true};
    for(const [x,y] of worldEnemyStarts(build,layout))assert.ok(nearVisited(x,y),`${template}/${seed}: enemy unreachable`);
  }
});
