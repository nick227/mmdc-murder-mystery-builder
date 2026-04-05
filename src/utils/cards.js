import crypto from 'node:crypto';

export function getCardsByType(cards = [], type) {
  return (Array.isArray(cards) ? cards : []).filter((card) => card?.card_type === type);
}

export function getCharacterCards(cards = []) {
  return getCardsByType(cards, 'character');
}

/** Clue/item cards only: fact ledger, duplicate detection, pressure scoring, canonical derived_facts (excludes story_meta and other packaging types). */
export function isEvidenceLedgerCard(card) {
  const t = String(card?.card_type || '').trim();
  return t === 'clue' || t === 'item';
}

export function mergeCardMetadata(previousCards = [], nextCards = []) {
  const previousById = new Map(
    (Array.isArray(previousCards) ? previousCards : [])
      .filter((card) => card?.card_id)
      .map((card) => [card.card_id, card])
  );

  return (Array.isArray(nextCards) ? nextCards : []).map((card, index) => {
    const previous = previousById.get(card?.card_id) || previousCards[index] || {};
    const merged = {
      ...card,
      card_id: card?.card_id || previous.card_id || crypto.randomUUID()
    };

    if (card?.linked_character_id !== undefined || previous.linked_character_id !== undefined) {
      merged.linked_character_id = card?.linked_character_id ?? previous.linked_character_id;
    }
    if (card?.linked_item_id !== undefined || previous.linked_item_id !== undefined) {
      merged.linked_item_id = card?.linked_item_id ?? previous.linked_item_id;
    }

    if (card?.linked_character_index !== undefined || previous.linked_character_index !== undefined) {
      merged.linked_character_index = card?.linked_character_index ?? previous.linked_character_index;
    }

    if (card?.linked_character !== undefined || previous.linked_character !== undefined) {
      merged.linked_character = card?.linked_character ?? previous.linked_character;
    }
    if (card?.secret_type !== undefined || previous.secret_type !== undefined) {
      merged.secret_type = card?.secret_type ?? previous.secret_type;
    }

    if (card?.trail_role !== undefined || previous.trail_role !== undefined) {
      merged.trail_role = card?.trail_role ?? previous.trail_role;
    }
    if (card?.role !== undefined || previous.role !== undefined) {
      merged.role = card?.role ?? previous.role;
    }
    if (card?.target_id !== undefined || previous.target_id !== undefined) {
      merged.target_id = card?.target_id ?? previous.target_id;
    }
    if (card?.weight !== undefined || previous.weight !== undefined) {
      merged.weight = card?.weight ?? previous.weight;
    }
    if (card?.evidence_type !== undefined || previous.evidence_type !== undefined) {
      merged.evidence_type = card?.evidence_type ?? previous.evidence_type;
    }
    if (card?.clue_type !== undefined || previous.clue_type !== undefined) {
      merged.clue_type = card?.clue_type ?? previous.clue_type;
    }
    if (card?.clue_weight !== undefined || previous.clue_weight !== undefined) {
      merged.clue_weight = card?.clue_weight ?? previous.clue_weight;
    }
    if (card?.suspect_name !== undefined || previous.suspect_name !== undefined) {
      merged.suspect_name = card?.suspect_name ?? previous.suspect_name;
    }
    if (card?.assigned_suspect_id !== undefined || previous.assigned_suspect_id !== undefined) {
      merged.assigned_suspect_id = card?.assigned_suspect_id ?? previous.assigned_suspect_id;
    }
    if (card?.assigned_suspect_name !== undefined || previous.assigned_suspect_name !== undefined) {
      merged.assigned_suspect_name = card?.assigned_suspect_name ?? previous.assigned_suspect_name;
    }
    if (card?.location_ref !== undefined || previous.location_ref !== undefined) {
      merged.location_ref = card?.location_ref ?? previous.location_ref;
    }
    if (card?.bundle_id !== undefined || previous.bundle_id !== undefined) {
      merged.bundle_id = card?.bundle_id ?? previous.bundle_id;
    }
    if (card?.card_ref !== undefined || previous.card_ref !== undefined) {
      merged.card_ref = card?.card_ref ?? previous.card_ref;
    }
    if (card?.puzzle_type !== undefined || previous.puzzle_type !== undefined) {
      merged.puzzle_type = card?.puzzle_type ?? previous.puzzle_type;
    }
    if (card?.required_card_refs !== undefined || previous.required_card_refs !== undefined) {
      merged.required_card_refs = card?.required_card_refs ?? previous.required_card_refs;
    }
    if (card?.unlock_card_refs !== undefined || previous.unlock_card_refs !== undefined) {
      merged.unlock_card_refs = card?.unlock_card_refs ?? previous.unlock_card_refs;
    }
    if (card?.difficulty !== undefined || previous.difficulty !== undefined) {
      merged.difficulty = card?.difficulty ?? previous.difficulty;
    }
    if (card?.required_card_ids !== undefined || previous.required_card_ids !== undefined) {
      merged.required_card_ids = card?.required_card_ids ?? previous.required_card_ids;
    }
    if (card?.unlock_card_ids !== undefined || previous.unlock_card_ids !== undefined) {
      merged.unlock_card_ids = card?.unlock_card_ids ?? previous.unlock_card_ids;
    }
    if (card?.actionable_gain !== undefined || previous.actionable_gain !== undefined) {
      merged.actionable_gain = card?.actionable_gain ?? previous.actionable_gain;
    }
    if (card?.solution_summary !== undefined || previous.solution_summary !== undefined) {
      merged.solution_summary = card?.solution_summary ?? previous.solution_summary;
    }
    if (card?.solve_instructions !== undefined || previous.solve_instructions !== undefined) {
      merged.solve_instructions = card?.solve_instructions ?? previous.solve_instructions;
    }
    if (card?.solution !== undefined || previous.solution !== undefined) {
      merged.solution = card?.solution ?? previous.solution;
    }
    if (card?.hidden_until_solved !== undefined || previous.hidden_until_solved !== undefined) {
      merged.hidden_until_solved = card?.hidden_until_solved ?? previous.hidden_until_solved;
    }
    if (card?.hidden !== undefined || previous.hidden !== undefined) {
      merged.hidden = card?.hidden ?? previous.hidden;
    }
    if (card?.reveal !== undefined || previous.reveal !== undefined) {
      merged.reveal = card?.reveal ?? previous.reveal;
    }
    if (card?.evidence_strength !== undefined || previous.evidence_strength !== undefined) {
      merged.evidence_strength = card?.evidence_strength ?? previous.evidence_strength;
    }
    if (card?.requires !== undefined || previous.requires !== undefined) {
      merged.requires = card?.requires ?? previous.requires;
    }
    if (card?.derived_facts !== undefined || previous.derived_facts !== undefined) {
      merged.derived_facts = card?.derived_facts ?? previous.derived_facts;
    }
    if (('target_character' in card) || ('target_character' in previous)) {
      merged.target_character = ('target_character' in card) ? card.target_character : previous.target_character;
    }
    if (('target_character_id' in card) || ('target_character_id' in previous)) {
      merged.target_character_id = ('target_character_id' in card) ? card.target_character_id : previous.target_character_id;
    }
    if (card?.is_treasure !== undefined || previous.is_treasure !== undefined) {
      merged.is_treasure = card?.is_treasure ?? previous.is_treasure;
    }
    if (card?.meta !== undefined || previous.meta !== undefined) {
      merged.meta = card?.meta ?? previous.meta;
    }
    if (card?.murder_canon !== undefined || previous.murder_canon !== undefined) {
      merged.murder_canon = card?.murder_canon ?? previous.murder_canon;
    }

    return merged;
  });
}

