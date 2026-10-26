const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

for (const id of ['cutscene', 'sceneStage', 'sceneChapter', 'sceneTitle', 'sceneText', 'sceneGlyphs', 'sceneDialogue', 'sceneAction', 'sceneContinue', 'sceneSkip']) {
  assert(html.includes(`id="${id}"`), `story UI contains #${id}`);
}

for (const scene of ['prologue', 'beacon', 'reactor', 'echo', 'gates', 'storm', 'rescue']) {
  assert(js.includes(`${scene}:`), `story data contains ${scene}`);
  assert(js.includes(`'${scene}'`), `story flow invokes ${scene}`);
}

assert(js.includes("track('cutscene_started'"), 'cutscenes are represented in the event log');
assert(js.includes("track('cutscene_action'"), 'player actions inside cutscenes are represented in the event log');
assert(js.includes("track('cutscene_completed'"), 'cutscene completion is represented in the event log');
assert(js.includes("},650);track('cutscene_started'"), 'actors and scene action appear without a long blank pause');
assert(css.includes('.cutscene'), 'cutscene has visual styling');
for (const asset of ['nova-world-panorama.png', 'nova-character.png', 'bit-character.png']) {
  assert(fs.existsSync(path.join(root, 'assets', asset)), `story asset exists: ${asset}`);
}
for (const asset of ['scene-forest-v2.png','scene-ruins-v2.png','scene-reactor-v2.png','scene-crystals-v2.png','scene-gates-v2.png','scene-storm-v2.png']) {
  assert(fs.existsSync(path.join(root, 'assets', asset)), `V2 scene asset exists: ${asset}`);
  assert(js.includes(asset) || css.includes(asset), `V2 scene asset is used: ${asset}`);
}
for (const asset of ['nova-running-v2.png','nova-powering-v2.png','nova-listening-v2.png','nova-reunion-v2.png']) {
  assert(fs.existsSync(path.join(root, 'assets', asset)), `original character asset is retained: ${asset}`);
}
for (const asset of ['scene-forest-v2.webp','scene-ruins-v2.webp','scene-reactor-v2.webp','scene-crystals-v2.webp','scene-gates-v2.webp','scene-storm-v2.webp','nova-character.webp','bit-character.webp','nova-running-v2.webp','nova-powering-v2.webp','nova-listening-v2.webp','nova-reunion-v2.webp']) {
  const file=path.join(root,'assets',asset);
  assert(fs.existsSync(file) && fs.statSync(file).size>1000, `lightweight scene asset exists: ${asset}`);
  assert(js.includes(asset) || css.includes(asset) || html.includes(asset), `lightweight scene asset is used: ${asset}`);
}
const pngBackgroundBytes=['scene-forest-v2.png','scene-ruins-v2.png','scene-reactor-v2.png','scene-crystals-v2.png','scene-gates-v2.png','scene-storm-v2.png'].reduce((sum,name)=>sum+fs.statSync(path.join(root,'assets',name)).size,0);
const webpBackgroundBytes=['scene-forest-v2.webp','scene-ruins-v2.webp','scene-reactor-v2.webp','scene-crystals-v2.webp','scene-gates-v2.webp','scene-storm-v2.webp'].reduce((sum,name)=>sum+fs.statSync(path.join(root,'assets',name)).size,0);
assert(webpBackgroundBytes<pngBackgroundBytes*.2, 'mobile scene backgrounds are less than 20% of the PNG fallback size');
for (const pose of ['novaSprint','novaCharge','novaListen','novaReach']) assert(css.includes(`@keyframes ${pose}`), `character acting contains ${pose}`);
for (const contract of ['world-panorama', 'shot-0', 'shot-1', 'shot-2', '.cutscene.resolved', 'signal-spark', 'scene-drone', 'tower-flare', 'crystal-echo', 'story-gate', 'storm-shield', 'rescue-wave']) assert(css.includes(contract) || js.includes(contract), `interactive movie contains ${contract}`);

console.log('PASS: 7 interactive movie scenes, world assets, controls and logging contracts');
