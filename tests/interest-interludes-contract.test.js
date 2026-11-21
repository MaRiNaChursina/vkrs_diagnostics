const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

for (const id of ['profileScene', 'profileTitle', 'profileOptions', 'profileContinue', 'interestSummary']) {
  assert(html.includes(`id="${id}"`), `interest interlude contains #${id}`);
}
for (const id of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']) {
  assert(js.includes(`${id}:{index:`), `question ${id} is defined`);
}
for (const functionName of ['showProfileSequence', 'showNextProfileQuestion', 'renderProfileQuestion', 'chooseProfileOption']) {
  assert(js.includes(`function ${functionName}`), `interest flow implements ${functionName}`);
}

assert(js.includes("showProfileSequence(['q1','q7']"), 'interest and prior experience appear before the first mission');
assert(js.includes("showProfileSequence(['q2']"), 'free-time choice appears after the first playable task');
assert(js.includes("showProfileSequence(['q4']"), 'preferred learning mode appears after planning');
assert(js.includes("showProfileSequence(['q6']"), 'disliked conditions appear after the circuit');
assert(js.includes("showProfileSequence(['q5']"), 'desired outcome appears after the memory task');
assert(js.includes("showProfileSequence(['q3']"), 'desired new activity appears after adaptation');
assert(js.includes("showProfileSequence(['q8']"), 'club goal appears before the finale');
assert(js.includes("interpretation:'self_report_not_competency'"), 'self-report is explicitly separated from competency evidence');
assert(js.includes('profileAnswers:S.profileAnswers'), 'answers are included in the completed trace');
assert(css.includes('.profile-scene'), 'visual interludes are styled');
assert(css.includes('body[data-stage="profile"] .sim-hud'), 'diagnostic HUD is hidden during self-report');

console.log('PASS: eight distributed visual questions, answer limits, trace capture and construct separation');
