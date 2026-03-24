import { callJson } from "../llm/client.js";
import { buildSolutionPrompt } from "../prompts/solutionPrompt.js";
import { solutionSchema } from "../schemas/solutionSchema.js";

export async function solutionAgent(context) {
  const prompt = buildSolutionPrompt({
    storyBlurb: context.storyBlurb
  });

  context.solutions = await callJson({
    ...prompt,
    schemaName: "mystery_solution",
    schema: solutionSchema
  });

  return context;
}
