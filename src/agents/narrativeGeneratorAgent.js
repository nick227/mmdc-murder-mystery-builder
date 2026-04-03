import { callJson } from '../llm/client.js';
import { buildNarrativesPrompt } from '../prompts/narrativesPrompt.js';
import { narrativesSchema } from '../schemas/narrativesSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getSolution, getStoryBlurb } from '../utils/context.js';

function getBaseCharacterName(value) {
  const title = String(value || '').trim();
  if (!title) {
    return '';
  }
  return title.split(',')[0].trim() || title;
}

function buildNarrativesSchemaForCharacters(characters) {
  const allowedSuspects = (Array.isArray(characters) ? characters : [])
    .map((c) => getBaseCharacterName(c?.card_title))
    .filter(Boolean);

  if (!allowedSuspects.length) {
    return narrativesSchema;
  }

  const base = structuredClone(narrativesSchema);
  for (const key of ['a', 'b', 'c']) {
    base.properties.narratives.properties[key].properties.suspect = {
      type: 'string',
      enum: allowedSuspects
    };
  }
  return base;
}

export async function narrativeGeneratorAgent(context) {
  const characters = getCharacterCards(context.cards);
  const prompt = buildNarrativesPrompt({
    storyBlurb: getStoryBlurb(context),
    solution: getSolution(context),
    trails: context.trails,
    playerCount: context.playerCount,
    characters
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'suspect_narratives',
    schema: buildNarrativesSchemaForCharacters(characters)
  });

  context.narratives = result.narratives || result;
  return context;
}
