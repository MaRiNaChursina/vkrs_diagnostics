const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = id => document.querySelector(`#${id}`);

// Android browsers do not always make 100vh match the part of the screen that
// is actually visible between their toolbars. Keep the game inside that area.
function syncVisibleViewport(){
  const viewport=window.visualViewport;
  const height=Math.round(viewport?.height||window.innerHeight);
  const width=Math.round(viewport?.width||window.innerWidth);
  document.documentElement.style.setProperty('--app-height',`${height}px`);
  document.documentElement.classList.toggle('short-landscape',width>height&&height<=340);
}
syncVisibleViewport();
window.addEventListener('resize',syncVisibleViewport,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncVisibleViewport,120),{passive:true});
window.visualViewport?.addEventListener('resize',syncVisibleViewport,{passive:true});

const creator = ui('creator'), intro = ui('intro'), missionCard = ui('missionCard'), toastEl = ui('toast');
const plannerPuzzle = ui('plannerPuzzle'), circuitPuzzle = ui('circuitPuzzle'), memoryPuzzle = ui('memoryPuzzle'), result = ui('result'), cutscene = ui('cutscene');
const lifeSim = ui('lifeSim'), simHud = ui('simHud');
const profileScene = ui('profileScene');
const logPanel = ui('logPanel'), eventList = ui('events');
const taskHelp = ui('taskHelp');
const taskHelpOpen = ui('taskHelpOpen');

const S = {
  age: '10-12', stage: 'creator', started: 0, events: [], evidence: { planning: 0, problem: 0, regulation: 0 },
  avatar: { created: false, name: 'nova', skin: 'warm', hair: 'wave', outfit: 'explorer', extra: 'none', trait: 'planner', turn: 0 },
  sim: { minute: 510, energy: 4, bond: 1, project: 4, choices: [], episode: null },
  profileAnswers: {},
  observations: { planning: {}, problem: {}, regulation: {} },
  player: { x: 1, y: 1 }, map: [], collected: 0, moves: 0,
  circuitRotations: 0, memoryErrors: 0, memoryRound: 0,
  adaptGate: 0, adaptErrors: 0, rule: 'blue', switchPending: false, switchResults: [], chaseHits: 0, resumedAfterFailure: 0, recovering: false, taskPaused: false
};

