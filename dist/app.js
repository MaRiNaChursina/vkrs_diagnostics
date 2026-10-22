const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = id => document.querySelector(`#${id}`);
const intro = ui('intro'), missionCard = ui('missionCard'), toastEl = ui('toast');
const plannerPuzzle = ui('plannerPuzzle'), circuitPuzzle = ui('circuitPuzzle'), memoryPuzzle = ui('memoryPuzzle'), result = ui('result'), cutscene = ui('cutscene');
const logPanel = ui('logPanel'), eventList = ui('events');

const S = {
  age: '10-12', stage: 'intro', started: 0, events: [], evidence: { planning: 0, problem: 0, regulation: 0 },
  observations: { planning: {}, problem: {}, regulation: {} },
  player: { x: 1, y: 1 }, map: [], collected: 0, moves: 0, tool: null, toolSwitches: 0, gateAttempts: 0,
  circuitRotations: 0, circuitClicks: [], memoryErrors: 0, memoryRound: 0,
  gateHistory: [], routeStarted: 0, adaptGate: 0, adaptErrors: 0, rule: 'blue', switchPending: false, switchResults: [], chaseHits: 0, recovering: false
};

const labels = { planning: 'планирование', problem: 'решение проблем', regulation: 'контроль действий' };
const observationNames = {
  planning:{completePlan:'полный план до запуска',planEfficiency:'длина программы',revision:'улучшение после обратной связи'},
  problem:{productiveSearch:'продуктивный поиск',lowRepetition:'без зацикливания',transfer:'перенос способа'},
  regulation:{loadControl:'контроль под нагрузкой',ruleSwitch:'смена правила',goalReturn:'возврат к цели'}
};
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
  const score=d=>Object.keys(S.observations[d]).length===3?`${evidenceCount(d)}/${evidenceObserved(d)}`:`${evidenceCount(d)}/3`;
  ui('evPlan').textContent=score('planning');
  ui('evProblem').textContent=score('problem');
  ui('evReg').textContent=score('regulation');
}
function toast(text,ms=850){ toastEl.textContent=text; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),ms); }
function stageUI(n,name,icon,text){ ui('stageName').textContent=name; ui('stageDots').textContent='●'.repeat(n)+'○'.repeat(6-n); missionCard.classList.remove('hidden'); ui('missionIcon').textContent=icon; ui('missionText').textContent=text; }
function hideOverlays(){ [intro,cutscene,plannerPuzzle,circuitPuzzle,memoryPuzzle,result].forEach(x=>x.classList.add('hidden')); }

