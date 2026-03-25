import fs from 'fs';
import path from 'path';
import { getCostSummary } from '../llm/costLedger.js';

export function writeOutput(runDir, context) {
  fs.mkdirSync(runDir, { recursive: true });

  const runId = context?.runId ?? null;
  const costAccounting = getCostSummary(runId);

  const enrichedContext = {
    ...context,
    costAccounting
  };

  fs.writeFileSync(
    path.join(runDir, 'result.json'),
    JSON.stringify(enrichedContext, null, 2)
  );
}