const labels = { planning: 'планирование', problem: 'решение проблем', regulation: 'саморегуляция' };
const observationNames = {
  planning:{completePlan:'полный план до запуска',planEfficiency:'эффективность маршрута'},
  problem:{productiveSearch:'продуктивный поиск в цепи',lowRepetition:'без возврата к прежнему состоянию',transfer:'перенос способа во второй цепи',adaptiveRevision:'изменение программы дрона после ошибки'},
  regulation:{loadControl:'контроль под нагрузкой',ruleSwitch:'смена правила',goalReturn:'возврат к цели'}
};
const PILOT_CRITERIA={firstRunRoutes:1,planEfficiency:.8,productiveSearch:.22,nonproductiveRepeat:.55};
const AVATAR_SECTIONS={
  identity:{title:'Выбери имя героя',icon:'✦',key:'name',options:[['nova','Нова','✦'],['lumi','Луми','☀'],['kai','Кай','⚡'],['mira','Мира','☾'],['ray','Рэй','◆'],['theo','Тео','◉']]},
  face:{title:'Выбери оттенок кожи',icon:'☺',key:'skin',options:[['light','Светлый','#f5d2b6'],['warm','Тёплый','#dca172'],['gold','Золотистый','#b9784e'],['deep','Тёмный','#71462f']]},
  hair:{title:'Собери причёску',icon:'✂',key:'hair',options:[['short','Короткая','✦'],['wave','Волны','〰'],['curls','Кудри','●'],['spikes','Шипы','▲']]},
  outfit:{title:'Выбери образ',icon:'◆',key:'outfit',options:[['explorer','Исследователь','#37d9dd'],['creator','Творец','#ff699f'],['tech','Техно','#9a7cff'],['sport','Движение','#75df83']]},
  extra:{title:'Добавь деталь',icon:'★',key:'extra',options:[['none','Без детали','—'],['glasses','Очки','⌐'],['headphones','Наушники','◖◗'],['badge','Значок','★']]},
  trait:{title:'Что герой любит делать?',icon:'☼',key:'trait',options:[['planner','Продумывать','🗺'],['maker','Создавать','🛠'],['explorer','Исследовать','🔎'],['helper','Помогать','♥']]}
};
const PROFILE_QUESTION_ORDER=['q1','q7','q2','q4','q6','q5','q3','q8'];
const PROFILE_QUESTIONS={
  q1:{index:1,theme:'backpack',chapter:'СБОРЫ В ДОРОГУ',icon:'🎒',prop:'🎒',title:'Чем тебе интереснее заниматься?',prompt:'Положи в рюкзак до 3 интересов',mode:'multi',max:3,options:[
    ['build','🧩','Собирать и конструировать'],['visual','🎨','Рисовать и создавать дизайн'],['logic','🧠','Решать загадки и задачки'],['science','🔬','Проводить опыты'],['code','🎮','Создавать игры и программы'],['stories','📚','Придумывать истории и героев'],['craft','🛠','Мастерить своими руками'],['strategy','♟','Придумывать стратегии'],['movement','⚽','Спорт, танцы и движение'],['social','🎭','Общаться и выступать'],['variety','✨','Хочу попробовать разное',true]
  ]},
  q7:{index:2,theme:'badges',chapter:'ЗНАЧКИ ОПЫТА',icon:'🏅',prop:'🏅',title:'Что ты уже пробовал?',prompt:'Отметь реальные занятия, а не умения героя',mode:'multi',options:[
    ['robotics','🤖','Робототехника и конструирование'],['art','🎨','Рисование, дизайн или рукоделие'],['programming','💻','Программирование или создание игр'],['science_club','🧪','Научные кружки и опыты'],['logic_club','♟','Шахматы и головоломки'],['stage','🎤','Музыка, танцы или театр'],['sport','⚽','Спорт'],['other','✦','Другие занятия'],['none','○','Пока ни на какие кружки не хожу',true],['unknown','?','Не помню или трудно ответить',true]
  ]},
  q2:{index:3,theme:'city',chapter:'СВОБОДНЫЙ ЧАС',icon:'◷',prop:'🗺',title:'Куда пойдём до следующей миссии?',prompt:'Выбери то, чем занялся бы ты',mode:'single',options:[
    ['assemble','🧩','Собрать что-нибудь новое'],['create','🎨','Придумать рисунок или проект'],['investigate','🔎','Разобраться в загадке'],['game','🎮','Поиграть или придумать игру'],['experiment','🧪','Провести опыт'],['friends','👥','Позвать друзей и делать вместе'],['mood','✨','Зависит от настроения',true]
  ]},
  q4:{index:4,theme:'workshop',chapter:'ПЛАН ДЕЙСТВИЙ',icon:'🛠',prop:'🧰',title:'Как тебе нравится выполнять задания?',prompt:'Выбери один способ',mode:'single',options:[
    ['own','✦','Придумывать что-то своё'],['instruction','📋','Делать по понятной инструкции'],['experiment','🧪','Проверять разные идеи'],['solve','🧠','Решать и искать ответы'],['team','👥','Работать вместе'],['open','🧭','Искать путь без готового ответа'],['unsure','?','Хочу попробовать разные способы',true]
  ]},
  q6:{index:5,theme:'storm',chapter:'ЧТО МЕШАЕТ',icon:'☁',prop:'⚠',title:'Что тебе меньше нравится на занятиях?',prompt:'Выбери до 2 вариантов',mode:'multi',max:2,options:[
    ['repeat','↻','Долго повторять одно и то же'],['listen','👂','Только слушать и ничего не делать'],['copy','📎','Всегда делать строго по образцу'],['alone','🧍','Работать одному'],['present','🎤','Выступать перед всеми'],['easy','○','Слишком простое задание'],['hard','▲','Слишком сложное задание'],['unknown','?','Пока не знаю',true]
  ]},
  q5:{index:6,theme:'stage',chapter:'НАГРАДА ЗА МИССИЮ',icon:'🏆',prop:'🎁',title:'Что приятнее получить в конце занятия?',prompt:'Выбери одну награду',mode:'single',options:[
    ['thing','🛠','Готовую вещь, которую сделал'],['project','✦','Собственный проект или идею'],['discovery','🔬','Новое открытие'],['hard_task','🧠','Решённую трудную задачу'],['team_result','👥','Общий результат команды'],['growth','📈','Увидеть свой прогресс'],['depends','?','Зависит от занятия',true]
  ]},
  q3:{index:7,theme:'portals',chapter:'ПОРТАЛЫ НОВЫХ ДЕЛ',icon:'◉',prop:'🌀',title:'Что хотелось бы попробовать?',prompt:'Открой до 2 порталов',mode:'multi',max:2,options:[
    ['robot','🤖','Создать собственного робота'],['game','🎮','Придумать игру'],['construction','🏗','Построить конструкцию'],['animation','🎬','Создать мультфильм или комикс'],['science','🔬','Проводить эксперименты'],['code','💻','Научиться программировать'],['craft','🛠','Сделать полезную вещь'],['performance','⚽','Попробовать спорт, танцы или сцену'],['variety','✨','Посмотреть разные варианты',true]
  ]},
  q8:{index:8,theme:'festival',chapter:'СЛЕДУЮЩАЯ ГЛАВА',icon:'🎆',prop:'🚩',title:'Чего хочется от нового кружка?',prompt:'Выбери до 2 целей',mode:'multi',max:2,options:[
    ['learn','📚','Научиться новому'],['projects','✦','Создавать свои проекты'],['interest','♥','Найти увлекающее занятие'],['friends','👥','Познакомиться с ребятами'],['competition','🏆','Подготовиться к соревнованию'],['try','🧭','Попробовать и понять, нравится ли'],['continue','🌱','Продолжить любимое занятие'],['unknown','?','Сначала посмотреть варианты',true]
  ]}
};
const AVATAR_SKINS={light:'#f5d2b6',warm:'#dca172',gold:'#b9784e',deep:'#71462f'};
const AVATAR_HAIR_COLORS={short:'#27324f',wave:'#6a3d2b',curls:'#2a1e2c',spikes:'#1c3853'};
const AVATAR_OUTFITS={explorer:['#37d9dd','#0c7085'],creator:['#ff699f','#8f315a'],tech:['#9a7cff','#4e3d9f'],sport:['#75df83','#28784a']};
const AGE_PROFILES={
  '7-9':{
    label:'РАЗВЕДКА',brief:'2 простых маршрута · 2 сигнала · 4 ворот',commandLimit:12,tutorialTarget:2,memoryPace:620,memoryErrorLimit:2,chaseHitLimit:3,
    tutorialMap:['################','#...P.........E#','#..............#','#..C...........#','#.....###......#','#..........C...#','#..............#','#..............#','################'],
    planLevels:[
      {rows:['..G..','.....','..C..','.....','S....'],optimal:6},
      {rows:['G....','.....','..C..','.....','....S'],optimal:8}
    ],
    circuitStarts:[[0,0,0,0,1,0,0,1,0],[0,1,0,0,0,1,0,1,0]],
    memorySets:[[0,2,1],[3,1,0,2]],
    adaptDoors:[['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue']],adaptSwitches:[2],
    chaseMap:['################','#............E.#','#..............#','#....##........#','#..............#','#..............#','#P......##.....#','#..............#','################'],
    glitches:[{x:7,y:2,d:1},{x:10,y:5,d:-1}]
  },
  '10-12':{
    label:'ЭКСПЕДИЦИЯ',brief:'2 маршрута · 3 сигнала · 6 ворот',commandLimit:16,tutorialTarget:3,memoryPace:470,memoryErrorLimit:2,chaseHitLimit:2,
    tutorialMap:['################','#...P#........E#','#.##..#..###...#','#..C.....#.....#','#.####...#..C..#','#......C.......#','#..######......#','#..............#','################'],
    planLevels:[
      {rows:['...G.','.##..','..C..','.#.#.','S....'],optimal:7},
      {rows:['G....','.#C#.','...#.','.#...','....S'],optimal:8}
    ],
    circuitStarts:[[1,1,2,1,2,1,3,1,2],[2,3,1,3,1,3,2,1,2]],
    memorySets:[[0,2,1,3],[3,0,2,1,3]],
    adaptDoors:[['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue']],adaptSwitches:[2,4],
    chaseMap:['################','#............E.#','#..##..........#','#......##......#','#..............#','#...##.........#','#P......##.....#','#..............#','################'],
    glitches:[{x:6,y:2,d:1},{x:11,y:4,d:-1},{x:5,y:6,d:1}]
  },
  '13-14':{
    label:'ШТУРМ',brief:'2 сложных маршрута · 4 сигнала · 8 ворот',commandLimit:20,tutorialTarget:4,memoryPace:390,memoryErrorLimit:2,chaseHitLimit:1,
    tutorialMap:['################','#...P#........E#','#.##..#..###...#','#..C.....#..C..#','#.####...#..C..#','#......C.......#','#..######......#','#..............#','################'],
    planLevels:[
      {rows:['....G','.###.','..C..','####.','S....'],optimal:12},
      {rows:['G....','.###.','....C','.###.','S....'],optimal:12}
    ],
    circuitStarts:[[3,2,1,2,3,2,1,3,2],[2,3,2,1,2,3,3,2,1]],
    memorySets:[[0,2,1,3,0],[3,1,0,2,3,1]],
    adaptDoors:[['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue']],adaptSwitches:[2,4,6],
    chaseMap:['################','#............E.#','#..##.....##...#','#......##......#','#..##......##..#','#......##......#','#P.##..........#','#..............#','################'],
    glitches:[{x:5,y:2,d:1},{x:11,y:3,d:-1},{x:6,y:4,d:1},{x:10,y:6,d:-1}]
  }
};
const ageProfile=()=>AGE_PROFILES[S.age];
const TASK_BRIEFS={
  tutorial:{glyph:'🏠  ⚡  ⚡  🛠',text:'Собери батареи по дороге в мастерскую',tip:'Двигайся стрелками к 🛠',demo:'<span class="demo-runner">🧒</span><i>⚡</i><i>⚡</i><b>🛠</b>'},
  planner:{glyph:'🤖  →  ⚡  →  🚪',text:'Нажми стрелки. Потом нажми ▶',tip:'Сначала составь весь маршрут',demo:'<span>🤖</span><i class="demo-key">▲</i><i class="demo-key">▶</i><i class="demo-key">▶</i><b>⚡</b><em>🚪</em>'},
  circuit:{glyph:'⚡  →  🎆',text:'Поверни линии и включи свет на площади',tip:'Соедини один путь от ⚡ до 🎆',demo:'<b>⚡</b><i class="demo-pipe">└</i><i class="demo-pipe delay">─</i><i class="demo-pipe delay-2">┐</i><em>🎆</em>'},
  memory:{glyph:'👁️  →  👆',text:'Смотри. Потом нажми так же',tip:'Во время показа только запоминай',demo:'<i class="demo-pad cyan"></i><i class="demo-pad pink"></i><i class="demo-pad yellow"></i><b class="demo-hand">👆</b>'},
  adapt:{glyph:'ЦВЕТ СВЕРХУ  →  ВОРОТА',text:'Иди в ворота цвета сверху',tip:'Внимание: цвет может измениться',demo:'<b class="demo-rule">🔵 ✓</b><span>🧒</span><i class="demo-door blue"></i><i class="demo-door pink"></i>'},
  chase:{glyph:'🧒  →  🐾',text:'Веди героя слева внизу к 🐾 справа вверху',tip:'Не касайся ✦. После столкновения продолжай',demo:'<span class="demo-runner">🧒</span><i class="demo-glitch">✦</i><i class="demo-glitch delay">✦</i><b>🐾</b>'}
};
let currentTask=null;
function setStage(stage){S.stage=stage;document.body.dataset.stage=stage;const hints={tutorial:'Иди в мастерскую 🛠',chase:'Найди Бита 🐾',adapt:'Проведи технику через ворота'};if(ui('controlsHint'))ui('controlsHint').textContent=hints[stage]||'Двигай героя';}
function announceTask(key,repeated=false){const task=TASK_BRIEFS[key];currentTask=key;S.taskPaused=true;ui('taskHelpGlyph').textContent=task.glyph;ui('taskHelpDemo').innerHTML=task.demo;ui('taskHelpText').textContent=task.text;ui('taskHelpTip').textContent=task.tip;taskHelpOpen.classList.add('hidden');taskHelp.classList.remove('hidden');track('task_instruction_shown',{task:key,text:task.text,repeated});}
ui('taskHelpStart').onclick=()=>{taskHelp.classList.add('hidden');taskHelpOpen.classList.remove('hidden');S.taskPaused=false;track('task_instruction_closed',{task:currentTask});};
taskHelpOpen.onclick=()=>{if(currentTask)announceTask(currentTask,true);};
function stamp(){ const s=Math.floor((performance.now()-S.started)/1000); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function track(name,payload={},competency=null,weight=0){
  S.events.push({time:stamp(),name,payload,competency,weight,stage:S.stage});
  if(competency) S.evidence[competency]+=weight;
  renderEvidence();
  eventList.innerHTML=S.events.slice().reverse().map(e=>`<li><time>${e.time}</time><b>${e.name}</b><span>${e.competency?`${labels[e.competency]} · +${e.weight}`:e.stage} · ${JSON.stringify(e.payload)}</span></li>`).join('');
}
function observation(domain,key,value,payload={}){
  S.observations[domain][key]=value===null?null:Boolean(value);
  track('indicator_observed',{indicator:key,value:S.observations[domain][key],...payload},domain,0);
  renderEvidence();
}
function evidenceCount(domain){return Object.values(S.observations[domain]).filter(Boolean).length;}
function evidenceObserved(domain){return Object.values(S.observations[domain]).filter(v=>v!==null).length;}
function renderEvidence(){
  const score=d=>`${evidenceObserved(d)}/${Object.keys(observationNames[d]).length}`;
  ui('evPlan').textContent=score('planning');
  ui('evProblem').textContent=score('problem');
  ui('evReg').textContent=score('regulation');
}
function toast(text,ms=850){ toastEl.textContent=text; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),ms); }
function stageUI(n,name,icon,text){ ui('stageName').textContent=name; ui('stageDots').textContent='●'.repeat(n)+'○'.repeat(6-n); missionCard.classList.remove('hidden'); ui('missionIcon').textContent=icon; ui('missionText').textContent=text; }
function hideOverlays(){ [creator,intro,lifeSim,profileScene,cutscene,plannerPuzzle,circuitPuzzle,memoryPuzzle,result,taskHelp,taskHelpOpen].forEach(x=>x.classList.add('hidden'));S.taskPaused=false; }

