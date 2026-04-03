function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(' ').filter(Boolean));
}

function jaccardSimilarity(a, b) {
  const aSet = tokenSet(a);
  const bSet = tokenSet(b);

  if (!aSet.size || !bSet.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
}

function collectBundles(cards) {
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

function containsVisibleSolutionLeak(puzzle, solution) {
  const puzzleText = `${String(puzzle?.card_title || '').trim()} ${String(puzzle?.card_contents || '').trim()}`.trim();
  const solutionStatement = String(solution?.card_contents || '').trim();
  const solutionText = `${String(solution?.card_title || '').trim()} ${solutionStatement}`.trim();
  const normalizedPuzzle = normalizeText(puzzleText);
  const normalizedSolutionContents = normalizeText(solutionStatement);

  if (String(puzzle?.card_contents || '').includes('Solution:')) {
    return true;
  }
  if (!puzzleText || !solutionText) {
    return false;
  }
  if (normalizedSolutionContents && normalizedPuzzle.includes(normalizedSolutionContents)) {
    return true;
  }

  return jaccardSimilarity(puzzleText, solutionText) > 0.85;
}

export async function cardQualityAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];
  const valid = cards.filter((card) => card && card.card_type && card.card_title?.trim() && card.card_contents?.trim());
  const seen = new Set();

  context.cards = valid.filter((card) => {
    if (card.bundle_id) {
      return true;
    }
    const key = `${card.card_type}::${card.card_title}::${card.card_contents}`.toLowerCase().trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const bundles = collectBundles(context.cards);
  for (const [bundleId, bundleCards] of bundles.entries()) {
    const puzzle = bundleCards.find((card) => card.card_type === 'puzzle');
    const solution = bundleCards.find((card) => card.card_type === 'solution');
    if (!puzzle || !solution) {
      continue;
    }
    const STRICT = false;

    if (containsVisibleSolutionLeak(puzzle, solution)) {
      if (STRICT) {
        throw new Error(`Puzzle bundle ${bundleId} leaks its hidden solution`);
      }

      context.warnings ??= [];
      context.warnings.push({ type: 'visible_solution_leak', bundleId });

      console.warn(`[card_quality_agent] possible solution leak: ${bundleId}`);
    }
  }

  return context;
}
