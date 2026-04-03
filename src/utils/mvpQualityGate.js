function summarizeIssue(issue, fallbackCode) {
  const code = String(issue?.code || fallbackCode || 'unknown_issue').trim();
  return {
    code,
    message: String(issue?.message || code).trim(),
    severity: String(issue?.severity || 'major').trim()
  };
}

function takeTopCauses(causes, limit = 5) {
  const seen = new Set();
  const result = [];
  for (const cause of causes) {
    const key = `${cause.code}|${cause.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cause);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function buildMvpQualityGate(context) {
  const playability = context?.playability_report || null;
  const preflight = context?.structural_preflight || null;

  const causes = [];
  const playabilityIssues = Array.isArray(playability?.issues) ? playability.issues : [];
  const preflightIssues = Array.isArray(preflight?.issues) ? preflight.issues : [];
  for (const issue of [...playabilityIssues, ...preflightIssues]) {
    if (issue?.severity === 'critical') {
      causes.push(summarizeIssue(issue));
    }
  }

  const topCauses = takeTopCauses(causes);
  const status = topCauses.length ? 'needs_repair' : 'ready_for_playtest';

  return {
    pass: topCauses.length === 0,
    status,
    top_causes: topCauses,
    checks: {
      structural_clear: preflight?.status === 'ready',
      playability_clear: playability?.status === 'ready_for_playtest',
      no_critical_issues: topCauses.length === 0
    }
  };
}
