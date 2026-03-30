import { callJson } from '../llm/client.js';
import { buildCoreTruthPrompt } from '../prompts/coreTruthPrompt.js';
import { coreTruthSchema } from '../schemas/coreTruthSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { validateUniqueKiller, validateVictimType } from '../utils/coreTruthChecks.js';

const MAX_RETRIES = 2;

function getAlternateSuspects(issues) {
  return issues
    .filter((issue) => String(issue || '').startsWith('alternate_killer_not_excluded:'))
    .flatMap((issue) => String(issue).split(':').slice(1).join(':').split(',').map((value) => value.trim()).filter(Boolean));
}

export async function coreTruthAgent(context) {
  let lastIssues = [];
  const prompt = buildCoreTruthPrompt({
    storyBlurb: getStoryBlurb(context),
    characters: getCharacterCards(context.cards),
    world: context.world
  });
  const reservedVictimName = String(context?.reservedVictim?.name || '').trim();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const retryNote = lastIssues.length
      ? `\n\nRetry requirements:\n- fix these exact problems: ${lastIssues.join('; ')}`
      : '';
    const alternateSuspects = getAlternateSuspects(lastIssues);
    const exclusionNote = alternateSuspects.length
      ? `\n- explicitly differentiate the declared killer from this ambiguous alternate suspect by at least two of: access, motive, opportunity: ${alternateSuspects.join(', ')}\n- in why_others_could_not, explicitly name and exclude these alternate suspects: ${alternateSuspects.join(', ')}`
      : '';
    const victimRetryNote = lastIssues.some((issue) => String(issue || '').startsWith('invalid_victim_type:')) && reservedVictimName
      ? `\n- murder.victim must be exactly: ${reservedVictimName}`
      : '';
    const victimNote = reservedVictimName
      ? `\n\nReserved victim:\n- use exactly this victim name: ${reservedVictimName}\n- this victim is non-playable and must not appear in the suspect roster`
      : '';

    context.coreTruth = await callJson({
      ...prompt,
      user: `${prompt.user}${victimNote}${retryNote}${exclusionNote}${victimRetryNote}`,
      schemaName: 'core_truth',
      schema: coreTruthSchema
    });

    const deterministicIssues = [
      validateVictimType(context.coreTruth, context),
      validateUniqueKiller(context.coreTruth, context)
    ].filter(Boolean);
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
