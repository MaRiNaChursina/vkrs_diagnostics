const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

for (const id of ['roleGate', 'parentPortal', 'childCode', 'roleSwitch']) {
  assert(!html.includes(`id="${id}"`), `temporary cabinet UI is removed: #${id}`);
}
assert(html.includes('id="memoryFeedback"'), 'memory error feedback is present');
assert(html.includes('id="memoryFeedbackText"'), 'memory feedback has a visible countdown');
assert(js.includes('function setMemoryInputEnabled(enabled)'), 'memory pads have explicit input locking');
assert(js.includes('showing=true;setMemoryInputEnabled(false)'), 'input locks immediately after a memory error');
assert(js.includes("ui('memoryFeedback').classList.remove('hidden')"), 'memory error opens a visible message');
assert(js.includes('await showSequence(token)'), 'the full sequence is replayed before input resumes');
assert(js.includes('MEMORY_ERROR_PAUSE_SECONDS=3'), 'memory error pauses for three seconds');
assert(js.includes('token!==memoryPlaybackToken'), 'stale memory replays are cancelled instead of stacking');
assert(css.includes('.pads.input-locked button'), 'locked memory pads have a visible disabled state');

assert(js.includes('parents.set(ni,i)'), 'circuit traversal remembers the actual source-to-target route');
assert(js.includes('path.unshift(current)'), 'circuit route is reconstructed in order');
assert(js.includes("flowOrder>=0?'solved-path':''"), 'only route tiles receive the solved-path state');
assert(!js.includes("forEach(b=>b.classList.add('powered'))"), 'completion no longer lights every circuit tile');
assert(css.includes('.circuit-grid.solved button:not(.solved-path)'), 'non-route tiles are dimmed after completion');
assert(css.includes('@keyframes pathSpark'), 'the completed route animates from the spark to the paws');
assert(js.includes('CIRCUIT_SUCCESS_HOLD_MS=3000'), 'the completed route stays visible for three seconds');

const repeatMatch = js.match(/function isNonproductiveStateRepeat\(history,signature,connected\)\{[^\n]+\}/);
assert(repeatMatch, 'whole-board repeat detection is independently testable');
const isNonproductiveStateRepeat = vm.runInNewContext(`(${repeatMatch[0]})`);
const history = new Map();
assert.equal(isNonproductiveStateRepeat(history, '000000000', 1), false, 'a new state is not a loop');
assert.equal(isNonproductiveStateRepeat(history, '000000000', 1), true, 'returning to the same state without progress is a loop');
assert.equal(isNonproductiveStateRepeat(history, '000000000', 2), false, 'the same state with greater connected progress is not treated as a loop');
assert(js.includes("formula:'revisited_whole_board_states_without_progress/all_rotations'"), 'the loop formula is explicit in logs');
assert(!js.includes('new Set(S.circuitClicks)'), 'repeated tile clicks are no longer treated as loops by themselves');

const goalReturnMatch = js.match(/function goalReturnObservation\(hits,resumed,limit\)\{[^\n]+\}/);
assert(goalReturnMatch, 'recovery scoring is independently testable');
const goalReturnObservation = vm.runInNewContext(`(${goalReturnMatch[0]})`);
assert.equal(goalReturnObservation(0, 0, 3), null, 'no collision means no opportunity to observe recovery');
assert.equal(goalReturnObservation(1, 1, 3), true, 'resuming after the collision is observed');
assert.equal(goalReturnObservation(2, 1, 3), false, 'not every collision was followed by a recorded resumption');
assert.equal(goalReturnObservation(4, 4, 3), false, 'exceeding the working collision limit does not pass the candidate rule');

console.log('PASS: single-game entry, source-to-target circuit path, state-loop detection and locked memory replay');
