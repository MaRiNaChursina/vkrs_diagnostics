const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

for (const id of ['taskHelp','taskHelpGlyph','taskHelpText','taskHelpStart','rotateNotice','rotateDismiss']) {
  assert(html.includes(`id="${id}"`), `mobile UI contains #${id}`);
}
assert(html.includes('styles.css?v=mobile-20261026'), 'mobile stylesheet cache is versioned');
assert(html.includes('app.js?v=mobile-20261026'), 'mobile script cache is versioned');

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

console.log('PASS: mobile layouts, touch controls and six short task instructions');
