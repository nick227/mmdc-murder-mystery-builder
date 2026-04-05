import { callJson } from '../llm/client.js';
import { buildCoreTruthPrompt } from '../prompts/coreTruthPrompt.js';
import { coreTruthSchema } from '../schemas/coreTruthSchema.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb, getStoryMetaForPrompts } from '../utils/context.js';
import {
  collectCoreTruthDeterministicIssues
} from '../utils/coreTruthChecks.js';
import { getMurderCanonRef } from '../utils/canonFacts.js';

function buildFinalSolutionCards(coreTruth) {
  const murder = coreTruth?.murder || {};
  const treasure = coreTruth?.treasure || {};

  const murderSolution = String(murder.murder_solution || '').trim();
  const treasureSolution = String(treasure.treasure_solution || '').trim();

  const cards = [];
  if (murderSolution) {
    cards.push({
      card_type: 'solution',
      role: 'murder',
      card_title: 'Murder Solution',
      card_contents: murderSolution,
      reveal: 'host_reveal',
      hidden: true
    });
  }
  if (treasureSolution) {
    cards.push({
      card_type: 'solution',
      role: 'treasure',
      card_title: 'Treasure Solution',
      card_contents: treasureSolution,
      reveal: 'host_reveal',
      hidden: true
    });
  }

  return cards;
}

export async function coreTruthAgent(context) {
  const reservedVictimName = String(context?.reservedVictim?.name || '').trim();
  const victimNote = reservedVictimName
    ? `\n\nReserved victim:\n- murder.victim must be exactly: ${reservedVictimName}\n- that victim is non-playable and must not appear in the suspect roster`
    : '';

  const prompt = buildCoreTruthPrompt({
    storyBlurb: getStoryBlurb(context),
    storyMeta: getStoryMetaForPrompts(context),
    characters: getCharacterCards(context.cards),
    world: context.world
  });

  context.coreTruth = await callJson({
    ...prompt,
    user: `${prompt.user}${victimNote}`,
    schemaName: 'core_truth',
    schema: coreTruthSchema
  });

  const issues = collectCoreTruthDeterministicIssues(context.coreTruth, context);
  if (issues.length) {
    throw new Error(
      'core_truth_agent failed deterministic checks\n' +
      JSON.stringify(issues, null, 2)
    );
  }

  const finalSolutionCards = buildFinalSolutionCards(context.coreTruth);
  if (finalSolutionCards.length) {
    const murderCanon = getMurderCanonRef(context.coreTruth);
    pushCards(
      context,
      'solution',
      finalSolutionCards.map((card) => ({
        ...card,
        murder_canon: murderCanon
      }))
    );
  }

  return context;
}
