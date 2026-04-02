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
const MOTIVE_PATTERN = /\b(debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|resentment|reputation|career|fame|role|endorsement|criticized|rival|rivalry|ambition|leverage)\b/i;

function validateRegeneratedSecrets(cards, characterName) {
  const contents = (Array.isArray(cards) ? cards : []).map((card) => String(card?.card_contents || '').trim());
  if (contents.length < 2) {
    throw new Error(`suspect_coverage_agent regenerated too few secrets for ${characterName}`);
  }
  if (!contents.some((text) => MOTIVE_PATTERN.test(text))) {
    throw new Error(`suspect_coverage_agent regenerated secrets still missing explicit motive for ${characterName}`);
  }
}

function replaceSecretsForCharacter(context, characterName, cards) {
  const remaining = (Array.isArray(context.cards) ? context.cards : []).filter((card) =>
    !(card?.card_type === 'secret' && String(card?.linked_character || '').split(',')[0].trim() === characterName)
  );
  context.cards = [
    ...remaining,
    ...cards.map((card) => ({
      card_type: 'secret',
      card_title: String(card?.card_title || 'Secret').trim(),
      card_contents: String(card?.card_contents || '').trim(),
      linked_character: characterName
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

  validateRegeneratedSecrets(result.cards || [], targetName);
  replaceSecretsForCharacter(context, String(targetName || '').trim(), result.cards || []);
  context.debug.warning_log.push({
    stage: 'suspect_coverage_agent',
    reason: 'regenerated_profile_secrets',
    message: `Regenerated secrets for ${targetName}: ${reason}`,
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

    const needsMotiveCompetition = report.issues.some((issue) => issue.code === 'insufficient_motive_competition');

    if (!missingMotive.length && !needsMotiveCompetition) {
      break;
    }

    const targetName = missingMotive[0]
      || (Array.isArray(report?.required_early_suspects) ? report.required_early_suspects[0] : '')
      || '';
    const healed = await regenerateSecretsForCharacter(
      context,
      targetName,
      `Add a concrete motive for ${targetName}. The secrets must state plainly why this suspect wanted the victim silenced or the treasure stolen/controlled.`
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
    ['underused_suspects', 'missing_material_suspect_hooks', 'insufficient_access_competition', 'insufficient_motive_competition'].includes(issue.code)
  );
  if (blockingIssues.length) {
    throw new Error(`suspect_coverage_agent blocking issues: ${blockingIssues.map((issue) => issue.code).join(', ')}`);
  }

  return context;
}
