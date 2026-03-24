import { callJson } from "../llm/client.js";
import { buildTrailsPrompt } from "../prompts/trailsPrompt.js";
import { trailsSchema } from "../schemas/trailsSchema.js";

export async function breadcrumbTrailAgent(context) {
  const prompt = buildTrailsPrompt({
    storyBlurb: context.storyBlurb,
    solutions: context.solutions
  });

  const result = await callJson({
    ...prompt,
    schemaName: "breadcrumb_trails",
    schema: trailsSchema
  });

  context.trails = result.trails;
  return context;
}