const actorMarkup=scene=>`<img class="story-nova" src="${scene.pose}" alt=""><img class="story-bit" src="assets/bit-character.png" alt="">`;
const storyScenes={
  prologue:{chapter:'ПРОЛОГ',title:'Сигнал погас',text:'Компас дрогнул в тёмном лесу.',glyphs:'🧭  ·  ✦  ·  ?',pose:'assets/nova-character.png',action:'Поймать сигнал',icon:'✦',dialogue:'Коснись искры — пусть компас запомнит направление.',after:'Луч ведёт через руины. Бит ещё на связи!',event:'<div class="story-prop signal-spark">✦<i></i><i></i></div><div class="story-prop compass-ray"></div>'},
  beacon:{chapter:'ГЛАВА I',title:'Дорога над пропастью',text:'Старая платформа ещё может летать.',glyphs:'◉  ·  ⚡  ·  ⛰',pose:'assets/nova-running-v2.png',action:'Запустить дрон',icon:'▶',dialogue:'Разбуди платформу одним импульсом.',after:'Дрон поднялся и показал путь к башне.',event:'<div class="story-prop scene-drone">◉<i></i></div><div class="story-prop flight-trail"></div>'},
  reactor:{chapter:'ГЛАВА II',title:'Башня без света',text:'Энергия остановилась в проводах.',glyphs:'⚡  ·  ⌁  ·  ◉',pose:'assets/nova-powering-v2.png',action:'Дать импульс',icon:'⚡',dialogue:'Коснись ядра — энергия побежит вверх.',after:'Башня ожила. Вдали ответили кристаллы.',event:'<div class="story-prop energy-pulse">⚡</div><div class="story-prop tower-flare"><i></i><i></i><i></i></div>'},
  echo:{chapter:'ГЛАВА III',title:'Каньон отвечает',text:'Свет Бита спрятался в кристаллах.',glyphs:'◆  ◇  ◆  ◇',pose:'assets/nova-listening-v2.png',action:'Разбудить эхо',icon:'◆',dialogue:'Коснись кристалла и смотри, как свет идёт дальше.',after:'Цветная волна указала проход к воротам.',event:'<div class="story-prop crystal-echo"><i>◆</i><i>◆</i><i>◆</i><i>◆</i></div>'},
  gates:{chapter:'ГЛАВА IV',title:'Проход меняет правило',text:'Ворота не держат один цвет.',glyphs:'●  ⇄  ●',pose:'assets/nova-running-v2.png',action:'Сменить цвет',icon:'⇄',dialogue:'Нажми, когда створки вспыхнут другим цветом.',after:'Створки разошлись. За ними уже слышна гроза.',event:'<div class="story-prop story-gate left"></div><div class="story-prop story-gate right"></div><div class="story-prop rule-orb">⇄</div>'},
  storm:{chapter:'ГЛАВА V',title:'Сквозь грозу',text:'Сигнал Бита почти рядом.',glyphs:'⚡  ·  🧭  ·  🐾',pose:'assets/nova-running-v2.png',action:'Удержать курс',icon:'🧭',dialogue:'Прижми компас — он прорежет помехи лучом.',after:'Молния отступила. В убежище кто-то ждёт.',event:'<div class="story-prop lightning l1"></div><div class="story-prop lightning l2"></div><div class="story-prop storm-shield"></div>'},
  rescue:{chapter:'ЭПИЛОГ',title:'Бит найден',text:'Тёплый свет дрожит у самого дома.',glyphs:'🧭  ·  ♥  ·  ◉',pose:'assets/nova-reunion-v2.png',action:'Позвать Бита',icon:'♥',dialogue:'Коснись сигнала — пусть Бит услышит Нову.',after:'Сигнал вернулся. Теперь домой — вместе.',event:'<div class="story-prop rescue-wave"><i></i><i></i><i></i></div><div class="story-prop heart-light">♥</div>'}
};
let storyNext=null,storyTimer=null;
function showCutscene(id,next){
  const scene=storyScenes[id];hideOverlays();missionCard.classList.add('hidden');S.stage='cutscene';storyNext=next;cutscene.dataset.scene=id;cutscene.dataset.pose=id;
  cutscene.classList.remove('resolved','shot-0','shot-1','shot-2');cutscene.classList.add('shot-0');
  ui('sceneChapter').textContent=scene.chapter;ui('sceneTitle').textContent=scene.title;ui('sceneText').textContent=scene.text;ui('sceneGlyphs').textContent=scene.glyphs;ui('sceneDialogue').textContent=scene.dialogue;
  ui('sceneStage').innerHTML=actorMarkup(scene)+scene.event;ui('sceneAction').innerHTML=`<b>${scene.icon}</b><span>${scene.action}</span>`;ui('sceneAction').classList.add('hidden');ui('sceneContinue').classList.add('hidden');
  cutscene.classList.remove('hidden');ui('stageName').textContent=scene.chapter;clearTimeout(storyTimer);storyTimer=setTimeout(()=>{cutscene.classList.replace('shot-0','shot-1');ui('sceneAction').classList.remove('hidden');},1200);track('cutscene_started',{scene:id});
}
function resolveCutscene(){
  if(cutscene.classList.contains('resolved'))return;const id=cutscene.dataset.scene,scene=storyScenes[id];cutscene.classList.add('resolved');cutscene.classList.replace('shot-1','shot-2');ui('sceneAction').classList.add('hidden');ui('sceneDialogue').textContent=scene.after;beep(id==='rescue'?880:660,.14);track('cutscene_action',{scene:id,action:scene.action});clearTimeout(storyTimer);storyTimer=setTimeout(()=>ui('sceneContinue').classList.remove('hidden'),900);
}
function continueStory(){
  if(!storyNext)return;const next=storyNext;storyNext=null;const scene=cutscene.dataset.scene;track('cutscene_completed',{scene});cutscene.classList.add('hidden');next();
}
ui('sceneAction').onclick=resolveCutscene;ui('sceneContinue').onclick=continueStory;ui('sceneSkip').onclick=continueStory;

let audio;
function beep(freq=440,d=.08){ try{ audio ||= new AudioContext(); const o=audio.createOscillator(),g=audio.createGain(); o.frequency.value=freq; o.type='sine'; g.gain.setValueAtTime(.05,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+d); }catch{} }

