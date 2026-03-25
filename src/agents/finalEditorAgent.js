import { callJson } from '../llm/client.js';
import { buildFinalEditorPrompt } from '../prompts/finalEditorPrompt.js';
import { finalCardsSchema } from '../schemas/finalCardsSchema.js';

export async function finalEditorAgent(context) {
  const prompt = buildFinalEditorPrompt(context);

  const result = await callJson({
    ...prompt,
    schemaName: 'final_cards',
    schema: finalCardsSchema
  });

  if (Array.isArray(result.cards)) {
    context.cards = result.cards.map((c, i) => ({
      ...c,
      act:
        c.act === 1 || c.act === 2 || c.act === 3
          ? c.act
          : ((i % 3) + 1)
    }));
  }

  return context;
}
