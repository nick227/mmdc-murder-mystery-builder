import { callJson } from "../llm/client.js";
import { trailsSchema } from "../schemas/trailsSchema.js";
import { buildTrailReviewPrompt } from "../prompts/trailReviewPrompt.js";

export async function trailReviewAgent(context) {
  if (!context.trails?.length) {
    throw new Error("No trails to review");
  }

  const prompt = buildTrailReviewPrompt({
    storyBlurb: context.storyBlurb,
    solutions: context.solutions,
    trails: context.trails
  });

  const result = await callJson({
    ...prompt,
    schemaName: "reviewed_trails",
    schema: trailsSchema
  });

  context.trails = result.trails;
  return context;
}