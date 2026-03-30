import { getCardsByType, getCharacterCards } from './cards.js';
import { buildFactLedger, buildPressureEntriesFromText, extractAxes } from './factLedger.js';
import {
  addPressure,
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

function getClueCards(context) {
  return getCardsByType(context?.cards, 'clue');
}

function getSuspectIdByName(suspects, value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  const match = suspects.find((suspect) =>
    [suspect.name, baseName(suspect.title), suspect.title]
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .includes(normalizedValue)
  );

  return String(match?.id || '').trim();
}

function getClueSuspectIds(card, suspects) {
  const suspectId = getSuspectIdByName(suspects, card?.suspect_name);
  return suspectId ? [suspectId] : [];
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

function compactSourceRef(record) {
  const sourceAgent = String(record?.source_agent || 'unknown').trim();
  const sourceTitle = String(record?.source_title || record?.source_id || '').trim();
  return sourceTitle ? `${sourceAgent}:${sourceTitle}` : sourceAgent;
}

function normalizeDuplicateTitle(value) {
  return normalizeText(String(value || '').trim());
}

function collectDuplicateEvidenceIssue(ledger, issues) {
  const clueClusters = [...(ledger?.signatureClusters?.entries() || [])]
    .map(([signature, records]) => ({
      signature,
      records: (Array.isArray(records) ? records : [])
        .filter((record) => String(record?.card_type || '').trim() === 'clue')
    }))
    .filter((cluster) => cluster.records.length >= 2);

  const itemRecords = Array.isArray(ledger?.records)
    ? ledger.records.filter((record) => String(record?.card_type || '').trim() === 'item')
    : [];
  const itemTitleClusters = new Map();
  for (const record of itemRecords) {
    const normalizedTitle = normalizeDuplicateTitle(record?.source_title);
    if (!normalizedTitle) {
      continue;
    }
    if (!itemTitleClusters.has(normalizedTitle)) {
      itemTitleClusters.set(normalizedTitle, []);
    }
    itemTitleClusters.get(normalizedTitle).push(record);
  }
  const itemClusters = [...itemTitleClusters.entries()]
    .map(([normalizedTitle, records]) => ({
      signature: `item_title:${normalizedTitle}`,
      records
    }))
    .filter((cluster) => cluster.records.length >= 2);

  const filteredClusters = [...clueClusters, ...itemClusters];

  if (!filteredClusters.length) {
    return;
  }

  const compactClusters = filteredClusters.slice(0, 3).map((cluster) => ({
    signature: cluster.signature,
    sources: cluster.records.slice(0, 4).map(compactSourceRef)
  }));

  addIssue(
    issues,
    'major',
    'duplicate_evidence_weighting',
    `Canonical evidence repeats across ledger signatures: ${compactClusters.map((cluster) => `${cluster.signature} [${cluster.sources.join(', ')}]`).join('; ')}`,
    {
      duplicate_clusters: filteredClusters.map((cluster) => ({
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
  const suspects = buildSuspectList(context);
  const strongestClueBySuspect = new Map();
  const axisPriority = ['weapon', 'physical_trace', 'possession', 'access', 'opportunity', 'timeline', 'witness', 'contradiction', 'motive'];

  for (const clue of getClueCards(context)) {
    const weight = String(clue?.clue_weight || '').trim() === 'high' ? 'material' : 'weak';
    for (const suspectId of getClueSuspectIds(clue, suspects)) {
      const current = strongestClueBySuspect.get(suspectId);
      const currentRank = current?.weight === 'material' ? 1 : 0;
      const nextRank = weight === 'material' ? 1 : 0;
      if (!current || nextRank > currentRank) {
        strongestClueBySuspect.set(suspectId, {
          suspect_id: suspectId,
          axis: 'opportunity',
          weight,
          source: 'clue_agent',
          raw_text: `${clue.card_title || ''} ${clue.card_contents || ''}`.trim()
        });
      }
    }
  }

  for (const entry of strongestClueBySuspect.values()) {
    addPressure(map, entry);
  }

  for (const record of Array.isArray(ledger?.records) ? ledger.records : []) {
    if (!record?.raw_text) {
      continue;
    }
    if (['clue', 'bundle_target', 'bundle_solution', 'bundle_unlock'].includes(String(record.card_type || '').trim())) {
      continue;
    }
    const weight = ['clue_target', 'bundle_solution', 'bundle_unlock'].includes(record.card_type) ? 'material' : 'weak';
    const entries = buildPressureEntriesFromText(record.raw_text, context);
    const bySuspect = new Map();
    for (const entry of entries) {
      const suspectId = String(entry?.suspectId || '').trim();
      if (!suspectId) {
        continue;
      }
      const existing = bySuspect.get(suspectId) || [];
      existing.push(String(entry?.axis || '').trim());
      bySuspect.set(suspectId, existing);
    }

    for (const [suspectId, axes] of bySuspect.entries()) {
      const axis = axisPriority.find((candidate) => axes.includes(candidate));
      if (!axis) {
        continue;
      }
      addPressure(map, {
        suspect_id: suspectId,
        axis,
        weight,
        source: record.source_agent || 'unknown',
        raw_text: record.raw_text
      });
    }
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
        .map(([axis, count]) => `${axis}:${count}`),
      pressure_sources: (map.bySuspect.get(entry.suspect_id)?.entries || []).map((sourceEntry) => ({
        axis: sourceEntry.axis,
        weight: sourceEntry.weight,
        source: sourceEntry.source,
        raw_text: sourceEntry.raw_text
      }))
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
  const ledger = buildFactLedger(context);

  collectDuplicateCharacterIssues(context, issues);
  collectVictimIssue(context, issues);
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
