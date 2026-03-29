import fs from 'fs';
import path from 'path';
import { getCostSummary } from '../llm/costLedger.js';

function sanitizeContextForOutput(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return context;
  }

  const sanitized = { ...context };
  delete sanitized.story_blurb;
  delete sanitized.player_count;
  delete sanitized.story_style;
  delete sanitized.solutions;
  delete sanitized.murder_truth;
  delete sanitized.fortune_truth;
  delete sanitized.solution;
  return sanitized;
}

export function writeOutput(runDir, context) {
  fs.mkdirSync(runDir, { recursive: true });

  const runId = context?.runId ?? null;
  const costAccounting = getCostSummary(runId);

  const enrichedContext = {
    ...sanitizeContextForOutput(context),
    costAccounting
  };

  fs.writeFileSync(
    path.join(runDir, 'result.json'),
    JSON.stringify(enrichedContext, null, 2)
  );
}