document.querySelectorAll('[data-age]').forEach(b=>b.onclick=()=>{ document.querySelectorAll('[data-age]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); S.age=b.dataset.age; });
ui('play').onclick=()=>{ beep(620); resetMetrics(); showCutscene('prologue',startTutorial); };
ui('again').onclick=()=>{ result.classList.add('hidden'); intro.classList.remove('hidden'); missionCard.classList.add('hidden'); ui('stageName').textContent='МИССИЯ'; ui('stageDots').textContent=''; S.stage='intro'; };
ui('logToggle').onclick=()=>logPanel.classList.toggle('open'); ui('logClose').onclick=()=>logPanel.classList.remove('open'); ui('openLogs').onclick=()=>logPanel.classList.add('open');

function resetMetrics(){ Object.assign(S,{started:performance.now(),events:[],evidence:{planning:0,problem:0,regulation:0},observations:{planning:{},problem:{},regulation:{}},collected:0,moves:0,tool:null,toolSwitches:0,gateAttempts:0,circuitRotations:0,circuitClicks:[],memoryErrors:0,memoryRound:0,gateHistory:[],routeStarted:0,adaptGate:0,adaptErrors:0,rule:'blue',switchPending:false,switchResults:[],chaseHits:0,recovering:false}); eventList.innerHTML=''; renderEvidence(); track('diagnostic_started',{age:S.age,version:'evidence-model-v5'}); }

const tutorialMap=[
  '################','#P...#........E#','#.##..#..###...#','#..C.....#.....#','#.####...#..C..#','#......C.......#','#..######......#','#..............#','################'
];
const routeMap=[
  '################','#..A...B...D...#','#..#...#...#...#','#..#...#...#...#','#..#...#...#...#','#..............#','#..m...f...r...#','#......P.......#','################'
];
const chaseMap=[
  '################','#............E.#','#..##..........#','#......##......#','#..............#','#...##.........#','#.......##.....#','#P.............#','################'
];

function loadMap(rows){ S.map=rows.map(r=>r.split('')); for(let y=0;y<S.map.length;y++)for(let x=0;x<S.map[y].length;x++)if(S.map[y][x]==='P'){S.player={x,y};S.map[y][x]='.';} }
function startTutorial(){ hideOverlays(); S.stage='tutorial'; S.collected=0; S.moves=0; loadMap(tutorialMap); stageUI(1,'ПОЙМАЙ СИГНАЛ','⚡','0 / 3'); track('tutorial_started'); }
function startRoute(){ S.stage='route'; S.moves=0; S.tool=null; S.gateHistory=[]; S.routeStarted=performance.now(); loadMap(routeMap); stageUI(2,'ВЫБЕРИ ПУТЬ','🎒','×1'); track('planning_trial_started'); toast('🎒 → 🚪'); }

function move(dx,dy){
  if(!['tutorial','route','chase'].includes(S.stage)) return;
  const nx=S.player.x+dx,ny=S.player.y+dy; const cell=S.map[ny]?.[nx]; if(!cell||cell==='#'){beep(150);return;}
  if(S.stage==='route' && 'ABD'.includes(cell)){ tryGate(cell); return; }
  S.player={x:nx,y:ny}; S.moves++;
  if(S.stage==='tutorial') tutorialCell(cell,nx,ny);
  if(S.stage==='route') routeCell(cell,nx,ny);
  if(S.stage==='chase') chaseStep();
}
function tutorialCell(cell,x,y){
  if(cell==='C'){ S.map[y][x]='.'; S.collected++; beep(720+S.collected*100); stageUI(1,'ПОЙМАЙ СИГНАЛ','⚡',`${S.collected} / 3`); track('signal_collected',{index:S.collected,moves:S.moves}); }
  if(cell==='E'){ if(S.collected===3){ track('tutorial_completed',{moves:S.moves}); beep(980,.15); showCutscene('beacon',startPlanner); } else { toast(`⚡ ${S.collected}/3`); beep(180); } }
}

const planLevels=[
  {rows:['...G.','.##..','..C..','.#.#.','S....'],optimal:7},
  {rows:['G....','.#C#.','...#.','.#...','....S'],optimal:8}
];
const commandDelta={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},commandIcon={U:'▲',D:'▼',L:'◀',R:'▶'};
let planRound=0,planQueue=[],planRobot={x:0,y:0},planStart={x:0,y:0},planCheckpoint=false,planAttempts=0,planTrials=[],planningSummary=null,planRunning=false,planRoundStartedAt=0,planFirstProgram='',planPreviousProgress=-1,planRevisionImproved=false,planHit=null;

function startPlanner(){
  hideOverlays();S.stage='planner';plannerPuzzle.classList.remove('hidden');missionCard.classList.add('hidden');ui('stageName').textContent='ЗАПРОГРАММИРУЙ ДРОНА';ui('stageDots').textContent='●●○○○○';planRound=0;planTrials=[];planningSummary=null;
  document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>addPlanCommand(b.dataset.command));ui('programUndo').onclick=undoPlanCommand;ui('programRun').onclick=runPlanProgram;
  beginPlanRound();track('planning_task_started',{rounds:2,rule:'program_before_launch'});
}
function beginPlanRound(){
  const level=planLevels[planRound];planQueue=[];planAttempts=0;planCheckpoint=false;planRunning=false;planRoundStartedAt=performance.now();planFirstProgram='';planPreviousProgress=-1;planRevisionImproved=false;planHit=null;
  level.rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='S')planStart={x,y};}));planRobot={...planStart};ui('planRound').textContent=`${planRound+1}/2`;ui('planAttempts').textContent='○ ○ ○';renderPlanner();track('planning_round_started',{round:planRound+1,optimalCommands:level.optimal});
}
function addPlanCommand(command){
  if(planRunning||planQueue.length>=16)return;planQueue.push(command);track('plan_command_added',{round:planRound+1,command,position:planQueue.length});renderPlanQueue();beep(360+planQueue.length*8);
}
function undoPlanCommand(){if(planRunning||!planQueue.length)return;const removed=planQueue.pop();track('plan_command_removed',{round:planRound+1,command:removed,remaining:planQueue.length});renderPlanQueue();}
function renderPlanQueue(){ui('programQueue').innerHTML=planQueue.length?planQueue.map(c=>`<span>${commandIcon[c]}</span>`).join(''):'<span class="empty">…</span>';ui('programRun').disabled=!planQueue.length||planRunning;ui('programUndo').disabled=!planQueue.length||planRunning;document.querySelectorAll('[data-command]').forEach(b=>b.disabled=planRunning);}
function renderPlanner(){
  const level=planLevels[planRound];ui('plannerPuzzle').querySelector('.planner-layout').classList.toggle('running',planRunning);
  ui('planGrid').innerHTML=level.rows.flatMap((row,y)=>[...row].map((cell,x)=>{const robot=planRobot.x===x&&planRobot.y===y;let icon='';if(robot)icon='🤖';else if(cell==='C'&&!planCheckpoint)icon='⚡';else if(cell==='G')icon='🚪';return `<div class="plan-cell ${cell==='#'?'wall':''} ${robot?'robot':''} ${planHit&&planHit.x===x&&planHit.y===y?'hit':''}">${icon}</div>`;})).join('');renderPlanQueue();
}
async function runPlanProgram(){
  if(planRunning||!planQueue.length)return;planRunning=true;planAttempts++;planHit=null;planRobot={...planStart};planCheckpoint=false;if(planAttempts===1)planFirstProgram=planQueue.join('');ui('planAttempts').textContent='● '.repeat(Math.min(planAttempts,3))+'○ '.repeat(Math.max(0,3-planAttempts));renderPlanner();
  const program=[...planQueue];track('plan_launched',{round:planRound+1,attempt:planAttempts,commands:program.join(''),length:program.length,prelaunchMs:planAttempts===1?Math.round(performance.now()-planRoundStartedAt):null});let completed=false,executed=0,reason='program_ended';
  for(const command of program){
    const [dx,dy]=commandDelta[command],nx=planRobot.x+dx,ny=planRobot.y+dy;const cell=planLevels[planRound].rows[ny]?.[nx];executed++;
    if(!cell||cell==='#'){planHit={x:Math.max(0,Math.min(4,nx)),y:Math.max(0,Math.min(4,ny))};reason='collision';beep(120);renderPlanner();break;}
    planRobot={x:nx,y:ny};if(cell==='C')planCheckpoint=true;if(cell==='G'){if(planCheckpoint){completed=true;reason='goal';}else reason='goal_without_energy';renderPlanner();if(!completed)beep(130);break;}beep(460+executed*12,.04);renderPlanner();await wait(135);
  }
  const targetChar=planCheckpoint?'G':'C';let target={x:0,y:0};planLevels[planRound].rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell===targetChar)target={x,y};}));const distance=Math.abs(planRobot.x-target.x)+Math.abs(planRobot.y-target.y);const progress=(planCheckpoint?20:0)+(completed?40:0)+Math.max(0,8-distance);if(planAttempts>1&&progress>planPreviousProgress&&program.join('')!==planFirstProgram)planRevisionImproved=true;planPreviousProgress=Math.max(planPreviousProgress,progress);
  track('plan_result',{round:planRound+1,attempt:planAttempts,completed,reason,executed,energy:planCheckpoint,programLength:program.length,progress});
  if(!completed){planRunning=false;renderPlanner();toast(reason==='goal_without_energy'?'⚡ → 🚪':'↶  ✎  ▶',1100);setTimeout(()=>{planRobot={...planStart};planCheckpoint=false;planHit=null;renderPlanner();},500);return;}
  renderPlanner();
  const level=planLevels[planRound];const trial={attempts:planAttempts,firstRunComplete:planAttempts===1,programLength:program.length,optimal:level.optimal,efficiency:level.optimal/program.length,revisionOpportunity:planAttempts>1,revisionImproved:planRevisionImproved};planTrials.push(trial);track('planning_round_completed',{round:planRound+1,...trial});beep(980,.2);
  if(planRound===0){planRound=1;toast('✓  →  2/2',900);setTimeout(beginPlanRound,750);return;}
  const firstRunCount=planTrials.filter(t=>t.firstRunComplete).length;const avgEfficiency=planTrials.reduce((s,t)=>s+t.efficiency,0)/planTrials.length;const retryTrials=planTrials.filter(t=>t.revisionOpportunity);
  planningSummary={firstRunCount,totalTrials:2,avgEfficiency,retryOpportunities:retryTrials.length,revisionImproved:retryTrials.length?retryTrials.some(t=>t.revisionImproved):null};
  observation('planning','completePlan',firstRunCount>=1,{firstRunCount,trials:2});
  observation('planning','planEfficiency',avgEfficiency>=.8,{measured:+avgEfficiency.toFixed(2)});
  observation('planning','revision',retryTrials.length?retryTrials.some(t=>t.revisionImproved):null,{opportunities:retryTrials.length,reason:retryTrials.length?'feedback_used':'not_needed'});
  setTimeout(()=>showCutscene('reactor',startCircuit),850);
}

