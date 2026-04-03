import { callJson } from '../llm/client.js';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

function buildSchema(playerCount) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: playerCount,
        maxItems: playerCount,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card_title', 'card_contents'],
          properties: {
            card_title: { type: 'string' },
            card_contents: { type: 'string' }
          }
        }
      }
    }
  };
}

function assertValidCharacters(cards, playerCount) {
  if (!Array.isArray(cards) || cards.length !== playerCount) {
    throw new Error(`characters_builder_agent produced ${Array.isArray(cards) ? cards.length : 0} characters for playerCount=${playerCount}`);
  }
  const names = new Set();
  for (const card of cards) {
    const name = normalizeText(baseName(card?.card_title));
    if (!name) {
      throw new Error('characters_builder_agent produced a character without a usable base name');
    }
    if (names.has(name)) {
      throw new Error(`characters_builder_agent duplicated suspect identity: ${baseName(card?.card_title)}`);
    }
    names.add(name);
  }
}

export async function charactersBuilderAgent(context) {
  const playerCount = context.playerCount ?? 4;
  const worldPeople = getCardsByType(context.cards, 'person').map((card) => ({
    name: card.card_title,
    summary: card.card_contents
  }));

  const result = await callJson({
    ...buildCharactersBuilderPrompt({
      storyBlurb: getStoryBlurb(context),
      world: context.world,
      worldPeople,
      playerCount
    }),
    schemaName: 'characters_builder',
    schema: buildSchema(playerCount)
  });

  const cards = (result.cards || []).map((c) => ({
    card_type: 'character',
    card_title: c.card_title,
    card_contents: c.card_contents
  }));

  assertValidCharacters(cards, playerCount);

  pushCards(context, 'character', cards);

  const playableNames = new Set(
    cards.map((card) => normalizeText(baseName(card.card_title))).filter(Boolean)
  );
  context.cards = (Array.isArray(context.cards) ? context.cards : []).filter((card) => {
    if (card?.card_type !== 'person') {
      return true;
    }
    return !playableNames.has(normalizeText(baseName(card.card_title)));
  });

  const characterCount = getCharacterCards(context.cards).length;
  if (characterCount !== playerCount) {
    throw new Error(`characters_builder_agent produced ${characterCount} characters for playerCount=${playerCount}`);
  }

  return context;
}