const storyAssetUrls=[
  'assets/scene-forest-v2.webp','assets/scene-ruins-v2.webp','assets/scene-reactor-v2.webp','assets/scene-crystals-v2.webp','assets/scene-gates-v2.webp','assets/scene-storm-v2.webp',
  'assets/nova-character.webp','assets/nova-running-v2.webp','assets/nova-powering-v2.webp','assets/nova-listening-v2.webp','assets/nova-reunion-v2.webp','assets/bit-character.webp'
];
const storyPreloads=[];
let storyAssetsWarmed=false;
function warmStoryAssets(){
  if(storyAssetsWarmed)return;storyAssetsWarmed=true;
  storyAssetUrls.forEach(src=>{const image=new Image();image.decoding='async';image.src=src;storyPreloads.push(image);});
}
if('requestIdleCallback' in window)requestIdleCallback(warmStoryAssets,{timeout:1800});else setTimeout(warmStoryAssets,400);
const avatarOption=(section,value)=>AVATAR_SECTIONS[section].options.find(option=>option[0]===value);
const avatarName=()=>avatarOption('identity',S.avatar.name)?.[1]||'Нова';
function avatarMarkup(extraClass=''){
  const [shirt,accent]=AVATAR_OUTFITS[S.avatar.outfit],skin=AVATAR_SKINS[S.avatar.skin],hair=AVATAR_HAIR_COLORS[S.avatar.hair];
  return `<div class="sim-avatar ${extraClass}" data-hair="${S.avatar.hair}" data-extra="${S.avatar.extra}" style="--skin:${skin};--hair:${hair};--shirt:${shirt};--accent:${accent};--turn:${S.avatar.turn}deg"><i class="sim-shadow"></i><i class="sim-leg left"></i><i class="sim-leg right"></i><i class="sim-shoe left"></i><i class="sim-shoe right"></i><i class="sim-body"></i><i class="sim-arm left"></i><i class="sim-arm right"></i><i class="sim-neck"></i><i class="sim-head"><b class="sim-hair"></b><b class="sim-eye left"></b><b class="sim-eye right"></b><b class="sim-mouth"></b><b class="sim-extra"></b></i><i class="sim-badge">✦</i></div>`;
}
const actorMarkup=scene=>`${avatarMarkup('story-avatar')}<img class="story-bit" src="assets/bit-character.webp" decoding="async" alt="">`;
const storyScenes={
  prologue:{chapter:'08:30 · ДОМ',title:'День фестиваля',text:'Площадь Нова-Сити всё ещё тёмная.',glyphs:'🏠  ·  🛠  ·  🎆',pose:'assets/nova-character.webp',action:'Открыть сообщение',icon:'✦',dialogue:'Бит прислал срочное сообщение. До открытия шесть часов.',after:'Сегодня вы отвечаете за главное световое шоу города.',event:'<div class="story-prop signal-spark">✦<i></i><i></i></div><div class="story-prop compass-ray"></div>'},
  beacon:{chapter:'09:20 · МАСТЕРСКАЯ',title:'Нужны батареи',text:'Без них проект не включится.',glyphs:'🤖  ·  ⚡  ·  🛠',pose:'assets/nova-running-v2.webp',action:'Включить дрона',icon:'▶',dialogue:'Дрон доставит батареи, если задать ему маршрут.',after:'Маршрут открыт. Можно собирать установку.',event:'<div class="story-prop scene-drone">◉<i></i></div><div class="story-prop flight-trail"></div>'},
  reactor:{chapter:'10:30 · ПЛОЩАДЬ',title:'Свет не проходит',text:'Одна из цепей собрана неверно.',glyphs:'⚡  ·  ⌁  ·  🎆',pose:'assets/nova-powering-v2.webp',action:'Проверить питание',icon:'⚡',dialogue:'Поверни участки цепи и проведи только один непрерывный путь.',after:'Первая часть площади загорелась. Проект оживает.',event:'<div class="story-prop energy-pulse">⚡</div><div class="story-prop tower-flare"><i></i><i></i><i></i></div>'},
  echo:{chapter:'12:00 · СЦЕНА',title:'Репетиция шоу',text:'Пульт отвечает цветными сигналами.',glyphs:'◆  ◇  ◆  ◇',pose:'assets/nova-listening-v2.webp',action:'Начать репетицию',icon:'◆',dialogue:'Запомни ритм света — вечером город увидит его целиком.',after:'Световой рисунок сохранён. До открытия всё меньше времени.',event:'<div class="story-prop crystal-echo"><i>◆</i><i>◆</i><i>◆</i><i>◆</i></div>'},
  gates:{chapter:'13:10 · ПЛОЩАДЬ',title:'Шторм меняет план',text:'Безопасный проход постоянно меняется.',glyphs:'●  ⇄  ●',pose:'assets/nova-running-v2.webp',action:'Обновить правило',icon:'⇄',dialogue:'Следи за новым цветом и проводи оборудование через нужные ворота.',after:'Оборудование спасено. Но Бита рядом больше нет.',event:'<div class="story-prop story-gate left"></div><div class="story-prop story-gate right"></div><div class="story-prop rule-orb">⇄</div>'},
  storm:{chapter:'14:00 · УЛИЦЫ',title:'Где Бит?',text:'На карте движутся помехи.',glyphs:'⚡  ·  🧭  ·  🐾',pose:'assets/nova-running-v2.webp',action:'Открыть карту',icon:'🧭',dialogue:'Доберись до сигнала. После ошибки путь можно продолжить.',after:'Сигнал найден — Бит застрял у старого павильона.',event:'<div class="story-prop lightning l1"></div><div class="story-prop lightning l2"></div><div class="story-prop storm-shield"></div>'},
  rescue:{chapter:'15:00 · ФЕСТИВАЛЬ',title:'Свет включён',text:'Площадь встречает первых гостей.',glyphs:'🎆  ·  ♥  ·  ◉',pose:'assets/nova-reunion-v2.webp',action:'Запустить шоу',icon:'♥',dialogue:'Остался последний шаг — включить проект вместе с Битом.',after:'Нова-Сити сияет. Финал этого дня создали ваши решения.',event:'<div class="story-prop rescue-wave"><i></i><i></i><i></i></div><div class="story-prop heart-light">♥</div>'}
};
let storyNext=null,storyTimer=null;
function showCutscene(id,next){
  const scene=storyScenes[id];hideOverlays();missionCard.classList.add('hidden');setStage('cutscene');storyNext=next;cutscene.dataset.scene=id;cutscene.dataset.pose=id;
  cutscene.classList.remove('resolved','shot-0','shot-1','shot-2');cutscene.classList.add('shot-0');
  ui('sceneChapter').textContent=scene.chapter;ui('sceneTitle').textContent=scene.title;ui('sceneText').textContent=scene.text;ui('sceneGlyphs').textContent=scene.glyphs;ui('sceneDialogue').textContent=scene.dialogue;
  ui('sceneStage').innerHTML=actorMarkup(scene)+scene.event;ui('sceneAction').innerHTML=`<b>${scene.icon}</b><span>${scene.action}</span>`;ui('sceneAction').classList.add('hidden');ui('sceneContinue').classList.add('hidden');
  cutscene.classList.remove('hidden');ui('stageName').textContent=scene.chapter;clearTimeout(storyTimer);storyTimer=setTimeout(()=>{cutscene.classList.replace('shot-0','shot-1');ui('sceneAction').classList.remove('hidden');},650);track('cutscene_started',{scene:id});
}
function resolveCutscene(){
  if(cutscene.classList.contains('resolved'))return;const id=cutscene.dataset.scene,scene=storyScenes[id];cutscene.classList.add('resolved');cutscene.classList.replace('shot-1','shot-2');ui('sceneAction').classList.add('hidden');ui('sceneDialogue').textContent=scene.after;beep(id==='rescue'?880:660,.14);track('cutscene_action',{scene:id,action:scene.action});clearTimeout(storyTimer);storyTimer=setTimeout(()=>ui('sceneContinue').classList.remove('hidden'),900);
}
function continueStory(){
  if(!storyNext)return;const next=storyNext;storyNext=null;const scene=cutscene.dataset.scene;track('cutscene_completed',{scene});cutscene.classList.add('hidden');next();
}
ui('sceneAction').onclick=resolveCutscene;ui('sceneContinue').onclick=continueStory;ui('sceneSkip').onclick=continueStory;

const SIM_EPISODES={
  morning:{location:'home',place:'ДОМ · УТРО',speaker:'БИТ',reaction:'☀',title:'До открытия 6 часов',text:'Главный световой проект не готов. С чего начнёте день?',choices:[
    {id:'open_plan',trait:'planner',icon:'🗺',label:'Открыть план',hint:'сначала увидеть весь день',outcome:'Вы отметили мастерскую, площадь и время открытия.',effects:{project:5}},
    {id:'pack_tools',trait:'maker',icon:'🛠',label:'Взять инструменты',hint:'начать с действия',outcome:'Инструменты собраны. Можно сразу идти в город.',effects:{energy:0,project:3}},
    {id:'split_work',trait:'helper',icon:'♥',label:'Делать вместе',hint:'разделить работу с Битом',outcome:'Бит берёт карту, а герой — набор для ремонта.',effects:{bond:1,project:3}}
  ]},
  workshop:{location:'workshop',place:'МАСТЕРСКАЯ · 09:20',speaker:'БИТ',reaction:'⚡',title:'Дрон не знает путь',text:'Нужно доставить батарею на площадь. Как начнёте?',choices:[
    {id:'route_first',trait:'planner',icon:'→',label:'Весь маршрут',hint:'собрать команды до запуска',outcome:'На панели появился полный маршрут для проверки.',effects:{project:4}},
    {id:'small_test',trait:'maker',icon:'▶',label:'Пробный запуск',hint:'проверять по шагам',outcome:'Дрон готов к короткой проверке, но время идёт.',effects:{energy:-1,project:2}},
    {id:'inspect_map',trait:'explorer',icon:'🔎',label:'Осмотреть карту',hint:'найти препятствия',outcome:'На карте отмечены стены, батарея и выход.',effects:{project:3}}
  ]},
  storm:{location:'square',place:'ПЛОЩАДЬ · 11:45',speaker:'ГОРОД',reaction:'☁',title:'Приближается шторм',text:'Свет уже работает, но шоу ещё не настроено. Что важнее сейчас?',choices:[
    {id:'rehearse_now',trait:'maker',icon:'🎛',label:'Репетировать',hint:'закрепить световой рисунок',outcome:'Команда включает пульт до того, как усилится ветер.',effects:{minutes:15,energy:-1,project:6}},
    {id:'check_safety',trait:'planner',icon:'✓',label:'Проверить площадь',hint:'подготовиться к изменению',outcome:'Вы замечаете ворота, которые придётся переключать.',effects:{minutes:15,project:4}},
    {id:'check_bit',trait:'helper',icon:'♥',label:'Проверить Бита',hint:'не потерять напарника',outcome:'Бит обещает держаться рядом во время репетиции.',effects:{minutes:15,bond:1,project:2}}
  ]},
  search:{location:'storm',place:'УЛИЦЫ · 14:00',speaker:'СИСТЕМА',reaction:'!',title:'Сигнал Бита пропал',text:'На карте помехи. Как будете искать?',choices:[
    {id:'follow_clues',trait:'explorer',icon:'🐾',label:'По следам',hint:'смотреть, где был Бит',outcome:'След ведёт к старому павильону через площадь.',effects:{project:2,bond:1}},
    {id:'short_route',trait:'planner',icon:'🧭',label:'Короткий путь',hint:'сначала выбрать маршрут',outcome:'На карте отмечена ближайшая точка сигнала.',effects:{project:3}},
    {id:'call_city',trait:'helper',icon:'📣',label:'Позвать город',hint:'использовать помощь',outcome:'Фонари показывают направление слабого сигнала.',effects:{bond:1}}
  ]}
};
let lifeNext=null;
const formatSimTime=()=>`${String(Math.floor(S.sim.minute/60)).padStart(2,'0')}:${String(S.sim.minute%60).padStart(2,'0')}`;
function updateSimHud(){
  ui('simTime').textContent=formatSimTime();ui('simEnergy').textContent=`${S.sim.energy}/4`;
  ui('simBondBar').style.width=`${Math.min(100,S.sim.bond*20)}%`;ui('simProjectBar').style.width=`${Math.min(100,S.sim.project)}%`;
}
function changeSimulation(effects={},reason='story'){
  S.sim.energy=Math.max(0,Math.min(4,S.sim.energy+(effects.energy||0)));S.sim.bond=Math.max(0,Math.min(5,S.sim.bond+(effects.bond||0)));S.sim.project=Math.max(0,Math.min(100,S.sim.project+(effects.project||0)));S.sim.minute=Math.min(23*60+59,S.sim.minute+(effects.minutes||0));updateSimHud();track('simulation_state_changed',{reason,effects,state:{...S.sim,choices:[...S.sim.choices]}});
}
function showLifeEpisode(id,next){
  const episode=SIM_EPISODES[id];hideOverlays();missionCard.classList.add('hidden');setStage('life');S.sim.episode=id;lifeNext=next;lifeSim.dataset.location=episode.location;
  ui('lifeAvatar').innerHTML=avatarMarkup('life-sim-avatar');ui('lifeLocation').textContent=episode.place;ui('lifeClock').textContent=formatSimTime();ui('lifeSpeaker').textContent=episode.speaker;ui('lifeTitle').textContent=episode.title;ui('lifeText').textContent=episode.text;ui('lifeReaction').textContent=episode.reaction;
  ui('lifeOutcome').classList.add('hidden');ui('lifeChoices').classList.remove('hidden');ui('lifeChoices').innerHTML=episode.choices.map(choice=>`<button type="button" data-life-choice="${choice.id}" class="${choice.trait===S.avatar.trait?'hero-style':''}"><i>${choice.icon}</i><b>${choice.label}</b><span>${choice.hint}</span>${choice.trait===S.avatar.trait?'<em>мой стиль</em>':''}</button>`).join('');
  ui('lifeChoices').querySelectorAll('[data-life-choice]').forEach(button=>button.onclick=()=>chooseLifeOption(id,button.dataset.lifeChoice));lifeSim.classList.remove('hidden');ui('stageName').textContent=episode.place;ui('stageDots').textContent='';track('simulation_episode_started',{episode:id,state:{...S.sim}});
}
function chooseLifeOption(episodeId,choiceId){
  const episode=SIM_EPISODES[episodeId],choice=episode.choices.find(item=>item.id===choiceId);if(!choice)return;
  S.sim.choices.push({episode:episodeId,choice:choiceId,declaredTrait:S.avatar.trait});changeSimulation(choice.effects,`choice:${choiceId}`);ui('lifeChoices').classList.add('hidden');ui('lifeOutcomeTitle').textContent=choice.label;ui('lifeOutcomeText').textContent=choice.outcome;
  const changes=[];if(choice.effects.project)changes.push(`✦ проект +${choice.effects.project}`);if(choice.effects.bond)changes.push(`♥ Бит +${choice.effects.bond}`);if(choice.effects.energy)changes.push(`⚡ энергия ${choice.effects.energy}`);ui('lifeChanges').innerHTML=changes.map(change=>`<span>${change}</span>`).join('')||'<span>◷ решение сохранено</span>';ui('lifeOutcome').classList.remove('hidden');ui('lifeReaction').textContent=choice.icon;track('simulation_choice',{episode:episodeId,choice:choiceId,declaredTrait:S.avatar.trait,effects:choice.effects,interpretation:'declared_preference_not_competency'});beep(700,.12);
}
ui('lifeContinue').onclick=()=>{if(!lifeNext)return;const next=lifeNext,episode=S.sim.episode;lifeNext=null;track('simulation_episode_completed',{episode,state:{...S.sim}});next();};

