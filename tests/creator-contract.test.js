const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

assert(html.includes('<body data-stage="creator">'), 'the character creator is the first stage');
assert(html.includes('id="creator"'), 'the creator overlay exists');
assert(!html.includes('id="questionnaire"'), 'the questionnaire is absent from the start flow');
for (const tab of ['identity','face','hair','outfit','extra','trait']) {
  assert(html.includes(`data-creator-tab="${tab}"`), `creator contains ${tab} choices`);
}
for (const id of ['avatarPreview','randomizeHero','turnLeft','turnRight','createHero','editHero','introAvatar','heroSummary']) {
  assert(html.includes(`id="${id}"`), `creator UI contains #${id}`);
}
assert(js.includes("track('avatar_created'"), 'the chosen avatar is attached to the game trace');
assert(js.includes("avatarMarkup('story-avatar')"), 'the custom hero is reused in cutscenes');
assert(js.includes('function drawPlayer(x,y)'), 'the custom hero is drawn in playable tasks');
assert(!js.includes('SURVEY_QUESTIONS'), 'survey logic is removed from the game flow');
assert(css.includes('.sim-avatar'), 'the reusable avatar renderer is styled');
assert(css.includes('@media(max-height:520px) and (orientation:landscape)'), 'short landscape creator layout is supported');

console.log('PASS: character creator, persistent hero and responsive simulation flow');
