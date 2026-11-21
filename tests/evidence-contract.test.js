const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

assert(js.includes("planning:{completePlan:'полный план до запуска',planEfficiency:'эффективность маршрута'}"), 'planning uses two independent drone indicators');
assert(js.includes("problem:{productiveSearch:'продуктивный поиск в цепи',lowRepetition:'без возврата к прежнему состоянию',transfer:'перенос способа во второй цепи',adaptiveRevision:'изменение программы дрона после ошибки'}"), 'problem solving combines chain and drone evidence');
assert(html.includes('id="evPlan">0/2'), 'planning denominator is transparent');
assert(html.includes('id="evProblem">0/4'), 'problem-solving denominator is transparent');
assert(html.includes('id="evReg">0/3'), 'self-regulation denominator is transparent');
assert(js.includes("ui('planScore').textContent=`Измерено ${planObserved} из ${planTotal}`"), 'the result clearly reports coverage instead of a competency score');
assert(!js.includes(' факта`'), 'the ambiguous “facts” label is removed');
assert(html.includes('<span>Саморегуляция</span>'), 'the parent-facing domain is named self-regulation');
assert(js.includes("['regulation','Саморегуляция: контроль действий']"), 'the detailed report keeps the narrower behavioral meaning');
assert(!`${html}${js}`.includes('MVP'), 'internal prototype wording is not exposed in the game or report');
assert(js.includes("criterionStatus:'pilot_predefined'"), 'predefined pilot criteria remain explicit in research logs');
assert(js.includes("goalReturnObservation(S.chaseHits,S.resumedAfterFailure"), 'goal return is scored through an explicit opportunity-aware rule');
assert(js.includes("reason:hadRecoveryOpportunity?'measured':'no_collision'"), 'absence of a recovery opportunity is logged as missing evidence');

for (const obsolete of ['const routeMap=', 'function startRoute(', 'function routeCell(', 'function tryGate(', "['tutorial','route','chase']"]) {
  assert(!js.includes(obsolete), `unused route prototype is removed: ${obsolete}`);
}

console.log('PASS: cross-task evidence, dynamic denominators, pilot criteria and obsolete route removal');