let profileQueue=[],profileNext=null,activeProfileQuestion=null;
const profileQuestion=id=>PROFILE_QUESTIONS[id];
const profileOption=(question,id)=>question.options.find(option=>option[0]===id);
const profileAnswerLabels=id=>(S.profileAnswers[id]||[]).map(value=>profileOption(profileQuestion(id),value)?.[2]).filter(Boolean);
function showProfileSequence(ids,next){profileQueue=[...ids];profileNext=next;showNextProfileQuestion();}
function showNextProfileQuestion(){
  if(!profileQueue.length){const next=profileNext;profileNext=null;activeProfileQuestion=null;profileScene.classList.add('hidden');if(next)next();return;}
  const id=profileQueue.shift(),question=profileQuestion(id);activeProfileQuestion=id;hideOverlays();missionCard.classList.add('hidden');setStage('profile');profileScene.dataset.theme=question.theme;
  ui('profileHero').innerHTML=avatarMarkup('profile-avatar');ui('profileProp').textContent=question.prop;ui('profileChapter').textContent=question.chapter;ui('profileProgress').textContent=`${question.index} / ${PROFILE_QUESTION_ORDER.length}`;ui('profileIcon').textContent=question.icon;ui('profileTitle').textContent=question.title;ui('profilePrompt').textContent=question.prompt;ui('stageName').textContent=question.chapter;ui('stageDots').textContent='';
  renderProfileQuestion();profileScene.classList.remove('hidden');track('interest_question_shown',{question:id,index:question.index,source:'child_self_report',interpretation:'self_report_not_competency'});
}
function renderProfileQuestion(message=''){
  const question=profileQuestion(activeProfileQuestion),selected=S.profileAnswers[activeProfileQuestion]||[];
  ui('profileOptions').innerHTML=question.options.map(([id,icon,label])=>`<button type="button" data-profile-option="${id}" class="${selected.includes(id)?'selected':''}" aria-pressed="${selected.includes(id)}"><span>${icon}</span><b>${label}</b><i>✓</i></button>`).join('');
  ui('profileOptions').querySelectorAll('[data-profile-option]').forEach(button=>button.onclick=()=>chooseProfileOption(button.dataset.profileOption));
  const status=message||(selected.length?(question.mode==='multi'&&question.max?`Выбрано ${selected.length} из ${question.max}`:`Выбрано: ${selected.length}`):question.prompt);
  ui('profileMessage').textContent=status;ui('profileContinue').disabled=!selected.length;
}
function chooseProfileOption(optionId){
  const question=profileQuestion(activeProfileQuestion),option=profileOption(question,optionId);if(!option)return;let selected=[...(S.profileAnswers[activeProfileQuestion]||[])];const exclusive=Boolean(option[3]);
  if(question.mode==='single')selected=[optionId];
  else if(selected.includes(optionId))selected=selected.filter(id=>id!==optionId);
  else if(exclusive)selected=[optionId];
  else{selected=selected.filter(id=>!profileOption(question,id)?.[3]);if(question.max&&selected.length>=question.max){beep(160,.06);renderProfileQuestion(`Можно выбрать не больше ${question.max}`);return;}selected.push(optionId);}
  S.profileAnswers[activeProfileQuestion]=selected;track('interest_option_changed',{question:activeProfileQuestion,option:optionId,selected:selected.includes(optionId),count:selected.length,source:'child_self_report'},null,0);renderProfileQuestion();beep(520+selected.length*45,.05);
}
ui('profileContinue').onclick=()=>{
  if(!activeProfileQuestion||(S.profileAnswers[activeProfileQuestion]||[]).length===0)return;const question=profileQuestion(activeProfileQuestion),answers=[...S.profileAnswers[activeProfileQuestion]];
  track('interest_answer_saved',{question:activeProfileQuestion,index:question.index,answers,labels:profileAnswerLabels(activeProfileQuestion),source:'child_self_report',interpretation:'self_report_not_competency'},null,0);beep(820,.1);showNextProfileQuestion();
};

let audio;
function beep(freq=440,d=.08){ try{ audio ||= new AudioContext(); const o=audio.createOscillator(),g=audio.createGain(); o.frequency.value=freq; o.type='sine'; g.gain.setValueAtTime(.05,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+d); }catch{} }

