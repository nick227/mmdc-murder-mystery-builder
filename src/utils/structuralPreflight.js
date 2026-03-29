import { getCardsByType, getCharacterCards } from './cards.js';
import { buildFactLedger, extractAxes } from './factLedger.js';
import {
  addPressureFromText,
  createSuspectPressureMap,
  getPressureBalance
} from './suspectPressureMap.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter((token) => token.length >= 4);
}

function baseName(title) {
  const raw = String(title || '').trim();
  return raw.split(',')[0].trim();
}

function buildSuspectList(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  if (suspects.length) {
    return suspects.map((suspect) => ({
      id: String(suspect.suspect_id || '').trim(),
      name: String(suspect.name || '').trim(),
      title: String(suspect.title || suspect.name || '').trim()
    }));
  }

  return getCharacterCards(context.cards).map((card) => ({
    id: String(card.card_id || '').trim(),
    name: baseName(card.card_title),
    title: String(card.card_title || '').trim()
  }));
}

function buildSuspectMatchers(suspects) {
  return suspects.map((suspect) => {
    const phrases = new Set();
    for (const raw of [suspect.name, suspect.title]) {
      const normalized = normalizeText(raw);
      if (!normalized) {
        continue;
      }
      phrases.add(normalized);
      const tokens = normalized.split(' ').filter(Boolean);
      if (tokens.length >= 2) {
        phrases.add(tokens.slice(0, 2).join(' '));
        phrases.add(tokens.slice(-2).join(' '));
      }
      for (const token of tokens) {
        if (token.length >= 5) {
          phrases.add(token);
        }
      }
    }

    return {
      ...suspect,
      phrases: [...phrases].filter(Boolean)
    };
  });
}

function findMentionedSuspects(text, suspectMatchers) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  return suspectMatchers
    .filter((suspect) => suspect.phrases.some((phrase) => normalized.includes(phrase)))
    .map((suspect) => suspect.id);
}

function addIssue(issues, severity, code, message, details = {}) {
  issues.push({
    severity,
    code,
    message,
    ...details
  });
}

function collectDuplicateCharacterIssues(context, issues) {
  const people = getCardsByType(context.cards, 'person').map((card) => baseName(card.card_title));
  const characters = getCharacterCards(context.cards).map((card) => baseName(card.card_title));
  const characterSet = new Set(characters.map((name) => normalizeText(name)).filter(Boolean));
  const duplicates = people.filter((name) => characterSet.has(normalizeText(name)));

  if (duplicates.length) {
    addIssue(
      issues,
      'major',
      'duplicate_character_systems',
      `Canonical suspects are duplicated across person and character cards: ${[...new Set(duplicates)].slice(0, 6).join(', ')}`,
      { duplicates: [...new Set(duplicates)] }
    );
  }
}

function collectVictimIssue(context, issues) {
  const victimName = String(context?.case_state?.victim_name || '').trim();
  if (!victimName) {
    addIssue(
      issues,
      'critical',
      'missing_victim_identity',
      'Case state has no victim_name; downstream clues refer to an unnamed victim.'
    );
  }
}

function collectEarlyLeakIssues(context, issues, suspectMatchers) {
  const killerId = String(context?.case_state?.killer_id || '').trim();
  if (!killerId) {
    return;
  }

  const earlyFacts = [
    ...(Array.isArray(context?.clue_targets) ? context.clue_targets : [])
      .filter((target) => Number(target?.act || 0) < 3)
      .map((target) => ({ source: 'clue_target', act: target.act, text: target.fact })),
    ...(Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [])
      .filter((bundle) => Number(bundle?.act || 0) < 3)
      .map((bundle) => ({ source: bundle.bundle_id || 'bundle', act: bundle.act, text: bundle.solution_summary || bundle.clue_target }))
  ];

  const decisivePatterns = [
    /\bexclusive access\b/i,
    /\bonly [a-z]/i,
    /\bmatching\b/i,
    /\bunaccounted\b/i,
    /\bbelong(?:ed|ing)? to\b/i,
    /\bidentified as belonging to\b/i,
    /\bused to\b/i
  ];

  for (const fact of earlyFacts) {
    const mentions = findMentionedSuspects(fact.text, suspectMatchers);
    if (mentions.length === 1 && mentions[0] === killerId && decisivePatterns.some((pattern) => pattern.test(String(fact.text || '')))) {
      addIssue(
        issues,
        'major',
        'early_killer_leak',
        `Early deduction chain is too decisive in Act ${fact.act}: ${String(fact.text || '').trim()}`,
        { source: fact.source, act: fact.act, text: fact.text }
      );
    }
  }
}

