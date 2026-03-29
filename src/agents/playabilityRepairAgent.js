import { callJson } from '../llm/client.js';
import { buildPlayabilityRepairPrompt } from '../prompts/playabilityRepairPrompt.js';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';
import { mergeCardMetadata } from '../utils/cards.js';

const TARGET_SCORE = Number(process.env.PLAYABILITY_TARGET || 9);
const MAX_ATTEMPTS = Number(process.env.PLAYABILITY_REPAIR_ATTEMPTS || 2);

function applyRepair(existingCards, editedCards) {
  const safeExistingCards = Array.isArray(existingCards) ? existingCards : [];
  const safeEditedCards = Array.isArray(editedCards) ? editedCards : [];

  if (safeExistingCards.length !== safeEditedCards.length) {
    throw new Error(`playability_repair_agent must preserve card count (${safeExistingCards.length} -> ${safeEditedCards.length})`);
  }

  const drafted = safeExistingCards.map((card, index) => {
    const edited = safeEditedCards[index] || {};
    return {
      card_id: card.card_id,
      card_type: card.card_type,
      card_title: String(edited.card_title || card.card_title || '').trim(),
      card_contents: String(edited.card_contents || card.card_contents || '').trim(),
      act: edited.act === 1 || edited.act === 2 || edited.act === 3
        ? edited.act
        : (card.act === 1 || card.act === 2 || card.act === 3 ? card.act : 1)
    };
  });

  return mergeCardMetadata(safeExistingCards, drafted);
}

export async function playabilityRepairAgent(context) {
  const existingCards = Array.isArray(context.cards) ? context.cards : [];
  if (!existingCards.length || process.env.SMOKE_MODE === 'true') {
    return context;
  }

  let report = context.playability_report || buildPlayabilityReport(context);
  context.playability_report = report;

  if (report.score_10 >= TARGET_SCORE || report.status === 'blocked' && !report.issues.length) {
    return context;
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: existingCards.length,
        maxItems: existingCards.length,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card_title', 'card_contents', 'act'],
          properties: {
            card_title: { type: 'string' },
            card_contents: { type: 'string' },
            act: { type: 'integer', enum: [1, 2, 3] }
          }
        }
      }
    }
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await callJson({
      ...buildPlayabilityRepairPrompt(context, report),
      schemaName: 'playability_repair',
      schema
    });

    const candidateCards = applyRepair(context.cards, result.cards);
    const candidateReport = buildPlayabilityReport({
      ...context,
      cards: candidateCards
    });

    if (candidateReport.score_10 <= report.score_10) {
      context.debug.warning_log.push({
        stage: 'playability_repair_agent',
        reason: 'repair_attempt_not_improved',
        previous_score: report.score_10,
        candidate_score: candidateReport.score_10
      });
      break;
    }

    context.cards = candidateCards;
    context.playability_report = candidateReport;
    report = candidateReport;

    if (report.score_10 >= TARGET_SCORE || report.pass === true) {
      break;
    }
  }

  return context;
}
