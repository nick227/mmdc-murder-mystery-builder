import { getSolution } from '../utils/context.js';

function getCharacterTitles(context) {
  return (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'character')
    .map((card) => String(card.card_title || '').trim())
    .filter(Boolean);
}

function getLocationTitles(context) {
  return (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'location')
    .map((card) => String(card.card_title || '').trim())
    .filter(Boolean);
}

function getRepairDirectives(scopes) {
  const directives = [];

  if (scopes.includes('timeline')) {
    directives.push(
      'TIMELINE: make all murder-report, discovery, and suspect-argument times internally consistent. Choose one coherent sequence and rewrite only the affected text.'
    );
  }

  if (scopes.includes('roster')) {
    directives.push(
      'ROSTER: replace unsupported proper names and unsupported places with names from the playable roster or established world cards. Do not invent new NPCs or locations unless the card already clearly establishes one.'
    );
  }

  if (scopes.includes('encoding')) {
    directives.push(
      'ENCODING: remove mojibake and malformed punctuation while preserving meaning.'
    );
  }

  if (scopes.includes('pacing')) {
    directives.push(
      'PACING: soften any final bundle clue or solution-summary that effectively states the final answer alone. Keep it as a strong late-game clue, but make it confirmatory rather than standalone conclusive.'
    );
  }

  return directives;
}

export function buildTargetedPlayabilityRepairPrompt(context, report, scopes) {
  const directives = getRepairDirectives(scopes);

  return {
    system: [
      'You repair only the specified defect classes in a murder mystery card set.',
      'Do not add cards, remove cards, or reorder cards.',
      'Preserve the hidden solution and puzzle structure.',
      'Edit only card_title, card_contents, and act.',
      'Return JSON only.'
    ].join(' '),
    user: `
Repair scopes:
${JSON.stringify(scopes, null, 2)}

Directives:
${JSON.stringify(directives, null, 2)}

Playability report:
${JSON.stringify(report || {}, null, 2)}

Canonical solution:
${JSON.stringify(getSolution(context) || {}, null, 2)}

Playable characters:
${JSON.stringify(getCharacterTitles(context), null, 2)}

Allowed locations:
${JSON.stringify(getLocationTitles(context), null, 2)}

Cards:
${JSON.stringify(context.cards || [], null, 2)}

Return:
{
  "cards": [
    {
      "card_title": "",
      "card_contents": "",
      "act": 1
    }
  ]
}
`.trim()
  };
}
