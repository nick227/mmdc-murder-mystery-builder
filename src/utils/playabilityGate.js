const DEFAULT_BLOCKING_CODES = new Set([
  'killer_equals_victim',
  'timeline_murder_time_conflict',
  'solvability_failed',
  'narrative_validation_failed'
]);

function parseConfiguredCodes() {
  const raw = String(process.env.PLAYABILITY_GATE_CODES || '').trim();
  if (!raw) {
    return new Set(DEFAULT_BLOCKING_CODES);
  }

  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function getPlayabilityGateDecision(report, options = {}) {
  const {
    allowPartial = false,
    minimumScore = Number(process.env.PLAYABILITY_GATE_MIN_SCORE || 8.5)
  } = options;

  const safeReport = report && typeof report === 'object' ? report : null;
  if (!safeReport) {
    return {
      blocked: false,
      reasons: []
    };
  }

  if (safeReport.partial && !allowPartial) {
    return {
      blocked: false,
      reasons: []
    };
  }

  const blockingCodes = parseConfiguredCodes();
  const reasons = [];
  const issues = Array.isArray(safeReport.issues) ? safeReport.issues : [];

  for (const issue of issues) {
    if (issue?.severity === 'critical') {
      reasons.push(`[critical] ${issue.code}: ${issue.message}`);
      continue;
    }
    if (blockingCodes.has(issue?.code)) {
      reasons.push(`[code] ${issue.code}: ${issue.message}`);
    }
  }

  if (Number.isFinite(minimumScore) && safeReport.score_10 < minimumScore && safeReport.status === 'blocked') {
    reasons.push(`[score] playability score ${safeReport.score_10}/10 is below gate ${minimumScore}/10`);
  }

  return {
    blocked: reasons.length > 0,
    reasons
  };
}
