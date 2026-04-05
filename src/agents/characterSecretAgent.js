import { callJson } from '../llm/client.js';
import { buildCharacterSecretsPrompt } from '../prompts/characterSecretsPrompt.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const SECRET_TYPES = new Set(['access', 'motive', 'alibi', 'relationship']);
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
        required: ['card_title', 'secret_type', 'card_contents'],
        properties: {
          card_title: { type: 'string' },
          secret_type: { type: 'string', enum: [...SECRET_TYPES] },
          card_contents: { type: 'string' }
        }
      }
    }
  }
};

const MAX_ATTEMPTS = 3;
const MATERIAL_PATTERN = /\b(access|key|backstage|cellar|study|vault|alcove|room|entry|route|passage|seen|spotted|present|near|during|before|after|whereabouts|entering|entered|slipping|slipped|rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|debt|threat|inheritance|blackmail|alibi|lied|denied|secretly)\b/i;
const MOTIVE_PATTERN = /\b(debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|rival|rivalry|ambition|leverage|resentment|reputation|career|fame|role|endorsement|criticized|wanted)\b/i;
const LOGISTICAL_HOOK_PATTERN = /\b(access|key|backstage|cellar|study|vault|alcove|room|entry|route|passage|moving|arrived|left|entering|entered|slipping|slipped|seen|spotted|present|near|during|before|after|whereabouts|rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|print|holding|carrying|found)\b/i;
const COMPETITIVE_HOOK_PATTERN = /\b(contradict|claims|despite|though|however|alibi|elsewhere|denied|inconsistent|debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|opportunity|alone|between|wanted)\b/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMotiveSignature(text, characterName) {
  let normalized = normalizeText(text);
  const variants = [
    String(characterName || '').trim(),
    String(characterName || '').split(',')[0]?.trim() || ''
  ]
    .map(normalizeText)
    .filter(Boolean);
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function validateSecrets(cards, characterName, existingMotiveSignatures) {
  if (!Array.isArray(cards) || cards.length < 2) {
    throw new Error(`character_secret_agent produced too few secrets for ${characterName}`);
  }

  const titleKeys = new Set();
  for (const card of cards) {
    const title = String(card?.card_title || '').trim();
    if (!title) {
      throw new Error(`character_secret_agent missing card_title for ${characterName}`);
    }
    const normalized = normalizeText(title);
    if (!normalized || normalized === 'secret' || normalized === 'confidential') {
      throw new Error(`character_secret_agent produced a generic card_title for ${characterName}`);
    }
    if (titleKeys.has(normalized)) {
      throw new Error(`character_secret_agent duplicate card_title for ${characterName}`);
    }
    titleKeys.add(normalized);
  }

  const secretTypes = cards.map((card) => String(card?.secret_type || '').trim());
  if (secretTypes.some((secretType) => !SECRET_TYPES.has(secretType))) {
    throw new Error(`character_secret_agent produced invalid secret_type for ${characterName}`);
  }

  const motiveSecrets = cards.filter((card) => String(card?.secret_type || '').trim() === 'motive');
  if (!motiveSecrets.length) {
    throw new Error(`character_secret_agent missing motive secret for ${characterName}`);
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
  const hasLogisticalHook = cards.some((card) => {
    const text = String(card?.card_contents || '');
    const secretType = String(card?.secret_type || '').trim();
    return secretType === 'access' || secretType === 'alibi' || LOGISTICAL_HOOK_PATTERN.test(text);
  });
  if (!hasLogisticalHook) {
    throw new Error(`character_secret_agent missing logistical deduction hook for ${characterName}`);
  }
  const hasCompetitiveHook = cards.some((card) => {
    const text = String(card?.card_contents || '');
    const secretType = String(card?.secret_type || '').trim();
    return secretType === 'motive' || secretType === 'relationship' || COMPETITIVE_HOOK_PATTERN.test(text);
  });
  if (!hasCompetitiveHook) {
    throw new Error(`character_secret_agent missing competitive deduction hook for ${characterName}`);
  }

  for (const motiveCard of motiveSecrets) {
    const signature = normalizeMotiveSignature(motiveCard.card_contents, characterName);
    if (!signature) {
      throw new Error(`character_secret_agent empty motive signature for ${characterName}`);
    }
    if (existingMotiveSignatures.has(signature)) {
      throw new Error(`character_secret_agent duplicate motive secret for ${characterName}`);
    }
  }
}

export async function characterSecretAgent(context) {
  const characters = getCharacterCards(context.cards).filter((c) => c.card_title?.trim());
  const secrets = [];
  const usedMotiveSignatures = new Set();
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
          usedMotiveSecrets: [...usedMotiveSignatures],
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
          secret_type: c.secret_type,
          card_contents: c.card_contents,
          linked_character: String(character.card_title || '').split(',')[0].trim()
        }));

        validateSecrets(cards, character.card_title, usedMotiveSignatures);
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

    for (const secret of cards) {
      if (secret.secret_type !== 'motive') {
        continue;
      }
      usedMotiveSignatures.add(normalizeMotiveSignature(secret.card_contents, character.card_title));
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
