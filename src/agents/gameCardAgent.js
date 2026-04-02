import { callJson } from '../llm/client.js';
import { buildGameCardsPromptForPlayer } from '../prompts/gameCardsPrompt.js';
import { actedCardsArraySchema } from '../schemas/cardsSchema.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import {
  buildSuspectRoster,
  collectGameCardTargetMetrics,
  rebalanceGameCardTargets
} from '../utils/gameCardTargetRebalance.js';
import { getStoryBlurb } from '../utils/context.js';

const MAX_ATTEMPTS = 5;
const CARDS_PER_PLAYER = 5;
const BETWEEN_PLAYER_DELAY_MS = 2000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaseCharacterName(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return text.split(',')[0].trim() || text;
}

function playerFromCharacterCard(card) {
  const title = String(card?.card_title || '').trim();
  const name = getBaseCharacterName(title) || title;
  const role = title.includes(',') ? title.split(',').slice(1).join(',').trim() : '';
  return {
    card_id: String(card?.card_id || '').trim() || null,
    name,
    role,
    bio: String(card?.card_contents || '').trim()
  };
}

function playerFromSuspect(s) {
  const title = String(s?.title || s?.name || '').trim();
  const name = String(s?.name || '').trim() || getBaseCharacterName(title);
  const role = title.includes(',') && String(s?.title || '').includes(',')
    ? String(s.title).split(',').slice(1).join(',').trim()
    : '';
  return {
    card_id: String(s?.card_id || '').trim() || null,
    name,
    role,
    bio: ''
  };
}

function resolveGameCardPlayers(context) {
  const n = context.playerCount || 4;
  const chars = getCharacterCards(context.cards || []);
  if (chars.length >= n) {
    return chars.slice(0, n).map(playerFromCharacterCard);
  }
  const suspects = Array.isArray(context.case_state?.suspects) ? context.case_state.suspects : [];
  if (suspects.length >= n) {
    return suspects.slice(0, n).map(playerFromSuspect);
  }
  throw new Error(`game_card_agent needs at least ${n} character cards or case_state.suspects`);
}

function analyzeGameCards(cards, caseState) {
  const issues = [];
  const roster = buildSuspectRoster(caseState);
  const { primaryTargetCounts, namedPrimaryTargetCardCount } = collectGameCardTargetMetrics(cards, roster);

  if (roster.length && namedPrimaryTargetCardCount > roster.length * 2) {
    issues.push(
      `Only ${roster.length * 2} non-flavor cards may use a named primary target in this run; current draft uses ${namedPrimaryTargetCardCount}. Shift extras toward group bits, props, or locations.`
    );
  }

  for (const [name, count] of Object.entries(primaryTargetCounts)) {
    if (count > 2) {
      issues.push(
        `${name} is the primary target in ${count} non-flavor cards. Reduce to at most 2 by retargeting or making a card group or atmospheric instead.`
      );
    }
  }

  return issues;
}

export async function gameCardAgent(context) {
  const schema = actedCardsArraySchema(CARDS_PER_PLAYER, CARDS_PER_PLAYER);
  const players = resolveGameCardPlayers(context);
  let rejectionReasons = [];
  let cards = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    cards = [];

    for (let p = 0; p < players.length; p += 1) {
      if (p > 0) {
        await delay(BETWEEN_PLAYER_DELAY_MS);
      }

      const player = players[p];
      const prompt = buildGameCardsPromptForPlayer({
        storyBlurb: getStoryBlurb(context),
        characterName: player.name,
        characterRole: player.role,
        characterBio: player.bio,
        playerIndex: p,
        playerCount: players.length,
        rejectionReasons
      });

      const result = await callJson({
        ...prompt,
        schemaName: 'game_cards',
        schema
      });

      const batch = result.cards || [];
      for (const c of batch) {
        const entry = { ...c };
        if (player.card_id) {
          entry.linked_character_id = player.card_id;
        }
        entry.linked_character = player.name;
        cards.push(entry);
      }
    }

    cards = rebalanceGameCardTargets(cards, context.case_state);
    rejectionReasons = analyzeGameCards(cards, context.case_state);
    if (!rejectionReasons.length) {
      break;
    }
  }

  return pushCards(context, 'game_card', cards);
}
