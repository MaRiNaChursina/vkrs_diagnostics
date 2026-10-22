const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'dist', 'app.js'), 'utf8');
const match = source.match(/const planLevels=(\[[\s\S]*?\]);\s*const commandDelta/);
assert(match, 'planLevels must be readable from app.js');
const levels = vm.runInNewContext(`(${match[1]})`);

function locate(rows, mark) {
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf(mark);
    if (x >= 0) return { x, y };
  }
  return null;
}

function shortest(level, requireEnergy = true) {
  const start = locate(level.rows, 'S');
  const queue = [{ ...start, energy: false, steps: 0 }];
  const seen = new Set([`${start.x},${start.y},0`]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const state = queue.shift();
    const cell = level.rows[state.y][state.x];
    const energy = state.energy || cell === 'C';
    if (cell === 'G' && (!requireEnergy || energy)) return state.steps;
    for (const [dx, dy] of dirs) {
      const x = state.x + dx, y = state.y + dy;
      const next = level.rows[y]?.[x];
      if (!next || next === '#') continue;
      const nextEnergy = energy || next === 'C';
      const key = `${x},${y},${Number(nextEnergy)}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ x, y, energy: nextEnergy, steps: state.steps + 1 });
      }
    }
  }
  return Infinity;
}

for (const [index, level] of levels.entries()) {
  assert.equal(level.rows.length, 5, `round ${index + 1}: five rows`);
  level.rows.forEach(row => assert.equal(row.length, 5, `round ${index + 1}: five columns`));
  for (const mark of ['S', 'C', 'G']) {
    assert.equal(level.rows.join('').split(mark).length - 1, 1, `round ${index + 1}: exactly one ${mark}`);
  }
  const withEnergy = shortest(level, true);
  assert(Number.isFinite(withEnergy), `round ${index + 1}: goal is reachable through energy`);
  assert.equal(withEnergy, level.optimal, `round ${index + 1}: declared optimum is correct`);
  assert(level.optimal <= 16, `round ${index + 1}: solution fits command limit`);
}

assert(source.includes('if(planRunning||planQueue.length>=16)return'), 'input is blocked while running and capped at 16');
assert(source.includes("ui('programRun').disabled=!planQueue.length||planRunning"), 'empty/running launch is disabled');
assert(source.includes("retryTrials.length?retryTrials.some(t=>t.revisionImproved):null"), 'revision is not inferred without an opportunity');

console.log(`PASS: ${levels.length} planning maps and 3 behavioral contracts`);