function collectDeadSuspectIssues(context, issues, suspectMatchers) {
  const suspects = buildSuspectList(context);
  const suspectActivity = new Map(suspects.map((suspect) => [suspect.id, 0]));

  const secretCards = (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'secret');
  for (const card of secretCards) {
    const linkedId = String(card?.linked_character_id || '').trim();
    if (linkedId && suspectActivity.has(linkedId)) {
      suspectActivity.set(linkedId, (suspectActivity.get(linkedId) || 0) + 1);
      continue;
    }
    for (const suspectId of findMentionedSuspects(card.card_contents, suspectMatchers)) {
      suspectActivity.set(suspectId, (suspectActivity.get(suspectId) || 0) + 1);
    }
  }

  const activityTexts = [
    ...(Array.isArray(context?.clue_targets) ? context.clue_targets : []).map((target) => target.fact),
    ...(Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : []).flatMap((bundle) => [bundle.solution_summary, bundle.clue_target])
  ];
  for (const text of activityTexts) {
    for (const suspectId of findMentionedSuspects(text, suspectMatchers)) {
      suspectActivity.set(suspectId, (suspectActivity.get(suspectId) || 0) + 1);
    }
  }

  const deadSuspects = suspects
    .filter((suspect) => (suspectActivity.get(suspect.id) || 0) <= 1)
    .map((suspect) => suspect.name);

  if (deadSuspects.length) {
    addIssue(
      issues,
      'major',
      'dead_suspect_slots',
      `Suspects are not materially used in deduction: ${deadSuspects.slice(0, 6).join(', ')}`,
      { suspects: deadSuspects }
    );
  }
}

function compactSourceRef(record) {
  const sourceAgent = String(record?.source_agent || 'unknown').trim();
  const sourceTitle = String(record?.source_title || record?.source_id || '').trim();
  return sourceTitle ? `${sourceAgent}:${sourceTitle}` : sourceAgent;
}

function isMirrorBundleDuplicateCluster(cluster) {
  const records = Array.isArray(cluster?.records) ? cluster.records : [];
  if (records.length < 2) {
    return false;
  }

  const allowedCardTypes = new Set(['clue_target', 'bundle_target', 'bundle_solution', 'bundle_unlock']);
  if (records.some((record) => !allowedCardTypes.has(String(record?.card_type || '').trim()))) {
    return false;
  }

  const sourceAgents = new Set(records.map((record) => String(record?.source_agent || '').trim()));
  if (![...sourceAgents].every((agent) => ['clue_target_agent', 'puzzle_agent'].includes(agent))) {
    return false;
  }

  return records.some((record) => String(record?.card_type || '').trim() === 'clue_target')
    && records.some((record) => String(record?.card_type || '').trim() === 'bundle_target')
    && records.some((record) => String(record?.card_type || '').trim() === 'bundle_solution');
}

function collectDuplicateEvidenceIssue(ledger, issues) {
  const duplicateClusters = [...(ledger?.signatureClusters?.entries() || [])]
    .map(([signature, records]) => ({
      signature,
      records: Array.isArray(records) ? records : []
    }))
    .filter((cluster) => cluster.records.length >= 2)
    .filter((cluster) => !isMirrorBundleDuplicateCluster(cluster));

  if (!duplicateClusters.length) {
    return;
  }

  const compactClusters = duplicateClusters.slice(0, 3).map((cluster) => ({
    signature: cluster.signature,
    sources: cluster.records.slice(0, 4).map(compactSourceRef)
  }));

  addIssue(
    issues,
    'major',
    'duplicate_evidence_weighting',
    `Canonical evidence repeats across ledger signatures: ${compactClusters.map((cluster) => `${cluster.signature} [${cluster.sources.join(', ')}]`).join('; ')}`,
    {
      duplicate_clusters: duplicateClusters.map((cluster) => ({
        signature: cluster.signature,
        sources: cluster.records.map((record) => ({
          source_agent: record.source_agent,
          card_type: record.card_type,
          source_id: record.source_id,
          source_title: record.source_title
        }))
      }))
    }
  );
}

