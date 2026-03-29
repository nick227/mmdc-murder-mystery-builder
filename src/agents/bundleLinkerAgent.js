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

  if (links.length) {
    context.debug.warning_log.push({
      stage: 'bundle_linker',
      reason: 'auto_linked_bundle_dependencies',
      links
    });
  }

  return context;
}
