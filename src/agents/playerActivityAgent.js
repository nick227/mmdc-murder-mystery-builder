import { callText } from '../llm/client.js';
import { buildPlayerActivityPrompt } from '../prompts/playerActivityPrompt.js';
import { pushCards } from '../utils/cards.js';
import { buildSealedNarrativeContext } from '../utils/contextSeal.js';

export async function playerActivityAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error('No validated trails available for player_activity_agent');
  }

  const prompt = buildPlayerActivityPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    playerCount: sealed.playerCount,
    narratives: sealed.narratives
  });

  const text = await callText(prompt);

  return pushCards(context, 'player_activity', [
    {
      card_title: 'Player Activities',
      card_contents: text
    }
  ]);
}
