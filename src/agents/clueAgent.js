import crypto from 'node:crypto';
import { callJson } from '../llm/client.js';
import { buildCluesPrompt } from '../prompts/cluesPrompt.js';
import { cluesArraySchema } from '../schemas/clueSchema.js';
import { getCardsByType, getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb, getStoryMetaForPrompts } from '../utils/context.js';
import { truncateToWordCount, MAX_STANDALONE_CLUE_WORDS } from '../utils/clueTextSanitize.js';
import { getMurderCanonRef } from '../utils/canonFacts.js';

const DEFAULT_CLUES_PER_PLAYER = 3;
const SMOKE = process.env.SMOKE_MODE === 'true';

async function generateClues(context, totalClues, numPlayers, callJsonImpl = callJson) {
  const prompt = buildCluesPrompt({
    storyBlurb: getStoryBlurb(context),
    storyMeta: getStoryMetaForPrompts(context),
    characters: getCharacterCards(context.cards),
    locations: getCardsByType(context.cards, 'location'),
    narratives: context.narratives,
    totalClues,
    numPlayers,
    coreTruth: context.coreTruth,
    context
  });

  const result = await callJsonImpl({
    ...prompt,
    schemaName: 'clue_cards',
    schema: cluesArraySchema(totalClues, totalClues)
  });

  return Array.isArray(result?.cards) ? result.cards : [];
}

export async function clueAgent(context, options = {}) {
  const callJsonImpl = typeof options.callJsonImpl === 'function' ? options.callJsonImpl : callJson;
  const numPlayers = Number.isFinite(Number(options.numPlayers))
    ? Number(options.numPlayers)
    : Number(context?.playerCount || 4);
  const cluesPerPlayer = Number.isFinite(Number(options.cluesPerPlayer))
    ? Number(options.cluesPerPlayer)
    : DEFAULT_CLUES_PER_PLAYER;
  const totalClues = Math.max(1, numPlayers * cluesPerPlayer);

  const clues = await generateClues(
    context,
    totalClues,
    numPlayers,
    callJsonImpl
  );
  if (clues.length < totalClues && !SMOKE) {
    throw new Error(`clue_agent produced ${clues.length} clues; expected at least ${totalClues}`);
  }

  const murderCanon = getMurderCanonRef(context.coreTruth);
  const cards = clues.slice(0, totalClues).map((clue) => ({
    card_id: crypto.randomUUID(),
    card_type: 'clue',
    card_title: clue.card_title,
    murder_canon: { ...murderCanon },
    card_contents: truncateToWordCount(clue.card_contents, MAX_STANDALONE_CLUE_WORDS),
    clue_type: clue.clue_type,
    suspect_name: clue.suspect_name,
    clue_weight: clue.clue_weight
  }));

  if (!Array.isArray(context.cards)) {
    context.cards = [];
  }
  context.cards.push(...cards);
  return context;
}
