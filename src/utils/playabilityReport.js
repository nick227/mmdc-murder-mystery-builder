import { getSolution } from './context.js';

function normalizeName(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  return raw.split(',')[0].trim().toLowerCase();
}

function collectTexts(context) {
  const texts = [];
  if (typeof context?.storyBlurb === 'string') {
    texts.push(context.storyBlurb);
  }
  for (const card of Array.isArray(context?.cards) ? context.cards : []) {
    texts.push(String(card?.card_title || ''));
    texts.push(String(card?.card_contents || ''));
  }
  return texts;
}

function extractTimes(text) {
  return [...String(text || '').matchAll(/\b\d{1,2}:\d{2}\s?(?:AM|PM)\b/gi)].map((match) =>
    match[0].toUpperCase().replace(/\s+/g, ' ')
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function addIssue(issues, severity, code, points, message, details = {}) {
  issues.push({
    severity,
    code,
    points,
    message,
    ...details
  });
}

function isLikelyRosterNoisePhrase(phrase) {
  const normalized = String(phrase || '').trim();
  if (!normalized) {
    return true;
  }

  const firstWord = normalized.split(/\s+/)[0];
  const noisyStarts = new Set([
    'Both',
    'Directly',
    'Either',
    'Encourage',
    'However',
    'Instead',
    'Mention',
    'Meanwhile',
    'Neither',
    'Only',
    'Require',
    'When'
  ]);
  if (noisyStarts.has(firstWord)) {
    return true;
  }

  const noisyTokens = new Set([
    'Comparison',
    'Confirmation',
    'Constraints',
    'Correlation',
    'Link',
    'Movement',
    'Ownership',
    'Physical',
    'Verification'
  ]);

  return normalized.split(/\s+/).some((token) => noisyTokens.has(token));
}

function collectTimelineIssues(context, issues) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const murderTimes = unique(cards.flatMap((card) => {
    const text = String(card?.card_contents || '');
    if (!/murder/i.test(text) || !/(reported|discovered)/i.test(text)) {
      return [];
    }
    return extractTimes(text);
  }));

  if (murderTimes.length > 1) {
    addIssue(
      issues,
      'critical',
      'timeline_murder_time_conflict',
      2.5,
      `Murder timing conflicts across cards: ${murderTimes.join(', ')}`,
      { values: murderTimes }
    );
  }

  const fentonArgumentCards = cards.filter((card) => {
    const text = String(card?.card_contents || '');
    return /fenton/i.test(text) && /argument/i.test(text);
  });

  const argumentRanges = [];
  const argumentEnds = [];

  for (const card of fentonArgumentCards) {
    const text = String(card?.card_contents || '');
    const rangeMatch = text.match(/\bfrom\s+(\d{1,2}:\d{2}\s?(?:AM|PM))\s+to\s+(\d{1,2}:\d{2}\s?(?:AM|PM))/i);
    if (rangeMatch) {
      argumentRanges.push(`${rangeMatch[1].toUpperCase()}-${rangeMatch[2].toUpperCase()}`);
    }
    const endMatch = text.match(/\bended at\s+(\d{1,2}:\d{2}\s?(?:AM|PM))/i);
    if (endMatch) {
      argumentEnds.push(endMatch[1].toUpperCase());
    }
  }

  if (unique(argumentRanges).length > 1 || unique(argumentEnds).length > 1) {
    addIssue(
      issues,
      'major',
      'timeline_argument_conflict',
      1.5,
      'The same suspect timeline is described with conflicting argument windows.',
      {
        ranges: unique(argumentRanges),
        ends: unique(argumentEnds)
      }
    );
  }

  if (argumentRanges.length && argumentEnds.length) {
    const impossible = argumentRanges.some((range) => {
      const [, end] = range.split('-');
      return end && argumentEnds.some((candidate) => candidate !== end);
    });
    if (impossible) {
      addIssue(
        issues,
        'major',
        'timeline_argument_end_mismatch',
        1.5,
        'Argument range and argument end-point disagree.',
        {
          ranges: unique(argumentRanges),
          ends: unique(argumentEnds)
        }
      );
    }
  }
}

function collectWarningIssues(context, issues) {
  const warnings = Array.isArray(context?.debug?.warning_log) ? context.debug.warning_log : [];
  const seenWarnings = new Set();
  for (const warning of warnings) {
    const warningKey = [
      String(warning?.stage || '').trim(),
      String(warning?.reason || '').trim(),
      String(warning?.message || '').trim(),
      String(warning?.character || '').trim(),
      String(warning?.bundle_id || '').trim()
    ].join('|');
    if (seenWarnings.has(warningKey)) {
      continue;
    }
    seenWarnings.add(warningKey);

    if (warning?.stage === 'structural_preflight_agent' && warning?.reason) {
      const issueMap = {
        duplicate_character_systems: { severity: 'major', points: 1.5 },
        missing_victim_identity: { severity: 'critical', points: 2.5 },
        early_killer_leak: { severity: 'major', points: 2 },
        dead_suspect_slots: { severity: 'major', points: 1.5 },
        duplicate_evidence_weighting: { severity: 'major', points: 1 }
      };
      const mapped = issueMap[String(warning.reason)] || { severity: warning.severity || 'major', points: 1 };
      addIssue(
        issues,
        mapped.severity,
        String(warning.reason),
        mapped.points,
        String(warning.message || warning.reason)
      );
      continue;
    }

    if (warning?.stage === 'suspect_coverage_agent' && warning?.reason) {
      if (String(warning.reason) === 'regenerated_duplicate_profile_secrets') {
        continue;
      }
      addIssue(
        issues,
        'major',
        String(warning.reason),
        1.5,
        String(warning.message || warning.reason)
      );
      continue;
    }

    if (warning?.stage === 'roster_integrity' && Array.isArray(warning.unknown_phrases) && warning.unknown_phrases.length) {
      const unknownPhrases = warning.unknown_phrases.filter(Boolean);
      const likelyEntityDrift = unknownPhrases.filter((phrase) => !isLikelyRosterNoisePhrase(phrase));
      if (!likelyEntityDrift.length) {
        addIssue(
          issues,
          'minor',
          'roster_validator_noise',
          0.5,
          `Roster validator flagged likely instruction noise: ${unknownPhrases.slice(0, 6).join(', ')}`,
          { unknown_phrases: unknownPhrases }
        );
      } else {
        addIssue(
          issues,
          'major',
          'unknown_roster_entities',
          1.5,
          `Cards reference unsupported names or places: ${likelyEntityDrift.slice(0, 6).join(', ')}`,
          { unknown_phrases: likelyEntityDrift }
        );
      }
      continue;
    }

    if (warning?.stage === 'bundle_structure_validator_agent') {
      addIssue(
        issues,
        'minor',
        String(warning.reason || 'bundle_structure_warning'),
        0.5,
        `Bundle pacing warning: ${warning.reason || 'unspecified bundle warning'}`,
        { bundle_id: warning.bundle_id || null }
      );
      continue;
    }

    if (warning?.stage === 'solvability_validator' && warning?.reason === 'repair_skipped_for_bundle_cards') {
      addIssue(
        issues,
        'major',
        'solvability_repair_skipped',
        1,
        'Solvability repair was skipped because bundle cards were already present.',
        { problems: warning.problems || [] }
      );
    }
  }
}

function collectEncodingIssue(context, issues) {
  const badSnippets = collectTexts(context).filter((text) =>
    /â€|â€™|â€œ|â€|â€”|Â/.test(text)
  );

  if (badSnippets.length) {
    addIssue(
      issues,
      'minor',
      'encoding_artifacts',
      0.5,
      'Output contains mojibake or encoding artifacts.',
      { count: badSnippets.length }
    );
  }
}

function collectActEscalationIssue(context, issues, { partial }) {
  const bundles = Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [];
  if (!bundles.length) {
    return;
  }

  const acts = bundles.map((bundle) => bundle?.act).filter((act) => act === 1 || act === 2 || act === 3);
  if (!partial && acts.length && !acts.includes(3)) {
    addIssue(
      issues,
      'major',
      'missing_act_three_climax',
      1.5,
      'No puzzle bundle escalates into Act 3.'
    );
  }
}

function collectDeductionBalanceIssues(context, issues) {
  const suspectNames = Array.isArray(context?.case_state?.suspects)
    ? context.case_state.suspects.map((suspect) => suspect?.name).filter(Boolean)
    : [];
  if (!suspectNames.length) {
    return;
  }

  const targetTexts = Array.isArray(context?.clue_targets)
    ? context.clue_targets.map((target) => String(target?.fact || ''))
    : [];
  const firstThree = targetTexts.slice(0, 3);
  const lowerTargets = targetTexts.map((text) => text.toLowerCase());

  const suspectMentionCounts = suspectNames.map((name) => {
    const normalized = normalizeName(name);
    const count = lowerTargets.filter((text) => text.includes(normalized)).length;
    return { name, normalized, count };
  });

  const activeInFirstThree = suspectMentionCounts.filter(({ normalized }) =>
    firstThree.some((text) => text.toLowerCase().includes(normalized))
  );
  if (firstThree.length >= 3 && activeInFirstThree.length < Math.min(3, suspectNames.length)) {
    addIssue(
      issues,
      'major',
      'suspect_pool_collapses_by_bundle_three',
      1.5,
      'The first three clue targets do not keep enough suspects materially active.'
    );
  }

  const penultimate = lowerTargets[2] || '';
  const finalTarget = lowerTargets[3] || '';
  if (
    penultimate &&
    finalTarget &&
    suspectMentionCounts.some(({ normalized }) =>
      normalized &&
      penultimate.includes(normalized) &&
      finalTarget.includes(normalized) &&
      /(access|checked out|carrying|found with|fingerprint|prints|murder weapon|used to strangle)/i.test(`${penultimate} ${finalTarget}`)
    )
  ) {
    addIssue(
      issues,
      'major',
      'final_bundle_redundant_confirmation',
      1,
      'The final confirmation bundle mostly repeats the same suspect-direction evidence as the prior bundle.'
    );
  }

  const evidenceTexts = Array.isArray(context?.cards)
    ? context.cards
      .filter((card) => ['clue', 'item'].includes(card?.card_type))
      .map((card) => `${card?.card_title || ''} ${card?.card_contents || ''}`.toLowerCase())
    : [];
  const decisivePattern = /\b(fingerprint|prints|blood|rope|dagger|weapon|poison|found hidden|checked out|carrying|present in|had access)\b/i;
  const weightedCounts = suspectMentionCounts.map(({ name, normalized }) => ({
    name,
    count: evidenceTexts.filter((text) => text.includes(normalized) && decisivePattern.test(text)).length
  }));
  const overweight = weightedCounts.sort((a, b) => b.count - a.count);
  if (
    overweight.length >= 2 &&
    overweight[0].count >= 4 &&
    overweight[0].count >= overweight[1].count + 2
  ) {
    addIssue(
      issues,
      'major',
      'suspect_evidence_overweight',
      1,
      `One suspect is over-weighted by repeated same-direction evidence: ${overweight[0].name}.`,
      { suspect: overweight[0].name, count: overweight[0].count }
    );
  }
}

export function buildPlayabilityReport(context, options = {}) {
  const { partial = false, stepName = null } = options;
  const issues = [];
  const solution = getSolution(context);
  const killerName = normalizeName(context?.case_state?.killer_name || solution?.killer);
  const victimName = normalizeName(context?.case_state?.victim_name);

  if (!partial) {
    if (!context?.solvability_validation) {
      addIssue(
        issues,
        'critical',
        'missing_solvability_validation',
        2,
        'No solvability validation result was persisted into the run context.'
      );
    } else if (context.solvability_validation.pass !== true) {
      addIssue(
        issues,
        'critical',
        'solvability_failed',
        3,
        'Solvability validation did not pass.',
        { problems: context.solvability_validation.problems || [] }
      );
    }
  }

  if (context?.narrative_validation && context.narrative_validation.pass !== true) {
    addIssue(
      issues,
      'critical',
      'narrative_validation_failed',
      2,
      'Narrative validation did not pass.',
      { problems: context.narrative_validation.problems || [] }
    );
  }

  if (killerName && victimName && killerName === victimName) {
    addIssue(
      issues,
      'critical',
      'killer_equals_victim',
      3,
      'The derived victim matches the killer, which breaks the case state.'
    );
  }

  collectTimelineIssues(context, issues);
  collectWarningIssues(context, issues);
  collectEncodingIssue(context, issues);
  collectActEscalationIssue(context, issues, { partial });
  collectDeductionBalanceIssues(context, issues);

  const totalPenalty = issues.reduce((sum, issue) => sum + Number(issue.points || 0), 0);
  const score = Math.max(0, Math.min(10, Number((10 - totalPenalty).toFixed(1))));
  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const majorCount = issues.filter((issue) => issue.severity === 'major').length;

  let grade = 'A';
  if (score < 9.5) {
    grade = 'B';
  }
  if (score < 8) {
    grade = 'C';
  }
  if (score < 6) {
    grade = 'D';
  }
  if (score < 4) {
    grade = 'F';
  }

  let status = 'ready_for_playtest';
  if (criticalCount > 0) {
    status = 'blocked';
  } else if (majorCount > 0 || score < 8.5) {
    status = 'needs_repair';
  }

  return {
    score_10: score,
    score_percent: Math.round(score * 10),
    grade,
    pass: criticalCount === 0 && score >= 8.5,
    status,
    partial,
    step_name: stepName,
    issue_count: issues.length,
    issues
  };
}
