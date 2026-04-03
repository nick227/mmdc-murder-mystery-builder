import { getCardsByType } from '../utils/cards.js';
import { buildEvidenceSignature } from '../utils/evidenceFacts.js';

const PUZZLE_COUNT = 4;
const DEFAULT_ACT = 2;
const BUNDLE_ACTS = [1, 2, 3, 3];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapClueTypeToCategory(clueType) {
  const normalized = normalizeText(clueType);
  if (normalized === 'artifact') {
    return 'object';
  }
  if (normalized === 'fact') {
    return 'location';
  }
  if (normalized === 'derived') {
    return 'access';
  }
  if (/(time|timeline)/.test(normalized)) {
    return 'timing';
  }
  if (/(location|scene)/.test(normalized)) {
    return 'location';
  }
  if (/(access|entry|route|key|passage|movement)/.test(normalized)) {
    return 'access';
  }
  if (/(object|item|document|physical evidence|physical_evidence)/.test(normalized)) {
    return 'object';
  }
  if (/(witness|testimony)/.test(normalized)) {
    return 'movement';
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

function buildDerivedTargetFact(clue) {
  const suspectName = String(clue?.suspect_name || '').trim() || 'the highlighted suspect';
  const category = mapClueTypeToCategory(clue?.clue_type);

  switch (category) {
  case 'timing':
    return `${suspectName} is the suspect whose timeline this clue meaningfully narrows.`;
  case 'location':
    return `${suspectName} is the suspect most strongly tied to the location revealed by this clue.`;
  case 'access':
    return `${suspectName} is the suspect constrained by the access pattern this clue reveals.`;
  case 'movement':
    return `${suspectName} is the suspect whose movement this clue helps narrow.`;
  case 'object':
  default:
    return `${suspectName} is the suspect implicated by the object relationship this clue reveals.`;
  }
}

function isMurderClueCard(card) {
  return String(card?.clue_type || '').trim().toLowerCase() !== 'treasure';
}

function buildDerivedClueTargets(context) {
  const clueCards = getCardsByType(context?.cards, 'clue')
    .filter(isMurderClueCard)
    .filter((card) => String(card?.card_contents || '').trim())
    .map((card) => {
      const sourceText = `${card?.card_title || ''} ${card?.card_contents || ''}`.trim();
      const category = mapClueTypeToCategory(card?.clue_type);
      return {
        card_id: String(card?.card_id || '').trim(),
        suspect_name: String(card?.suspect_name || '').trim(),
        source_signature: String(buildEvidenceSignature(card, context) || '').trim(),
        source_text: sourceText,
        fact: buildDerivedTargetFact(card),
        category,
        puzzle_type_hint: derivePuzzleTypeFromCategory(category),
        act: typeof card?.act === 'number' ? card.act : null
      };
    });

  const usedSourceKeys = new Set();
  const selected = [];

  for (const clue of clueCards) {
    if (selected.length >= PUZZLE_COUNT) {
      break;
    }
    const sourceKey = clue.source_signature || normalizeText(clue.source_text);
    if (!sourceKey || usedSourceKeys.has(sourceKey)) {
      continue;
    }
    usedSourceKeys.add(sourceKey);
    selected.push(clue);
  }

  return selected.slice(0, PUZZLE_COUNT).map((clue, index) => ({
    target_id: clue.card_id || `derived_clue_target_${index + 1}`,
    fact: clue.fact,
    category: clue.category,
    act: clue.act ?? BUNDLE_ACTS[index] ?? DEFAULT_ACT,
    puzzle_type_hint: clue.puzzle_type_hint,
    suspect_name: clue.suspect_name
  }));
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

function distributeClues(clues, roster, killerId) {
  const killerClues = [];
  const nonKillerEntries = roster.filter((entry) => entry.suspectId !== killerId);
  const assignments = new Map(nonKillerEntries.map((entry) => [entry.suspectId, []]));
  let roundRobinIndex = 0;

  for (const clue of clues) {
    const clueWeight = String(clue?.clue_weight || '').trim();
    if (clueWeight === 'high' || !nonKillerEntries.length) {
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
  const clueCards = getCardsByType(context?.cards, 'clue');
  const murderClues = clueCards.filter(isMurderClueCard);
  const roster = buildSuspectRoster(context);
  const killerId = String(context?.case_state?.killer_id || '').trim();
  const killerEntry = roster.find((entry) => entry.suspectId === killerId) || null;

  if (!clueCards.length) {
    throw new Error('clue_target_agent requires clue cards in context.cards');
  }
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
  context.clue_targets = buildDerivedClueTargets(context);
  return context;
}
