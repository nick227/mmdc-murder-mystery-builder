import { buildPressureEntriesFromText } from './factLedger.js';

export const PRESSURE_AXES = [
  'motive',
  'access',
  'opportunity',
  'weapon',
  'timeline',
  'witness',
  'contradiction',
  'possession',
  'physical_trace'
];

const MATERIAL_AXES = new Set([
  'access',
  'opportunity',
  'weapon',
  'timeline',
  'contradiction',
  'possession',
  'physical_trace'
]);

function emptyAxisCounts() {
  return Object.fromEntries(PRESSURE_AXES.map((axis) => [axis, 0]));
}

function normalizeWeight(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'weak' ? 'weak' : 'material';
}

function scoreForWeight(weight) {
  return normalizeWeight(weight) === 'weak' ? 1 : 2;
}

export function createSuspectPressureMap(caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  const bySuspect = new Map();

  for (const suspect of suspects) {
    const suspectId = String(suspect?.suspect_id || '').trim();
    if (!suspectId) {
      continue;
    }
    bySuspect.set(suspectId, {
      suspect_id: suspectId,
      name: String(suspect?.name || '').trim(),
      axes: emptyAxisCounts(),
      weak_mentions: 0,
      material_implications: 0,
      total_score: 0,
      entries: []
    });
  }

  return { bySuspect };
}

export function addPressure(map, {
  suspect_id,
  axis,
  weight = 'material',
  source = 'unknown',
  raw_text = ''
}) {
  const entry = map?.bySuspect?.get(String(suspect_id || '').trim());
  const normalizedAxis = String(axis || '').trim();
  if (!entry || !PRESSURE_AXES.includes(normalizedAxis)) {
    return map;
  }

  const normalizedWeight = normalizeWeight(weight);
  entry.axes[normalizedAxis] += 1;
  entry.total_score += scoreForWeight(normalizedWeight);
  if (normalizedWeight === 'weak') {
    entry.weak_mentions += 1;
  } else {
    entry.material_implications += 1;
  }
  entry.entries.push({
    axis: normalizedAxis,
    weight: normalizedWeight,
    source,
    raw_text
  });

  return map;
}

export function addPressureFromText(map, text, context, options = {}) {
  const weight = options.weight || 'material';
  const source = options.source || 'unknown';
  for (const entry of buildPressureEntriesFromText(text, context)) {
    addPressure(map, {
      suspect_id: entry.suspectId,
      axis: entry.axis,
      weight,
      source,
      raw_text: text
    });
  }
  return map;
}

export function getActiveSuspects(map, { materialOnly = false } = {}) {
  const suspects = [...(map?.bySuspect?.values() || [])];
  return suspects.filter((entry) =>
    materialOnly
      ? entry.material_implications >= 2 || Object.entries(entry.axes).some(([axis, count]) => MATERIAL_AXES.has(axis) && count >= 1)
      : entry.total_score > 0
  );
}

export function suspectIsUnderused(map, suspectId) {
  const entry = map?.bySuspect?.get(String(suspectId || '').trim());
  if (!entry) {
    return false;
  }
  const materialAxisCount = Object.entries(entry.axes)
    .filter(([axis, count]) => MATERIAL_AXES.has(axis) && count > 0)
    .length;
  return entry.material_implications < 2 || materialAxisCount < 2;
}

export function suspectIsOverweighted(map, suspectId) {
  const entry = map?.bySuspect?.get(String(suspectId || '').trim());
  if (!entry) {
    return false;
  }
  const totals = [...map.bySuspect.values()].map((candidate) => candidate.total_score).sort((a, b) => b - a);
  const top = totals[0] || 0;
  const runnerUp = totals[1] || 0;
  return entry.total_score >= 5 && entry.total_score === top && top > runnerUp + 1;
}

export function getPressureBalance(map) {
  const suspects = [...(map?.bySuspect?.values() || [])];
  const active = getActiveSuspects(map, { materialOnly: true });
  const underused = suspects.filter((entry) => suspectIsUnderused(map, entry.suspect_id));
  const overweighted = suspects.filter((entry) => suspectIsOverweighted(map, entry.suspect_id));

  return {
    active_suspects: active.map((entry) => entry.suspect_id),
    active_count: active.length,
    underused_suspects: underused.map((entry) => entry.suspect_id),
    overweighted_suspects: overweighted.map((entry) => entry.suspect_id),
    by_suspect: suspects.map((entry) => ({
      suspect_id: entry.suspect_id,
      name: entry.name,
      axes: entry.axes,
      weak_mentions: entry.weak_mentions,
      material_implications: entry.material_implications,
      total_score: entry.total_score
    }))
  };
}