const toolIcon={m:'🧲',f:'🔦',r:'🛠️'},toolName={m:'magnet',f:'flashlight',r:'repair'},gateNeed={A:'magnet',B:'flashlight',D:'repair'};
function routeCell(cell,x,y){
  if('mfr'.includes(cell)){
    const next=toolName[cell]; if(S.tool&&S.tool!==next) S.toolSwitches++;
    S.tool=next; S.map[y][x]='.'; stageUI(2,'ВЫБЕРИ ПУТЬ',toolIcon[cell],'✓'); beep(600); track('tool_selected',{tool:next,switches:S.toolSwitches},'planning',2); toast(`${toolIcon[cell]} ✓`);
  }
}
function tryGate(cell){
  const need=gateNeed[cell]; S.gateAttempts++; S.gateHistory.push(cell);
  if(S.tool===need){
    const latency=Math.round(performance.now()-S.routeStarted);
    observation('planning','firstChoice',S.gateAttempts===1,{attempts:S.gateAttempts});
    observation('planning','routeEfficiency',S.moves<=14,{moves:S.moves,reference:14});
    observation('planning','correction',S.gateAttempts<=2&&S.toolSwitches<=1,{attempts:S.gateAttempts,switches:S.toolSwitches});
    track('route_completed',{gate:cell,tool:S.tool,moves:S.moves,attempts:S.gateAttempts,switches:S.toolSwitches,latencyMs:latency},'planning',0); beep(900,.15); startCircuit();
  }
  else { track('gate_rejected',{gate:cell,tool:S.tool,attempt:S.gateAttempts},'planning',0); toast(`${gateIcon(cell)}  +  ${needIcon(need)}`); beep(130); }
}
function gateIcon(c){return{A:'🧲',B:'🔦',D:'🛠️'}[c]} function needIcon(n){return{magnet:'🧲',flashlight:'🔦',repair:'🛠️'}[n]}

