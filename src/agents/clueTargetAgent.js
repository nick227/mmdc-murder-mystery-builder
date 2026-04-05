import { getCardsByType } from '../utils/cards.js';
import { buildEvidenceSignature } from '../utils/evidenceFacts.js';
import { FACT_BINDING_ORDER } from '../utils/truthTrailReachability.js';
import { DEFAULT_PUZZLE_COUNT, coercePuzzleCount } from '../config/generationDefaults.js';

const DEFAULT_ACT = 3;
const BUNDLE_ACTS = [1, 2, 3, 3];

function resolveBundleAct(index, puzzleCount) {
  const count = Number.isFinite(Number(puzzleCount)) ? Math.max(0, Math.floor(Number(puzzleCount))) : 0;
  if (count <= 1) {
    return 3;
  }
  if (count === 2) {
    return index === 0 ? 2 : 3;
  }
  if (count === 3) {
    return [1, 2, 3][index] ?? 3;
  }
  return BUNDLE_ACTS[index] ?? DEFAULT_ACT;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapClueTypeToCategory(hintText) {
  const normalized = normalizeText(hintText);
  if (normalized === 'artifact') {
    return 'object';
  }
  if (normalized === 'fact') {
    return 'location';
  }
  if (normalized === 'derived') {
    return 'access';
  }
  if (/(time|timeline|alibi)/.test(normalized)) {
    return 'timing';
  }
  if (/(location|scene|room|where)/.test(normalized)) {
    return 'location';
  }
  if (/(access|entry|route|key|passage|movement|locked|door)/.test(normalized)) {
    return 'access';
  }
  if (/(witness|testimony|seen|heard)/.test(normalized)) {
    return 'movement';
  }
  if (/(object|item|document|physical evidence|physical_evidence|fingerprint|blood|weapon)/.test(normalized)) {
    return 'object';
  }
  if (/(contradiction|conflict|doesn t match|does not match)/.test(normalized)) {
    return 'location';
  }
  return 'object';
}

function derivePuzzleTypeFromCategory(category) {
  switch (category) {
  case 'timing':
    return 'timeline';
  case 'location':
    return 'cross_reference';
  case 'access':
    return 'elimination';
  case 'movement':
    return 'timeline';
  case 'object':
    return 'item_combination';
  default:
    return 'cross_reference';
  }
}

function clueCategory(card) {
  const hint = [
    card?.role,
    card?.evidence_type,
    card?.card_title,
    card?.card_contents
  ].filter(Boolean).join(' ');
  return mapClueTypeToCategory(hint);
}

function parseEvidenceSignature(signature) {
  const [subject, object, property, location] = String(signature || '').split('|');
  return {
    subject: String(subject || '').trim(),
    object: String(object || '').trim(),
    property: String(property || '').trim(),
    location: String(location || '').trim()
  };
}

function buildSuspectLookup(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  return new Map(
    suspects
      .map((suspect) => [String(suspect?.suspect_id || '').trim(), String(suspect?.name || suspect?.title || '').trim()])
      .filter(([suspectId, displayName]) => suspectId && displayName)
  );
}

function humanizeSlug(value, fallback = 'the object') {
  const text = String(value || '').trim();
  if (!text || text === 'unknown_location' || text === 'scene' || text === 'plain' || text === 'generic') {
    return fallback;
  }
  return text.replace(/_/g, ' ').trim() || fallback;
}

function buildDerivedTargetFact(clue, context, factBinding) {
  const title = String(clue?.card_title || 'this evidence').trim() || 'this evidence';
  const location = String(context?.coreTruth?.murder?.location || 'the scene').trim() || 'the scene';
  const victim = String(context?.coreTruth?.murder?.victim || 'the victim').trim() || 'the victim';
  const treasureObject = String(context?.coreTruth?.treasure?.object || 'the treasure object').trim() || 'the treasure object';
  const treasureLocation = String(
    context?.coreTruth?.treasure?.hiding_place
      || context?.coreTruth?.treasure?.treasure_solution
      || 'the hiding place'
  ).trim() || 'the hiding place';
  const category = clueCategory(clue);
  const suspectLookup = buildSuspectLookup(context);
  const suspectName = suspectLookup.get(String(clue?.target_id || '').trim()) || 'the killer';
  const signatureParts = parseEvidenceSignature(clue?.source_signature);
  const objectLabel = humanizeSlug(signatureParts.object, title);
  const localLocation = humanizeSlug(signatureParts.location, location);

  switch (String(factBinding || '').trim()) {
  case 'killer':
    return `Only ${suspectName} fits the evidence from "${title}" and could be tied to ${victim} at ${location}.`;
  case 'location':
    return `The evidence from "${title}" places the critical event at ${localLocation || location}.`;
  case 'treasure_object':
    return `The evidence from "${title}" identifies ${treasureObject} as the key object linked to the case.`;
  case 'treasure_location':
    return `The evidence from "${title}" narrows the hidden item to ${treasureLocation}.`;
  default:
    break;
  }

  switch (category) {
  case 'timing':
    return `Resolving records tied to "${title}" pins the time window for what happened to ${victim} at ${location}.`;
  case 'location':
    return `Cross-referencing "${title}" isolates the exact location detail tied to ${victim} at ${location}.`;
  case 'access':
    return `The "${title}" material shows which person or credential controlled access at ${location}.`;
  case 'movement':
    return `Reconstructing movement from "${title}" narrows which suspect could have been present near ${location}.`;
  case 'object':
  default:
    return `The evidence in "${title}" points to ${objectLabel} as a concrete object tied to the death at ${location}.`;
  }
}

function isMurderClueCard(card) {
  const role = String(card?.role || '').trim().toLowerCase();
  if (role) {
    return role !== 'treasure';
  }
  // Backward compat.
  return String(card?.clue_type || '').trim().toLowerCase() !== 'treasure';
}

function buildDerivedClueTargets(context, puzzleCount) {
  const clueCards = getCardsByType(context?.cards, 'clue')
    .filter(isMurderClueCard)
    .filter((card) => String(card?.card_contents || '').trim())
    .map((card) => {
      const sourceText = `${card?.card_title || ''} ${card?.card_contents || ''}`.trim();
      const category = clueCategory(card);
      return {
        card_id: String(card?.card_id || '').trim(),
        target_id: card?.target_id === null ? null : String(card?.target_id || '').trim(),
        source_signature: String(buildEvidenceSignature(card, context) || '').trim(),
        source_text: sourceText,
        category,
        puzzle_type_hint: derivePuzzleTypeFromCategory(category),
        act: typeof card?.act === 'number' ? card.act : null
      };
    });

  const usedSourceKeys = new Set();
  const selected = [];

  for (const clue of clueCards) {
    if (selected.length >= puzzleCount) {
      break;
    }
    const sourceKey = clue.source_signature || normalizeText(clue.source_text);
    if (!sourceKey || usedSourceKeys.has(sourceKey)) {
      continue;
    }
    usedSourceKeys.add(sourceKey);
    selected.push(clue);
  }

  return selected.slice(0, puzzleCount).map((clue, index) => {
    const factBinding = FACT_BINDING_ORDER[index % FACT_BINDING_ORDER.length];
    return {
      target_id: clue.card_id || `derived_clue_target_${index + 1}`,
      fact: buildDerivedTargetFact(clue, context, factBinding),
      category: clue.category,
      act: clue.act ?? resolveBundleAct(index, puzzleCount),
      puzzle_type_hint: clue.puzzle_type_hint,
      fact_binding: factBinding
    };
  });
}

function buildSuspectRoster(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  return suspects.map((suspect) => ({
    suspectId: String(suspect?.suspect_id || '').trim(),
    displayName: String(suspect?.name || suspect?.title || '').trim()
  })).filter((entry) => entry.suspectId && entry.displayName);
}

function annotateClueCard(clue) {
  return {
    ...clue
  };
}

function clueWeightValue(clue) {
  const weight = String(clue?.weight || clue?.clue_weight || '').trim().toLowerCase();
  return weight;
}

function distributeClues(clues, roster, killerId) {
  const killerClues = [];
  const nonKillerEntries = roster.filter((entry) => entry.suspectId !== killerId);
  const assignments = new Map(nonKillerEntries.map((entry) => [entry.suspectId, []]));
  let roundRobinIndex = 0;

  for (const clue of clues) {
    const weight = clueWeightValue(clue);
    if (weight === 'high' || !nonKillerEntries.length) {
      killerClues.push(clue);
      continue;
    }

    const recipient = nonKillerEntries[roundRobinIndex % nonKillerEntries.length];
    assignments.get(recipient.suspectId).push(clue);
    roundRobinIndex += 1;
  }

  return { killerClues, assignments };
}

export async function clueTargetAgent(context) {
  const puzzleCount = coercePuzzleCount(context?.puzzleCount, DEFAULT_PUZZLE_COUNT);
  if (puzzleCount === 0) {
    context.clue_targets = [];
    return context;
  }
  const clueCards = getCardsByType(context?.cards, 'clue');
  if (!clueCards.length) {
    context.clue_targets = [];
    return context;
  }
  const murderClues = clueCards.filter(isMurderClueCard);
  const roster = buildSuspectRoster(context);
  const killerId = String(context?.case_state?.killer_id || '').trim();
  const killerEntry = roster.find((entry) => entry.suspectId === killerId) || null;

  if (!murderClues.length) {
    throw new Error('clue_target_agent requires at least one non-treasure clue card');
  }
  if (!roster.length || !killerEntry) {
    throw new Error('clue_target_agent requires a playable suspect roster and killer');
  }

  const { killerClues, assignments } = distributeClues(murderClues, roster, killerId);
  const nextCards = Array.isArray(context.cards) ? [...context.cards] : [];
  const assignedByClue = new Map();

  for (const clue of killerClues) {
    assignedByClue.set(clue, killerEntry);
  }

  for (const suspectEntry of roster) {
    if (suspectEntry.suspectId === killerId) {
      continue;
    }
    const assigned = assignments.get(suspectEntry.suspectId) || [];
    for (const clue of assigned) {
      assignedByClue.set(clue, suspectEntry);
    }
  }

  for (let index = 0; index < nextCards.length; index += 1) {
    const card = nextCards[index];
    if (card?.card_type !== 'clue') {
      continue;
    }
    const suspectEntry = assignedByClue.get(card);
    if (suspectEntry) {
      nextCards[index] = annotateClueCard(card);
    }
  }

  context.cards = nextCards;
  context.clue_targets = buildDerivedClueTargets(context, puzzleCount);
  return context;
}
