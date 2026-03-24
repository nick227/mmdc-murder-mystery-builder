
import { callJson } from "../llm/client.js";
import { buildNarrativeValidatorPrompt } from "../prompts/narrativeValidatorPrompt.js";
import { narrativesSchema } from "../schemas/narrativesSchema.js";
import { balanced } from "../utils/semanticWeight.js";

function guard(n) {
  const suspects = [n.a?.suspect, n.b?.suspect, n.c?.suspect].filter(Boolean);
  if (new Set(suspects).size < 3) throw new Error("3 suspects required");
  if (!balanced(n)) throw new Error("semantic imbalance");
  return n;
}

export async function narrativeValidatorAgent(context) {
  let last;

  for (let i = 0; i < 3; i++) {
    // FIX: call the LLM first (unconditionally on every attempt), then guard
    // the result. The old code ran guard() on the incoming narratives before
    // the first LLM call, which wasted a retry slot on input that was already
    // broken and would never have been fixed without a model call.
    const prompt = buildNarrativeValidatorPrompt({
      storyBlurb: context.storyBlurb,
      solutions: context.solutions,
      trails: context.trails,
      narratives: context.narratives
    });

    const res = await callJson({
      ...prompt,
      schemaName: "validated_narratives",
      schema: narrativesSchema
    });

    try {
      context.narratives = guard(res.narratives);
      return context;
    } catch (err) {
      last = err;
      // Store the model's latest attempt so the next iteration feeds it back.
      context.narratives = res.narratives;
    }
  }

  throw new Error("narrative validation failed: " + last?.message);
}
