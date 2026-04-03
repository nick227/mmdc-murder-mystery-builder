import { getCardsByType } from './cards.js';

/**
 * Adapter-facing notes: this repo does not render UI. Hints describe conventional
 * presentation for character secrets vs finale treasure vs “session complete”.
 */
export function buildHostUiHints(context) {
  const cards = context?.cards || [];
  const treasure = getCardsByType(cards, 'treasure')[0] || null;
  const secrets = getCardsByType(cards, 'secret');
  const hiddenSolutions = cards.filter(
    (c) => c?.card_type === 'solution' && c?.hidden_until_solved === true
  );

  return {
    export_note:
      'No lobby or layout is defined in the builder JSON. The host app chooses which cards are lobby tiles, hand cards, or gated by act.',
    character_secrets: {
      count: secrets.length,
      presentation_hint:
        'Usually not lobby collectibles — they are per-character private text. Hand out or reveal in-scene when a player earns it (not a shared lobby stack).',
      card_ids: secrets.map((c) => c.card_id).filter(Boolean)
    },
    finale_treasure: treasure
      ? {
          card_id: treasure.card_id,
          act: treasure.act,
          hidden_until_solved: treasure.hidden_until_solved === true,
          linked_item_id: treasure.linked_item_id || null,
          presentation_hint:
            'Finale reveal: unlock after murder is resolved (or your act-3 rule). Not a lobby item — host reads aloud or reveals as the last beat.'
        }
      : null,
    game_over: {
      suggested_host_sequence: [
        'Act 3 story_act + host_speech (final call to accuse).',
        'Players vote or accuse.',
        'Reveal bundle solution cards (murder canon).',
        'Unlock and present card_type "treasure" (macguffin resolution).',
        'Declare the mystery closed; optional debrief.'
      ],
      structural_markers: {
        hidden_solution_card_ids: hiddenSolutions.map((c) => c.card_id).filter(Boolean),
        treasure_reveal_card_id: treasure?.card_id || null
      },
      ui_suggestion:
        'Show a dedicated “case closed” / session-complete screen (or modal) after the treasure card is shown, so players get a clear end state beyond running out of cards.'
    }
  };
}
