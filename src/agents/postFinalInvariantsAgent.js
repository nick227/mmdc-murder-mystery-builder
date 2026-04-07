import { getCardsByType, getCharacterCards } from '../utils/cards.js';

const SECRET_TYPES = new Set(['access', 'motive', 'alibi', 'relationship']);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function warn(context, reason, message) {
  context.debug ??= {};
  context.debug.warning_log ??= [];
  context.debug.warning_log.push({
    stage: 'post_final_invariants_agent',
    reason,
    message
  });
}

function stripEmptyFields(card) {
  const next = { ...card };

  const dropIfEmpty = (key) => {
    const value = next[key];
    if (value === null || value === undefined || value === '') {
      delete next[key];
      return;
    }
    if (Array.isArray(value) && value.length === 0) {
      delete next[key];
      return;
    }
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      delete next[key];
    }
  };

  // Deprecated / puzzle-era fields
  delete next.hidden_until_solved;
  delete next.bundle_id;
  delete next.card_ref;
  delete next.puzzle_type;
  delete next.required_card_refs;
  delete next.unlock_card_refs;
  delete next.required_card_ids;
  delete next.unlock_card_ids;

  if (next.card_type === 'solution') {
    delete next.act;
    delete next.murder_canon;
  }

  dropIfEmpty('target_id');
  dropIfEmpty('target_name');
  dropIfEmpty('weight');
  dropIfEmpty('evidence_type');
  dropIfEmpty('role');
  dropIfEmpty('reveal');
  dropIfEmpty('hidden');
  dropIfEmpty('meta');

  return next;
}

function hasPlaceholder(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'derived_later' || normalized.includes('to be derived');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return normalizeText(value);
}

function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

function collectDuplicateTitlesByType(cards) {
  const byType = new Map();
  for (const card of Array.isArray(cards) ? cards : []) {
    const type = String(card?.card_type || '').trim();
    const titleKey = normalizeTitle(card?.card_title);
    if (!type || !titleKey) {
      continue;
    }
    if (!byType.has(type)) {
      byType.set(type, new Map());
    }
    const titleMap = byType.get(type);
    if (!titleMap.has(titleKey)) {
      titleMap.set(titleKey, []);
    }
    titleMap.get(titleKey).push(String(card?.card_id || '').trim() || '(missing_id)');
  }

  const duplicates = [];
  for (const [type, titleMap] of byType.entries()) {
    for (const [titleKey, ids] of titleMap.entries()) {
      if (ids.length <= 1) {
        continue;
      }
      duplicates.push({ card_type: type, normalized_title: titleKey, card_ids: ids });
    }
  }
  return duplicates;
}

