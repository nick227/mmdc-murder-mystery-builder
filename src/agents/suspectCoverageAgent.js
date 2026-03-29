import { buildSuspectCoverageReport } from '../utils/suspectCoverage.js';
import { callJson } from '../llm/client.js';
import { buildCharacterSecretsPrompt } from '../prompts/characterSecretsPrompt.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const SECRET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title', 'card_contents'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' }
        }
      }
    }
  }
};
const MAX_PROFILE_HEAL_ATTEMPTS = 3;

function replaceSecretsForCharacter(context, characterId, cards) {
  const remaining = (Array.isArray(context.cards) ? context.cards : []).filter((card) =>
    !(card?.card_type === 'secret' && String(card?.linked_character_id || '').trim() === characterId)
  );
  context.cards = [
    ...remaining,
    ...cards.map((card) => ({
      card_type: 'secret',
      card_title: String(card?.card_title || 'Secret').trim(),
      card_contents: String(card?.card_contents || '').trim(),
      linked_character_id: characterId
    }))
  ];
}

async function regenerateSecretsForCharacter(context, targetName, reason) {
  const character = getCharacterCards(context.cards).find((entry) => String(entry?.card_title || '').split(',')[0].trim() === targetName);
  if (!character?.card_id) {
    return false;
  }

  const result = await callJson({
    ...buildCharacterSecretsPrompt({
      storyBlurb: getStoryBlurb(context),
      characterName: character.card_title,
      rejectionReasons: [reason]
    }),
    schemaName: 'character_secrets',
    schema: SECRET_SCHEMA
  });

  replaceSecretsForCharacter(context, String(character.card_id).trim(), result.cards || []);
  context.debug.warning_log.push({
    stage: 'suspect_coverage_agent',
    reason: 'regenerated_duplicate_profile_secrets',
    message: `Regenerated secrets for ${targetName} to break duplicate deduction profile`,
    character: targetName
  });
  return true;
}

export async function suspectCoverageAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  let report = null;
  for (let attempt = 1; attempt <= MAX_PROFILE_HEAL_ATTEMPTS; attempt += 1) {
    report = buildSuspectCoverageReport(context);
    const missingMotive = (Array.isArray(report?.suspect_signals) ? report.suspect_signals : [])
      .filter((entry) => !(Array.isArray(entry?.signal_types) ? entry.signal_types : []).includes('motive'))
      .map((entry) => entry.name)
      .filter(Boolean);

    if (!missingMotive.length) {
      break;
    }

    const healed = await regenerateSecretsForCharacter(
      context,
      missingMotive[0],
      `Add a concrete motive for ${missingMotive[0]}. The secrets must state why this suspect would want the victim silenced or the treasure controlled.`
    );
    if (!healed || attempt >= MAX_PROFILE_HEAL_ATTEMPTS) {
      break;
    }
  }

  context.suspect_coverage = report;

  for (const issue of report.issues) {
    context.debug.warning_log.push({
      stage: 'suspect_coverage_agent',
      reason: issue.code,
      severity: issue.severity,
      message: issue.message
    });
  }

  const blockingIssues = report.issues.filter((issue) =>
    ['underused_suspects', 'missing_material_suspect_hooks', 'insufficient_access_competition'].includes(issue.code)
  );
  if (blockingIssues.length) {
    throw new Error(`suspect_coverage_agent blocking issues: ${blockingIssues.map((issue) => issue.code).join(', ')}`);
  }

  return context;
}
