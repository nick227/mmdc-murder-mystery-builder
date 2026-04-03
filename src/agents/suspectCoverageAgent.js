import { buildSuspectCoverageReport } from '../utils/suspectCoverage.js';

/**
 * Analysis-only: runs heuristics from `buildSuspectCoverageReport`, attaches `context.suspect_coverage`,
 * mirrors issues into `debug.warning_log`. No LLM calls, no card mutation, no throws.
 */
export function suspectCoverageAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  const report = buildSuspectCoverageReport(context);
  context.suspect_coverage = report;

  context.debug.warning_log.push(
    ...report.issues.map((issue) => ({
      stage: 'suspect_coverage_agent',
      reason: issue.code,
      severity: issue.severity,
      message: issue.message
    }))
  );

  return context;
}
