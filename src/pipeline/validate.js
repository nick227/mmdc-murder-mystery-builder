function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateContext(context, options = {}) {
  const { allowPartial = false } = options;

  assert(isObject(context), 'pipeline context must be an object');

  if (!allowPartial || context.runId !== undefined) {
    assert(typeof context.runId === 'string' || context.runId === null, 'context.runId must be a string or null');
  }

  if (!allowPartial || context.runDir !== undefined) {
    assert(typeof context.runDir === 'string' || context.runDir === null, 'context.runDir must be a string or null');
  }

  if (!allowPartial || context.userPrompt !== undefined) {
    assert(typeof context.userPrompt === 'string', 'context.userPrompt must be a string');
  }

  if (context.storyBlurb !== undefined) {
    assert(typeof context.storyBlurb === 'string', 'context.storyBlurb must be a string');
  }

  if (context.storyStyle !== undefined) {
    assert(typeof context.storyStyle === 'string', 'context.storyStyle must be a string');
  }

  if (context.coreTruth !== undefined && context.coreTruth !== null) {
    assert(isObject(context.coreTruth), 'context.coreTruth must be an object');
    if (context.coreTruth.murder !== undefined && context.coreTruth.murder !== null) {
      assert(isObject(context.coreTruth.murder), 'context.coreTruth.murder must be an object');
    }
    if (context.coreTruth.treasure !== undefined && context.coreTruth.treasure !== null) {
      assert(isObject(context.coreTruth.treasure), 'context.coreTruth.treasure must be an object');
    }
  }

  if (context.case_state !== undefined && context.case_state !== null) {
    assert(isObject(context.case_state), 'context.case_state must be an object');
    assert(Array.isArray(context.case_state.suspects), 'context.case_state.suspects must be an array');
    assert(typeof context.case_state.killer_id === 'string', 'context.case_state.killer_id must be a string');
    assert(isObject(context.case_state.state_progression), 'context.case_state.state_progression must be an object');
    assert(Array.isArray(context.case_state.state_progression.viable_suspects), 'context.case_state.state_progression.viable_suspects must be an array');
    assert(Array.isArray(context.case_state.state_progression.eliminated_suspects), 'context.case_state.state_progression.eliminated_suspects must be an array');
    assert(Array.isArray(context.case_state.state_progression.constraints), 'context.case_state.state_progression.constraints must be an array');
  }

  if (context.playerCount !== undefined && context.playerCount !== null) {
    context.playerCount = Number(context.playerCount);
  }

  if (!allowPartial || context.playerCount !== undefined) {
    assert(Number.isFinite(context.playerCount), 'context.playerCount must be a finite number');
  }

  if (context.cards !== undefined) {
    assert(Array.isArray(context.cards), 'context.cards must be an array');

    for (const [index, card] of context.cards.entries()) {
      assert(isObject(card), `context.cards[${index}] must be an object`);

      if (card.card_type !== undefined) {
        assert(typeof card.card_type === 'string', `context.cards[${index}].card_type must be a string`);
      }
      if (card.game_card_type !== undefined && card.game_card_type !== null) {
        assert(
          ['performance', 'conversation', 'search', 'flavor', 'accusation', 'alibi', 'trade', 'revelation'].includes(card.game_card_type),
          `context.cards[${index}].game_card_type must be a supported game card type`
        );
      }
      if (card.card_title !== undefined) {
        assert(typeof card.card_title === 'string', `context.cards[${index}].card_title must be a string`);
      }
      if (card.card_contents !== undefined) {
        assert(typeof card.card_contents === 'string', `context.cards[${index}].card_contents must be a string`);
      }
      if (card.card_id !== undefined) {
        assert(typeof card.card_id === 'string', `context.cards[${index}].card_id must be a string`);
      }
      if (card.act !== undefined && card.act !== null) {
        assert([1, 2, 3].includes(card.act), `context.cards[${index}].act must be 1, 2, or 3`);
      }
      if (card.location_ref !== undefined && card.location_ref !== null) {
        assert(typeof card.location_ref === 'string', `context.cards[${index}].location_ref must be a string`);
      }
      if (card.linked_character_id !== undefined) {
        assert(typeof card.linked_character_id === 'string', `context.cards[${index}].linked_character_id must be a string`);
      }
      if (card.linked_character_index !== undefined && card.linked_character_index !== null) {
        assert(Number.isInteger(card.linked_character_index), `context.cards[${index}].linked_character_index must be an integer`);
      }
      if (card.trail_role !== undefined && card.trail_role !== null) {
        assert(
          ['red_herring', 'ambiguous', 'killer_aligned'].includes(card.trail_role),
          `context.cards[${index}].trail_role must be red_herring, ambiguous, or killer_aligned`
        );
      }
      if (card.bundle_id !== undefined && card.bundle_id !== null) {
        assert(typeof card.bundle_id === 'string', `context.cards[${index}].bundle_id must be a string`);
      }
      if (card.card_ref !== undefined && card.card_ref !== null) {
        assert(typeof card.card_ref === 'string', `context.cards[${index}].card_ref must be a string`);
      }
      if (card.puzzle_type !== undefined && card.puzzle_type !== null) {
        assert(
          ['cross_reference', 'cipher', 'item_combination', 'timeline', 'elimination'].includes(card.puzzle_type),
          `context.cards[${index}].puzzle_type must be a supported puzzle type`
        );
      }
      if (card.required_card_refs !== undefined && card.required_card_refs !== null) {
        assert(Array.isArray(card.required_card_refs), `context.cards[${index}].required_card_refs must be an array`);
      }
      if (card.unlock_card_refs !== undefined && card.unlock_card_refs !== null) {
        assert(Array.isArray(card.unlock_card_refs), `context.cards[${index}].unlock_card_refs must be an array`);
      }
      if (card.difficulty !== undefined && card.difficulty !== null) {
        assert(['easy', 'medium', 'hard'].includes(card.difficulty), `context.cards[${index}].difficulty must be easy, medium, or hard`);
      }
      if (card.required_card_ids !== undefined && card.required_card_ids !== null) {
        assert(Array.isArray(card.required_card_ids), `context.cards[${index}].required_card_ids must be an array`);
      }
      if (card.unlock_card_ids !== undefined && card.unlock_card_ids !== null) {
        assert(Array.isArray(card.unlock_card_ids), `context.cards[${index}].unlock_card_ids must be an array`);
      }
      if (card.actionable_gain !== undefined && card.actionable_gain !== null) {
        assert(typeof card.actionable_gain === 'string', `context.cards[${index}].actionable_gain must be a string`);
      }
      if (card.solution_summary !== undefined && card.solution_summary !== null) {
        assert(typeof card.solution_summary === 'string', `context.cards[${index}].solution_summary must be a string`);
      }
      if (card.solve_instructions !== undefined && card.solve_instructions !== null) {
        assert(typeof card.solve_instructions === 'string', `context.cards[${index}].solve_instructions must be a string`);
      }
      if (card.solution !== undefined && card.solution !== null) {
        assert(typeof card.solution === 'string', `context.cards[${index}].solution must be a string`);
      }
      if (card.hidden_until_solved !== undefined && card.hidden_until_solved !== null) {
        assert(typeof card.hidden_until_solved === 'boolean', `context.cards[${index}].hidden_until_solved must be a boolean`);
      }
      if (card.evidence_strength !== undefined && card.evidence_strength !== null) {
        assert(
          ['weak', 'supporting', 'strong', 'decisive'].includes(card.evidence_strength),
          `context.cards[${index}].evidence_strength must be weak, supporting, strong, or decisive`
        );
      }
      if (card.requires !== undefined && card.requires !== null) {
        assert(Array.isArray(card.requires), `context.cards[${index}].requires must be an array`);
      }
      if (card.derived_facts !== undefined && card.derived_facts !== null) {
        assert(Array.isArray(card.derived_facts), `context.cards[${index}].derived_facts must be an array`);
        for (const [factIndex, fact] of card.derived_facts.entries()) {
          assert(isObject(fact), `context.cards[${index}].derived_facts[${factIndex}] must be an object`);
          if (fact.fact_id !== undefined && fact.fact_id !== null) {
            assert(typeof fact.fact_id === 'string', `context.cards[${index}].derived_facts[${factIndex}].fact_id must be a string`);
          }
          if (fact.subject !== undefined && fact.subject !== null) {
            assert(typeof fact.subject === 'string', `context.cards[${index}].derived_facts[${factIndex}].subject must be a string`);
          }
          if (fact.time !== undefined && fact.time !== null) {
            assert(typeof fact.time === 'string', `context.cards[${index}].derived_facts[${factIndex}].time must be a string`);
          }
          if (fact.location !== undefined && fact.location !== null) {
            assert(typeof fact.location === 'string', `context.cards[${index}].derived_facts[${factIndex}].location must be a string`);
          }
          if (fact.statement !== undefined && fact.statement !== null) {
            assert(typeof fact.statement === 'string', `context.cards[${index}].derived_facts[${factIndex}].statement must be a string`);
          }
          if (fact.source_card_id !== undefined && fact.source_card_id !== null) {
            assert(typeof fact.source_card_id === 'string', `context.cards[${index}].derived_facts[${factIndex}].source_card_id must be a string`);
          }
        }
      }
    }
  }

  return context;
}
