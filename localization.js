/* Runtime localization keeps existing Russian game data as the source of truth. */
const AstralI18n=(()=>{
  const KEY='astral-language';
  const saved=(()=>{try{return localStorage.getItem(KEY);}catch{return null;}})();
  let language=saved==='ru'?'ru':'en';
  const words={
    'ГЛУБИНЫ АСТРАЛА':'ASTRAL DEPTHS','Глубины астрала':'Astral Depths',
    'ГОРОД · ТИХАЯ ГАВАНЬ':'CITY · QUIET HAVEN','АСТРАЛЬНАЯ ПУСТОШЬ':'ASTRAL WASTELAND','ТРОН МУСОРНОЙ КУЧИ':'JUNK HEAP THRONE',
    'ГРЕМЛИН КОРОЛЬ МУСОРНОЙ КУЧИ':'GREMLIN KING OF THE JUNK HEAP','Гремлин Король Мусорной Кучи':'Gremlin King of the Junk Heap',
    'ЗАДАНИЕ КАРТЫ · УБИТЬ ВСЕХ ГРЕМЛИНОВ':'MAP QUEST · DEFEAT ALL GREMLINS','ЗАДАНИЕ КАРТЫ · УБИТЬ ВСЕХ':'MAP QUEST · DEFEAT ALL',
    'Выберите шаблон карты и до шести сфер для забега. Каждая копия повторяемой сферы занимает отдельный слот.':'Choose a map layout and up to six spheres. Each copy of a repeatable sphere uses one slot.',
    'Стрелы и зелья закупаются на одну экспедицию. После возвращения или гибели новый запас стрел снова начинается с 10.':'Arrows and potions are bought for one expedition. After returning or dying, your arrow supply starts at 10 again.',
    'Каждый герой хранит собственный уровень, снаряжение и прогресс. Чтобы продолжить — нажмите «Играть» на карточке героя. Новый герой создаётся ниже.':'Each hero has separate levels, gear, and progress. Select Play on a hero to continue, or create a new hero below.',
    'Пока нет ни одного героя. Выберите имя и облик ниже, чтобы начать путь в Астрал.':'No heroes yet. Choose a name and appearance below to begin your journey.',
    'Нажмите на действие, затем клавишу или кнопку мыши. Повторная клавиша поменяет назначения местами.':'Select an action, then press a key or mouse button. Reusing a key swaps the bindings.',
    'Нажмите на предмет в рюкзаке, чтобы надеть его. Нажмите на надетую броню или украшение, чтобы снять.':'Select an item in your bag to equip it. Select equipped armor or jewelry to remove it.',
    'Отдельные моды для обычной атаки. Совместимость определяется тегами навыков.':'Normal attacks have their own mods. Skill tags determine compatibility.',
    'Странник окружения обменивает золото на припасы для продолжения экспедиции. Иногда среди товаров встречаются осколки памяти.':'A wandering trader exchanges gold for expedition supplies. Memory shards occasionally appear in stock.',
    'Первый гремлин, услышавший шёпот выброшенных миров. Он собирает обломки памяти, строит из них трон и объявляет мусором всё, что не смог подчинить.':'The first gremlin to hear the whispers of discarded worlds. He built a throne from memory fragments and calls everything he cannot rule trash.',
    'Король сражается огромной дубиной, стреляет из рогатки и зовёт подданных. Потеряв половину здоровья, он призывает воинов и шамана, а затем начинает сокрушительные рывки.':'The king swings a huge club, fires a slingshot, and summons followers. At half health he calls warriors and a shaman, then starts crushing charges.',
    'Гремлин Король Мусорной Кучи повержен.':'The Gremlin King of the Junk Heap has fallen.','Шёпот Астральной пустоши затих.':'The whispers of the Astral Wasteland have faded.',
    'ГЕРОЙ И СНАРЯЖЕНИЕ':'HERO AND EQUIPMENT','ВЫБОР ПЕРСОНАЖА':'SELECT HERO','СОЗДАТЬ НОВОГО ГЕРОЯ':'CREATE A NEW HERO','СОЗДАТЬ И ВОЙТИ':'CREATE AND ENTER',
    'ПОДГОТОВКА ЭКСПЕДИЦИИ':'EXPEDITION PREPARATION','КАРТА И СФЕРЫ':'MAP AND SPHERES','ШАБЛОН ЛОКАЦИИ':'MAP LAYOUT','ВОЙТИ В СОЗДАННЫЙ МИР':'ENTER THE CREATED WORLD',
    'ПОРТАЛ В АСТРАЛ':'PORTAL TO THE ASTRAL','ЗАНЯТО СЛОТОВ':'SLOTS USED','НЕИЗВЕСТНАЯ СФЕРА':'UNKNOWN SPHERE',
    'Встретьте этот эффект или существо во время спуска в Астрал.':'Encounter this effect or creature while descending into the Astral.',
    'БОСС БИОМА':'BIOME BOSS','НАЧАТЬ БИТВУ':'START BATTLE','СРАЗИТЬСЯ СНОВА':'FIGHT AGAIN',
    'ВЫБОР ПУТИ':'CHOOSE YOUR PATH','ПРИЗВАТЬ БОССА':'SUMMON BOSS','СПУСТИТЬСЯ ГЛУБЖЕ':'DESCEND DEEPER','ВЕРНУТЬСЯ В ГОРОД':'RETURN TO CITY',
    'Все обычные враги побеждены. Можно вызвать босса карты или вернуться в город.':'All regular enemies are defeated. Summon the map boss or return to the city.',
    'Босс побеждён. Можно вернуться в город или спуститься глубже. Следующая карта получит уровень монстров либо случайную сферу.':'The boss is defeated. Return to the city or descend deeper. The next map gains a monster level or a random sphere.',
    'Босс ещё жив. Можно покинуть карту, но награда за её прохождение не будет выдана.':'The boss is still alive. You can leave, but will not receive the map completion reward.',
    'Сначала победите всех врагов, чтобы вызвать босса. Вернуться в город можно сейчас.':'Defeat all enemies to summon the boss. You may return to the city now.',
    'ПЕРЕКОВКА АФФИКСОВ':'REROLL AFFIXES','ОБНОВИТЬ ВИТРИНУ':'REROLL STOCK','ВЕРНУТЬ СТАНДАРТНЫЕ КЛАВИШИ':'RESTORE DEFAULT KEYS',
    'НАСТРОИТЬ ЛУК':'CONFIGURE BOW','НАВЫКИ ОРУЖИЯ':'WEAPON SKILLS','МОДЫ И УМЕНИЯ':'MODS AND SKILLS',
    'СКОРОСТЬ АТАКИ':'ATTACK SPEED','СКОРОСТЬ ДВИЖЕНИЯ':'MOVE SPEED','КРИТ. ШАНС':'CRIT CHANCE',
    'ОСКОЛКИ ПАМЯТИ':'MEMORY SHARDS','ОСКОЛКОВ ПАМЯТИ':'MEMORY SHARDS','ЗЕЛЬЕ ЛЕЧЕНИЯ':'HEALING POTION',
    'ПРОНЗАЮЩИЙ РЫВОК':'PIERCING DASH','ЦЕПЬ ПРОНЗАНИЙ':'PIERCING CHAIN','КРОВАВЫЙ ВИХРЬ':'BLOODY WHIRLWIND',
    'НЕ ХВАТАЕТ ЗОЛОТА':'NOT ENOUGH GOLD','РЮКЗАК ПОЛОН':'BAG IS FULL','КАРТА ПРОЙДЕНА':'MAP CLEARED',
    'БОСС ПОБЕЖДЁН':'BOSS DEFEATED','ОТКРЫТА СФЕРА КАРТЫ':'MAP SPHERE UNLOCKED','СЛЕДУЮЩИЙ УРОН':'NEXT HIT DAMAGE',
    'БЕЗОПАСНАЯ ЗОНА':'SAFE ZONE','ОСТАЛОСЬ ВРАГОВ':'ENEMIES LEFT','НОВЫЙ УРОВЕНЬ':'LEVEL UP',
    'ОБЫЧНЫЙ':'COMMON','ВОЛШЕБНЫЙ':'MAGIC','РЕДКИЙ':'RARE',
    'ЛАБИРИНТ':'MAZE','ОТКРЫТАЯ МЕСТНОСТЬ':'OPEN FIELD','КОРИДОР':'CORRIDOR',
    'Сфера уровня':'Level sphere','Гремлин воин':'Gremlin warrior','Гремлин стрелок':'Gremlin archer','Гремлин шаман':'Gremlin shaman',
    'Сфера усиления':'Empowerment sphere','Сфера руин':'Ruins sphere','Сфера камней':'Stone sphere','Сфера болота':'Swamp sphere',
    'Сфера деревьев':'Tree sphere','Скелеты-рыцари':'Skeleton knights','Скелеты-маги':'Skeleton mages',
    'Сфера травы':'Grass sphere','Скелеты-танки':'Skeleton tanks',
    'Уровень всех монстров +1. Каждая копия занимает слот.':'All monsters gain one level. Each copy uses a slot.',
    'Добавляет одного бронированного бойца.':'Adds one armored fighter.','Добавляет одного дальнобойного стрелка.':'Adds one ranged archer.',
    'Добавляет мага, который стреляет и лечит союзников.':'Adds a mage who fires spells and heals allies.',
    'Аффиксов у каждого монстра +1. Каждая копия занимает слот.':'Each monster gains one possible affix. Each copy uses a slot.',
    'Добавляет разрушенные сооружения на карту.':'Adds ruined structures to the map.','Добавляет камни-препятствия на карту.':'Adds rock obstacles to the map.',
    'Добавляет топи, замедляющие героя.':'Adds swamps that slow the hero.','Добавляет деревья и лесные преграды.':'Adds trees and woodland obstacles.',
    'Добавляет трёх бронированных мечников с парированием и кружилкой.':'Adds three armored swordsmen with parry and spin.',
    'Добавляет трёх магов холода и крови.':'Adds three frost and blood mages.',
    'Добавляет высокую траву, скрывающую стоящих в ней монстров.':'Adds tall grass that conceals monsters inside it.',
    'Добавляет трёх бойцов со щитами, перехватывающих стрелы.':'Adds three shield fighters who intercept arrows.',
    'Каменные перегородки, обходы и узкие проходы.':'Stone walls, detours, and narrow passages.',
    'Просторная карта для свободного манёвра.':'A spacious map with room to maneuver.',
    'Длинный путь вперёд, враги стоят по всему маршруту.':'A long winding route with enemies along the way.',
    'Быстрый удар широкой дугой.':'A quick swing in a wide arc.',
    'Точный выпад, пробивающий двух врагов. Кончик наносит усиленный урон.':'A precise thrust that pierces two foes. The tip deals extra damage.',
    'Медленный удар по области вокруг точки попадания.':'A slow strike that hits an area around impact.',
    'Попадания в ближнем бою вызывают кровотечение.':'Melee hits cause bleeding.',
    'Повторяет 35% урона по цели через мгновение.':'Repeats 35% of damage to the target shortly after.',
    'Урон в ближнем бою увеличен на 20%.':'Melee damage increases by 20%.',
    'Атаки ближнего боя восстанавливаются быстрее.':'Melee attacks recover faster.',
    'Расширяет угол дуговой атаки.':'Widens the arc of attacks.',
    'Дуга меча достигает цели на 18 дальше.':'The sword arc reaches 18 farther.',
    'Следом проходит ещё один, более слабый взмах.':'A weaker second swing follows.',
    'Увеличивает дальность выпада на 24.':'Increases thrust range by 24.',
    'Урон копья увеличен на 30%.':'Spear damage increases by 30%.',
    'Укол замедляет противника на короткое время.':'Thrusts briefly slow the target.',
    'Расширяет область удара молота на 24.':'Widens the hammer impact area by 24.',
    'Через мгновение молот наносит второй удар по области.':'The hammer strikes the area a second time shortly after.',
    'Урон молота выше, но удары ещё медленнее.':'Hammer damage increases, but attacks become slower.',
    'Три стрелы за один выстрел и одну стрелу из колчана.':'Fire three arrows while spending one from the quiver.',
    'Стрела пронзает ещё одного противника.':'Arrows pierce one additional enemy.',
    'Лук стреляет чаще.':'The bow fires more often.',
    'Каждая стрела наносит больше урона.':'Each arrow deals more damage.',
    'Стрела летит дольше.':'Arrows fly longer.',
    'Попадание отравляет цель.':'Hits poison the target.',
    'Скорость стрелы увеличена.':'Arrows fly faster.',
    'Перекат быстрее восстанавливается.':'The dodge roll recovers faster.',
    'Неуязвимый рывок на 55 урона: вызывает кровотечение и на 2 с ускоряет атаки копьём на 25%.':'Invulnerable dash for 55 damage. Causes bleeding and grants 25% spear attack speed for 2 seconds.',
    'Укол двойной дальности. Добивание даёт неуязвимый рывок к ближайшему врагу и +60% к следующему урону.':'A thrust with double range. A kill triggers an invulnerable dash to the nearest foe and grants +60% damage to the next hit.',
    '6 с: атаки в 2 раза быстрее, движение ×1,5, выпады пробивают всех. Убийства продлевают эффект до 3 с.':'For 6 seconds, attack twice as fast and move 1.5 times as fast. Thrusts pierce all foes; kills extend the effect by up to 3 seconds.',
    '5 с: сопротивление 60%. Предотвращённый урон накапливается и взрывается вокруг героя.':'Gain 60% damage resistance for 5 seconds. Prevented damage builds up and explodes around the hero.',
    'Удар в 2 раза быстрее, на 150% сильнее обычной атаки и с меньшей областью.':'Strike twice as fast for 150% more damage than a normal hit, in a smaller area.',
    'Удар без урона, который снижает броню врагов на 80%.':'A non-damaging strike that reduces enemy armor by 80%.',
    '0,5 с на парирование. Успех мгновенно переносит героя к атакующему и наносит ответный удар.':'A 0.5-second parry window. Success dashes to the attacker and deals a counterstrike.',
    '5 с круговых ударов по 80% урона: герой движется быстрее и притягивает ближайших врагов.':'Spin for 5 seconds, dealing 80% damage. Move faster and pull nearby foes closer.',
    'Рывок к выбранной цели с мощным ударом. Убийство восстанавливает навык и здоровье.':'Dash to the chosen target for a powerful hit. A kill resets the skill and restores health.',
    'Перезарядка навыка сокращается на 10%.':'Skill cooldown is reduced by 10%.',
    'Применение навыка восстанавливает 6 здоровья.':'Using the skill restores 6 health.',
    'После применения скорость движения повышена на 20% в течение 1,5 с.':'After use, movement speed rises by 20% for 1.5 seconds.',
    'В течение 2 с после применения входящий урон снижен на 20%.':'Take 20% less damage for 2 seconds after use.',
    'Следующий удар после применения навыка сильнее на 15%.':'Your next attack after the skill deals 15% more damage.',
    'Навык накладывает кровотечение.':'The skill causes bleeding.',
    'Через миг повторяет 25% урона навыка.':'Repeats 25% of the skill damage shortly after.',
    'Рывок проходит на 80 дальше.':'Dash travels 80 farther.',
    'После рывка следующий урон усилен на 25%.':'After dashing, the next hit deals 25% more damage.',
    'Усиление или защитная стойка длится на 2 с дольше.':'A buff or guard stance lasts 2 seconds longer.',
    'Защита молота поглощает 70%; окно парирования длиннее на 0,25 с.':'Hammer guard absorbs 70%; the parry window is 0.25 seconds longer.',
    'Увеличивает область навыка на 25.':'Increases the skill area by 25.',
    'Урон добивающего удара увеличен на 25%.':'Finisher damage increases by 25%.',
    'Снижение брони достигает 90%.':'Armor reduction reaches 90%.',
    'Урон ударного навыка увеличен на 25%.':'Impact skill damage increases by 25%.',
    'Пронзающий рывок':'Piercing Dash','Цепь пронзаний':'Piercing Chain','Стремительность':'Swiftness',
    'Накопленный удар':'Stored Impact','Быстрый молот':'Quick Hammer','Раскол брони':'Armor Break',
    'Контррывок':'Counterdash','Кровавый вихрь':'Bloody Whirlwind','Охота':'Hunt',
    'Кровавая кромка':'Bloody Edge','Эхо атаки':'Attack Echo','Ярость':'Fury','Быстрые руки':'Quick Hands',
    'Широкий замах':'Wide Swing','Полумесяц':'Crescent','Вторая дуга':'Second Arc','Длинный выпад':'Long Thrust',
    'Точное остриё':'Precise Tip','Подсечка':'Hamstring','Ударная волна':'Shockwave','Послезвучие':'Aftershock',
    'Тяжёлая головка':'Heavy Head','Тройной залп':'Triple Shot','Сквозная стрела':'Piercing Arrow',
    'Быстрая тетива':'Quick Draw','Тяжёлый наконечник':'Heavy Arrowhead','Дальний полёт':'Long Flight',
    'Ядовитая стрела':'Poison Arrow','Лёгкое оперение':'Light Fletching','Лёгкая поступь':'Light Step',
    'Сокращение':'Recovery','Искра жизни':'Life Spark','Порыв':'Surge','Покров':'Ward','Прицел':'Focus',
    'Кровавый след':'Blood Trail','Отголосок':'Echo','Дальний рывок':'Long Dash','Инерция':'Momentum',
    'Продление':'Extension','Твёрдая стойка':'Firm Stance','Широкий охват':'Wide Reach','Точное добивание':'Precise Finisher',
    'Глубокий раскол':'Deep Sunder','Сильный толчок':'Heavy Impact',
    'Страж Разлома':'Rift Warden','Мать Топи':'Mire Mother','Астральный Ловчий':'Astral Hunter','Пепельный Дуэлянт':'Ash Duelist',
    'Охотничье копьё':'Hunting Spear','Кузнечный молот':'Smith Hammer','Железный меч':'Iron Sword','Короткий лук':'Short Bow',
    'Астральный клинок':'Astral Blade','Копьё хранителя':'Warden Spear','Молот разлома':'Rift Hammer','Астральный лук':'Astral Bow',
    'Кожаный капюшон':'Leather Hood','Шлем стража':'Warden Helm','Плащ путника':'Traveler Cloak','Панцирь бездны':'Abyss Cuirass',
    'Кожаные перчатки':'Leather Gloves','Перчатки охотника':'Hunter Gloves','Сапоги странника':'Wanderer Boots',
    'Сапоги стража':'Warden Boots','Кольцо искры':'Spark Ring','Кольцо сумрака':'Dusk Ring','Амулет идеи':'Idea Amulet','Оберег глубин':'Depth Charm',
    'Вверх':'Up','Вниз':'Down','Влево':'Left','Вправо':'Right','Удар оружием':'Melee attack','Выстрел из лука':'Bow shot','Перекат':'Dodge roll','Навык':'Skill','Взаимодействие':'Interact',
    'ПЕРСОНАЖ':'CHARACTER','СНАРЯЖЕНИЕ':'EQUIPMENT','УПРАВЛЕНИЕ':'CONTROLS','ТОРГОВЕЦ ГЛУБИНЫ':'DEPTH MERCHANT','ТОРГОВЕЦ':'MERCHANT',
    'Торговец':'Merchant','КУЗНЕЦ':'BLACKSMITH','ЮВЕЛИР':'JEWELER','ГЕРОИ':'HEROES','ЗДОРОВЬЕ':'HEALTH','БРОНЯ':'ARMOR','СИЛА':'POWER',
    'ЗОЛОТО':'GOLD','СТРЕЛЫ':'ARROWS','ЗЕЛЬЯ':'POTIONS','УРОВЕНЬ':'LEVEL','ГЛУБИНА':'DEPTH','ОП':'XP',
    'ГОРОД':'CITY','АСТРАЛ':'ASTRAL','РУКЗАК':'BAG','РЮКЗАК':'BAG','НАДЕТО':'EQUIPPED','Пусто':'Empty',
    'МЕЧ':'SWORD','КОПЬЁ':'SPEAR','МОЛОТ':'HAMMER','ЛУК':'BOW','УДАР':'ATTACK','ДЕЙСТВИЕ':'ACTION',
    'СОЗДАТЬ МИР':'CREATE WORLD','ТОРГОВАТЬ С КУЗНЕЦОМ':'TRADE WITH BLACKSMITH','ТОРГОВАТЬ С ЮВЕЛИРОМ':'TRADE WITH JEWELER',
    'НАЧАТЬ':'START','ИГРАТЬ':'PLAY','ПРОДАНО':'SOLD','КУПИТЬ':'BUY','СЛОТОВ':'SLOTS','МОДОВ':'MODS',
    'ГОТОВО':'READY','ПЕРЕЗАРЯДКА':'COOLDOWN','ПУСТО':'EMPTY','УКЛОНЕНИЕ':'DODGE','ПОБЕДА':'VICTORY',
    'ЭТО ИГРА-ДЕМКА':'THIS IS A DEMO','СОЗДАЛ ИГРУ':'CREATED BY','АНАТОЛИЙ ИОНОВ':'ANATOLY IONOV',
    'ЗАДАНИЕ':'QUEST','ПОБЕДИТЬ':'DEFEAT','БОССА':'BOSS','НЕИЗВЕСТНАЯ':'UNKNOWN','СФЕРА':'SPHERE',
    'выбрать один':'choose one','слоты не занимает':'uses no slots','клавиши':'keys','до 6 модов в каждом':'up to 6 mods each',
    'волшебные и редкие предметы':'magic and rare items','Например, Айрин':'For example, Aerin',
    'Обычный':'Common','Волшебный':'Magic','Редкий':'Rare','Урон':'Damage','Броня':'Armor',
    'Скорость атаки':'Attack speed','Крит. шанс':'Crit chance','Скорость движения':'Move speed',
    'ОБЛИК ГЕРОЯ':'HERO APPEARANCE','ОРУЖИЕ':'WEAPON','МОДЫ':'MODS','ОБЛИК':'APPEARANCE','ИМЯ ГЕРОЯ':'HERO NAME',
    'Странник':'Wanderer','Пепельный':'Ashen','Мшистый':'Mossy','Багряный':'Crimson',
    'СФЕРА РУИН':'RUINS SPHERE','СФЕРА УРОВНЯ':'LEVEL SPHERE','СФЕРА УСИЛЕНИЯ':'EMPOWERMENT SPHERE'
    ,'Уровень монстров +1':'Monster level +1','Крепкий':'Sturdy','Бронированный':'Armored','Проворный':'Swift','Свирепый':'Fierce','Живучий':'Vital','Разъярённый':'Enraged'
    ,'СТРАЖ РАЗЛОМА':'RIFT WARDEN','МАТЬ ТОПИ':'MIRE MOTHER','АСТРАЛЬНЫЙ ЛОВЧИЙ':'ASTRAL HUNTER','ПЕПЕЛЬНЫЙ ДУЭЛЯНТ':'ASH DUELIST'
    ,'Крушит землю и вызывает каменный дождь.':'Shatters the ground and calls down a rain of stones.'
    ,'Разливает топь и стреляет ядовитыми сгустками.':'Spreads swamps and fires poisonous bolts.'
    ,'Пускает веер стрел и прицельный выстрел.':'Fires arrow volleys and aimed shots.'
    ,'Рубит широкой дугой и совершает выпад.':'Slashes in a wide arc and lunges.'
    ,'Повелитель Астральной пустоши, построивший трон из обломков исчезнувших миров.':'Lord of the Astral Wasteland, whose throne is built from the debris of lost worlds.'
    ,'Астральный рыцарь':'Astral Knight','Хранитель бездны':'Abyss Warden','Призрак пустоши':'Wasteland Ghost'
    ,'ДУБИНА':'CLUB','МЕЧА':'SWORD','КОПЬЯ':'SPEAR','МОЛОТА':'HAMMER','ЛУКА':'BOW'
    ,'УРОНА':'DAMAGE','ДАЛЬНОСТЬ':'RANGE','Ближний бой':'Melee','Дуга':'Arc','Выпад':'Thrust','Удар':'Impact','Снаряд':'Projectile','Умение':'Skill','Рывок':'Dash','Усиление':'Buff','Защита':'Guard','Область':'Area','Ослабление':'Debuff','Парирование':'Parry','Добивание':'Finisher'
    ,'Оружие':'Weapon','Лук':'Bow','Шлем':'Helm','Доспех':'Armor','Перчатки':'Gloves','Сапоги':'Boots','Кольцо I':'Ring I','Кольцо II':'Ring II','Кольцо':'Ring','Амулет':'Amulet'
    ,'Мощный':'Mighty','Сила':'Power','Живучесть':'Vitality','Защитный':'Protective','Стремительный':'Swift','Меткий':'Precise','Лёгкий':'Light'
    ,'Зелье лечения':'Healing potion','Персонаж':'Character','ЛКМ':'LMB','ПКМ':'RMB','СКМ':'MMB','ПРОБЕЛ':'SPACE'
    ,'ОТКРЫТЬ СУНДУК':'OPEN CHEST','ВЫХОД ИЗ ЛОГОВА':'LAIR EXIT','АСТРАЛЬНЫЙ АЛТАРЬ':'ASTRAL ALTAR','АЛТАРЬ':'ALTAR'
    ,'ПОБЕДИТЕ КОРОЛЯ МУСОРНОЙ КУЧИ':'DEFEAT THE JUNK HEAP KING','ОГЛУШЕНИЕ':'STUNNED'
    ,'ПРОБИВАНИЕ ВСЕХ':'PIERCE ALL','АТАКА':'ATTACK','ДВИЖЕНИЕ':'MOVEMENT','ПОГЛОЩЕНИЕ УРОНА':'DAMAGE ABSORPTION'
    ,'БРОНЯ ГРЕМЛИНОВ РАСКОЛОТА':'GREMLIN ARMOR SHATTERED','СКОРОСТЬ И ПРИТЯЖЕНИЕ':'SPEED AND PULL','РЫВОК К ЦЕЛИ':'DASH TO TARGET'
    ,'НЕТ ЦЕЛИ В НАПРАВЛЕНИИ КУРСОРА':'NO TARGET IN AIM DIRECTION','ПРОДОЛЖАЕТСЯ':'CONTINUES','ЗДОРОВЬЯ':'HEALTH'
    ,'ВЗРЫВ НАКОПЛЕННОГО УРОНА':'STORED DAMAGE EXPLOSION','СТРЕЛЫ ЗАКОНЧИЛИСЬ':'OUT OF ARROWS','ВЕРНИТЕСЬ К АЛТАРЮ':'RETURN TO THE ALTAR'
    ,'СКЕЛЕТ ПАРИРОВАЛ УДАР':'SKELETON PARRIED','ЗАСАДА ПОБЕЖДЕНА':'AMBUSH DEFEATED','НАГРАДА':'REWARD','МОНЕТ':'COINS'
    ,'ПРИЗВАТЬ БОССА ИЛИ ВЕРНУТЬСЯ':'SUMMON BOSS OR RETURN','ВСЕ ГРЕМЛИНЫ ПОВЕРЖЕНЫ':'ALL GREMLINS DEFEATED','ПОДОЙДИТЕ К АЛТАРЮ':'APPROACH THE ALTAR'
    ,'СТРАЖ СУНДУКА':'CHEST GUARD','СУНДУК ОКАЗАЛСЯ ЛОВУШКОЙ':'THE CHEST WAS A TRAP','ПОБЕДИТЕ СТРАЖЕЙ':'DEFEAT THE GUARDS'
    ,'СФЕРА ВОССТАНОВЛЕНИЯ':'HEALING ORB','КНИГА ПАМЯТИ':'MEMORY TOME','СТРЕЛА':'ARROW','СТРЕЛЫ':'ARROWS','СТРЕЛ':'ARROWS'
    ,'МАКСИМУМ СТРЕЛ':'MAX ARROWS','МАКСИМУМ ЗЕЛИЙ':'MAX POTIONS','ЗДОРОВЬЕ УЖЕ ПОЛНОЕ':'HEALTH IS FULL','НАЙДЕНО':'FOUND'
    ,'ТОРГОВЦЫ ГЛУБИНЫ ПРИБЫЛИ':'DEPTH MERCHANTS ARRIVED','СКОВАН ХОЛОДОМ':'FROZEN','ОТВЕТНЫЙ УДАР':'COUNTERSTRIKE'
    ,'ВОССТАНОВЛЕНИЕ В ТЕЧЕНИЕ':'RECOVERY OVER','БОСС ПРИЗВАН':'BOSS SUMMONED','ВОЗВРАТ':'RETURN','СТАДИЯ':'PHASE'
    ,'ВЛАДЫКА АСТРАЛЬНОЙ ПУСТОШИ':'LORD OF THE ASTRAL WASTELAND','ШАМАН':'SHAMAN','ВОИН':'WARRIOR'
    ,'КОРОЛЬ ПРИЗЫВАЕТ ДВУХ ДУБИНЩИКОВ':'KING SUMMONS TWO CLUB FIGHTERS','КОРОЛЬ ПРИЗЫВАЕТ ТРЁХ ВОИНОВ И ШАМАНА':'KING SUMMONS THREE WARRIORS AND A SHAMAN'
    ,'КОРОЛЬ В ЯРОСТИ':'KING IS ENRAGED','КОРОЛЬ ГОТОВИТ СОКРУШИТЕЛЬНЫЙ РЫВОК':'KING PREPARES A CRUSHING CHARGE','РОГАТКА':'SLINGSHOT'
    ,'ПОВЕРЖЕН':'DEFEATED','ВЫ ПАЛИ':'YOU FELL','ПОБЕЖДЕНО ГРЕМЛИНОВ':'GREMLINS DEFEATED','ДОБЫЧА СОХРАНЕНА':'LOOT RETAINED'
    ,'ТИХАЯ ГАВАНЬ':'QUIET HAVEN','ТОРГОВЦЫ':'MERCHANTS','ПОРТАЛ В АСТРАЛ':'PORTAL TO THE ASTRAL','СПУСК НА ГЛУБИНУ':'DESCENDING TO DEPTH'
    ,'НАЖМИТЕ КЛАВИШУ':'PRESS A KEY','КОРОЛЬ ПОВЕРЖЕН':'KING DEFEATED','ВЫЗВАТЬ БОССА':'SUMMON BOSS','ПОБЕДИТЬ КОРОЛЯ':'DEFEAT THE KING'
    ,'АКТИВЕН':'ACTIVE','ВОЙТИ':'ENTER','УДАЛИТЬ?':'DELETE?','Удалить героя':'Delete hero','Неизвестная сфера ещё не открыта':'Unknown sphere is still locked'
    ,'Убрать':'Remove','Добавить':'Add','монстры':'monsters','уровень':'level','аффиксов на монстра':'affixes per monster','бонус монет и опыта':'coin and XP bonus'
    ,'Добавляет 10 стрел только к следующей экспедиции. После возвращения запас снова станет 10. Максимум 100.':'Adds 10 arrows to the next expedition only. After returning, your supply resets to 10. Maximum 100.'
    ,'Каждое восстанавливает 45% максимального здоровья постепенно в течение 4 секунд. Запас действует одну экспедицию.':'Each gradually restores 45% maximum health over 4 seconds. Supplies last for one expedition.'
    ,'СТРЕЛЫ НА ЭКСПЕДИЦИЮ':'EXPEDITION ARROWS','ЗЕЛЬЯ ЛЕЧЕНИЯ':'HEALING POTIONS','МАКСИМУМ':'MAXIMUM','ДОСТУП ОТКРЫТ':'ACCESS UNLOCKED','ОСКОЛКИ НЕ РАСХОДУЮТСЯ':'SHARDS ARE NOT SPENT','НУЖНО':'REQUIRED','СОБРАНО':'COLLECTED'
    ,'КУПЛЕНО ДЛЯ ЭКСПЕДИЦИИ':'BOUGHT FOR EXPEDITION','ЗЕЛЬЕ ДОБАВЛЕНО В ЭКСПЕДИЦИЮ':'POTION ADDED TO EXPEDITION'
    ,'Без аффиксов':'No affixes','Надето':'Equipped','Снято':'Unequipped','НЕТ ОРУЖИЯ ЭТОГО ВИДА В РЮКЗАКЕ':'THIS WEAPON TYPE IS NOT IN YOUR BAG'
    ,'Оружие и броня для следующего похода в Астрал.':'Weapons and armor for your next Astral expedition.','Кольца и амулеты с аффиксами для вашего билда.':'Rings and amulets with affixes for your build.'
    ,'Пополняет запас текущей экспедиции. Максимум 100.':'Refills supplies for this expedition. Maximum 100.','Добавляет одно постепенное лечебное зелье. Максимум 10.':'Adds one gradual healing potion. Maximum 10.','Сразу добавляет осколки памяти к запасу героя.':'Immediately adds memory shards to your supply.'
    ,'ТОВАР КУПЛЕН':'ITEM PURCHASED','КУПЛЕНО':'PURCHASED','НОВЫЕ АФФИКСЫ':'NEW AFFIXES','Все':'All','доступно герою':'available to hero','в этом оружии':'in this weapon','Слоты свободны':'Empty slots'
    ,'ЛИМИТ ГЕРОЯ':'HERO LIMIT','КАЖДЫЕ 2 УРОВНЯ':'EVERY 2 LEVELS','ДОСТУПНО МОДОВ В НАВЫКЕ':'SKILL MODS AVAILABLE'
    ,'Нажмите, чтобы надеть':'Select to equip','оружие всегда должно быть надето':'a weapon must stay equipped','снято в рюкзак':'move to bag','АССОРТИМЕНТ ОБНОВЛЁН':'STOCK REROLLED'
    ,'ОТЛАДКА':'DEBUG','ОСКОЛКИ ПАМЯТИ ЗАПОЛНЕНЫ':'MEMORY SHARDS FILLED','РУССКИЙ':'RUSSIAN','Русский':'Russian'
    ,'Нет свободного места для врага на карте':'No free spawn point for an enemy on map'
    ,'УРОНА':'DAMAGE','ОГЛУШЕНИЕ':'STUNNED','СЕКУНДА':'SECOND','СТРЕМИТЕЛЬНОСТЬ':'SWIFTNESS'
    ,'НАКОПЛЕННЫЙ УДАР':'STORED IMPACT','КРОВАВЫЙ ВИХРЬ':'BLOODY WHIRLWIND','ДОБИВАНИЕ':'FINISHER'
    ,'ОХОТА':'HUNT','СТРАЖ СУНДУКА':'CHEST GUARD','ЗОЛОТА':'GOLD','ОСКОЛКОВ':'SHARDS'
    ,'ВЕРНИТЕСЬ В ГОРОД':'RETURN TO CITY','СКОВАН ХОЛОДОМ':'FROZEN','КОНТРРЫВОК':'COUNTERDASH'
    ,'УРОНА АТАКИ':'ATTACK DAMAGE','УР.':'LVL.','УР':'LVL','модов':'mods'
    ,'Рюкзак пуст. Снаряжение продаётся у торговцев в городе.':'Your bag is empty. Gear is sold by merchants in the city.'
    ,'У вас пока нет подходящих волшебных или редких предметов.':'You have no eligible magic or rare items yet.'
    ,'У лука пока есть базовый выстрел и его моды выше. Три активных навыка доступны мечу, копью и молоту.':'The bow has a basic shot and the mods above. Sword, spear, and hammer each have three active skills.'
    ,'+1 слот каждые 10 уровней':'+1 slot every 10 levels'
    ,'КАРТ ПРОЙДЕНО':'MAPS CLEARED','БОСС':'BOSS','УМЕНИЯ':'SKILLS','ЗЕЛЬЕ':'POTION','ПЕРЕКАТ':'ROLL'
    ,'ВЗЯТЬ ЗЕЛЬЕ':'TAKE POTION','ПЕРЕКОВАТЬ':'REROLL','ДОСТУПНО ЗОЛОТО':'AVAILABLE GOLD'
    ,'В НАВЫКЕ':'IN SKILL','ТИХОЙ ГАВАНИ':'OF QUIET HAVEN','КАЖДАЯ ДЕСЯТАЯ':'EVERY TENTH'
    ,'ВАШЕ':'YOUR','ВИТРИНА':'STOCK','НАСТРОЙКИ':'SETTINGS','Движение':'Movement'
    ,'Сенсорное управление':'Touch controls','Меню':'Menu','Язык':'Language'
    ,'выбрать одно':'choose one','слотов':'slots','ДОСТУПНО':'AVAILABLE'
    ,'ГОРОД · ТОРГОВЦЫ, РЮКЗАК И ПОРТАЛ В АСТРАЛ':'CITY · MERCHANTS, BAG AND ASTRAL PORTAL'
  };
  const entries=Object.entries(words).sort((a,b)=>b[0].length-a[0].length);
  const originalNodes=new WeakMap(),originalAttributes=new WeakMap();
  function english(value){
    if(typeof value!=='string')return value;
    let result=value;
    for(const [ru,en] of entries)if(result.includes(ru))result=result.split(ru).join(en);
    result=result.replace(/(\d+(?:[.,]\d+)?)\s*[сС](?![А-Яа-яЁё])/g,'$1 s');
    result=result.replace(/\b(affixes per monster:\s*)до\s+(\d+)/g,'$1up to $2');
    return result;
  }
  function translate(value){return language==='en'?english(value):value;}
  function apply(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('script,style,#languageScreen'))continue;
      const prior=originalNodes.get(node),source=prior&&(node.nodeValue===prior||node.nodeValue===english(prior))?prior:node.nodeValue;
      originalNodes.set(node,source);
      const localized=translate(source);if(node.nodeValue!==localized)node.nodeValue=localized;
    }
    const elements=root.querySelectorAll?.('[placeholder],[title],[aria-label]')||[];
    for(const element of elements)for(const name of ['placeholder','title','aria-label'])if(element.hasAttribute(name)){
      let record=originalAttributes.get(element);if(!record){record={};originalAttributes.set(element,record);}
      const current=element.getAttribute(name),source=record[name]&&(current===record[name]||current===english(record[name]))?record[name]:current;
      record[name]=source;const localized=translate(source);if(current!==localized)element.setAttribute(name,localized);
    }
    document.documentElement.lang=language;
    document.title=language==='en'?'Astral Depths — Combat Prototype':'Глубины астрала — боевой прототип';
  }
  function setLanguage(next){
    language=next==='en'?'en':'ru';
    try{localStorage.setItem(KEY,language);}catch{}
    apply();
    const toggle=document.getElementById('languageToggle');if(toggle)toggle.textContent=language==='en'?'English':'Русский';
  }
  function installPhaser(Phaser){
    const proto=Phaser?.GameObjects?.Text?.prototype;if(!proto||proto.__astralLocalized)return;
    const setText=proto.setText;
    proto.setText=function(value){this.__astralSourceText=value;return setText.call(this,Array.isArray(value)?value.map(translate):translate(value));};
    proto.__astralLocalized=true;
  }
  function refreshPhaser(game){
    for(const scene of game?.scene?.getScenes?.(true)||[])
      for(const child of scene.children?.list||[])
        if(child.__astralSourceText!==undefined)child.setText(child.__astralSourceText);
  }
  function start(){
    apply();
    const observer=new MutationObserver(()=>apply());
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
  }
  return {translate,apply,setLanguage,installPhaser,refreshPhaser,start,get language(){return language;},get firstLaunch(){return saved!=='ru'&&saved!=='en';}};
})();