function collectPressureImbalanceIssue(context, ledger, issues) {
  const map = createSuspectPressureMap(context?.case_state);
  for (const record of Array.isArray(ledger?.records) ? ledger.records : []) {
    if (!record?.raw_text) {
      continue;
    }
    if (['bundle_target', 'bundle_solution', 'bundle_unlock'].includes(String(record.card_type || '').trim())) {
      continue;
    }
    addPressureFromText(map, record.raw_text, context, {
      weight: ['clue_target', 'bundle_solution', 'bundle_unlock'].includes(record.card_type) ? 'material' : 'weak',
      source: record.source_agent || 'unknown'
    });
  }

  const balance = getPressureBalance(map);
  if (!balance.overweighted_suspects.length) {
    return;
  }

  const offending = balance.by_suspect
    .filter((entry) => balance.overweighted_suspects.includes(entry.suspect_id))
    .map((entry) => ({
      suspect_id: entry.suspect_id,
      name: entry.name,
      total_score: entry.total_score,
      axes: Object.entries(entry.axes || {})
        .filter(([, count]) => count > 0)
        .map(([axis, count]) => `${axis}:${count}`)
    }));

  addIssue(
    issues,
    'major',
    'one_suspect_gravity',
    `Ledger pressure overweights one suspect too early: ${offending.map((entry) => `${entry.name || entry.suspect_id} (${entry.axes.join(', ')})`).join('; ')}`,
    {
      pressure_balance: balance,
      suspects: offending
    }
  );
}

function collectFinalBundleRedundancyIssue(context, issues) {
  const bundles = Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [];
  if (bundles.length < 2) {
    return;
  }

  const sorted = [...bundles].sort((a, b) => Number(a?.act || 0) - Number(b?.act || 0));
  const penultimate = sorted[sorted.length - 2];
  const finalBundle = sorted[sorted.length - 1];
  const penultimateText = String(penultimate?.solution_summary || penultimate?.clue_target || '').trim();
  const finalText = String(finalBundle?.solution_summary || finalBundle?.clue_target || '').trim();
  if (!penultimateText || !finalText) {
    return;
  }

  const penultimateAxes = new Set(extractAxes(penultimateText));
  const finalAxes = new Set(extractAxes(finalText));
  const sharedAxes = [...penultimateAxes].filter((axis) => finalAxes.has(axis));

  if (sharedAxes.length === 0) {
    return;
  }

  addIssue(
    issues,
    'major',
    'final_bundle_redundant_confirmation',
    `Final bundle reuses prior deduction axes instead of adding a fresh constraint: ${sharedAxes.join(', ')}`,
    {
      shared_axes: sharedAxes,
      bundles: [
        {
          source_agent: 'puzzle_agent',
          bundle_id: penultimate?.bundle_id,
          act: penultimate?.act,
          text: penultimateText
        },
        {
          source_agent: 'puzzle_agent',
          bundle_id: finalBundle?.bundle_id,
          act: finalBundle?.act,
          text: finalText
        }
      ]
    }
  );
}

export function buildStructuralPreflight(context) {
  const issues = [];
  const suspects = buildSuspectList(context);
  const suspectMatchers = buildSuspectMatchers(suspects);
  const ledger = buildFactLedger(context);

  collectDuplicateCharacterIssues(context, issues);
  collectVictimIssue(context, issues);
  collectEarlyLeakIssues(context, issues, suspectMatchers);
  collectDeadSuspectIssues(context, issues, suspectMatchers);
  collectDuplicateEvidenceIssue(ledger, issues);
  collectPressureImbalanceIssue(context, ledger, issues);
  collectFinalBundleRedundancyIssue(context, issues);

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const majorCount = issues.filter((issue) => issue.severity === 'major').length;

  return {
    pass: criticalCount === 0 && majorCount === 0,
    status: criticalCount > 0 ? 'blocked' : (majorCount > 0 ? 'needs_repair' : 'ready'),
    issue_count: issues.length,
    issues
  };
}
