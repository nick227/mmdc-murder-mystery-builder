import assert from 'node:assert/strict';
import { getPlayabilityGateDecision } from '../utils/playabilityGate.js';

const blocked = getPlayabilityGateDecision({
  score_10: 3.5,
  status: 'blocked',
  partial: false,
  issues: [
    {
      severity: 'critical',
      code: 'killer_equals_victim',
      message: 'The derived victim matches the killer.'
    }
  ]
});

assert.equal(blocked.blocked, true);
assert(blocked.reasons.some((reason) => reason.includes('killer_equals_victim')));

const partialIgnored = getPlayabilityGateDecision({
  score_10: 4,
  status: 'blocked',
  partial: true,
  issues: [
    {
      severity: 'critical',
      code: 'killer_equals_victim',
      message: 'The derived victim matches the killer.'
    }
  ]
});

assert.equal(partialIgnored.blocked, false);

console.log('playabilityGateTest passed');