const solutionMasks=[6,6,12,10,9,3,3,10,9];
const circuitStarts=[[1,1,2,1,2,1,3,1,2],[2,3,1,3,1,3,2,1,2]];
let rotations=[],circuitHintUsed=false,circuitDone=false,circuitRound=0,circuitTrials=[],lastConnected=0,productiveActions=0;
function rotateMask(mask,times){let m=mask;for(let i=0;i<times;i++)m=((m<<1)&15)|((m>>3)&1);return m;}
function pipeChar(m){return({10:'─',5:'│',6:'┌',12:'┐',9:'┘',3:'└'}[m]||'•');}
function startCircuit(){ S.stage='circuit'; hideOverlays(); circuitPuzzle.classList.remove('hidden'); missionCard.classList.add('hidden'); ui('stageName').textContent='ЗАЖГИ МАЯК'; ui('stageDots').textContent='●●●○○○'; circuitRound=0;circuitTrials=[];beginCircuitRound();ui('circuitHint').onclick=showCircuitHint;track('circuit_started',{goal:'connect_source_to_target',rounds:2}); }
function beginCircuitRound(){rotations=[...circuitStarts[circuitRound]];circuitHintUsed=false;circuitDone=false;S.circuitRotations=0;S.circuitClicks=[];productiveActions=0;lastConnected=circuitState().powered.size;ui('circuitRound').textContent=`${circuitRound+1}/2`;renderCircuit();track('circuit_round_started',{round:circuitRound+1});}
function renderCircuit(){
  const state=circuitState();
  ui('circuitGrid').innerHTML=solutionMasks.map((m,i)=>`<button data-tile="${i}" class="${state.powered.has(i)?'powered':''}" aria-label="Повернуть элемент цепи">${pipeChar(rotateMask(m,rotations[i]))}</button>`).join('');
  ui('circuitGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(circuitDone)return;const i=+b.dataset.tile;rotations[i]=(rotations[i]+1)%4;S.circuitRotations++;S.circuitClicks.push(i);beep(330+rotations[i]*70);const next=circuitState();if(next.powered.size>lastConnected)productiveActions++;track('circuit_tile_rotated',{round:circuitRound+1,tile:i,connected:next.powered.size,delta:next.powered.size-lastConnected,rotation:rotations[i]});lastConnected=next.powered.size;renderCircuit();if(next.solved)finishCircuit();});
}
function circuitState(){
  const masks=solutionMasks.map((m,i)=>rotateMask(m,rotations[i]));const powered=new Set();
  if(!(masks[3]&8))return{powered,solved:false};
  const q=[3];powered.add(3);const dirs=[[-1,0,8,2],[1,0,2,8],[0,-1,1,4],[0,1,4,1]];
  while(q.length){const i=q.shift(),x=i%3,y=Math.floor(i/3);for(const[dx,dy,outBit,inBit]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||nx>2||ny<0||ny>2||!(masks[i]&outBit))continue;const ni=ny*3+nx;if((masks[ni]&inBit)&&!powered.has(ni)){powered.add(ni);q.push(ni);}}}
  return{powered,solved:powered.has(5)&&Boolean(masks[5]&2)};
}
function showCircuitHint(){circuitHintUsed=true;const path=[3,4,1,2,5];const i=path.find(n=>rotateMask(solutionMasks[n],rotations[n])!==solutionMasks[n])??3;const tile=ui('circuitGrid').querySelector(`[data-tile="${i}"]`);tile?.classList.add('hinted');track('hint_requested',{round:circuitRound+1,tile:i,rotations:S.circuitRotations});toast('👆 ↻');}
function finishCircuit(){
  if(circuitDone)return;circuitDone=true;ui('circuitGrid').querySelectorAll('button').forEach(b=>b.classList.add('powered'));
  const repeated=S.circuitClicks.length-new Set(S.circuitClicks).size;
  const trial={rotations:S.circuitRotations,repeated,hintUsed:circuitHintUsed,productiveRatio:S.circuitRotations?productiveActions/S.circuitRotations:0};
  circuitTrials.push(trial);track('circuit_solved',{round:circuitRound+1,...trial},'problem',0);beep(1000,.22);
  if(circuitRound===0){circuitRound=1;toast('✓  →  2/2',1000);setTimeout(beginCircuitRound,850);return;}
  const avgProductive=(circuitTrials[0].productiveRatio+circuitTrials[1].productiveRatio)/2;
  const repeatRatio=(circuitTrials[0].repeated+circuitTrials[1].repeated)/Math.max(1,circuitTrials[0].rotations+circuitTrials[1].rotations);
  observation('problem','productiveSearch',avgProductive>=.22,{measured:+avgProductive.toFixed(2)});
  observation('problem','lowRepetition',repeatRatio<=.55,{measured:+repeatRatio.toFixed(2)});
  observation('problem','transfer',!circuitTrials[1].hintUsed&&(circuitTrials[1].productiveRatio>=circuitTrials[0].productiveRatio-.15||circuitTrials[1].rotations<=circuitTrials[0].rotations),{round1:circuitTrials[0],round2:circuitTrials[1]});
  setTimeout(()=>showCutscene('echo',startMemory),850);
}

