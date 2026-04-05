import { getCardsByType } from './cards.js';

/**
 * Adapter-facing notes: this repo does not render UI. Hints describe conventional
 * presentation for character secrets vs finale reveal vs "session complete".
 */
export function buildHostUiHints(context) {
  const cards = context?.cards || [];
  const secrets = getCardsByType(cards, 'secret');
  const solutionReveals = cards.filter(
    (c) => c?.card_type === 'solution' && c?.reveal === 'host_reveal'
  );
  const murderSolution = solutionReveals.find((c) => String(c?.role || '').trim().toLowerCase() === 'murder') || null;
  const treasureSolution = solutionReveals.find((c) => String(c?.role || '').trim().toLowerCase() === 'treasure') || null;
  const includeHostSpeeches = context?.includeHostSpeeches !== false;
  const includeSecrets = context?.includeSecrets !== false;
  const hasHostSpeeches = includeHostSpeeches && getCardsByType(cards, 'host_speech').length > 0;

  return {
    export_note:
      'No lobby or layout is defined in the builder JSON. The host app chooses which cards are lobby tiles, hand cards, or gated by act.',
    character_secrets: includeSecrets
      ? {
          count: secrets.length,
          presentation_hint:
            'Usually not lobby collectibles - they are per-character private text. Hand out or reveal in-scene when a player earns it (not a shared lobby stack).',
          card_ids: secrets.map((c) => c.card_id).filter(Boolean)
        }
      : null,
    finale_solutions: solutionReveals.length
      ? {
          murder_card_id: murderSolution?.card_id || null,
          treasure_card_id: treasureSolution?.card_id || null,
          reveal: 'host_reveal',
          presentation_hint:
            'Finale reveal: host triggers Reveal Secrets to post the murder solution, then the treasure solution.'
        }
      : null,
    game_over: {
      suggested_host_sequence: [
        hasHostSpeeches
          ? 'Act 3 story_act + host_speech (final call to accuse).'
          : 'Act 3 story_act (final call to accuse).',
        'Players vote or accuse.',
        'Host clicks Reveal Secrets.',
        'Reveal murder solution, then treasure solution.',
        'Declare the mystery closed; optional debrief.'
      ],
      structural_markers: {
        solution_card_ids: solutionReveals.map((c) => c.card_id).filter(Boolean),
        murder_solution_card_id: murderSolution?.card_id || null,
        treasure_solution_card_id: treasureSolution?.card_id || null
      },
      ui_suggestion:
        'Show a dedicated "case closed" / session-complete screen (or modal) after the treasure solution card is shown.'
    }
  };
}
