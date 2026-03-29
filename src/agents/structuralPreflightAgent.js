import { buildStructuralPreflight } from '../utils/structuralPreflight.js';

export async function structuralPreflightAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  const report = buildStructuralPreflight(context);
  context.structural_preflight = report;

  for (const issue of report.issues) {
    context.debug.warning_log.push({
      stage: 'structural_preflight_agent',
      reason: issue.code,
      severity: issue.severity,
      message: issue.message
    });
  }

  return context;
}
