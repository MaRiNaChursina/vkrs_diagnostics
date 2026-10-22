const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');
const match = source.match(/const AGE_PROFILES=(\{[\s\S]*?\});\s*const ageProfile/);
assert(match, 'AGE_PROFILES must be readable from app.js');
const profiles = vm.runInNewContext(`(${match[1]})`);
assert.deepEqual(Object.keys(profiles), ['7-9', '10-12', '13-14']);
const solutionMasks = [6,6,12,10,9,3,3,10,9];
const rotateMask = (mask, times) => { let value = mask; for (let i = 0; i < times; i++) value = ((value << 1) & 15) | ((value >> 3) & 1); return value; };
function circuitSolved(rotations) {
  const masks = solutionMasks.map((mask, index) => rotateMask(mask, rotations[index]));
  if (!(masks[3] & 8)) return false;
  const powered = new Set([3]), queue = [3], dirs = [[-1,0,8,2],[1,0,2,8],[0,-1,1,4],[0,1,4,1]];
  while (queue.length) {
    const index = queue.shift(), x = index % 3, y = Math.floor(index / 3);
    for (const [dx,dy,outBit,inBit] of dirs) {
      const nx=x+dx, ny=y+dy;
      if (nx<0 || nx>2 || ny<0 || ny>2 || !(masks[index]&outBit)) continue;
      const next=ny*3+nx;
      if ((masks[next]&inBit) && !powered.has(next)) { powered.add(next); queue.push(next); }
    }
  }
  return powered.has(5) && Boolean(masks[5] & 2);
}

function reachable(rows, requiredSignals = 0) {
  let start;
  rows.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === 'P') start = { x, y }; }));
  const queue = [{ ...start, mask: 0 }], seen = new Set([`${start.x},${start.y},0`]);
  const signals = new Map(); let signalIndex = 0;
  rows.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === 'C') signals.set(`${x},${y}`, signalIndex++); }));
  while (queue.length) {
    const state = queue.shift();
    let mask = state.mask;
    const bit = signals.get(`${state.x},${state.y}`);
    if (bit !== undefined) mask |= 1 << bit;
    if (rows[state.y][state.x] === 'E' && mask === (1 << requiredSignals) - 1) return true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = state.x + dx, y = state.y + dy, cell = rows[y]?.[x];
      if (!cell || cell === '#') continue;
      const key = `${x},${y},${mask}`;
      if (!seen.has(key)) { seen.add(key); queue.push({ x, y, mask }); }
    }
  }
  return false;
}

for (const [age, profile] of Object.entries(profiles)) {
  assert.equal(profile.tutorialMap.join('').split('C').length - 1, profile.tutorialTarget, `${age}: signal target matches map`);
  assert(reachable(profile.tutorialMap, profile.tutorialTarget), `${age}: tutorial can be completed`);
  assert(reachable(profile.chaseMap, 0), `${age}: chase exit can be reached`);
  assert.equal(profile.circuitStarts.length, 2, `${age}: two circuit rounds`);
  profile.circuitStarts.forEach((start, round) => {
    assert.equal(start.length, 9, `${age}: circuit contains nine tiles`);
    assert(!circuitSolved(start), `${age}, circuit round ${round + 1}: starts unsolved`);
  });
  assert.equal(profile.memorySets.length, 2, `${age}: two memory rounds`);
  assert.equal(profile.adaptSwitches.length + 1, Number(age === '7-9' ? 2 : age === '10-12' ? 3 : 4), `${age}: switch load increases by age`);
}

assert(profiles['7-9'].tutorialTarget < profiles['10-12'].tutorialTarget);
assert(profiles['10-12'].tutorialTarget < profiles['13-14'].tutorialTarget);
assert(profiles['7-9'].memorySets[1].length < profiles['10-12'].memorySets[1].length);
assert(profiles['10-12'].memorySets[1].length < profiles['13-14'].memorySets[1].length);
assert(profiles['7-9'].adaptDoors.length < profiles['10-12'].adaptDoors.length);
assert(profiles['10-12'].adaptDoors.length < profiles['13-14'].adaptDoors.length);

console.log('PASS: age-specific tutorial, planning, circuit, memory, switching and chase contracts');
