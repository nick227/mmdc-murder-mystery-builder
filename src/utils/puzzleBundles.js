function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function derivePuzzleDifficulty(evidenceCount) {
  if (evidenceCount <= 2) {
    return 'easy';
  }
  if (evidenceCount === 3) {
    return 'medium';
  }
  return 'hard';
}

export function validatePuzzleCardComposition(cards = [], label = 'puzzle bundle') {
  const safeCards = Array.isArray(cards) ? cards : [];
  const puzzle = safeCards.filter((card) => card?.card_type === 'puzzle');
  const solution = safeCards.filter((card) => card?.card_type === 'solution');
  const evidence = safeCards.filter((card) => card?.card_type === 'evidence' || card?.card_type === 'clue');
  const gate = safeCards.filter((card) => card?.card_type === 'item');

  assert(puzzle.length === 1, `${label}: must have exactly 1 puzzle card`);
  assert(solution.length === 1, `${label}: must have exactly 1 solution card`);
  assert(evidence.length >= 2, `${label}: must have at least 2 evidence cards`);
  assert(gate.length >= 1, `${label}: must have at least 1 gate card`);
}

function collectCardsByBundle(cards = []) {
  const bundles = new Map();

  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card?.bundle_id) {
      continue;
    }

    if (!bundles.has(card.bundle_id)) {
      bundles.set(card.bundle_id, []);
    }
    bundles.get(card.bundle_id).push(card);
  }

  return bundles;
}

function isTreasureUnlockCard(card) {
  return card?.card_type === 'treasure'
    || (card?.card_type === 'clue' && String(card?.role || '').trim().toLowerCase() === 'treasure');
}

export function validateBundleIntegrity(context, options = {}) {
  const { allowIdRemap = false } = options;
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const puzzleBundles = Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [];
  const cardLookup = new Map();
  const bundleCardsById = collectCardsByBundle(cards);

  for (const card of cards) {
    assert(card?.card_id, 'bundle_integrity_validator_agent: card missing card_id');
    assert(!cardLookup.has(card.card_id), `bundle_integrity_validator_agent: duplicate card_id ${card.card_id}`);
    cardLookup.set(card.card_id, card);
  }

  for (const bundle of puzzleBundles) {
    const bundleId = bundle?.bundle_id;
    const expectedCardIds = Array.isArray(bundle?.card_ids) ? bundle.card_ids : [];
    const finalBundleCards = bundleCardsById.get(bundleId) || [];
    const finalBundleCardIds = finalBundleCards.map((card) => card.card_id);
    const duplicateExpectedIds = expectedCardIds.length !== new Set(expectedCardIds).size;

    assert(bundleId, 'bundle_integrity_validator_agent: puzzle bundle missing bundle_id');
    assert(!duplicateExpectedIds, `bundle_integrity_validator_agent: bundle ${bundleId} has duplicate card_ids`);
    assert(finalBundleCards.length === expectedCardIds.length, `bundle_integrity_validator_agent: bundle ${bundleId} card count changed`);

    const allCardsMatchBundle = finalBundleCards.every((card) => card.bundle_id === bundleId);
    assert(allCardsMatchBundle, `bundle_integrity_validator_agent: bundle ${bundleId} has mixed bundle_id values`);
    validatePuzzleCardComposition(finalBundleCards, `bundle_integrity_validator_agent: bundle ${bundleId}`);

    const missingIds = expectedCardIds.filter((cardId) => !cardLookup.has(cardId));
    if (missingIds.length) {
      if (allowIdRemap && finalBundleCards.length === expectedCardIds.length) {
        bundle.card_ids = finalBundleCardIds;
      } else {
        throw new Error(`bundle_integrity_validator_agent: bundle ${bundleId} references missing card_ids`);
      }
    }

    for (const cardId of bundle.card_ids || []) {
      const card = cardLookup.get(cardId);
      assert(card, `bundle_integrity_validator_agent: bundle ${bundleId} references missing card_id ${cardId}`);
      assert(card.bundle_id === bundleId, `bundle_integrity_validator_agent: bundle ${bundleId} card ${cardId} has inconsistent bundle_id`);
    }

    const puzzleCard = finalBundleCards.find((card) => card.card_type === 'puzzle');
    if (!puzzleCard) {
      continue;
    }

    for (const unlockId of Array.isArray(puzzleCard.unlock_card_ids) ? puzzleCard.unlock_card_ids : []) {
      const unlockCard = cardLookup.get(unlockId);
      assert(unlockCard, `bundle_integrity_validator_agent: bundle ${bundleId} dropped unlock card ${unlockId}`);
      if (!isTreasureUnlockCard(unlockCard)) {
        assert(unlockCard.bundle_id === bundleId, `bundle_integrity_validator_agent: unlock card ${unlockId} escaped bundle ${bundleId}`);
      }
      assert(unlockCard.hidden_until_solved === true, `bundle_integrity_validator_agent: unlock card ${unlockId} is no longer hidden`);
    }
  }

  return context;
}