function updateAgeIntro(){const profile=ageProfile();ui('ageBrief').innerHTML=`<b>${profile.label}</b><span>${profile.brief}</span>`;}
document.querySelectorAll('[data-age]').forEach(b=>b.onclick=()=>{ document.querySelectorAll('[data-age]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); S.age=b.dataset.age; updateAgeIntro(); });
updateAgeIntro();
let creatorTab='identity';
const avatarTelemetry=()=>({name:S.avatar.name,skin:S.avatar.skin,hair:S.avatar.hair,outfit:S.avatar.outfit,extra:S.avatar.extra,declaredTrait:S.avatar.trait});
function refreshAvatar(){
  ui('avatarPreview').innerHTML=avatarMarkup('creator-avatar');ui('introAvatar').innerHTML=avatarMarkup('intro-sim-avatar');ui('heroCallsign').textContent=avatarName().toUpperCase();
}
function renderCreator(){
  const section=AVATAR_SECTIONS[creatorTab],sectionIndex=Object.keys(AVATAR_SECTIONS).indexOf(creatorTab)+1;
  document.querySelectorAll('[data-creator-tab]').forEach(button=>button.classList.toggle('active',button.dataset.creatorTab===creatorTab));
  ui('creatorSectionIcon').textContent=section.icon;ui('creatorSectionTitle').textContent=section.title;ui('creatorSectionStep').textContent=`${sectionIndex} / ${Object.keys(AVATAR_SECTIONS).length}`;
  ui('creatorChoices').innerHTML=section.options.map(([value,label,visual])=>`<button type="button" data-avatar-value="${value}" class="${S.avatar[section.key]===value?'selected':''}" aria-pressed="${S.avatar[section.key]===value}"><i style="${visual.startsWith('#')?`--choice:${visual}`:''}">${visual.startsWith('#')?'':visual}</i><b>${label}</b><span>✓</span></button>`).join('');
  ui('creatorChoices').querySelectorAll('[data-avatar-value]').forEach(button=>button.onclick=()=>{S.avatar[section.key]=button.dataset.avatarValue;refreshAvatar();renderCreator();beep(430+Math.random()*80,.04);});
  refreshAvatar();
}
document.querySelectorAll('[data-creator-tab]').forEach(button=>button.onclick=()=>{creatorTab=button.dataset.creatorTab;renderCreator();beep(520,.04);});
ui('randomizeHero').onclick=()=>{Object.entries(AVATAR_SECTIONS).forEach(([key,section])=>{const option=section.options[Math.floor(Math.random()*section.options.length)];S.avatar[section.key]=option[0];});S.avatar.turn=0;renderCreator();beep(760,.12);};
ui('turnLeft').onclick=()=>{S.avatar.turn=Math.max(-18,S.avatar.turn-9);refreshAvatar();};
ui('turnRight').onclick=()=>{S.avatar.turn=Math.min(18,S.avatar.turn+9);refreshAvatar();};
ui('createHero').onclick=()=>{S.avatar.created=true;refreshAvatar();creator.classList.add('hidden');intro.classList.remove('hidden');setStage('intro');ui('stageName').textContent='НОВА-СИТИ';beep(880,.16);};
ui('editHero').onclick=()=>{intro.classList.add('hidden');creator.classList.remove('hidden');setStage('creator');renderCreator();};
renderCreator();
ui('play').onclick=()=>{ warmStoryAssets();document.body.classList.add('game-active');document.body.classList.remove('portrait-ok');beep(620);resetMetrics();showProfileSequence(['q1','q7'],()=>showLifeEpisode('morning',startTutorial)); };
ui('again').onclick=()=>{ result.classList.add('hidden'); intro.classList.remove('hidden');simHud.classList.add('hidden');missionCard.classList.add('hidden'); ui('stageName').textContent='НОВА-СИТИ'; ui('stageDots').textContent=''; setStage('intro');document.body.classList.remove('game-active','portrait-ok'); };
ui('rotateDismiss').onclick=()=>document.body.classList.add('portrait-ok');
ui('logToggle').onclick=()=>logPanel.classList.toggle('open'); ui('logClose').onclick=()=>logPanel.classList.remove('open'); ui('openLogs').onclick=()=>logPanel.classList.add('open');

function resetMetrics(){ Object.assign(S,{started:performance.now(),events:[],evidence:{planning:0,problem:0,regulation:0},observations:{planning:{},problem:{},regulation:{}},profileAnswers:{},sim:{minute:510,energy:4,bond:1,project:4,choices:[],episode:null},collected:0,moves:0,circuitRotations:0,memoryErrors:0,memoryRound:0,adaptGate:0,adaptErrors:0,rule:'blue',switchPending:false,switchResults:[],chaseHits:0,recovering:false,chaseStart:{x:1,y:7},taskPaused:false}); eventList.innerHTML=''; renderEvidence();updateSimHud();simHud.classList.remove('hidden');track('diagnostic_started',{age:S.age,ageProfile:ageProfile().label,version:'story-simulation-v3-interest-interludes',criteria:'pilot_predefined_not_age_norms'});track('avatar_created',{avatar:avatarTelemetry(),interpretation:'appearance_and_trait_are_declared_choices_not_competency'}); }

function loadMap(rows){ S.map=rows.map(r=>r.split('')); for(let y=0;y<S.map.length;y++)for(let x=0;x<S.map[y].length;x++)if(S.map[y][x]==='P'){S.player={x,y};S.chaseStart={x,y};S.map[y][x]='.';} }
function startTutorial(){ const profile=ageProfile();hideOverlays(); setStage('tutorial'); S.collected=0; S.moves=0; loadMap(profile.tutorialMap); stageUI(1,'ДОРОГА В МАСТЕРСКУЮ','⚡',`0 / ${profile.tutorialTarget}`); track('tutorial_started',{age:S.age,target:profile.tutorialTarget,mapVersion:profile.label,storyGoal:'reach_workshop_with_batteries'});announceTask('tutorial'); }

function move(dx,dy){
  if(S.taskPaused||!['tutorial','chase'].includes(S.stage)) return;
  const nx=S.player.x+dx,ny=S.player.y+dy; const cell=S.map[ny]?.[nx]; if(!cell||cell==='#'){beep(150);return;}
  S.player={x:nx,y:ny}; S.moves++;
  if(S.stage==='tutorial') tutorialCell(cell,nx,ny);
  if(S.stage==='chase') chaseStep();
}
function tutorialCell(cell,x,y){
  const target=ageProfile().tutorialTarget;
  if(cell==='C'){ S.map[y][x]='.'; S.collected++; beep(720+S.collected*80); stageUI(1,'ДОРОГА В МАСТЕРСКУЮ','⚡',`${S.collected} / ${target}`); track('battery_collected',{index:S.collected,target,moves:S.moves}); }
  if(cell==='E'){ if(S.collected===target){ track('tutorial_completed',{moves:S.moves,target});changeSimulation({minutes:50,energy:-1,project:7},'reached_workshop');beep(980,.15);showProfileSequence(['q2'],()=>showLifeEpisode('workshop',startPlanner)); } else { toast(`⚡ ${S.collected}/${target}`); beep(180); } }
}

const commandDelta={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},commandIcon={U:'▲',D:'▼',L:'◀',R:'▶'};
let planRound=0,planQueue=[],planRobot={x:0,y:0},planStart={x:0,y:0},planCheckpoint=false,planAttempts=0,planTrials=[],planningSummary=null,planRunning=false,planRoundStartedAt=0,planFirstProgram='',planPreviousProgress=-1,planRevisionImproved=false,planHit=null;
function summarizeRouteEfficiency(trials){const totalOptimal=trials.reduce((sum,trial)=>sum+trial.optimal,0),totalExecuted=trials.reduce((sum,trial)=>sum+trial.executedLength,0);return{totalOptimal,totalExecuted,routeEfficiency:Math.min(1,totalOptimal/Math.max(1,totalExecuted))};}

function startPlanner(){
  hideOverlays();setStage('planner');plannerPuzzle.classList.remove('hidden');missionCard.classList.add('hidden');ui('stageName').textContent='ДОСТАВКА ДЛЯ ПРОЕКТА';ui('stageDots').textContent='';planRound=0;planTrials=[];planningSummary=null;
  document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>addPlanCommand(b.dataset.command));ui('programUndo').onclick=undoPlanCommand;ui('programRun').onclick=runPlanProgram;
  beginPlanRound();track('planning_task_started',{age:S.age,rounds:ageProfile().planLevels.length,commandLimit:ageProfile().commandLimit,rule:'program_before_launch'});announceTask('planner');
}
function beginPlanRound(){
  const levels=ageProfile().planLevels,level=levels[planRound];planQueue=[];planAttempts=0;planCheckpoint=false;planRunning=false;planRoundStartedAt=performance.now();planFirstProgram='';planPreviousProgress=-1;planRevisionImproved=false;planHit=null;
  level.rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='S')planStart={x,y};}));planRobot={...planStart};ui('planRound').textContent=`${planRound+1}/${levels.length}`;ui('planAttempts').textContent='○ ○ ○';renderPlanner();track('planning_round_started',{age:S.age,round:planRound+1,optimalCommands:level.optimal,commandLimit:ageProfile().commandLimit});
}
function addPlanCommand(command){
  if(S.taskPaused||planRunning||planQueue.length>=ageProfile().commandLimit)return;planQueue.push(command);track('plan_command_added',{round:planRound+1,command,position:planQueue.length});renderPlanQueue();beep(360+planQueue.length*8);
}
function undoPlanCommand(){if(S.taskPaused||planRunning||!planQueue.length)return;const removed=planQueue.pop();track('plan_command_removed',{round:planRound+1,command:removed,remaining:planQueue.length});renderPlanQueue();}
function renderPlanQueue(){ui('programQueue').innerHTML=planQueue.length?planQueue.map(c=>`<span>${commandIcon[c]}</span>`).join(''):'<span class="empty">…</span>';ui('programRun').disabled=!planQueue.length||planRunning;ui('programUndo').disabled=!planQueue.length||planRunning;document.querySelectorAll('[data-command]').forEach(b=>b.disabled=planRunning);}
function renderPlanner(){
  const level=ageProfile().planLevels[planRound];ui('plannerPuzzle').querySelector('.planner-layout').classList.toggle('running',planRunning);
  ui('planGrid').innerHTML=level.rows.flatMap((row,y)=>[...row].map((cell,x)=>{const robot=planRobot.x===x&&planRobot.y===y;let icon='';if(robot)icon='🤖';else if(cell==='C'&&!planCheckpoint)icon='⚡';else if(cell==='G')icon='🚪';return `<div class="plan-cell ${cell==='#'?'wall':''} ${robot?'robot':''} ${planHit&&planHit.x===x&&planHit.y===y?'hit':''}">${icon}</div>`;})).join('');renderPlanQueue();
}
async function runPlanProgram(){
  if(S.taskPaused||planRunning||!planQueue.length)return;planRunning=true;planAttempts++;planHit=null;planRobot={...planStart};planCheckpoint=false;if(planAttempts===1)planFirstProgram=planQueue.join('');ui('planAttempts').textContent='● '.repeat(Math.min(planAttempts,3))+'○ '.repeat(Math.max(0,3-planAttempts));renderPlanner();
  const program=[...planQueue];track('plan_launched',{round:planRound+1,attempt:planAttempts,commands:program.join(''),length:program.length,prelaunchMs:planAttempts===1?Math.round(performance.now()-planRoundStartedAt):null});let completed=false,executed=0,reason='program_ended';
  for(const command of program){
    const [dx,dy]=commandDelta[command],nx=planRobot.x+dx,ny=planRobot.y+dy;const cell=ageProfile().planLevels[planRound].rows[ny]?.[nx];executed++;
    if(!cell||cell==='#'){planHit={x:Math.max(0,Math.min(4,nx)),y:Math.max(0,Math.min(4,ny))};reason='collision';beep(120);renderPlanner();break;}
    planRobot={x:nx,y:ny};if(cell==='C')planCheckpoint=true;if(cell==='G'){if(planCheckpoint){completed=true;reason='goal';}else reason='goal_without_energy';renderPlanner();if(!completed)beep(130);break;}beep(460+executed*12,.04);renderPlanner();await wait(135);
  }
  const targetChar=planCheckpoint?'G':'C';let target={x:0,y:0};ageProfile().planLevels[planRound].rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell===targetChar)target={x,y};}));const distance=Math.abs(planRobot.x-target.x)+Math.abs(planRobot.y-target.y);const progress=(planCheckpoint?20:0)+(completed?40:0)+Math.max(0,8-distance);if(planAttempts>1&&progress>planPreviousProgress&&program.join('')!==planFirstProgram)planRevisionImproved=true;planPreviousProgress=Math.max(planPreviousProgress,progress);
  track('plan_result',{round:planRound+1,attempt:planAttempts,completed,reason,executed,energy:planCheckpoint,programLength:program.length,progress});
  if(!completed){planRunning=false;renderPlanner();toast(reason==='goal_without_energy'?'⚡ → 🚪':'↶  ✎  ▶',1100);setTimeout(()=>{planRobot={...planStart};planCheckpoint=false;planHit=null;renderPlanner();},500);return;}
  renderPlanner();
  const levels=ageProfile().planLevels,level=levels[planRound],executedLength=executed;const trial={attempts:planAttempts,firstRunComplete:planAttempts===1,programLength:executedLength,queuedLength:program.length,executedLength,optimal:level.optimal,efficiency:Math.min(1,level.optimal/executedLength),revisionOpportunity:planAttempts>1,revisionImproved:planRevisionImproved};planTrials.push(trial);track('planning_round_completed',{age:S.age,round:planRound+1,...trial});beep(980,.2);
  if(planRound<levels.length-1){planRound++;toast(`✓  →  ${planRound+1}/${levels.length}`,900);setTimeout(beginPlanRound,750);return;}
  const firstRunCount=planTrials.filter(t=>t.firstRunComplete).length,{totalOptimal,totalExecuted,routeEfficiency}=summarizeRouteEfficiency(planTrials),retryTrials=planTrials.filter(t=>t.revisionOpportunity);
  planningSummary={firstRunCount,totalTrials:levels.length,routeEfficiency,totalOptimal,totalExecuted,retryOpportunities:retryTrials.length,revisionImproved:retryTrials.length?retryTrials.some(t=>t.revisionImproved):null};
  observation('planning','completePlan',firstRunCount>=PILOT_CRITERIA.firstRunRoutes,{firstRunCount,trials:levels.length,age:S.age,criterion:PILOT_CRITERIA.firstRunRoutes,criterionStatus:'pilot_predefined'});
  observation('planning','planEfficiency',routeEfficiency>=PILOT_CRITERIA.planEfficiency,{measured:+routeEfficiency.toFixed(2),minimumPath:totalOptimal,childPath:totalExecuted,formula:'minimum_path/child_path',criterion:PILOT_CRITERIA.planEfficiency,criterionStatus:'pilot_predefined'});
  observation('problem','adaptiveRevision',retryTrials.length?retryTrials.some(t=>t.revisionImproved):null,{sourceTask:'drone',opportunities:retryTrials.length,reason:retryTrials.length?'feedback_used':'not_needed'});
  changeSimulation({minutes:70,energy:-1,project:18},'batteries_delivered');setTimeout(()=>showProfileSequence(['q4'],()=>showCutscene('reactor',startCircuit)),850);
}

