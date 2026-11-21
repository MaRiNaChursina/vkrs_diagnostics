const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'dist', 'app.js'), 'utf8');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'dist', 'index.html'), 'utf8');
const match = source.match(/const AGE_PROFILES=(\{[\s\S]*?\});\s*const ageProfile/);
assert(match, 'AGE_PROFILES must be readable from app.js');
const profiles = vm.runInNewContext(`(${match[1]})`);

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

for (const [age, profile] of Object.entries(profiles)) {
  assert.equal(profile.planLevels.length, 2, `${age}: two planning rounds`);
  for (const [index, level] of profile.planLevels.entries()) {
    assert.equal(level.rows.length, 5, `${age}, round ${index + 1}: five rows`);
    level.rows.forEach(row => assert.equal(row.length, 5, `${age}, round ${index + 1}: five columns`));
    for (const mark of ['S', 'C', 'G']) {
      assert.equal(level.rows.join('').split(mark).length - 1, 1, `${age}, round ${index + 1}: exactly one ${mark}`);
    }
    const withEnergy = shortest(level, true);
    assert(Number.isFinite(withEnergy), `${age}, round ${index + 1}: goal is reachable through energy`);
    assert.equal(withEnergy, level.optimal, `${age}, round ${index + 1}: declared optimum is correct`);
    assert(level.optimal <= profile.commandLimit, `${age}, round ${index + 1}: solution fits age command limit`);
  }
}

assert(source.includes('if(S.taskPaused||planRunning||planQueue.length>=ageProfile().commandLimit)return'), 'input is blocked while paused/running and capped by age profile');
assert(source.includes("ui('programRun').disabled=!planQueue.length||planRunning"), 'empty/running launch is disabled');
assert(source.includes("observation('problem','adaptiveRevision',retryTrials.length?retryTrials.some(t=>t.revisionImproved):null"), 'drone revision is cross-task evidence for problem solving and is not inferred without an opportunity');
const efficiencyMatch = source.match(/function summarizeRouteEfficiency\(trials\)\{[^\n]+\}/);
assert(efficiencyMatch, 'route efficiency summary is independently testable');
const summarizeRouteEfficiency = vm.runInNewContext(`(${efficiencyMatch[0]})`);
const weighted = summarizeRouteEfficiency([{ optimal: 7, executedLength: 7 }, { optimal: 8, executedLength: 10 }]);
assert.equal(weighted.totalOptimal, 15);
assert.equal(weighted.totalExecuted, 17);
assert.equal(Math.round(weighted.routeEfficiency * 100), 88, '7/7 and 8/10 combine to 15/17 = 88%, not 90%');
assert.equal(summarizeRouteEfficiency([{ optimal: 6, executedLength: 4 }]).routeEfficiency, 1, 'efficiency is capped at 100%');
assert(source.includes('executedLength=executed'), 'route length stops when the goal is actually reached');
assert(source.includes("formula:'minimum_path/child_path'"), 'the logged formula is explicit and auditable');
assert(source.includes('minimumPath:totalOptimal,childPath:totalExecuted'), 'logs use parent-readable route terms');
assert(source.includes('эффективность в 2 маршрутах дрона'), 'the parent report names where route efficiency is measured');
assert(source.includes('минимальный путь ${planningSummary.totalOptimal}, путь ребёнка ${planningSummary.totalExecuted}'), 'the parent report explains both values');
assert(html.includes('эффективность двух маршрутов дрона'), 'the evidence map names the two drone routes');
assert(!source.includes('эталон'), 'the ambiguous word “эталон” is absent from the report');
assert(!source.includes('planTrials.reduce((s,t)=>s+t.efficiency,0)/planTrials.length'), 'percentages are not averaged across unequal routes');

console.log(`PASS: ${Object.keys(profiles).length} age profiles, 6 planning maps and 3 behavioral contracts`);