function assertStructuredSecrets(context) {
  const secrets = getCardsByType(context.cards, 'secret');
  const characterCards = getCharacterCards(context.cards);
  const characterNames = new Set(characterCards.map((card) => baseName(card.card_title)).filter(Boolean));
  const characterNameById = new Map(
    characterCards
      .filter((c) => c?.card_id)
      .map((c) => [String(c.card_id).trim(), baseName(c.card_title)])
      .filter(([, name]) => Boolean(name))
  );
  const motiveByCharacter = new Map();

  for (const secret of secrets) {
    const secretType = String(secret?.secret_type || '').trim();
    assert(SECRET_TYPES.has(secretType), `post_final_invariants_agent: secret ${secret.card_id} missing valid secret_type`);

    // Some upstream steps may attach linkage by id or by roster index rather than by name.
    // Normalize to `linked_character` (base name) so downstream invariants can be stable.
    if (!secret?.linked_character) {
      const linkedById = String(secret?.linked_character_id || '').trim();
      if (linkedById && characterNameById.has(linkedById)) {
        secret.linked_character = characterNameById.get(linkedById);
      } else if (Number.isInteger(secret?.linked_character_index)) {
        const idx = secret.linked_character_index;
        const byIndex = characterCards[idx] ? baseName(characterCards[idx].card_title) : '';
        if (byIndex) {
          secret.linked_character = byIndex;
        }
      }
    }

    const linkedCharacter = String(secret?.linked_character || '').trim();
    assert(linkedCharacter && characterNames.has(linkedCharacter), `post_final_invariants_agent: secret ${secret.card_id} missing linked_character`);

    if (secretType === 'motive') {
      const normalized = normalizeText(secret.card_contents)
        .replace(new RegExp(`\\b${normalizeText(linkedCharacter).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ')
        .replace(/\s+/g, ' ')
        .trim();
      assert(normalized, `post_final_invariants_agent: motive secret ${secret.card_id} is empty after normalization`);
      if (!motiveByCharacter.has(linkedCharacter)) {
        motiveByCharacter.set(linkedCharacter, []);
      }
      motiveByCharacter.get(linkedCharacter).push(normalized);
    }
  }

  const seenMotives = new Map();
  for (const [characterName, motives] of motiveByCharacter.entries()) {
    assert(motives.length >= 1, `post_final_invariants_agent: ${characterName} missing motive secret`);
    for (const motive of motives) {
      if (seenMotives.has(motive) && seenMotives.get(motive) !== characterName) {
        throw new Error(`post_final_invariants_agent: suspect motives must be distinct (${seenMotives.get(motive)} and ${characterName})`);
      }
      seenMotives.set(motive, characterName);
    }
  }
}

function assertCharacterCoverage(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const clueCoverage = new Set(
    getCardsByType(context.cards, 'clue')
      .map((card) => String(card?.target_id || '').trim())
      .filter(Boolean)
  );
  const secretCoverage = new Set(
    getCardsByType(context.cards, 'secret')
      .map((card) => String(card?.linked_character || '').trim())
      .filter(Boolean)
  );
  const cluesExpected = Number(context?.cluesPerPlayer ?? 0) > 0;
  const secretsExpected = context?.includeSecrets !== false;

  for (const suspect of suspects) {
    const suspectId = String(suspect?.suspect_id || '').trim();
    const suspectName = String(suspect?.name || suspect?.title || '').trim();
    const base = baseName(suspectName);
    if (!cluesExpected && !secretsExpected) {
      continue;
    }
    assert(
      clueCoverage.has(suspectId) || secretCoverage.has(base) || secretCoverage.has(suspectName),
      `post_final_invariants_agent: character ${suspectName} is not referenced by any clue or secret`
    );
  }
}

function checkClueCoverage(context) {
  const cluesExpected = Number(context?.cluesPerPlayer ?? 0) > 0;
  if (!cluesExpected) {
    return;
  }
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  if (!suspects.length) {
    return;
  }

  const clueCounts = new Map(
    suspects.map((suspect) => [String(suspect?.suspect_id || '').trim(), 0])
  );

  for (const clue of getCardsByType(context.cards, 'clue')) {
    const targetId = String(clue?.target_id || '').trim();
    if (!targetId || !clueCounts.has(targetId)) {
      continue;
    }
    clueCounts.set(targetId, clueCounts.get(targetId) + 1);
  }

  for (const suspect of suspects) {
    const suspectId = String(suspect?.suspect_id || '').trim();
    const suspectName = String(suspect?.name || suspect?.title || '').trim();
    const count = clueCounts.get(suspectId) || 0;
    if (count < 1) {
      warn(
        context,
        'missing_clue_coverage',
        `post_final_invariants_agent: ${suspectName} missing clue coverage`
      );
    }
  }
}

export async function postFinalInvariantsAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];

  const playerCount = context.playerCount ?? 4;
  const characterCount = getCharacterCards(context.cards).length;
  assert(
    characterCount === playerCount,
    `post_final_invariants_agent: character count ${characterCount} != playerCount ${playerCount}`
  );

  const secrets = getCardsByType(context.cards, 'secret');
  if (context?.includeSecrets !== false) {
    assert(
      secrets.length >= characterCount * 2,
      `post_final_invariants_agent: expected at least ${characterCount * 2} secret cards; got ${secrets.length}`
    );
    assertStructuredSecrets(context);
  }

  const storyActs = getCardsByType(context.cards, 'story_act');
  assert(
    storyActs.length === 3,
    `post_final_invariants_agent: expected exactly 3 story_act cards; got ${storyActs.length}`
  );
  for (const c of storyActs) {
    assert(
      String(c?.card_contents || '').trim().length >= 40,
      `post_final_invariants_agent: story_act ${c?.act} must have meaningful card_contents`
    );
    assert([1, 2, 3].includes(c.act), `post_final_invariants_agent: story_act has invalid act ${c?.act}`);
  }
  const actKeys = new Set(storyActs.map((c) => c.act));
  assert(actKeys.size === 3, 'post_final_invariants_agent: story_act cards must cover acts 1, 2, and 3');

  if (context?.includeHostSpeeches !== false) {
    const hostSpeech = getCardsByType(context.cards, 'host_speech');
    assert(
      hostSpeech.length >= 3,
      `post_final_invariants_agent: expected at least 3 host_speech cards; got ${hostSpeech.length}`
    );
  }

  const solutionCards = getCardsByType(context.cards, 'solution');
  const murderSolution = solutionCards.find((c) => String(c?.role || '').trim().toLowerCase() === 'murder') || null;
  const treasureSolution = solutionCards.find((c) => String(c?.role || '').trim().toLowerCase() === 'treasure') || null;
  assert(murderSolution, 'post_final_invariants_agent: missing murder solution card');
  assert(treasureSolution, 'post_final_invariants_agent: missing treasure solution card');
  for (const solution of [murderSolution, treasureSolution]) {
    assert(
      String(solution?.card_contents || '').trim().length >= 40,
      'post_final_invariants_agent: solution card_contents must be substantive'
    );
    if (solution?.reveal !== 'host_reveal') {
      warn(
        context,
        'solution_reveal_mismatch',
        `post_final_invariants_agent: solution ${solution?.card_id || ''} missing reveal=host_reveal`
      );
    }
    if (solution?.hidden !== true) {
      warn(
        context,
        'solution_hidden_mismatch',
        `post_final_invariants_agent: solution ${solution?.card_id || ''} missing hidden=true`
      );
    }
  }

  checkClueCoverage(context);
  assertCharacterCoverage(context);

  for (const card of context.cards || []) {
    assert(!hasPlaceholder(card.difficulty), `post_final_invariants_agent: placeholder difficulty on card ${card.card_id}`);
    if (card.hidden_until_solved !== undefined) {
      warn(
        context,
        'deprecated_hidden_until_solved',
        `post_final_invariants_agent: card ${card.card_id} still uses hidden_until_solved`
      );
    }

    if (Array.isArray(card.required_card_refs) && card.required_card_refs.length > 0) {
      assert(
        Array.isArray(card.required_card_ids) && card.required_card_ids.length >= card.required_card_refs.length,
        `post_final_invariants_agent: unresolved required refs on card ${card.card_id}`
      );
    }

    if (Array.isArray(card.unlock_card_refs)) {
      assert(
        Array.isArray(card.unlock_card_ids) && card.unlock_card_ids.length >= card.unlock_card_refs.length,
        `post_final_invariants_agent: unresolved unlock refs on card ${card.card_id}`
      );
    }
  }

  for (const bundle of context.puzzle_bundles || []) {
    assert(!hasPlaceholder(bundle.difficulty), `post_final_invariants_agent: placeholder bundle difficulty on ${bundle.bundle_id}`);
  }

  const duplicateTitles = collectDuplicateTitlesByType(context.cards);
  if (duplicateTitles.length) {
    context.debug.warning_log.push({
      stage: 'post_final_invariants_agent',
      reason: 'duplicate_titles_by_type',
      duplicates: duplicateTitles.slice(0, 20)
    });
  }

  // Final cleanup of deprecated fields and empty values.
  context.cards = (context.cards || []).map(stripEmptyFields);
  delete context.clue_targets;
  delete context.puzzle_bundle_drafts;
  delete context.puzzle_bundles;
  delete context.truth_trail;

  return context;
}