let sequence=[],input=[],showing=false;
function startMemory(){ S.stage='memory'; hideOverlays(); memoryPuzzle.classList.remove('hidden'); ui('stageName').textContent='ЭХО БИТА'; ui('stageDots').textContent='●●●●○○'; ui('roundMarks').textContent='○ ○'; ui('memoryHint').textContent='👁️'; ui('memoryStart').classList.remove('hidden'); S.memoryRound=0; bindPads(); track('memory_started'); }
function bindPads(){ document.querySelectorAll('[data-pad]').forEach(b=>b.onclick=()=>padInput(+b.dataset.pad)); ui('memoryStart').onclick=beginMemoryRound; }
function beginMemoryRound(){ const sets=S.age==='7-9'?[[0,2,1],[3,1,0,2]]:S.age==='13-14'?[[0,2,1,3,0],[3,1,0,2,3,1]]:[[0,2,1,3],[3,0,2,1,3]]; sequence=sets[S.memoryRound]; input=[]; ui('memoryStart').classList.add('hidden'); showSequence(); }
async function showSequence(){ showing=true; ui('memoryHint').textContent='👁️'; await wait(350); for(const p of sequence){ flashPad(p); await wait(470); } showing=false; ui('memoryHint').textContent='👆'; }
function flashPad(i){ const b=document.querySelector(`[data-pad="${i}"]`); b.classList.add('flash'); beep([420,520,620,720][i]); setTimeout(()=>b.classList.remove('flash'),260); }
function padInput(i){ if(showing||ui('memoryStart').classList.contains('hidden')===false)return; flashPad(i); input.push(i); const at=input.length-1; if(input[at]!==sequence[at]){ S.memoryErrors++; track('pattern_error',{round:S.memoryRound+1,position:at+1},'regulation',0); toast('↻'); input=[]; setTimeout(showSequence,650); return; } if(input.length===sequence.length){ track('pattern_completed',{round:S.memoryRound+1,length:sequence.length,errors:S.memoryErrors},'regulation',0); S.memoryRound++; ui('roundMarks').textContent=S.memoryRound===1?'● ○':'● ●'; if(S.memoryRound===2){observation('regulation','loadControl',S.memoryErrors<=2,{errors:S.memoryErrors});beep(980,.2);setTimeout(()=>showCutscene('gates',startAdapt),650);}else{ui('memoryStart').classList.remove('hidden');ui('memoryHint').textContent='▶';} } }
function wait(ms){return new Promise(r=>setTimeout(r,ms));}

