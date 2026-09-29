const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const localization=fs.readFileSync(path.join(root,'localization.js'),'utf8');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const pagesWorkflow=fs.readFileSync(path.join(root,'.github','workflows','deploy-pages.yml'),'utf8');

function languageSession(initial=null){
  const data=new Map(initial?[['astral-language',initial]]:[]);
  const localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  const document={body:null,documentElement:{lang:'en',},title:'',getElementById:()=>null};
  const sandbox={localStorage,document,MutationObserver:class{},NodeFilter:{SHOW_TEXT:4}};
  vm.runInNewContext(`${localization}\nthis.i18n=AstralI18n;`,sandbox);
  return {i18n:sandbox.i18n,data};
}

test('language defaults to English and an explicit Russian choice persists',()=>{
  const first=languageSession();
  assert.equal(first.i18n.language,'en');
  assert.match(html,/<html lang="en">/);
  assert.equal(first.i18n.firstLaunch,true);
  first.i18n.setLanguage('ru');
  assert.equal(first.data.get('astral-language'),'ru');
  const next=languageSession(first.data.get('astral-language'));
  assert.equal(next.i18n.language,'ru');
  assert.equal(next.i18n.firstLaunch,false);
  assert.equal(next.i18n.translate('Кровавый вихрь'),'Кровавый вихрь');
});

test('English covers mobile actions, menus, inventory and dynamic timers',()=>{
  const {i18n}=languageSession();
  assert.equal(i18n.translate('Кровавый вихрь'),'Bloody Whirlwind');
  assert.equal(i18n.translate('Добавляет камни-препятствия на карту.'),'Adds rock obstacles to the map.');
  assert.equal(i18n.translate('ЗЕЛЬЕ · ПЕРЕКАТ'),'POTION · ROLL');
  assert.equal(i18n.translate('ГОРОД · ТОРГОВЦЫ, РЮКЗАК И ПОРТАЛ В АСТРАЛ'),'CITY · MERCHANTS, BAG AND ASTRAL PORTAL');
  assert.equal(i18n.translate('5 С'),'5 s');
  assert.equal(i18n.translate('аффиксов на монстра: до 3'),'affixes per monster: up to 3');
  assert.equal(i18n.translate('Рюкзак пуст. Снаряжение продаётся у торговцев в городе.'),'Your bag is empty. Gear is sold by merchants in the city.');
  assert.match(pagesWorkflow,/cp index\.html style\.css game\.js localization\.js/);
});

test('mobile game exposes movement, aiming, combat and all utility actions',()=>{
  for(const action of ['melee','bow','roll','potion','skill1','skill2','skill3','interact'])
    assert.match(html,new RegExp(`data-mobile-action="${action}"`));
  // Narrow phone-sized browser windows must activate mobile mode even when
  // desktop emulation reports a fine pointer.
  assert.match(game,/mobileQuery=.*max-width: 700px.*pointer: coarse/);
  assert.match(game,/function setupMobileControls\(/);
  assert.match(game,/mobileState\.aim=Math\.atan2/);
  assert.match(game,/mobileMode\?Phaser\.Scale\.RESIZE:Phaser\.Scale\.FIT/);
  assert.match(css,/\.mobile-mode \.mobile-joystick/);
  assert.match(html,/id="mobileMenuButton"/);
  assert.match(game,/mobileMenuButton.*addEventListener\('click'/);
  assert.match(css,/\.mobile-mode \.hud-actions\.open:not\(\[hidden\]\)/);
});
