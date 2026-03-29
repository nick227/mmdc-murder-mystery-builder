import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reviewBatch } from '../utils/playabilityBatchReview.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdc2-batch-'));

function writeRun(name, context) {
  const runDir = path.join(tempDir, name);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(context, null, 2));
}

writeRun('run-good', {
  runId: 'run-good',
  cards: [],
  solvability_validation: { pass: true, problems: [] },
  narrative_validation: { pass: true, problems: [] },
  debug: { warning_log: [] }
});

writeRun('run-bad', {
  runId: 'run-bad',
  case_state: {
    killer_name: 'Lady Viola',
    victim_name: 'Lady Viola'
  },
  cards: [],
  solvability_validation: { pass: true, problems: [] },
  narrative_validation: { pass: true, problems: [] },
  debug: { warning_log: [] }
});

const summary = reviewBatch(tempDir);

assert.equal(summary.reviewed_count, 2);
assert(summary.recurring_issues.some((issue) => issue.code === 'killer_equals_victim'));
assert(summary.worst_runs.some((run) => run.run_id === 'run-bad'));

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('playabilityBatchReviewTest passed');
