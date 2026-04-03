import { buildSuspectCoverageReport } from '../utils/suspectCoverage.js';

/**
 * Builds suspect_coverage diagnostics (motive/access heuristics, underused flags).
 * Does not mutate cards or fail the pipeline — use the report in QA, playability, and runs.
 */
export async function suspectCoverageAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  const report = buildSuspectCoverageReport(context);
  context.suspect_coverage = report;

  for (const issue of report.issues) {
    context.debug.warning_log.push({
      stage: 'suspect_coverage_agent',
      reason: issue.code,
      severity: issue.severity,
      message: issue.message
    });
  }

  return context;
}