const solutionMasks=[6,6,12,10,9,3,3,10,9];
const CIRCUIT_SUCCESS_HOLD_MS=3000;
let rotations=[],circuitHintUsed=false,circuitDone=false,circuitRound=0,circuitTrials=[],lastConnected=0,productiveActions=0,nonproductiveRepeats=0,seenCircuitStates=new Map(),problemSummary=null;
function rotateMask(mask,times){let m=mask;for(let i=0;i<times;i++)m=((m<<1)&15)|((m>>3)&1);return m;}
function pipeChar(m){return({10:'─',5:'│',6:'┌',12:'┐',9:'┘',3:'└'}[m]||'•');}
function circuitSignature(){return rotations.map(value=>value%4).join('');}
function isNonproductiveStateRepeat(history,signature,connected){const previousBest=history.get(signature);history.set(signature,Math.max(previousBest??-1,connected));return previousBest!==undefined&&connected<=previousBest;}
function startCircuit(){ const rounds=ageProfile().circuitStarts.length;hideOverlays();setStage('circuit'); circuitPuzzle.classList.remove('hidden'); missionCard.classList.add('hidden'); ui('stageName').textContent='СВЕТ НА ПЛОЩАДИ'; ui('stageDots').textContent=''; circuitRound=0;circuitTrials=[];problemSummary=null;beginCircuitRound();ui('circuitHint').onclick=showCircuitHint;track('circuit_started',{age:S.age,goal:'restore_festival_power',rounds});announceTask('circuit'); }
function beginCircuitRound(){const starts=ageProfile().circuitStarts;rotations=[...starts[circuitRound]];circuitHintUsed=false;circuitDone=false;S.circuitRotations=0;productiveActions=0;nonproductiveRepeats=0;seenCircuitStates=new Map();const initial=circuitState();lastConnected=initial.powered.size;isNonproductiveStateRepeat(seenCircuitStates,circuitSignature(),lastConnected);ui('circuitRound').textContent=`${circuitRound+1}/${starts.length}`;renderCircuit();track('circuit_round_started',{age:S.age,round:circuitRound+1,initialConnected:lastConnected});}
function renderCircuit(){
  const state=circuitState();
  ui('circuitGrid').classList.toggle('solved',state.solved);
  ui('circuitGrid').closest('.power-line').classList.toggle('route-complete',state.solved);
  ui('circuitGrid').innerHTML=solutionMasks.map((m,i)=>{const flowOrder=state.path.indexOf(i),isPowered=state.powered.has(i)&&(!state.solved||flowOrder>=0);const classes=[isPowered?'powered':'',flowOrder>=0?'solved-path':''].filter(Boolean).join(' ');return `<button data-tile="${i}" class="${classes}" ${flowOrder>=0?`style="--flow-order:${flowOrder}"`:''} aria-label="Повернуть элемент цепи"><span>${pipeChar(rotateMask(m,rotations[i]))}</span></button>`;}).join('');
  ui('circuitGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(S.taskPaused||circuitDone)return;const i=+b.dataset.tile;rotations[i]=(rotations[i]+1)%4;S.circuitRotations++;beep(330+rotations[i]*70);const next=circuitState();if(next.powered.size>lastConnected)productiveActions++;const repeatedState=isNonproductiveStateRepeat(seenCircuitStates,circuitSignature(),next.powered.size);if(repeatedState)nonproductiveRepeats++;track('circuit_tile_rotated',{round:circuitRound+1,tile:i,connected:next.powered.size,delta:next.powered.size-lastConnected,rotation:rotations[i],repeatedState});lastConnected=next.powered.size;renderCircuit();if(next.solved)finishCircuit();});
}
function circuitState(){
  const masks=solutionMasks.map((m,i)=>rotateMask(m,rotations[i]));const powered=new Set(),parents=new Map();
  if(!(masks[3]&8))return{powered,solved:false,path:[]};
  const q=[3];powered.add(3);parents.set(3,null);const dirs=[[-1,0,8,2],[1,0,2,8],[0,-1,1,4],[0,1,4,1]];
  while(q.length){const i=q.shift(),x=i%3,y=Math.floor(i/3);for(const[dx,dy,outBit,inBit]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||nx>2||ny<0||ny>2||!(masks[i]&outBit))continue;const ni=ny*3+nx;if((masks[ni]&inBit)&&!powered.has(ni)){powered.add(ni);parents.set(ni,i);q.push(ni);}}}
  const solved=powered.has(5)&&Boolean(masks[5]&2),path=[];
  if(solved){for(let current=5;current!==null;current=parents.get(current)??null)path.unshift(current);}
  return{powered,solved,path};
}
function showCircuitHint(){circuitHintUsed=true;const path=[3,4,1,2,5];const i=path.find(n=>rotateMask(solutionMasks[n],rotations[n])!==solutionMasks[n])??3;const tile=ui('circuitGrid').querySelector(`[data-tile="${i}"]`);tile?.classList.add('hinted');track('hint_requested',{round:circuitRound+1,tile:i,rotations:S.circuitRotations});toast('👆 ↻');}
function finishCircuit(){
  if(circuitDone)return;circuitDone=true;renderCircuit();toast('⚡  ПЛОЩАДЬ ЗАГОРЕЛАСЬ  🎆',CIRCUIT_SUCCESS_HOLD_MS);
  const trial={rotations:S.circuitRotations,productiveActions,nonproductiveRepeats,nonproductiveRepeatRatio:S.circuitRotations?nonproductiveRepeats/S.circuitRotations:0,hintUsed:circuitHintUsed,productiveRatio:S.circuitRotations?productiveActions/S.circuitRotations:0};
  circuitTrials.push(trial);track('circuit_solved',{round:circuitRound+1,...trial},'problem',0);beep(1000,.22);
  if(circuitRound<ageProfile().circuitStarts.length-1){circuitRound++;setTimeout(beginCircuitRound,CIRCUIT_SUCCESS_HOLD_MS);return;}
  const totalRotations=circuitTrials.reduce((sum,trial)=>sum+trial.rotations,0),totalProductive=circuitTrials.reduce((sum,trial)=>sum+trial.productiveActions,0),totalNonproductiveRepeats=circuitTrials.reduce((sum,trial)=>sum+trial.nonproductiveRepeats,0);
  const avgProductive=totalProductive/Math.max(1,totalRotations),repeatRatio=totalNonproductiveRepeats/Math.max(1,totalRotations),transferObserved=!circuitTrials[1].hintUsed&&(circuitTrials[1].productiveRatio>=circuitTrials[0].productiveRatio-.15||circuitTrials[1].rotations<=circuitTrials[0].rotations);
  problemSummary={avgProductive,repeatRatio,transferObserved,totalRotations,totalNonproductiveRepeats};
  observation('problem','productiveSearch',avgProductive>=PILOT_CRITERIA.productiveSearch,{measured:+avgProductive.toFixed(2),formula:'productive_actions/all_rotations',criterion:PILOT_CRITERIA.productiveSearch,criterionStatus:'pilot_predefined'});
  observation('problem','lowRepetition',repeatRatio<=PILOT_CRITERIA.nonproductiveRepeat,{measured:+repeatRatio.toFixed(2),repeatedStates:totalNonproductiveRepeats,formula:'revisited_whole_board_states_without_progress/all_rotations',criterion:PILOT_CRITERIA.nonproductiveRepeat,criterionStatus:'pilot_predefined'});
  observation('problem','transfer',transferObserved,{round1:circuitTrials[0],round2:circuitTrials[1],criterionStatus:'pilot_predefined'});
  changeSimulation({minutes:75,energy:-1,project:24},'square_power_restored');setTimeout(()=>showProfileSequence(['q6'],()=>showLifeEpisode('storm',()=>showCutscene('echo',startMemory))),CIRCUIT_SUCCESS_HOLD_MS);
}

