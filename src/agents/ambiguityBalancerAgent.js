import { callText } from '../llm/client.js';

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

export async function ambiguityBalancerAgent(context) {
  const cards = ensureArray(context.cards);
  if (!cards.length) {
    return context;
  }

  const prompt = {
    system: 'Balance ambiguity across suspects. Give concise editorial guidance only.',
    user: `Story:\n${context.story_blurb || ''}\n\nMurder truth:\n${context.murder_truth || ''}\n\nCards:\n${cards.map((c, i) => `[${i}] ${c.card_title}\n${c.card_contents}`).join('\n\n')}`
  };

  const text = await callText(prompt);
  context.ambiguity_notes = text;
  return context;
}
