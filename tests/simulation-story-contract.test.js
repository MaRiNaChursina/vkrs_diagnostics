const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

for (const id of ['simHud', 'simTime', 'simEnergy', 'simBondBar', 'simProjectBar', 'lifeSim', 'lifeChoices', 'lifeOutcome', 'lifeContinue']) {
  assert(html.includes(`id="${id}"`), `story simulation contains #${id}`);
}

assert(html.includes('data-creator-tab="trait"'), 'character creator contains a declared trait choice');
for (const episode of ['morning', 'workshop', 'storm', 'search']) {
  assert(js.includes(`${episode}:{location:`), `simulation contains the ${episode} episode`);
}
for (const functionName of ['showLifeEpisode', 'chooseLifeOption', 'changeSimulation', 'updateSimHud']) {
  assert(js.includes(`function ${functionName}`), `simulation implements ${functionName}`);
}
assert(js.includes("interpretation:'declared_preference_not_competency'"), 'story choices are explicitly separated from competency evidence');
assert(js.includes("version:'story-simulation-v3-interest-interludes'"), 'the new trace is versioned');
assert(css.includes('.life-sim'), 'the life-simulation world is styled');
assert(css.includes('.sim-hud'), 'the persistent simulation state is styled');
assert(css.includes('[data-location="workshop"]'), 'locations have distinct visual states');
assert(css.includes('[data-location="storm"]'), 'storm location has a distinct visual state');

console.log('PASS: one-day story simulation, persistent state, consequential choices and trace separation');
