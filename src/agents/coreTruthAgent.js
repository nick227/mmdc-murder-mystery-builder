import { callJson } from '../llm/client.js';
import { buildCoreTruthPrompt } from '../prompts/coreTruthPrompt.js';
import { coreTruthSchema } from '../schemas/coreTruthSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import {
  collectCoreTruthDeterministicIssues,
  getPlayableCharacters,
  resolveKillerToPlayableName
} from '../utils/coreTruthChecks.js';

export async function coreTruthAgent(context) {
  const reservedVictimName = String(context?.reservedVictim?.name || '').trim();
  const victimNote = reservedVictimName
    ? `\n\nReserved victim:\n- murder.victim must be exactly: ${reservedVictimName}\n- that victim is non-playable and must not appear in the suspect roster`
    : '';

  const prompt = buildCoreTruthPrompt({
    storyBlurb: getStoryBlurb(context),
    characters: getCharacterCards(context.cards),
    world: context.world
  });

  context.coreTruth = await callJson({
    ...prompt,
    user: `${prompt.user}${victimNote}`,
    schemaName: 'core_truth',
    schema: coreTruthSchema
  });

  const resolvedKiller = resolveKillerToPlayableName(
    context.coreTruth.murder.killer,
    getPlayableCharacters(context)
  );
  if (resolvedKiller) {
    context.coreTruth.murder.killer = resolvedKiller;
  }

  const issues = collectCoreTruthDeterministicIssues(context.coreTruth, context);
  if (issues.length) {
    throw new Error(
      'core_truth_agent failed deterministic checks\n' +
      JSON.stringify(issues, null, 2)
    );
  }

  return context;
}