export function pushCards(context, type, entries) {
  if (!context.cards) {
    context.cards = [];
  }

  const normalized = entries.map((e, i) => {
    const cardType = e.card_type || type;
    const card = {
      card_id: e.card_id || crypto.randomUUID(),
      card_type: cardType,
      card_title: String(e.card_title || '').trim(),
      card_contents: String(e.card_contents || '').trim()
    };

    if (cardType !== 'game_card' && cardType !== 'solution') {
      card.act = (e.act === 1 || e.act === 2 || e.act === 3)
        ? e.act
        : ((i % 3) + 1);
    }

    if (e.linked_character !== undefined) {
      card.linked_character = e.linked_character;
    }
    if (e.secret_type !== undefined) {
      card.secret_type = e.secret_type;
    }
    if (e.linked_character_index !== undefined) {
      card.linked_character_index = e.linked_character_index;
    }
    if (e.linked_character_id !== undefined) {
      card.linked_character_id = e.linked_character_id;
    }
    if (e.trail_role !== undefined) {
      card.trail_role = e.trail_role;
    }
    if (e.role !== undefined) {
      card.role = e.role;
    }
    if (e.target_id !== undefined) {
      card.target_id = e.target_id;
    }
    if (e.weight !== undefined) {
      card.weight = e.weight;
    }
    if (e.evidence_type !== undefined) {
      card.evidence_type = e.evidence_type;
    }
    if (e.clue_type !== undefined) {
      card.clue_type = e.clue_type;
    }
    if (e.clue_weight !== undefined) {
      card.clue_weight = e.clue_weight;
    }
    if (e.suspect_name !== undefined) {
      card.suspect_name = e.suspect_name;
    }
    if (e.assigned_suspect_id !== undefined) {
      card.assigned_suspect_id = e.assigned_suspect_id;
    }
    if (e.assigned_suspect_name !== undefined) {
      card.assigned_suspect_name = e.assigned_suspect_name;
    }
    if (e.location_ref !== undefined) {
      card.location_ref = e.location_ref;
    }
    if (e.bundle_id !== undefined) {
      card.bundle_id = e.bundle_id;
    }
    if (e.card_ref !== undefined) {
      card.card_ref = e.card_ref;
    }
    if (e.puzzle_type !== undefined) {
      card.puzzle_type = e.puzzle_type;
    }
    if (e.required_card_refs !== undefined) {
      card.required_card_refs = e.required_card_refs;
    }
    if (e.unlock_card_refs !== undefined) {
      card.unlock_card_refs = e.unlock_card_refs;
    }
    if (e.difficulty !== undefined) {
      card.difficulty = e.difficulty;
    }
    if (e.required_card_ids !== undefined) {
      card.required_card_ids = e.required_card_ids;
    }
    if (e.unlock_card_ids !== undefined) {
      card.unlock_card_ids = e.unlock_card_ids;
    }
    if (e.actionable_gain !== undefined) {
      card.actionable_gain = e.actionable_gain;
    }
    if (e.solution_summary !== undefined) {
      card.solution_summary = e.solution_summary;
    }
    if (e.solve_instructions !== undefined) {
      card.solve_instructions = e.solve_instructions;
    }
    if (e.solution !== undefined) {
      card.solution = e.solution;
    }
    if (e.hidden_until_solved !== undefined) {
      card.hidden_until_solved = e.hidden_until_solved;
    }
    if (e.hidden !== undefined) {
      card.hidden = e.hidden;
    }
    if (e.reveal !== undefined) {
      card.reveal = e.reveal;
    }
    if (e.evidence_strength !== undefined) {
      card.evidence_strength = e.evidence_strength;
    }
    if (e.requires !== undefined) {
      card.requires = e.requires;
    }
    if (e.derived_facts !== undefined) {
      card.derived_facts = e.derived_facts;
    }
    if ('target_character' in e) {
      card.target_character = e.target_character;
    }
    if ('target_character_id' in e) {
      card.target_character_id = e.target_character_id;
    }
    if (e.is_treasure !== undefined) {
      card.is_treasure = e.is_treasure;
    }
    if (e.linked_item_id !== undefined) {
      card.linked_item_id = e.linked_item_id;
    }
    if (e.meta !== undefined) {
      card.meta = e.meta;
    }
    if (e.murder_canon !== undefined) {
      card.murder_canon = e.murder_canon;
    }

    return card;
  });

  context.cards.push(...normalized);
  return context;
}
