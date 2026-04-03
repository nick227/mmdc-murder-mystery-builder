import { callJson } from '../llm/client.js';
import { buildStoryActsPrompt } from '../prompts/storyActsPrompt.js';
import { actedSimpleCardsSchema } from '../schemas/simpleCardsSchema.js';
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
        schema: actedSimpleCardsSchema
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

  const raw = result.cards || [];
  if (raw.length !== 3) {
    throw new Error(`story_acts_agent: expected exactly 3 story act cards, got ${raw.length}`);
  }

  const cards = raw.map((c, i) => {
    const body = String(c?.card_contents || '').trim();
    if (body.length < 40) {
      throw new Error(`story_acts_agent: act ${i + 1} card_contents too short (need at least 40 characters)`);
    }
    const actNum = i + 1;
    const declared = c.act;
    if (declared !== undefined && declared !== null && Number(declared) !== actNum) {
      throw new Error(`story_acts_agent: card index ${i} must use act ${actNum}, got ${declared}`);
    }
    return {
      card_title: String(c?.card_title || '').trim(),
      card_contents: body,
      act: actNum,
      location_ref: c?.location_ref ?? null
    };
  });

  return pushCards(context, 'story_act', cards);
}
