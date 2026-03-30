import { callJson } from '../llm/client.js';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const MAX_ATTEMPTS = 3;
const NON_PLAYABLE_ROLE_TOKENS = ['constable', 'inspector', 'detective', 'steward', 'host', 'gardener', 'actor', 'poet', 'playwright'];

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

function scoreVictimCandidate(entry, storyBlurb) {
  const name = baseName(entry?.name || entry?.card_title);
  const summary = String(entry?.summary || entry?.card_contents || '').trim();
  const blob = normalizeText(`${name} ${summary} ${storyBlurb || ''}`);
  if (!name) {
    return -1;
  }

  let score = 0;
  if (/\b(victim|murdered|slain|dead|found dead|body)\b/.test(blob)) {
    score += 5;
  }
  if (/\b(host|steward|actor|poet|playwright|lord|lady|sir|master|mistress)\b/.test(blob)) {
    score += 2;
  }
  if (NON_PLAYABLE_ROLE_TOKENS.some((token) => blob.includes(token))) {
    score += 1;
  }
  return score;
}

function reserveVictim(context, worldPeople) {
  if (context.reservedVictim?.name) {
    return context.reservedVictim;
  }

  const personCards = getCardsByType(context.cards, 'person').map((card) => ({
    name: card.card_title,
    summary: card.card_contents
  }));
  const candidates = [...personCards, ...(Array.isArray(worldPeople) ? worldPeople : [])]
    .map((entry) => ({
      name: baseName(entry?.name),
      summary: String(entry?.summary || '').trim()
    }))
    .filter((entry, index, list) => entry.name && list.findIndex((candidate) => normalizeText(candidate.name) === normalizeText(entry.name)) === index);

  const sorted = candidates
    .map((entry) => ({
      ...entry,
      score: scoreVictimCandidate(entry, getStoryBlurb(context))
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const selected = sorted.find((entry) => entry.score >= 0) || null;
  if (!selected) {
    return null;
  }

  context.reservedVictim = {
    name: selected.name,
    summary: selected.summary
  };

  return context.reservedVictim;
}

const AXIS_PATTERNS = {
  motive: /\b(debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|ambition|covet)\b/i,
  access: /\b(access|key|backstage|cellar|study|vault|alcove|garden|room|entry|storage|route|passage|corridor)\b/i,
  opportunity: /\b(seen|spotted|present|near|alone|during|before|after|between|moving|arrived|left|whereabouts)\b/i,
  weapon: /\b(rope|dagger|poison|weapon|scarf|quill|blood|prop|blade)\b/i,
  contradiction: /\b(contradict|claims|despite|though|however|alibi|elsewhere|denied|secretly|lied|false)\b/i
};

function countAxes(text) {
  const value = String(text || '');
  return Object.values(AXIS_PATTERNS).filter((pattern) => pattern.test(value)).length;
}

function validateCharacterCards(cards, playerCount) {
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
    if (countAxes(card?.card_contents) < 2) {
      throw new Error(`characters_builder_agent weak suspect slot without enough deduction axes: ${baseName(card?.card_title)}`);
    }
  }
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

export async function charactersBuilderAgent(context) {
  const playerCount = context.playerCount ?? 4;
  context.debug ??= {};
  context.debug.rejection_log ??= [];
  const worldPeople = getCardsByType(context.cards, 'person').map((card) => ({
    name: card.card_title,
    summary: card.card_contents
  }));
  const reservedVictim = reserveVictim(context, worldPeople);
  const filteredWorldPeople = reservedVictim
    ? worldPeople.filter((entry) => normalizeText(baseName(entry?.name)) !== normalizeText(reservedVictim.name))
    : worldPeople;

  let cards = [];
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const prompt = buildCharactersBuilderPrompt({
        storyBlurb: getStoryBlurb(context),
        world: context.world,
        worldPeople: filteredWorldPeople,
        playerCount,
        reservedVictimName: reservedVictim?.name || '',
        rejectionReasons: context.debug.rejection_log
          .filter((entry) => entry?.stage === 'characters_builder_agent')
          .map((entry) => entry.reason)
          .slice(-4)
      });

      const result = await callJson({
        ...prompt,
        schemaName: 'characters_builder',
        schema: buildSchema(playerCount)
      });

      const candidateCards = (result.cards || []).map((c) => ({
        card_type: 'character',
        card_title: c.card_title,
        card_contents: c.card_contents
      }));

      validateCharacterCards(candidateCards, playerCount);
      if (reservedVictim && candidateCards.some((card) => normalizeText(baseName(card?.card_title)) === normalizeText(reservedVictim.name))) {
        throw new Error(`characters_builder_agent reserved victim leaked into playable roster: ${reservedVictim.name}`);
      }
      cards = candidateCards;
      break;
    } catch (error) {
      lastError = error;
      cards = [];
      context.debug.rejection_log.push({
        stage: 'characters_builder_agent',
        attempt,
        reason: String(error?.message || error)
      });
    }
  }

  if (!cards.length) {
    throw lastError || new Error('characters_builder_agent failed to create a valid suspect cast');
  }

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
