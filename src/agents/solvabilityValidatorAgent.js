import { callJson } from '../llm/client.js';
import { buildSolvabilityValidatorPrompt } from '../prompts/solvabilityValidatorPrompt.js';
import { buildSolvabilityRepairPrompt } from '../prompts/solvabilityRepairPrompt.js';
import { mergeCardMetadata } from '../utils/cards.js';

const solvabilitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'problems'],
  properties: {
    pass: { type: 'boolean' },
    problems: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const solvabilityRepairSchema = {
  type: 'object',
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'card_type',
          'card_title',
          'card_contents'
        ],
        properties: {
          card_id: { type: 'string' },
          card_type: { type: 'string' },
          card_title: { type: 'string' },
          card_contents: { type: 'string' },
          linked_character_id: {
            type: 'string'
          },
          act: {
            type: ['number', 'null']
          },
          explanation: {
            type: ['string', 'null']
          }
        }
      }
    }
  }
};

export async function solvabilityValidatorAgent(context) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const validatePrompt = buildSolvabilityValidatorPrompt(context);

    const result = await callJson({
      ...validatePrompt,
      schemaName: 'solvability_validation',
      schema: solvabilitySchema
    });

    console.log('VALIDATOR RESULT:', result);

    if (result.pass === true) {
      return context;
    }

    const problems = Array.isArray(result.problems)
      ? result.problems
      : ['unspecified solvability failure'];

    console.log('SOLVABILITY REPAIR:', problems);

    const repairPrompt = buildSolvabilityRepairPrompt(context, problems);

    const repair = await callJson({
      ...repairPrompt,
      schemaName: 'solvability_repair',
      schema: solvabilityRepairSchema
    });

    if (!repair || !repair.cards) {
      break;
    }

    if (
      repair.cards.length === context.cards.length &&
      isValidCards(repair.cards) &&
      sameCardShape(context.cards, repair.cards) &&
      cardsChanged(context.cards, repair.cards)
    ) {
      console.log('REPAIR APPLIED');
      context.cards = mergeCardMetadata(context.cards, repair.cards);
    } else {
      break;
    }
  }

  const finalCheck = await callJson({
    ...buildSolvabilityValidatorPrompt(context),
    schemaName: 'solvability_validation',
    schema: solvabilitySchema
  });

  if (finalCheck.pass !== true) {
    throw new Error(
      'FAIL: unsolvable after repair\n' +
      JSON.stringify(finalCheck.problems || [], null, 2)
    );
  }

  return context;
}

function isValidCards(cards) {
  return Array.isArray(cards) && cards.every((c) =>
    c.card_type &&
    c.card_title &&
    c.card_contents
  );
}

function sameCardShape(a, b) {
  return a.every((card, i) =>
    card.card_type === b[i].card_type
  );
}

function cardsChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