function startAdapt(){ hideOverlays(); S.stage='adapt'; S.adaptGate=0; S.adaptErrors=0; S.rule='blue'; S.switchPending=false; S.switchResults=[]; stageUI(5,'ВОРОТА БУРИ','🔵','✓'); track('adaptation_started',{rule:'blue',switches:2}); }
const adaptDoors=[['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue'],['blue','pink'],['pink','blue']];
function adaptChoice(lane){
  const colors=adaptDoors[S.adaptGate]; const chosen=colors[lane];
  if(S.switchPending){S.switchResults.push(chosen===S.rule);S.switchPending=false;}
  if(chosen===S.rule){
    track('gate_choice',{gate:S.adaptGate+1,color:chosen,correct:true},'regulation',0); S.adaptGate++; beep(740);
    if(S.adaptGate===2||S.adaptGate===4){const old=S.rule;S.rule=S.rule==='blue'?'pink':'blue';S.switchPending=true;stageUI(5,'ПРАВИЛО ИЗМЕНИЛОСЬ',S.rule==='blue'?'🔵':'🩷','✓');track('rule_changed',{from:old,to:S.rule,afterGate:S.adaptGate});toast(old==='blue'?'🔵 ×    🩷 ✓':'🩷 ×    🔵 ✓',1200);}
    if(S.adaptGate===6){observation('regulation','ruleSwitch',S.switchResults.length===2&&S.switchResults.every(Boolean),{firstChoices:S.switchResults,errors:S.adaptErrors});track('adaptation_completed',{errors:S.adaptErrors,switchResults:S.switchResults},'regulation',0);setTimeout(()=>showCutscene('storm',startChase),450);}
  }
  else { S.adaptErrors++; track('old_rule_error',{gate:S.adaptGate+1,color:chosen,activeRule:S.rule},'regulation',0); beep(120); toast('×'); }
}

let glitches=[];
function startChase(){ S.stage='chase'; loadMap(chaseMap); glitches=[{x:6,y:2,d:1},{x:11,y:4,d:-1},{x:5,y:6,d:1}]; S.chaseHits=0; stageUI(6,'СКВОЗЬ ШТОРМ','🐾','↑'); track('chase_started'); }
function chaseStep(){
  glitches.forEach(g=>{const nx=g.x+g.d;if(nx<=1||nx>=14||S.map[g.y][nx]==='#')g.d*=-1;else g.x=nx;});
  const hit=glitches.some(g=>g.x===S.player.x&&g.y===S.player.y);
  if(hit){S.chaseHits++;S.recovering=true;track('glitch_collision',{hits:S.chaseHits},'regulation',0);S.player={x:1,y:7};toast('↻');beep(110);return;}
  if(S.recovering){S.recovering=false;track('resumed_after_failure',{hits:S.chaseHits},'regulation',2);}
  if(S.map[S.player.y][S.player.x]==='E'){observation('regulation','goalReturn',S.chaseHits<=2,{hits:S.chaseHits});track('pet_rescued',{moves:S.moves,hits:S.chaseHits},'regulation',0);showCutscene('rescue',finishGame);}
}

function finishGame(){
  S.stage='result'; missionCard.classList.add('hidden'); result.classList.remove('hidden');
  const plan=evidenceCount('planning'),problem=evidenceCount('problem'),reg=evidenceCount('regulation');
  const planObserved=evidenceObserved('planning'),problemObserved=evidenceObserved('problem'),regObserved=evidenceObserved('regulation'),totalObserved=planObserved+problemObserved+regObserved;
  ui('planScore').textContent=`${planObserved} факта`;ui('problemScore').textContent=`${problemObserved} факта`;ui('regScore').textContent=`${regObserved} факта`;
  ui('resultStory').textContent=`За одну игровую сессию получено ${totalObserved} наблюдений. Показатель исправления плана не оценивается, если первый запуск сразу успешен. Это описание действий в заданиях для возраста ${S.age}, а не оценка личности.`;
  const domains=[['planning','Планирование'],['problem','Решение проблем'],['regulation','Контроль действий']];
  const displayLabel=(domain,key,label)=>{if(domain!=='planning'||!planningSummary)return label;if(key==='completePlan')return `полный план с первого запуска: ${planningSummary.firstRunCount}/${planningSummary.totalTrials}`;if(key==='planEfficiency')return `средняя эффективность длины: ${Math.round(planningSummary.avgEfficiency*100)}%`;return planningSummary.retryOpportunities?`улучшение после обратной связи: ${planningSummary.revisionImproved?'да':'нет'}`:'исправление плана: не потребовалось';};
  ui('reportDetails').innerHTML=domains.map(([domain,title])=>`<article><b>${title}</b>${Object.entries(observationNames[domain]).map(([key,label])=>{const value=S.observations[domain][key];return `<span class="${value===true?'yes':value===false?'no':''}">${value===true?'●':value===false?'○':'—'} ${displayLabel(domain,key,label)}</span>`}).join('')}</article>`).join('');
  track('diagnostic_completed',{observations:S.observations,counts:{plan,problem,reg},observed:{plan:planObserved,problem:problemObserved,reg:regObserved},limits:'screening_not_diagnosis'});beep(1040,.3);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function drawBackdrop(){ const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'#18265d');g.addColorStop(.55,'#111938');g.addColorStop(1,'#090d1d');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);ctx.fillStyle='rgba(255,255,255,.22)';for(let i=0;i<38;i++)ctx.fillRect((i*137)%960,(i*71)%250,2,2); }
