function collectPuzzleBundles(cards) {
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

  return [...bundles.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bundleId, bundleCards]) => {
      const puzzle = bundleCards.find((card) => card.card_type === 'puzzle') || null;
      return {
        bundleId,
        bundleCards,
        puzzle
      };
    })
    .filter((bundle) => bundle.puzzle);
}

function hasCrossBundleDependency(sourceBundle, targetBundle) {
  const unlockIds = new Set(sourceBundle.puzzle?.unlock_card_ids || []);
  const requiredIds = new Set(targetBundle.puzzle?.required_card_ids || []);

  for (const id of unlockIds) {
    if (requiredIds.has(id)) {
      return true;
    }
  }

  return false;
}

function getCardLookup(cards) {
  return new Map((Array.isArray(cards) ? cards : []).map((card) => [card.card_id, card]));
}

function getUnlockCardsForPuzzle(puzzle, cardLookup) {
  return (Array.isArray(puzzle?.unlock_card_ids) ? puzzle.unlock_card_ids : [])
    .map((id) => cardLookup.get(id))
    .filter(Boolean);
}

function findBundleByFactBinding(bundles, cardLookup, factBinding) {
  return bundles.find((bundle) =>
    getUnlockCardsForPuzzle(bundle?.puzzle, cardLookup)
      .some((card) => card?.card_type === 'solution' && String(card?.meta?.fact_binding || '').trim() === factBinding)
  ) || null;
}

function appendUnlockCard(puzzle, cardId) {
  const current = Array.isArray(puzzle?.unlock_card_ids) ? [...puzzle.unlock_card_ids] : [];
  if (!cardId || current.includes(cardId)) {
    return false;
  }
  puzzle.unlock_card_ids = [...current, cardId];
  return true;
}

function wireTreasureUnlocks(context, bundles, cardLookup, links) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const treasureClue = cards.find((card) =>
    card?.card_type === 'clue'
    && String(card?.role || '').trim().toLowerCase() === 'treasure'
    && card?.hidden_until_solved === true
    && String(card?.meta?.treasure_stage || '').trim() === 'clue'
  ) || null;
  const treasureReveal = cards.find((card) =>
    card?.card_type === 'treasure'
    && card?.hidden_until_solved === true
  ) || null;

  const treasureObjectBundle = findBundleByFactBinding(bundles, cardLookup, 'treasure_object');
  const treasureLocationBundle = findBundleByFactBinding(bundles, cardLookup, 'treasure_location');

  if (treasureClue && treasureObjectBundle?.puzzle && appendUnlockCard(treasureObjectBundle.puzzle, treasureClue.card_id)) {
    links.push({
      from_bundle_id: treasureObjectBundle.bundleId,
      to_special_unlock: 'treasure_clue',
      unlock_card_id: treasureClue.card_id,
      mutation_type: 'unlock_card_id_append_only'
    });
  }

  if (treasureReveal && treasureLocationBundle?.puzzle && appendUnlockCard(treasureLocationBundle.puzzle, treasureReveal.card_id)) {
    links.push({
      from_bundle_id: treasureLocationBundle.bundleId,
      to_special_unlock: 'treasure_reveal',
      unlock_card_id: treasureReveal.card_id,
      mutation_type: 'unlock_card_id_append_only'
    });
  }
}

export function getBundleAct(bundle) {
  const act = bundle?.puzzle?.act;
  return act === 1 || act === 2 || act === 3 ? act : 2;
}

export function canLinkUnlockToPuzzle(sourceBundle, unlockCard, targetBundle, currentRequired) {
  const targetPuzzle = targetBundle?.puzzle;
  if (!sourceBundle || !unlockCard || !targetPuzzle) {
    return false;
  }
  if (currentRequired.includes(unlockCard.card_id)) {
    return false;
  }
  if (unlockCard.hidden_until_solved !== true) {
    return false;
  }

  const unlockAct = unlockCard.act === 1 || unlockCard.act === 2 || unlockCard.act === 3 ? unlockCard.act : 3;
  const targetAct = targetPuzzle.act === 1 || targetPuzzle.act === 2 || targetPuzzle.act === 3 ? targetPuzzle.act : 2;
  if (unlockAct > targetAct) {
    return false;
  }
  if (unlockCard.hidden_until_solved === true) {
    const sourceAct = getBundleAct(sourceBundle);
    if (sourceAct > targetAct) {
      return false;
    }
  }

  return true;
}

export async function bundleLinkerAgent(context) {
  const bundles = collectPuzzleBundles(context.cards);
  const cardLookup = getCardLookup(context.cards);
  if (bundles.length < 2) {
    wireTreasureUnlocks(context, bundles, cardLookup, []);
    return context;
  }

  const links = [];

  function tryLinkAdjacentBundle(sourceBundle, targetBundle) {
    const targetPuzzle = targetBundle?.puzzle;
    if (!sourceBundle?.puzzle || !targetPuzzle) {
      return false;
    }
    if (hasCrossBundleDependency(sourceBundle, targetBundle)) {
      return false;
    }

    const currentRequired = Array.isArray(targetPuzzle.required_card_ids)
      ? [...targetPuzzle.required_card_ids]
      : [];
    const earlierUnlockIds = Array.isArray(sourceBundle.puzzle?.unlock_card_ids) ? sourceBundle.puzzle.unlock_card_ids : [];
    const earlierUnlockCards = earlierUnlockIds
      .map((id) => cardLookup.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.card_type === 'clue' && b.card_type !== 'clue') {
          return -1;
        }
        if (a.card_type !== 'clue' && b.card_type === 'clue') {
          return 1;
        }
        return String(a.card_id).localeCompare(String(b.card_id));
      });

    const linkCard = earlierUnlockCards.find((card) => canLinkUnlockToPuzzle(sourceBundle, card, targetBundle, currentRequired));
    if (!linkCard) {
      return false;
    }

    targetPuzzle.required_card_ids = [...currentRequired, linkCard.card_id];
    links.push({
      from_bundle_id: sourceBundle.bundleId,
      to_bundle_id: targetBundle.bundleId,
      required_card_id: linkCard.card_id,
      mutation_type: 'required_card_id_append_only'
    });
    return true;
  }

  for (let index = 1; index < bundles.length; index += 1) {
    tryLinkAdjacentBundle(bundles[index - 1], bundles[index]);
  }

  wireTreasureUnlocks(context, bundles, cardLookup, links);

  if (links.length) {
    context.debug.warning_log.push({
      stage: 'bundle_linker',
      reason: 'auto_linked_bundle_dependencies',
      links
    });
  }

  return context;
}
