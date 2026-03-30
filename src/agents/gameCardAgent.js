import { callJson } from '../llm/client.js';
import { buildGameCardsPrompt } from '../prompts/gameCardsPrompt.js';
import { actedCardsArraySchema } from '../schemas/cardsSchema.js';
import { getCardsByType, pushCards } from '../utils/cards.js';
import {
  buildSuspectRoster,
  collectGameCardTargetMetrics,
  rebalanceGameCardTargets
} from '../utils/gameCardTargetRebalance.js';
import { getStoryBlurb } from '../utils/context.js';

const GAME_CARD_TYPES = ['performance', 'conversation', 'search', 'flavor', 'accusation', 'alibi', 'trade', 'revelation'];
const MAX_ATTEMPTS = 5;

function analyzeGameCards(cards, caseState, playerCount) {
  const issues = [];
  const expectedActCounts = {
    1: playerCount * 2,
    2: playerCount,
    3: playerCount * 2
  };
  const roster = buildSuspectRoster(caseState);

  const actCounts = { 1: 0, 2: 0, 3: 0 };
  const typeCounts = Object.fromEntries(GAME_CARD_TYPES.map((type) => [type, 0]));
  const { primaryTargetCounts, namedPrimaryTargetCardCount } = collectGameCardTargetMetrics(cards, roster);

  for (const card of Array.isArray(cards) ? cards : []) {
    if (actCounts[card?.act] !== undefined) {
      actCounts[card.act] += 1;
    }
    if (typeCounts[card?.game_card_type] !== undefined) {
      typeCounts[card.game_card_type] += 1;
    }
  }

  for (const type of GAME_CARD_TYPES) {
    if (typeCounts[type] === 0) {
      issues.push(`Include at least one ${type} card.`);
    }
  }

  for (const act of [1, 2, 3]) {
    if (actCounts[act] !== expectedActCounts[act]) {
      issues.push(`Use exactly ${expectedActCounts[act]} act ${act} cards; current draft has ${actCounts[act]}.`);
    }
  }

  if (roster.length && namedPrimaryTargetCardCount > roster.length * 2) {
    issues.push(`Only ${roster.length * 2} non-flavor cards may use a named primary target in this run; current draft uses ${namedPrimaryTargetCardCount}. Rewrite the excess cards around items, locations, public scenes, rumors, or group actions.`);
  }

  for (const [name, count] of Object.entries(primaryTargetCounts)) {
    if (count > 2) {
      issues.push(`${name} is the primary target in ${count} non-flavor cards. Reduce that to at most 2 by retargeting or rewriting cards around items, locations, or public scenes.`);
    }
  }

  return issues;
}

export async function gameCardAgent(context) {
  const cardCount = (context.playerCount || 4) * 5;
  const schema = actedCardsArraySchema(cardCount, cardCount);
  const secretCards = getCardsByType(context.cards, 'secret');
  let rejectionReasons = [];
  let cards = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const prompt = buildGameCardsPrompt({
      storyBlurb: getStoryBlurb(context),
      playerCount: context.playerCount,
      narratives: context.narratives,
      caseState: context.case_state,
      secretCards,
      rejectionReasons
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'game_cards',
      schema
    });

    cards = result.cards || [];
    cards = rebalanceGameCardTargets(cards, context.case_state);
    rejectionReasons = analyzeGameCards(cards, context.case_state, context.playerCount || 4);
    if (!rejectionReasons.length) {
      break;
    }
  }

  return pushCards(context, 'game_card', cards);
}
