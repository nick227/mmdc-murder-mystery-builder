import { callJson } from '../llm/client.js';
import { buildStoryActsPrompt } from '../prompts/storyActsPrompt.js';
import { simpleCardsSchema } from '../schemas/simpleCardsSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const MAX_PARSE_RETRIES = 2;

export async function storyActsAgent(context) {
  const prompt = buildStoryActsPrompt({
    storyBlurb: getStoryBlurb(context),
    narratives: context.narratives,
    characters: getCharacterCards(context.cards),
    locations: getCardsByType(context.cards, 'location')
  });

  let result = null;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_PARSE_RETRIES + 1; attempt += 1) {
    try {
      result = await callJson({
        ...prompt,
        schemaName: 'story_acts',
        schema: simpleCardsSchema
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      if (!/Failed to parse JSON from model response/i.test(message) || attempt > MAX_PARSE_RETRIES) {
        throw error;
      }
      context.debug ??= {};
      context.debug.warning_log ??= [];
      context.debug.warning_log.push({
        stage: 'story_acts_agent',
        code: 'json_parse_retry',
        attempt,
        message
      });
      console.log(`[story_acts_agent] JSON parse retry ${attempt}: ${message}`);
    }
  }

  if (!result) {
    throw lastError || new Error('story_acts_agent failed to produce story acts');
  }

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? (i + 1)
  }));

  return pushCards(context, 'story_act', cards);
}
