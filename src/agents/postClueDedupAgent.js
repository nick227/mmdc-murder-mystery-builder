import { buildEvidenceSignature } from '../utils/evidenceFacts.js';

const CLUE_WEIGHT_ORDER = {
  low: 0,
  mid: 1,
  high: 2
};

function tokenSet(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((token) => token.length >= 4)
  );
}

function overlapScore(a, b) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(aTokens.size, bTokens.size);
}

function clueText(card) {
  return `${card?.card_title || ''} ${card?.card_contents || ''}`.trim();
}

function cluePriority(card) {
  const weight = String(card?.weight || card?.clue_weight || '').trim().toLowerCase();
  return CLUE_WEIGHT_ORDER[weight] ?? -1;
}

export async function postClueDedupAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  const cards = Array.isArray(context.cards) ? context.cards : [];
  const clues = cards
    .filter((card) => card?.card_type === 'clue')
    .slice()
    .sort((a, b) => cluePriority(b) - cluePriority(a));
  if (!clues.length) {
    return context;
  }

  const kept = [];
  const removals = [];
  const keptSignatures = new Map();

  for (const clue of clues) {
    const text = clueText(clue);
    const signature = buildEvidenceSignature(clue, context);
    if (!text) {
      removals.push({
        card_id: clue?.card_id || null,
        card_title: clue?.card_title || '',
        reason: 'empty_clue_text'
      });
      continue;
    }

    const duplicateClueSignature = signature && keptSignatures.has(signature)
      ? keptSignatures.get(signature)
      : null;
    if (duplicateClueSignature) {
      removals.push({
        card_id: clue?.card_id || null,
        card_title: clue?.card_title || '',
        reason: 'overlaps_clue_signature',
        matched_source: duplicateClueSignature.card_title || duplicateClueSignature.card_id || 'clue',
        matched_signature: signature
      });
      continue;
    }

    const duplicateClue = kept.find((entry) => overlapScore(text, clueText(entry)) > 0.7);
    if (duplicateClue) {
      removals.push({
        card_id: clue?.card_id || null,
        card_title: clue?.card_title || '',
        reason: 'overlaps_existing_clue',
        matched_source: duplicateClue.card_title || duplicateClue.card_id || 'clue'
      });
      continue;
    }

    kept.push(clue);
    if (signature) {
      keptSignatures.set(signature, clue);
    }
  }

  if (!removals.length) {
    return context;
  }

  const nonClues = cards.filter((card) => card?.card_type !== 'clue');
  context.cards = [...nonClues, ...kept];
  for (const removal of removals) {
    context.debug.warning_log.push({
      stage: 'post_clue_dedup_agent',
      reason: removal.reason,
      message: `Removed overlapping clue "${removal.card_title}"`,
      removal
    });
  }

  return context;
}

