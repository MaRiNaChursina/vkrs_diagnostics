const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

for (const id of ['taskHelp','taskHelpGlyph','taskHelpDemo','taskHelpText','taskHelpTip','taskHelpStart','taskHelpOpen','rotateNotice','rotateDismiss']) {
  assert(html.includes(`id="${id}"`), `mobile UI contains #${id}`);
}
assert(html.includes('styles.css?v=responsive-20261026'), 'responsive stylesheet cache is versioned');
assert(html.includes('app.js?v=responsive-20261026'), 'responsive script cache is versioned');

for (const task of ['tutorial','planner','circuit','memory','adapt','chase']) {
  assert(js.includes(`${task}:{glyph:`), `short instruction exists for ${task}`);
  assert(js.includes(`announceTask('${task}')`), `instruction is shown for ${task}`);
}

assert(css.includes('@media(max-width:760px)'), 'portrait/mobile layout exists');
assert(css.includes('@media(max-width:760px) and (orientation:portrait)'), 'portrait rotation guidance exists');
assert(css.includes('@media(max-height:520px) and (orientation:landscape)'), 'phone landscape layout exists');
assert(css.includes('aspect-ratio:auto'), 'portrait frame does not expand beyond the viewport');
assert(css.includes('min-height:44px'), 'mobile touch targets include a 44px minimum');
assert(js.includes('if(S.taskPaused||'), 'game input pauses while the instruction is visible');
assert(js.includes('let currentTask=null'), 'the active task can be explained again');
assert(js.includes('announceTask(currentTask,true)'), 'help button repeats the current instruction');
assert(js.includes('warmStoryAssets()'), 'story images are warmed before later cutscenes');
assert(css.includes('body.game-active:not(.portrait-ok) .rotate-notice{background:rgba(5,8,20,.74)'), 'portrait prompt keeps the scene visible');
assert(css.includes('object-position:center bottom'), 'mobile actors remain completely inside the scene');
assert(css.includes('.shell{width:100vw;min-height:100svh;margin:0;padding:0}'), 'phone landscape uses the full screen width');
assert(css.includes('.command-pad button,.program-actions button{height:44px;min-height:44px}'), 'landscape puzzle controls remain tappable');
for (const visual of ['demo-runner','demo-key','demo-pipe','demo-pad','demo-rule','demo-glitch']) {
  assert(js.includes(visual) && css.includes(visual), `visual demonstration exists: ${visual}`);
}

console.log('PASS: mobile layouts, touch controls and six replayable visual task instructions');
