import { callJson } from '../llm/client.js';
import { buildWorldBuildingPrompt } from '../prompts/worldBuildingPrompt.js';
import { worldBuildingSchema } from '../schemas/worldBuildingSchema.js';
import { appendUniqueCards } from '../utils/seedCards.js';

function toSeedCards(entities, cardType) {
  return (Array.isArray(entities) ? entities : []).map((entity) => ({
    card_type: cardType,
    card_title: String(entity?.name || '').trim(),
    card_contents: String(entity?.summary || '').trim(),
    act: 1
  }));
}

export async function worldBuildingAgent(context) {
  const prompt = buildWorldBuildingPrompt(context);
  const result = await callJson({
    ...prompt,
    schemaName: 'world_building',
    schema: worldBuildingSchema
  });
  context.world = result.world;
  context.worldEntities = {
    people: result.people || [],
    locations: result.locations || [],
    items: result.items || []
  };
  appendUniqueCards(context, [
    ...toSeedCards(result.people, 'person'),
    ...toSeedCards(result.locations, 'location'),
    ...toSeedCards(result.items, 'item')
  ]);
  return context;
}
