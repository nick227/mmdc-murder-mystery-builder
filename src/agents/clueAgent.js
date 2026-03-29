import { callJson } from '../llm/client.js';
import { buildCluesPrompt } from '../prompts/cluesPrompt.js';
import { cluesArraySchema } from '../schemas/clueSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { buildEvidenceSignature } from '../utils/evidenceFacts.js';

const MIN_CLUE_COUNT = 8;
const SMOKE = process.env.SMOKE_MODE === 'true';

const trailRoleToAct = {
  red_herring: 1,
  ambiguous: 2,
  killer_aligned: 3
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((token) => token.length >= 4)
  );
}

function hasSubsetTokenOverlap(a, b) {
  const aTokens = [...tokenSet(a)];
  const bTokens = [...tokenSet(b)];
  if (!aTokens.length || !bTokens.length) {
    return false;
  }
  const smaller = aTokens.length <= bTokens.length ? aTokens : bTokens;
  const larger = smaller === aTokens ? bTokens : aTokens;
  return smaller.length >= 2 && smaller.every((token) => larger.includes(token));
}

function hasStrongOverlap(a, b) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (!aTokens.size || !bTokens.size) {
    return false;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }

  const smaller = Math.min(aTokens.size, bTokens.size);
  return smaller >= 4 && (overlap / smaller) >= 0.75;
}

function buildReservedFactPool(context) {
  const reserved = [];
  for (const card of Array.isArray(context?.cards) ? context.cards : []) {
    if (['item', 'clue'].includes(card?.card_type)) {
      reserved.push({
        text: card.card_title,
        signature: buildEvidenceSignature(card, context)
      });
      reserved.push({
        text: card.card_contents,
        signature: buildEvidenceSignature(card, context)
      });
      reserved.push({
        text: `${card.card_title || ''} ${card.card_contents || ''}`.trim(),
        signature: buildEvidenceSignature(card, context)
      });
    }
  }
  return reserved.filter((entry) => entry.text);
}

function dedupeGeneratedClues(context, clues) {
  const reserved = buildReservedFactPool(context);
  const kept = [];
  const usedSignatures = new Set(
    reserved
      .map((entry) => entry.signature)
      .filter(Boolean)
  );

  for (const clue of Array.isArray(clues) ? clues : []) {
    const title = String(clue?.card_title || '').trim();
    const contents = String(clue?.card_contents || '').trim();
    if (!title || !contents) {
      continue;
    }

    const signature = buildEvidenceSignature({
      card_title: title,
      card_contents: contents
    }, context);
    if (signature && usedSignatures.has(signature)) {
      continue;
    }

    const duplicatesReserved = reserved.some((entry) =>
      hasStrongOverlap(contents, entry.text)
      || hasStrongOverlap(title, entry.text)
      || hasSubsetTokenOverlap(title, entry.text)
      || hasSubsetTokenOverlap(`${title} ${contents}`, entry.text)
    );
    if (duplicatesReserved) {
      continue;
    }

    const duplicatesKept = kept.some((entry) =>
      hasStrongOverlap(contents, entry.card_contents) ||
      hasStrongOverlap(title, entry.card_title) ||
      hasStrongOverlap(contents, entry.card_title) ||
      hasSubsetTokenOverlap(title, entry.card_title) ||
      hasSubsetTokenOverlap(`${title} ${contents}`, `${entry.card_title} ${entry.card_contents}`) ||
      (signature && entry.signature && signature === entry.signature)
    );
    if (duplicatesKept) {
      continue;
    }

    usedSignatures.add(signature);
    kept.push({ ...clue, signature });
  }

  return kept.map(({ signature, ...clue }) => clue);
}

function dedupeGeneratedCluesOnly(clues) {
  const kept = [];
  const usedSignatures = new Set();

  for (const clue of Array.isArray(clues) ? clues : []) {
    const title = String(clue?.card_title || '').trim();
    const contents = String(clue?.card_contents || '').trim();
    if (!title || !contents) {
      continue;
    }

    const signature = buildEvidenceSignature({
      card_title: title,
      card_contents: contents
    }, {});
    if (signature && usedSignatures.has(signature)) {
      continue;
    }

    const duplicatesKept = kept.some((entry) =>
      hasStrongOverlap(contents, entry.card_contents) ||
      hasStrongOverlap(title, entry.card_title) ||
      hasSubsetTokenOverlap(title, entry.card_title) ||
      hasSubsetTokenOverlap(`${title} ${contents}`, `${entry.card_title} ${entry.card_contents}`) ||
      (signature && entry.signature && signature === entry.signature)
    );
    if (duplicatesKept) {
      continue;
    }

    usedSignatures.add(signature);
    kept.push({ ...clue, signature });
  }

  return kept.map(({ signature, ...clue }) => clue);
}

async function generateClues(context) {
  const prompt = buildCluesPrompt({
    storyBlurb: getStoryBlurb(context),
    trails: context.trails,
    narratives: context.narratives,
    characters: getCharacterCards(context.cards),
    people: getCardsByType(context.cards, 'person'),
    locations: getCardsByType(context.cards, 'location'),
    items: getCardsByType(context.cards, 'item'),
    clueTargets: context.clue_targets,
    puzzleBundles: context.puzzle_bundles
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'clue_cards',
    schema: cluesArraySchema(8, 16)
  });

  return result.cards || [];
}

export async function clueAgent(context) {
  context.debug ??= {};
  context.debug.rejection_log ??= [];

  if (SMOKE) {
    const clues = await generateClues(context);
    const cards = clues.map((c) => ({
      card_type: 'clue',
      card_title: c.card_title,
      card_contents: c.card_contents,
      location_ref: c.location_ref,
      trail_role: c.trail_role,
      act: trailRoleToAct[c.trail_role] || c.act
    }));
    return pushCards(context, 'clue', cards);
  }

  let clues = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    clues = dedupeGeneratedClues(context, await generateClues(context));
    if (clues.length >= MIN_CLUE_COUNT) {
      break;
    }
    context.debug.rejection_log.push({
      stage: 'clue_agent',
      attempt,
      reason: 'duplicate_open_clues_removed',
      remaining_count: clues.length
    });
  }

  if (clues.length < MIN_CLUE_COUNT) {
    context.debug.rejection_log.push({
      stage: 'clue_agent',
      reason: 'fallback_to_generated_only_dedupe',
      remaining_count: clues.length
    });
    clues = dedupeGeneratedCluesOnly(await generateClues(context));
  }

  if (clues.length < MIN_CLUE_COUNT) {
    throw new Error(`clue_agent produced only ${clues.length} usable clues after fallback dedupe`);
  }

  const cards = clues.map((c) => ({
    card_type: 'clue',
    card_title: c.card_title,
    card_contents: c.card_contents,
    location_ref: c.location_ref,
    trail_role: c.trail_role,
    act: trailRoleToAct[c.trail_role] || c.act
  }));

  return pushCards(context, 'clue', cards);
}
