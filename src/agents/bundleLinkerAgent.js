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

export async function bundleLinkerAgent(context) {
  const bundles = collectPuzzleBundles(context.cards);
  if (bundles.length < 2) {
    return context;
  }

  const hasAnyDependency = bundles.some((source, sourceIndex) =>
    bundles.some((target, targetIndex) =>
      sourceIndex !== targetIndex && hasCrossBundleDependency(source, target)
    )
  );

  if (hasAnyDependency) {
    return context;
  }

  const links = [];

  for (let laterIndex = 1; laterIndex < bundles.length && links.length < 2; laterIndex += 1) {
    const later = bundles[laterIndex];
    const laterPuzzle = later.puzzle;

    if (!laterPuzzle || !['medium', 'hard'].includes(laterPuzzle.difficulty)) {
      continue;
    }

    const currentRequired = Array.isArray(laterPuzzle.required_card_ids)
      ? [...laterPuzzle.required_card_ids]
      : [];

    for (let earlierIndex = 0; earlierIndex < laterIndex; earlierIndex += 1) {
      const earlier = bundles[earlierIndex];
      const earlierUnlockIds = Array.isArray(earlier.puzzle?.unlock_card_ids)
        ? earlier.puzzle.unlock_card_ids
        : [];
      const linkId = earlierUnlockIds.find((id) => !currentRequired.includes(id));

      if (!linkId) {
        continue;
      }

      laterPuzzle.required_card_ids = [...currentRequired, linkId];
      links.push({
        from_bundle_id: earlier.bundleId,
        to_bundle_id: later.bundleId,
        required_card_id: linkId
      });
      break;
    }
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
