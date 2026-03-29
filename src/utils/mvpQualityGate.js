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
  const preflightIssues = Array.isArray(preflight?.issues) ? preflight.issues : [];
  const playabilityIssues = Array.isArray(playability?.issues) ? playability.issues : [];

  const duplicateClusterIssue = preflightIssues.find((issue) =>
    issue?.code === 'duplicate_evidence_weighting'
    && Array.isArray(issue?.duplicate_clusters)
    && issue.duplicate_clusters.some((cluster) => (cluster?.sources || []).length >= 2)
  );
  const suspectCoverageIssue = playabilityIssues.find((issue) =>
    ['underused_suspects', 'safe_suspect_roles'].includes(issue?.code)
  ) || preflightIssues.find((issue) => issue?.code === 'dead_suspect_slots');
  const finalBundleAxisIssue = preflightIssues.find((issue) => issue?.code === 'final_bundle_redundant_confirmation')
    || playabilityIssues.find((issue) => issue?.code === 'final_bundle_redundant_confirmation');
  const earlyCollapseIssue = playabilityIssues.find((issue) => issue?.code === 'suspect_pool_collapses_by_bundle_three')
    || preflightIssues.find((issue) => ['early_killer_leak', 'one_suspect_gravity'].includes(issue?.code));
  const readyButMajorIssue = playability?.status === 'ready_for_playtest'
    ? preflightIssues.find((issue) => issue?.severity === 'major' || issue?.severity === 'critical')
    : null;

  const causes = [];
  if (duplicateClusterIssue) {
    causes.push(summarizeIssue(duplicateClusterIssue));
  }
  if (suspectCoverageIssue) {
    causes.push(summarizeIssue(suspectCoverageIssue));
  }
  if (finalBundleAxisIssue) {
    causes.push(summarizeIssue(finalBundleAxisIssue));
  }
  if (earlyCollapseIssue) {
    causes.push(summarizeIssue(earlyCollapseIssue));
  }
  if (readyButMajorIssue) {
    causes.push(summarizeIssue(readyButMajorIssue, 'playability_preflight_mismatch'));
  }

  const topCauses = takeTopCauses(causes);
  const status = topCauses.length ? 'needs_repair' : 'ready_for_playtest';

  return {
    pass: topCauses.length === 0,
    status,
    top_causes: topCauses,
    checks: {
      duplicate_fact_clusters_clear: !duplicateClusterIssue,
      all_suspects_materially_compete: !suspectCoverageIssue,
      final_bundle_axis_progression_clear: !finalBundleAxisIssue,
      early_clue_target_viability_clear: !earlyCollapseIssue,
      playability_preflight_alignment_clear: !readyButMajorIssue
    }
  };
}
