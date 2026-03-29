import { callJson } from '../llm/client.js';
import { buildCoreTruthPrompt } from '../prompts/coreTruthPrompt.js';
import { coreTruthSchema } from '../schemas/coreTruthSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { collectCoreTruthDeterministicIssues } from '../utils/coreTruthChecks.js';

const MAX_ATTEMPTS = 3;

export async function coreTruthAgent(context) {
  let lastIssues = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const prompt = buildCoreTruthPrompt({
      storyBlurb: getStoryBlurb(context),
      characters: getCharacterCards(context.cards),
      world: context.world
    });
    const reservedVictimName = String(context?.reservedVictim?.name || '').trim();
    const retryNote = lastIssues.length
      ? `\n\nRetry requirements:\n- fix these exact problems: ${lastIssues.join('; ')}`
      : '';
    const alternateSuspects = lastIssues
      .filter((issue) => String(issue || '').startsWith('alternate_killer_not_excluded:'))
      .flatMap((issue) => String(issue).split(':').slice(1).join(':').split(',').map((value) => value.trim()).filter(Boolean));
    const exclusionNote = alternateSuspects.length
      ? `\n- in why_others_could_not, explicitly name and exclude these alternate suspects: ${alternateSuspects.join(', ')}`
      : '';
    const victimNote = reservedVictimName
      ? `\n\nReserved victim:\n- use exactly this victim name: ${reservedVictimName}\n- this victim is non-playable and must not appear in the suspect roster`
      : '';

    context.coreTruth = await callJson({
      ...prompt,
      user: `${prompt.user}${victimNote}${retryNote}${exclusionNote}`,
      schemaName: 'core_truth',
      schema: coreTruthSchema
    });

    const deterministicIssues = collectCoreTruthDeterministicIssues(context.coreTruth, context);
    if (!deterministicIssues.length) {
      return context;
    }
    lastIssues = deterministicIssues;
  }

  throw new Error(
    'core_truth_agent failed deterministic checks\n' +
    JSON.stringify(lastIssues || [], null, 2)
  );
}
