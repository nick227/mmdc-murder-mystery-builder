import { callJson } from '../llm/client.js';
import { buildPuzzleEvidencePrompt } from '../prompts/puzzleEvidencePrompt.js';
import { getStoryBlurb } from '../utils/context.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectBundleIds(cards) {
  const ids = new Set();
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.bundle_id) {
      ids.add(card.bundle_id);
    }
  }
  return [...ids];
}

function buildEvidenceRewriteSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['card_id', 'evidence_type', 'card_contents'],
    properties: {
      card_id: { type: 'string' },
      evidence_type: {
        type: 'string',
        enum: [
          'logs',
          'schedules',
          'lists',
          'notes',
          'transcripts',
          'ledgers',
          'receipts',
          'rosters',
          'constraints',
          'comparisons',
          'cipher_blocks',
          'diagrams',
          'maps'
        ]
      },
      card_contents: { type: 'string' }
    }
  };
}

function applyEvidenceRewrite(existingCards, rewrite) {
  const cardId = String(rewrite?.card_id || '').trim();
  if (!cardId) {
    return existingCards;
  }
  return (Array.isArray(existingCards) ? existingCards : []).map((card) => {
    if (String(card?.card_id || '').trim() !== cardId) {
      return card;
    }
    return {
      ...card,
      evidence_type: String(rewrite.evidence_type || '').trim() || card.evidence_type,
      card_contents: String(rewrite.card_contents || '').trim() || card.card_contents
    };
  });
}

function selectBundleCards(cards, bundleId) {
  const list = Array.isArray(cards) ? cards : [];
  const puzzle = list.find((c) => c?.bundle_id === bundleId && c.card_type === 'puzzle') || null;
  const answer = list.find((c) => c?.bundle_id === bundleId && c.card_type === 'solution') || null;
  const evidence = list
    .filter((c) => c?.bundle_id === bundleId && c.card_type === 'clue' && c.hidden_until_solved !== true)
    .map((c) => ({ card_id: c.card_id, card_title: c.card_title, card_contents: c.card_contents }));

  return { puzzle, answer, evidence };
}

export async function puzzleEvidenceAgent(context) {
  if (process.env.SMOKE_MODE === 'true') {
    return context;
  }

  const cards = Array.isArray(context.cards) ? context.cards : [];
  const bundleIds = collectBundleIds(cards);
  if (!bundleIds.length) {
    return context;
  }

  let nextCards = cards;

  for (const bundleId of bundleIds) {
    const { puzzle, answer, evidence } = selectBundleCards(nextCards, bundleId);
    if (!puzzle || !answer || evidence.length < 1) {
      continue;
    }

    for (let i = 0; i < evidence.length; i += 1) {
      const current = evidence[i];
      const others = evidence.filter((e) => e.card_id !== current.card_id);
      const prompt = buildPuzzleEvidencePrompt({
        storyBlurb: getStoryBlurb(context),
        puzzle: { card_title: puzzle.card_title, card_contents: puzzle.card_contents },
        answer: { card_title: answer.card_title, card_contents: answer.card_contents },
        currentEvidenceCard: current,
        otherEvidenceCards: others
      });

      const result = await callJson({
        ...prompt,
        schemaName: 'puzzle_evidence',
        schema: buildEvidenceRewriteSchema()
      });

      if (isObject(result)) {
        nextCards = applyEvidenceRewrite(nextCards, result);
      }
    }
  }

  context.cards = nextCards;
  return context;
}

