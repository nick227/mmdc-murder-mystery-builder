import { callJson } from '../llm/client.js';
import { buildCharacterSecretsPrompt } from '../prompts/characterSecretsPrompt.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
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

const MAX_ATTEMPTS = 3;
const MATERIAL_PATTERN = /\b(access|key|backstage|cellar|study|vault|alcove|room|entry|route|passage|seen|spotted|present|near|during|before|after|whereabouts|rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|debt|threat|inheritance|blackmail|alibi|lied|denied|secretly)\b/i;
const MOTIVE_PATTERN = /\b(debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|rival|ambition|leverage)\b/i;
const LOGISTICAL_HOOK_PATTERN = /\b(access|key|backstage|cellar|study|vault|alcove|room|entry|route|passage|moving|arrived|left|seen|spotted|present|near|during|before|after|whereabouts|rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|print|holding|carrying|found)\b/i;
const COMPETITIVE_HOOK_PATTERN = /\b(contradict|claims|despite|though|however|alibi|elsewhere|denied|inconsistent|debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|opportunity|alone|between)\b/i;

function validateSecrets(cards, characterName) {
  if (!Array.isArray(cards) || cards.length < 2) {
    throw new Error(`character_secret_agent produced too few secrets for ${characterName}`);
  }
  const contents = cards.map((card) => String(card?.card_contents || ''));
  const hasMaterialSecret = contents.some((text) => MATERIAL_PATTERN.test(text));
  if (!hasMaterialSecret) {
    throw new Error(`character_secret_agent produced no materially useful secret for ${characterName}`);
  }
  const hasMotiveHook = contents.some((text) => MOTIVE_PATTERN.test(text));
  if (!hasMotiveHook) {
    throw new Error(`character_secret_agent missing motive hook for ${characterName}`);
  }
  const hasLogisticalHook = contents.some((text) => LOGISTICAL_HOOK_PATTERN.test(text));
  if (!hasLogisticalHook) {
    throw new Error(`character_secret_agent missing logistical deduction hook for ${characterName}`);
  }
  const hasCompetitiveHook = contents.some((text) => COMPETITIVE_HOOK_PATTERN.test(text));
  if (!hasCompetitiveHook) {
    throw new Error(`character_secret_agent missing competitive deduction hook for ${characterName}`);
  }
}

export async function characterSecretAgent(context) {
  const characters = getCharacterCards(context.cards).filter((c) => c.card_title?.trim());
  const secrets = [];
  context.debug ??= {};
  context.debug.rejection_log ??= [];

  for (const character of characters) {
    if (!character.card_id) {
      throw new Error(`character_secret_agent requires card_id on character "${character.card_title}"`);
    }

    let cards = [];
    let lastError = null;
    let rejectionReasons = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const prompt = buildCharacterSecretsPrompt({
          storyBlurb: getStoryBlurb(context),
          characterName: character.card_title,
          rejectionReasons
        });

        const result = await callJson({
          ...prompt,
          schemaName: 'character_secrets',
          schema
        });

        cards = (result.cards || []).map((c) => ({
          card_type: 'secret',
          card_title: c.card_title,
          card_contents: c.card_contents,
          linked_character_id: character.card_id
        }));

        validateSecrets(cards, character.card_title);
        break;
      } catch (error) {
        lastError = error;
        rejectionReasons = [String(error?.message || error)];
        context.debug.rejection_log.push({
          stage: 'character_secret_agent',
          character: character.card_title,
          attempt,
          reason: String(error?.message || error)
        });
      }
    }

    if (!cards.length) {
      throw lastError || new Error(`character_secret_agent failed for ${character.card_title}`);
    }

    secrets.push(...cards);

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  pushCards(context, 'secret', secrets);

  const secretCount = getCardsByType(context.cards, 'secret').length;
  if (secretCount < characters.length) {
    throw new Error(`character_secret_agent produced ${secretCount} secrets for ${characters.length} characters`);
  }

  return context;
}
