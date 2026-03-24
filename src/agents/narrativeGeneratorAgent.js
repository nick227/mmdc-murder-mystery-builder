import { callJson } from "../llm/client.js";
import { buildNarrativesPrompt } from "../prompts/narrativesPrompt.js";
import { narrativesSchema } from "../schemas/narrativesSchema.js";

export async function narrativeGeneratorAgent(context) {
  if (!context.trails?.length) {
    throw new Error("No validated trails available for narrative_generator_agent");
  }

  const prompt = buildNarrativesPrompt({
    storyBlurb: context.storyBlurb,
    solutions: context.solutions,
    trails: context.trails,
    playerCount: context.playerCount
  });

  const result = await callJson({
    ...prompt,
    schemaName: "suspect_narratives",
    schema: narrativesSchema
  });

  context.narratives = result.narratives;
  return context;
}