function drawGridWorld(){ drawBackdrop(); const tw=60,ox=0,oy=0; for(let y=0;y<S.map.length;y++)for(let x=0;x<S.map[y].length;x++){const c=S.map[y][x],px=x*tw,py=y*tw;if(c==='#'){rounded(px+3,py+3,54,54,12,'#202944','#313b60');ctx.fillStyle='rgba(86,231,255,.08)';ctx.fillRect(px+12,py+12,8,8);}else{ctx.fillStyle='rgba(255,255,255,.018)';ctx.fillRect(px,py,60,60);} if(c==='C')drawToken(px+30,py+30,'⚡','#56e7ff'); if(c==='E')drawToken(px+30,py+30,S.stage==='chase'?'🐾':'◉',S.collected===3||S.stage==='chase'?'#91f28a':'#58617f'); if('mfr'.includes(c))drawToken(px+30,py+30,toolIcon[c],'#fff'); if('ABD'.includes(c)){rounded(px+8,py+6,44,50,12,'#141a31',S.tool===gateNeed[c]?'#91f28a':'#ff4f9a');ctx.font='25px sans-serif';ctx.textAlign='center';ctx.fillText(gateIcon(c),px+30,py+39);} }
  if(S.stage==='chase')glitches.forEach(g=>drawToken(g.x*60+30,g.y*60+30,'✦','#ff4f9a'));
  drawPlayer(S.player.x*60+30,S.player.y*60+30);
  if(S.stage==='tutorial'&&S.moves<4){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=4;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(S.player.x*60+55,S.player.y*60+30);ctx.lineTo(S.player.x*60+145,S.player.y*60+30);ctx.stroke();ctx.setLineDash([]);ctx.font='28px sans-serif';ctx.fillText('→',S.player.x*60+120,S.player.y*60+20);}
}
function drawToken(x,y,char,color){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=18;rounded(x-22,y-22,44,44,14,'#11182d',color);ctx.shadowBlur=0;ctx.font='25px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(char,x,y+1);ctx.restore();}
function drawPlayer(x,y){ctx.save();ctx.shadowColor='#56e7ff';ctx.shadowBlur=18;rounded(x-23,y-25,46,50,16,'#dffaff');ctx.shadowBlur=0;ctx.font='27px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🧒',x,y);ctx.restore();}
function drawAdapt(){ drawBackdrop(); ctx.fillStyle='#0d1126';ctx.fillRect(0,380,960,160);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(0,455,960,6); ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText(S.rule==='blue'?'🔵 ✓   🩷 ×':'🔵 ×   🩷 ✓',480,74); for(let i=S.adaptGate;i<Math.min(S.adaptGate+3,6);i++){const x=250+(i-S.adaptGate)*210;const cols=adaptDoors[i];drawDoor(x,145,cols[0]);drawDoor(x,320,cols[1]);} drawPlayer(120,270);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(145,270);ctx.lineTo(230,190);ctx.moveTo(145,270);ctx.lineTo(230,365);ctx.stroke();ctx.font='34px sans-serif';ctx.fillText('▲',125,155);ctx.fillText('▼',125,390); }
function drawDoor(x,y,color){const c=color==='blue'?'#36d7ff':'#ff4f9a';ctx.save();ctx.shadowColor=c;ctx.shadowBlur=24;rounded(x-45,y-62,90,124,20,'#11162a',c);ctx.fillStyle=c;ctx.globalAlpha=.7;ctx.fillRect(x-5,y-42,10,84);ctx.restore();}
function loop(){ctx.clearRect(0,0,960,540);if(['tutorial','route','chase'].includes(S.stage))drawGridWorld();else if(S.stage==='adapt')drawAdapt();requestAnimationFrame(loop);}loop();

window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','w'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('U'):S.stage==='adapt'?adaptChoice(0):move(0,-1);}if(['arrowdown','s'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('D'):S.stage==='adapt'?adaptChoice(1):move(0,1);}if(['arrowleft','a'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('L'):move(-1,0);}if(['arrowright','d'].includes(k)){e.preventDefault();S.stage==='planner'?addPlanCommand('R'):move(1,0);}});
document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const d=b.dataset.move;if(S.stage==='planner'){addPlanCommand({up:'U',down:'D',left:'L',right:'R'}[d]);return;}if(S.stage==='adapt'){if(d==='up')adaptChoice(0);if(d==='down')adaptChoice(1);return;}({up:()=>move(0,-1),down:()=>move(0,1),left:()=>move(-1,0),right:()=>move(1,0)}[d])();});
