import assert from 'node:assert/strict';
import { buildMvpQualityGate } from '../utils/mvpQualityGate.js';

const ready = buildMvpQualityGate({
  playability_report: {
    status: 'ready_for_playtest',
    issues: []
  },
  structural_preflight: {
    status: 'ready',
    issues: []
  }
});

assert.equal(ready.status, 'ready_for_playtest');
assert.equal(ready.pass, true);
assert.equal(ready.top_causes.length, 0);

const needsRepair = buildMvpQualityGate({
  playability_report: {
    status: 'ready_for_playtest',
    issues: [
      {
        severity: 'critical',
        code: 'solvability_failed',
        message: 'Solvability validation did not pass.'
      }
    ]
  },
  structural_preflight: {
    status: 'needs_repair',
    issues: [
      {
        severity: 'critical',
        code: 'missing_victim_identity',
        message: 'Case state has no victim_name.'
      }
    ]
  }
});

assert.equal(needsRepair.status, 'needs_repair');
assert.equal(needsRepair.pass, false);
assert.equal(needsRepair.checks.structural_clear, false);
assert.equal(needsRepair.checks.playability_clear, true);
assert.equal(needsRepair.checks.no_critical_issues, false);

console.log('mvpQualityGateTest passed');
