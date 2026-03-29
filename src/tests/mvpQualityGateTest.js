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
        severity: 'major',
        code: 'underused_suspects',
        message: 'One suspect never materially competes.'
      },
      {
        severity: 'major',
        code: 'suspect_pool_collapses_by_bundle_three',
        message: 'The first three clue targets do not keep enough suspects materially active.'
      },
      {
        severity: 'major',
        code: 'final_bundle_redundant_confirmation',
        message: 'The final confirmation bundle mostly repeats the same suspect-direction evidence as the prior bundle.'
      }
    ]
  },
  structural_preflight: {
    status: 'needs_repair',
    issues: [
      {
        severity: 'major',
        code: 'duplicate_evidence_weighting',
        message: 'Canonical evidence repeats across ledger signatures.',
        duplicate_clusters: [
          {
            signature: 'lord_pembroke|scarf|blood|rose_arbor',
            sources: [{ source_agent: 'clue_agent' }, { source_agent: 'puzzle_agent' }]
          }
        ]
      }
    ]
  }
});

assert.equal(needsRepair.status, 'needs_repair');
assert.equal(needsRepair.pass, false);
assert.equal(needsRepair.checks.duplicate_fact_clusters_clear, false);
assert.equal(needsRepair.checks.all_suspects_materially_compete, false);
assert.equal(needsRepair.checks.final_bundle_axis_progression_clear, false);
assert.equal(needsRepair.checks.early_clue_target_viability_clear, false);
assert.equal(needsRepair.checks.playability_preflight_alignment_clear, false);

console.log('mvpQualityGateTest passed');
