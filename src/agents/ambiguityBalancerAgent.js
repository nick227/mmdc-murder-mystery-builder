import { callText } from '../llm/client.js';
import { getMurderTruth, getStoryBlurb } from '../utils/context.js';

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatTruth(value) {
  return typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
}

export async function ambiguityBalancerAgent(context) {
  const trailReviewPassed = context.trail_review?.pass === true;
  const narrativeValidationPassed = context.narrative_validation?.pass === true;

  if (trailReviewPassed && narrativeValidationPassed) {
    context.ambiguity_notes = null;
    context.ambiguity_balancer_skipped = true;
    return context;
  }

  const murderTruth = getMurderTruth(context);
  const cards = ensureArray(context.cards);
  if (!cards.length) {
    return context;
  }

  const prompt = {
    system: 'Balance ambiguity across suspects. Give concise editorial guidance only.',
    user: `Story:\n${getStoryBlurb(context)}\n\nMurder truth:\n${formatTruth(murderTruth)}\n\nCards:\n${cards.map((c, i) => `[${i}] ${c.card_title}\n${c.card_contents}`).join('\n\n')}`
  };

  const text = await callText(prompt);
  context.ambiguity_notes = text;
  context.ambiguity_balancer_skipped = false;
  return context;
}