const MEMORY_ERROR_PAUSE_SECONDS=3;
let sequence=[],input=[],showing=false,memoryPlaybackToken=0;
function setMemoryInputEnabled(enabled){ui('pads').classList.toggle('input-locked',!enabled);document.querySelectorAll('[data-pad]').forEach(button=>button.disabled=!enabled);}
function startMemory(){ hideOverlays();setStage('memory'); memoryPuzzle.classList.remove('hidden'); ui('stageName').textContent='РЕПЕТИЦИЯ СВЕТОВОГО ШОУ'; ui('stageDots').textContent=''; ui('roundMarks').textContent='○ ○'; ui('memoryHint').textContent='👁️'; ui('memoryStart').classList.remove('hidden'); ui('memoryFeedback').classList.add('hidden'); S.memoryRound=0; showing=false;memoryPlaybackToken++;setMemoryInputEnabled(false);bindPads(); track('memory_started',{storyGoal:'save_light_sequence'});announceTask('memory'); }
function bindPads(){ document.querySelectorAll('[data-pad]').forEach(b=>b.onclick=()=>padInput(+b.dataset.pad)); ui('memoryStart').onclick=beginMemoryRound; }
function beginMemoryRound(){ const profile=ageProfile();sequence=profile.memorySets[S.memoryRound]; input=[]; ui('memoryStart').classList.add('hidden'); track('memory_round_started',{age:S.age,round:S.memoryRound+1,length:sequence.length,paceMs:profile.memoryPace});const token=++memoryPlaybackToken;showSequence(token); }
async function showSequence(token=memoryPlaybackToken){ showing=true;setMemoryInputEnabled(false);ui('memoryFeedback').classList.add('hidden');ui('memoryHint').textContent='👁️'; await wait(350);if(token!==memoryPlaybackToken||S.stage!=='memory')return; for(const p of sequence){ flashPad(p); await wait(ageProfile().memoryPace);if(token!==memoryPlaybackToken||S.stage!=='memory')return; } showing=false;setMemoryInputEnabled(true);ui('memoryHint').textContent='👆'; }
function flashPad(i){ const b=document.querySelector(`[data-pad="${i}"]`); b.classList.add('flash'); beep([420,520,620,720][i]); setTimeout(()=>b.classList.remove('flash'),260); }
async function replayAfterMemoryError(){const token=++memoryPlaybackToken;showing=true;setMemoryInputEnabled(false);ui('memoryHint').textContent='✕';ui('memoryFeedback').classList.remove('hidden');for(let seconds=MEMORY_ERROR_PAUSE_SECONDS;seconds>0;seconds--){ui('memoryFeedbackText').textContent=`Пауза. Повтор через ${seconds}…`;await wait(1000);if(token!==memoryPlaybackToken||S.stage!=='memory')return;}ui('memoryFeedback').classList.add('hidden');await showSequence(token);}
function padInput(i){ if(S.taskPaused||showing||ui('memoryStart').classList.contains('hidden')===false)return; flashPad(i); input.push(i); const at=input.length-1; if(input[at]!==sequence[at]){ S.memoryErrors++; track('pattern_error',{age:S.age,round:S.memoryRound+1,position:at+1},'regulation',0); input=[];replayAfterMemoryError();return; } if(input.length===sequence.length){ const rounds=ageProfile().memorySets.length;track('pattern_completed',{age:S.age,round:S.memoryRound+1,length:sequence.length,errors:S.memoryErrors},'regulation',0); S.memoryRound++;setMemoryInputEnabled(false); ui('roundMarks').textContent=S.memoryRound===1?'● ○':'● ●'; if(S.memoryRound===rounds){observation('regulation','loadControl',S.memoryErrors<=ageProfile().memoryErrorLimit,{age:S.age,errors:S.memoryErrors,limit:ageProfile().memoryErrorLimit,criterionStatus:'pilot_predefined_not_age_norm'});changeSimulation({minutes:70,project:15},'show_rehearsed');beep(980,.2);setTimeout(()=>showProfileSequence(['q5'],()=>showCutscene('gates',startAdapt)),650);}else{ui('memoryStart').classList.remove('hidden');ui('memoryHint').textContent='▶';} } }
function wait(ms){return new Promise(r=>setTimeout(r,ms));}

function startAdapt(){ const profile=ageProfile();hideOverlays(); setStage('adapt'); S.adaptGate=0; S.adaptErrors=0; S.rule='blue'; S.switchPending=false; S.switchResults=[]; stageUI(5,'ЭВАКУАЦИЯ ОБОРУДОВАНИЯ','🔵',`0 / ${profile.adaptDoors.length}`); track('adaptation_started',{age:S.age,rule:'blue',gates:profile.adaptDoors.length,switches:profile.adaptSwitches.length,storyGoal:'move_equipment_to_safety'});announceTask('adapt'); }
function adaptChoice(lane){
  const profile=ageProfile();if(S.taskPaused||S.adaptGate>=profile.adaptDoors.length)return;const colors=profile.adaptDoors[S.adaptGate]; const chosen=colors[lane];
  if(S.switchPending){S.switchResults.push(chosen===S.rule);S.switchPending=false;}
  if(chosen===S.rule){
    track('gate_choice',{gate:S.adaptGate+1,color:chosen,correct:true},'regulation',0); S.adaptGate++; beep(740);
    stageUI(5,'ВОРОТА БУРИ',S.rule==='blue'?'🔵':'🩷',`${S.adaptGate} / ${profile.adaptDoors.length}`);
    if(profile.adaptSwitches.includes(S.adaptGate)){const old=S.rule;S.rule=S.rule==='blue'?'pink':'blue';S.switchPending=true;stageUI(5,'ПРАВИЛО ИЗМЕНИЛОСЬ',S.rule==='blue'?'🔵':'🩷',`${S.adaptGate} / ${profile.adaptDoors.length}`);track('rule_changed',{age:S.age,from:old,to:S.rule,afterGate:S.adaptGate});toast(old==='blue'?'🔵 ×    🩷 ✓':'🩷 ×    🔵 ✓',1200);}
    if(S.adaptGate===profile.adaptDoors.length){const expected=profile.adaptSwitches.length;observation('regulation','ruleSwitch',S.switchResults.length===expected&&S.switchResults.every(Boolean),{age:S.age,expectedSwitches:expected,firstChoices:S.switchResults,errors:S.adaptErrors,criterionStatus:'pilot_predefined_not_age_norm'});track('adaptation_completed',{age:S.age,errors:S.adaptErrors,switchResults:S.switchResults},'regulation',0);changeSimulation({minutes:50,project:10},'equipment_saved');setTimeout(()=>showProfileSequence(['q3'],()=>showLifeEpisode('search',()=>showCutscene('storm',startChase))),450);}
  }
  else { S.adaptErrors++; track('old_rule_error',{gate:S.adaptGate+1,color:chosen,activeRule:S.rule},'regulation',0); beep(120); toast('×'); }
}

let glitches=[];
function goalReturnObservation(hits,resumed,limit){return hits>0?resumed===hits&&hits<=limit:null;}
function startChase(){ const profile=ageProfile();setStage('chase'); loadMap(profile.chaseMap); glitches=profile.glitches.map(g=>({...g})); S.chaseHits=0;S.resumedAfterFailure=0;S.recovering=false; stageUI(6,'ПОИСК БИТА','🐾',`${glitches.length} помехи`); track('chase_started',{age:S.age,glitches:glitches.length,hitLimit:profile.chaseHitLimit,storyGoal:'find_bit'});announceTask('chase');setTimeout(()=>toast('🧒 слева внизу  →  🐾 справа вверху',1800),250); }
function chaseStep(){
  glitches.forEach(g=>{const nx=g.x+g.d;if(nx<=1||nx>=14||S.map[g.y][nx]==='#')g.d*=-1;else g.x=nx;});
  const hit=glitches.some(g=>g.x===S.player.x&&g.y===S.player.y);
  if(hit){S.chaseHits++;S.recovering=true;track('glitch_collision',{age:S.age,hits:S.chaseHits},'regulation',0);S.player={...S.chaseStart};toast('↻');beep(110);return;}
  if(S.recovering){S.recovering=false;S.resumedAfterFailure++;track('resumed_after_failure',{hits:S.chaseHits,resumed:S.resumedAfterFailure},'regulation',2);}
  if(S.map[S.player.y][S.player.x]==='E'){
    const hadRecoveryOpportunity=S.chaseHits>0;
    observation('regulation','goalReturn',goalReturnObservation(S.chaseHits,S.resumedAfterFailure,ageProfile().chaseHitLimit),{age:S.age,hits:S.chaseHits,resumed:S.resumedAfterFailure,opportunity:hadRecoveryOpportunity,limit:ageProfile().chaseHitLimit,reason:hadRecoveryOpportunity?'measured':'no_collision',criterionStatus:'pilot_predefined_not_age_norm'});
    track('pet_rescued',{age:S.age,moves:S.moves,hits:S.chaseHits,resumed:S.resumedAfterFailure},'regulation',0);changeSimulation({minutes:60,energy:-1,bond:1,project:12},'bit_found');showProfileSequence(['q8'],()=>showCutscene('rescue',finishGame));
  }
}

