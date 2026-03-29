import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reviewBatch } from '../utils/playabilityBatchReview.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdc2-learning-'));

function writeRun(name, context) {
  const runDir = path.join(tempDir, name);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(context, null, 2));
}

writeRun('legacy', {
  runId: 'legacy',
  cards: [],
  debug: { warning_log: [] }
});

writeRun('current', {
  runId: 'current',
  cards: [],
  playability_history: [{ step_name: 'final_editor_agent', score_10: 9, status: 'needs_repair', issue_count: 1 }],
  debug: { warning_log: [] }
});

const allSummary = reviewBatch(tempDir);
assert.equal(allSummary.reviewed_count, 2);
assert(Array.isArray(allSummary.learning_summary));

const currentOnlySummary = reviewBatch(tempDir, { currentOnly: true });
assert.equal(currentOnlySummary.reviewed_count, 1);
assert.equal(currentOnlySummary.reviews[0].run_id, 'current');

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('playabilityLearningTest passed');
