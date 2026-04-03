import { callJson } from '../llm/client.js';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';
import { mergeCardMetadata } from '../utils/cards.js';
import { buildTargetedPlayabilityRepairPrompt } from '../prompts/targetedPlayabilityRepairPrompt.js';

const ISSUE_SCOPE_MAP = new Map([
  ['timeline_argument_conflict', 'timeline'],
  ['timeline_argument_end_mismatch', 'timeline'],
  ['unknown_roster_entities', 'roster'],
  ['missing_victim_identity', 'identity']
]);

function getRepairScopes(report) {
  const scopes = new Set();
  for (const issue of Array.isArray(report?.issues) ? report.issues : []) {
    const scope = ISSUE_SCOPE_MAP.get(issue?.code);
    if (scope) {
      scopes.add(scope);
    }
  }
  return [...scopes];
}

function applyRepair(existingCards, editedCards) {
  const safeExistingCards = Array.isArray(existingCards) ? existingCards : [];
  const safeEditedCards = Array.isArray(editedCards) ? editedCards : [];

  if (safeExistingCards.length !== safeEditedCards.length) {
    throw new Error(`targeted_playability_repair_agent must preserve card count (${safeExistingCards.length} -> ${safeEditedCards.length})`);
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

export async function targetedPlayabilityRepairAgent(context) {
  if (process.env.SMOKE_MODE === 'true') {
    return context;
  }

  const report = context.playability_report || buildPlayabilityReport(context);
  context.playability_report = report;

  const scopes = getRepairScopes(report);
  if (!scopes.length) {
    return context;
  }

  const existingCards = Array.isArray(context.cards) ? context.cards : [];
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

  const result = await callJson({
    ...buildTargetedPlayabilityRepairPrompt(context, report, scopes),
    schemaName: 'targeted_playability_repair',
    schema
  });

  const repairedCards = applyRepair(existingCards, result.cards);
  const repairedReport = buildPlayabilityReport({
    ...context,
    cards: repairedCards
  });

  if (repairedReport.score_10 > report.score_10) {
    context.cards = repairedCards;
    context.playability_report = repairedReport;
  } else {
    context.debug.warning_log.push({
      stage: 'targeted_playability_repair_agent',
      reason: 'repair_attempt_not_improved',
      scopes,
      previous_score: report.score_10,
      candidate_score: repairedReport.score_10
    });
  }

  return context;
}