function finishGame(){
  setStage('result');document.body.classList.remove('game-active','portrait-ok');simHud.classList.add('hidden');missionCard.classList.add('hidden');taskHelpOpen.classList.add('hidden'); result.classList.remove('hidden');
  const plan=evidenceCount('planning'),problem=evidenceCount('problem'),reg=evidenceCount('regulation');
  const planObserved=evidenceObserved('planning'),problemObserved=evidenceObserved('problem'),regObserved=evidenceObserved('regulation'),planTotal=Object.keys(observationNames.planning).length,problemTotal=Object.keys(observationNames.problem).length,regTotal=Object.keys(observationNames.regulation).length,totalObserved=planObserved+problemObserved+regObserved,totalIndicators=planTotal+problemTotal+regTotal;
  ui('planScore').textContent=`Измерено ${planObserved} из ${planTotal}`;ui('problemScore').textContent=`Измерено ${problemObserved} из ${problemTotal}`;ui('regScore').textContent=`Измерено ${regObserved} из ${regTotal}`;
  const unavailable=[];
  if(S.observations.problem.adaptiveRevision===null)unavailable.push('исправление программы — повторный запуск не потребовался');
  if(S.observations.regulation.goalReturn===null)unavailable.push('возврат к цели — столкновения не было');
  const storyEnding=S.sim.bond>=4?'Финал «Команда города»':S.sim.project>=95?'Финал «Мастер света»':'Финал «Проект спасён»';
  ui('resultStory').textContent=`${storyEnding}. Измерено ${totalObserved} из ${totalIndicators} поведенческих показателей.${unavailable.length?` Не оценивались: ${unavailable.join('; ')}.`:''} Это описание действий в заданиях для возраста ${S.age}, а не оценка личности.`;
  const traitLabel=avatarOption('trait',S.avatar.trait)?.[1]||'Исследовать';
  ui('heroSummary').innerHTML=`<b>${storyEnding}</b><span><strong>${avatarName()}</strong> прожил день до ${formatSimTime()} · проект ${S.sim.project}% · отношения с Битом ${S.sim.bond}/5</span><span>В начале выбран стиль «${traitLabel}». Внешность, характер и сюжетные решения — игровые предпочтения ребёнка и не используются как оценка компетенций.</span>`;
  ui('interestSummary').innerHTML=`<header><b>ВЫБОР РЕБЁНКА</b><span>ответы между миссиями · не оценка компетенций</span></header><div>${PROFILE_QUESTION_ORDER.map(id=>{const labels=profileAnswerLabels(id);return labels.length?`<article><b>${profileQuestion(id).title}</b><span>${labels.join(' · ')}</span></article>`:'';}).join('')}</div>`;
  const domains=[['planning','Планирование'],['problem','Решение проблем'],['regulation','Саморегуляция: контроль действий']];
  const displayLabel=(domain,key,label)=>{
    if(domain==='planning'&&planningSummary){if(key==='completePlan')return `полный план с первого запуска: ${planningSummary.firstRunCount}/${planningSummary.totalTrials}`;if(key==='planEfficiency')return `эффективность в 2 маршрутах дрона: ${Math.round(planningSummary.routeEfficiency*100)}% · минимальный путь ${planningSummary.totalOptimal}, путь ребёнка ${planningSummary.totalExecuted}`;}
    if(domain==='problem'){if(key==='adaptiveRevision'&&planningSummary)return planningSummary.retryOpportunities?`изменение программы дрона после ошибки: ${planningSummary.revisionImproved?'помогло продвинуться':'не улучшило результат'}`:'изменение программы дрона: не оценивалось, повторный запуск не потребовался';if(key==='productiveSearch'&&problemSummary)return `продуктивные повороты цепи: ${Math.round(problemSummary.avgProductive*100)}%`;if(key==='lowRepetition'&&problemSummary)return `возвраты к уже встречавшемуся состоянию без прогресса: ${Math.round(problemSummary.repeatRatio*100)}%`;if(key==='transfer'&&problemSummary)return `перенос способа во вторую цепь: ${problemSummary.transferObserved?'наблюдался':'не наблюдался'}`;}
    if(domain==='regulation'){if(key==='loadControl')return `контроль после ошибки памяти: ${S.memoryErrors} ошибок`;if(key==='ruleSwitch')return `смена правила: ${S.switchResults.filter(Boolean).length}/${ageProfile().adaptSwitches.length} первых выборов`;if(key==='goalReturn')return S.chaseHits?`возврат к цели после столкновения: ${S.resumedAfterFailure}/${S.chaseHits} продолжений`:'возврат к цели: не оценивался, столкновения не было';}
    return label;
  };
  ui('reportDetails').innerHTML=domains.map(([domain,title])=>`<article><b>${title}</b>${Object.entries(observationNames[domain]).map(([key,label])=>{const value=S.observations[domain][key];return `<span class="${value===true?'yes':value===false?'no':''}">${value===true?'●':value===false?'○':'—'} ${displayLabel(domain,key,label)}</span>`}).join('')}</article>`).join('');
  track('diagnostic_completed',{observations:S.observations,profileAnswers:S.profileAnswers,counts:{plan,problem,reg},observed:{plan:planObserved,problem:problemObserved,reg:regObserved},available:{plan:planTotal,problem:problemTotal,reg:regTotal},simulation:{...S.sim},limits:'screening_not_diagnosis;pilot_criteria_not_age_norms;story_choices_and_self_report_are_not_competency'});beep(1040,.3);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function drawBackdrop(){ const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'#18265d');g.addColorStop(.55,'#111938');g.addColorStop(1,'#090d1d');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);ctx.fillStyle='rgba(255,255,255,.22)';for(let i=0;i<38;i++)ctx.fillRect((i*137)%960,(i*71)%250,2,2); }
function drawGridWorld(){ drawBackdrop(); const tw=60; for(let y=0;y<S.map.length;y++)for(let x=0;x<S.map[y].length;x++){const c=S.map[y][x],px=x*tw,py=y*tw;if(c==='#'){rounded(px+3,py+3,54,54,12,'#202944','#313b60');ctx.fillStyle='rgba(86,231,255,.08)';ctx.fillRect(px+12,py+12,8,8);}else{ctx.fillStyle='rgba(255,255,255,.018)';ctx.fillRect(px,py,60,60);} if(c==='C')drawToken(px+30,py+30,'⚡','#56e7ff'); if(c==='E')drawToken(px+30,py+30,S.stage==='chase'?'🐾':'🛠',S.collected===ageProfile().tutorialTarget||S.stage==='chase'?'#91f28a':'#58617f'); }
  if(S.stage==='chase')glitches.forEach(g=>drawToken(g.x*60+30,g.y*60+30,'✦','#ff4f9a'));
  drawPlayer(S.player.x*60+30,S.player.y*60+30);
  if(S.stage==='chase'&&S.moves<4){const x=S.player.x*60+30,y=S.player.y*60+30,pulse=8+Math.sin(performance.now()/180)*4;ctx.save();ctx.strokeStyle='#56e7ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,34+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 18px sans-serif';ctx.textAlign='center';ctx.fillText('ТЫ',x,y-48);ctx.restore();}
  if(S.stage==='tutorial'&&S.moves<4){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=4;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(S.player.x*60+55,S.player.y*60+30);ctx.lineTo(S.player.x*60+145,S.player.y*60+30);ctx.stroke();ctx.setLineDash([]);ctx.font='28px sans-serif';ctx.fillText('→',S.player.x*60+120,S.player.y*60+20);}
}
function drawToken(x,y,char,color){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=18;rounded(x-22,y-22,44,44,14,'#11182d',color);ctx.shadowBlur=0;ctx.font='25px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(char,x,y+1);ctx.restore();}
function drawPlayer(x,y){
  const skin=AVATAR_SKINS[S.avatar.skin],hair=AVATAR_HAIR_COLORS[S.avatar.hair],[shirt,accent]=AVATAR_OUTFITS[S.avatar.outfit];ctx.save();ctx.translate(x,y);ctx.shadowColor='#56e7ff';ctx.shadowBlur=15;
  ctx.fillStyle='rgba(3,8,22,.35)';ctx.beginPath();ctx.ellipse(0,24,22,7,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle=accent;ctx.fillRect(-14,13,10,15);ctx.fillRect(4,13,10,15);ctx.fillStyle='#19233e';ctx.fillRect(-16,25,12,5);ctx.fillRect(4,25,12,5);
  rounded(-21,-1,42,30,12,shirt,accent);ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-14,16,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.2)';ctx.stroke();
  ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,-18,17,Math.PI,Math.PI*2);ctx.lineTo(15,-11);ctx.quadraticCurveTo(4,-21,-15,-11);ctx.closePath();ctx.fill();
  if(S.avatar.hair==='curls'){for(let i=-12;i<=12;i+=8){ctx.beginPath();ctx.arc(i,-26+Math.abs(i)/5,6,0,Math.PI*2);ctx.fill();}}
  if(S.avatar.hair==='spikes'){ctx.beginPath();ctx.moveTo(-15,-22);ctx.lineTo(-8,-36);ctx.lineTo(-2,-25);ctx.lineTo(5,-38);ctx.lineTo(10,-24);ctx.lineTo(17,-31);ctx.lineTo(15,-15);ctx.closePath();ctx.fill();}
  ctx.fillStyle='#17213a';ctx.beginPath();ctx.arc(-5,-14,1.7,0,Math.PI*2);ctx.arc(5,-14,1.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8a4e4e';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,-9,4,0,Math.PI);ctx.stroke();
  if(S.avatar.extra==='glasses'){ctx.strokeStyle='#18213a';ctx.lineWidth=2;ctx.strokeRect(-11,-19,9,8);ctx.strokeRect(2,-19,9,8);ctx.beginPath();ctx.moveTo(-2,-15);ctx.lineTo(2,-15);ctx.stroke();}
  if(S.avatar.extra==='headphones'){ctx.strokeStyle='#7ff1ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-15,19,Math.PI,0);ctx.stroke();}
  if(S.avatar.extra==='badge'){ctx.fillStyle='#fff4a8';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('★',10,9);}
  ctx.restore();
}
function drawAdapt(){ const doors=ageProfile().adaptDoors;drawBackdrop(); ctx.fillStyle='#0d1126';ctx.fillRect(0,380,960,160);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(0,455,960,6); ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText(S.rule==='blue'?'🔵 ✓   🩷 ×':'🔵 ×   🩷 ✓',480,74); for(let i=S.adaptGate;i<Math.min(S.adaptGate+3,doors.length);i++){const x=250+(i-S.adaptGate)*210;const cols=doors[i];drawDoor(x,145,cols[0]);drawDoor(x,320,cols[1]);} drawPlayer(120,270);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(145,270);ctx.lineTo(230,190);ctx.moveTo(145,270);ctx.lineTo(230,365);ctx.stroke();ctx.font='34px sans-serif';ctx.fillText('▲',125,155);ctx.fillText('▼',125,390); }
function drawDoor(x,y,color){const c=color==='blue'?'#36d7ff':'#ff4f9a';ctx.save();ctx.shadowColor=c;ctx.shadowBlur=24;rounded(x-45,y-62,90,124,20,'#11162a',c);ctx.fillStyle=c;ctx.globalAlpha=.7;ctx.fillRect(x-5,y-42,10,84);ctx.restore();}
function loop(){ctx.clearRect(0,0,960,540);if(['tutorial','chase'].includes(S.stage))drawGridWorld();else if(S.stage==='adapt')drawAdapt();requestAnimationFrame(loop);}loop();

window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','w'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('U'):S.stage==='adapt'?adaptChoice(0):move(0,-1);}if(['arrowdown','s'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('D'):S.stage==='adapt'?adaptChoice(1):move(0,1);}if(['arrowleft','a'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('L'):move(-1,0);}if(['arrowright','d'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('R'):move(1,0);}});
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const d=b.dataset.move;if(S.stage==='planner'){addPlanCommand({up:'U',down:'D',left:'L',right:'R'}[d]);return;}if(S.stage==='adapt'){if(d==='up')adaptChoice(0);if(d==='down')adaptChoice(1);return;}({up:()=>move(0,-1),down:()=>move(0,1),left:()=>move(-1,0),right:()=>move(1,0)}[d])();});
