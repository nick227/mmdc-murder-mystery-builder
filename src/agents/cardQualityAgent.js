function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function bumpCount(map, key) {
  const safeKey = key || 'unknown';
  map[safeKey] = (map[safeKey] || 0) + 1;
}

function warn(context, bundleId, reason, stage) {
  context.debug.warning_log.push({
    bundle_id: bundleId,
    reason,
    stage
  });
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function tokenSet(value) {
  return new Set(tokenize(value));
}

function isPlaceholderText(value) {
  const text = normalizeText(value);
  return !text || text === 'mock' || text === 'generated puzzle evidence' || text.includes('mock card');
}

function isInformativeText(value) {
  const tokens = tokenize(value).filter((token) => !['mock', 'card', 'generated', 'puzzle', 'evidence'].includes(token));
  return tokens.length >= 4;
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

function affectsSuspectSpace(value) {
  const text = normalizeText(value);
  const signalTerms = [
    'suspect',
    'timeline',
    'access',
    'object',
    'weapon',
    'route',
    'alibi',
    'movement',
    'owner',
    'motive',
    'location'
  ];

  return signalTerms.some((term) => text.includes(term));
}

function hasMultiCardReasoning(summary, requiredCards) {
  const text = normalizeText(summary);
  const connectiveTerms = [' and ', ' both ', ' compare ', ' combined ', ' together ', ' intersection ', ' cross reference '];
  const distinctMatches = requiredCards.filter((card) => {
    const title = normalizeText(card.card_title);
    return title && text.includes(title);
  });

  return distinctMatches.length >= 2 || connectiveTerms.some((term) => text.includes(term.trim()) || text.includes(term));
}

function requiredCardsInteract(requiredCards, summary) {
  if (requiredCards.length <= 2) {
    return true;
  }

  const interactionTerms = [
    'log', 'list', 'map', 'route', 'key', 'ledger', 'timeline', 'time',
    'record', 'note', 'diagram', 'cipher', 'code', 'inventory', 'schedule',
    'access', 'door', 'room', 'hall', 'cabinet', 'watch'
  ];

  const texts = requiredCards.map((card) => normalizeText(`${card.card_title} ${card.card_contents}`));
  const matchedTerms = new Set();

  for (const text of texts) {
    for (const term of interactionTerms) {
      if (text.includes(term)) {
        matchedTerms.add(term);
      }
    }
  }

  if (matchedTerms.size >= 2) {
    return true;
  }

  const summaryText = normalizeText(summary);
  return ['compare', 'both', 'together', 'contradiction', 'cross reference', 'intersection']
    .some((term) => summaryText.includes(term));
}

function isTrivialPuzzle(summary, requiredCards) {
  const summaryText = normalizeText(summary);
  return requiredCards.some((card) => {
    const cardText = normalizeText(`${card.card_title} ${card.card_contents}`);
    return cardText && summaryText && (cardText.includes(summaryText) || summaryText.includes(cardText));
  });
}

function isCircularUnlock(puzzle, unlockCards) {
  const puzzleText = `${puzzle.card_title} ${puzzle.card_contents}`;
  return unlockCards.some((card) => {
    const unlockText = `${card.card_title} ${card.card_contents}`;
    return jaccardSimilarity(puzzleText, unlockText) > 0.85;
  });
}

function isRedundantUnlock(unlockCards, comparisonCards) {
  return unlockCards.some((unlockCard) => {
    const unlockText = `${unlockCard.card_title} ${unlockCard.card_contents}`;
    if (isPlaceholderText(unlockText) || !isInformativeText(unlockText)) {
      return false;
    }

    return comparisonCards.some((card) => {
      const comparisonText = `${card.card_title} ${card.card_contents}`;
      if (isPlaceholderText(comparisonText) || !isInformativeText(comparisonText)) {
        return false;
      }
      return jaccardSimilarity(unlockText, comparisonText) > 0.85;
    });
  });
}

function isRedundantAgainstSingleRequiredCard(unlockCards, requiredCards) {
  return unlockCards.some((unlockCard) => {
    const unlockText = `${unlockCard.card_title} ${unlockCard.card_contents}`;
    if (isPlaceholderText(unlockText) || !isInformativeText(unlockText)) {
      return false;
    }

    return requiredCards.some((card) => {
      const requiredText = `${card.card_title} ${card.card_contents}`;
      if (isPlaceholderText(requiredText) || !isInformativeText(requiredText)) {
        return false;
      }
      return jaccardSimilarity(unlockText, requiredText) > 0.85;
    });
  });
}

function violatesSemanticStrength(puzzle, unlockCards, solutionSummary) {
  const actionableGain = normalizeText(puzzle.actionable_gain);
  const summaryText = normalizeText(solutionSummary);
  const unlockText = normalizeText(unlockCards.map((card) => `${card.card_title} ${card.card_contents}`).join(' '));
  const combined = `${actionableGain} ${summaryText} ${unlockText}`;

  if (puzzle.difficulty === 'easy' || puzzle.difficulty === 'medium') {
    if (combined.includes('only suspect') || combined.includes('one suspect') || combined.includes('weapon ownership')) {
      return true;
    }
  }

  if (puzzle.difficulty === 'hard') {
    const changesSuspectSpace = ['eliminate', 'eliminates', 'narrow', 'narrows', 'contradict', 'contradicts', 'break', 'breaks', 'link', 'links', 'prove', 'proves']
      .some((term) => combined.includes(term));
    const solvesCase = ['killer', 'murderer', 'full solution', 'case solved'].some((term) => combined.includes(term));
    if (!changesSuspectSpace || solvesCase) {
      return true;
    }
  }

  return false;
}

function getBundleAct(bundleCards) {
  const puzzle = bundleCards.find((card) => card.card_type === 'puzzle');
  return puzzle?.act ?? 2;
}

function getBundleDifficulty(bundleCards) {
  const puzzle = bundleCards.find((card) => card.card_type === 'puzzle');
  return puzzle?.difficulty ?? 'medium';
}

function getBundlePuzzle(bundleCards) {
  return bundleCards.find((card) => card.card_type === 'puzzle') || null;
}

function collectBundles(cards) {
  const bundles = new Map();

  for (const card of cards) {
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

function buildBundleGraph(bundles) {
  const graph = new Map();

  for (const [bundleId, bundleCards] of bundles.entries()) {
    const puzzle = getBundlePuzzle(bundleCards);
    const unlockCards = bundleCards.filter((card) => puzzle?.unlock_card_ids?.includes(card.card_id));
    const requiredIds = new Set(puzzle?.required_card_ids || []);
    const unlockIds = new Set(puzzle?.unlock_card_ids || []);

    graph.set(bundleId, {
      bundleId,
      puzzle,
      bundleCards,
      requiredIds,
      unlockIds,
      unlockCards,
      incoming: new Set(),
      outgoing: new Set(),
      unlockReferencedCount: 0
    });
  }

  const entries = [...graph.values()];
  for (const source of entries) {
    for (const target of entries) {
      if (source.bundleId === target.bundleId) {
        continue;
      }

      const unlockDependency = [...source.unlockIds].some((id) => target.requiredIds.has(id));

      if (unlockDependency) {
        source.outgoing.add(target.bundleId);
        target.incoming.add(source.bundleId);
        source.unlockReferencedCount += 1;
      }
    }
  }

  return graph;
}

function isTerminalStrongBundle(node) {
  const puzzle = node.puzzle;
  const combined = normalizeText(`${puzzle?.actionable_gain} ${puzzle?.solution_summary}`);
  const narrowsTightly = combined.includes('two suspects') || combined.includes('2 suspects') || combined.includes('final two') || combined.includes('narrows the suspect space');

  return getBundleAct(node.bundleCards) === 3
    && getBundleDifficulty(node.bundleCards) === 'hard'
    && narrowsTightly;
}

function rejectPuzzleIslands(cards, context) {
  const bundles = collectBundles(cards);
  const graph = buildBundleGraph(bundles);
  const chainMemo = new Map();

  function getChainDepth(bundleId, visiting = new Set()) {
    if (chainMemo.has(bundleId)) {
      return chainMemo.get(bundleId);
    }
    if (visiting.has(bundleId)) {
      return 0;
    }

    visiting.add(bundleId);
    const node = graph.get(bundleId);
    let depth = 1;
    for (const nextId of node?.outgoing || []) {
      depth = Math.max(depth, 1 + getChainDepth(nextId, visiting));
    }
    visiting.delete(bundleId);
    chainMemo.set(bundleId, depth);
    return depth;
  }

  for (const node of graph.values()) {
    const puzzle = node.puzzle;
    if (!puzzle) {
      continue;
    }

    const isIsolated = node.incoming.size === 0 && node.outgoing.size === 0;
    const hasUnlockReuse = node.unlockReferencedCount >= 1;
    const effectText = `${puzzle.actionable_gain} ${puzzle.solution_summary} ${node.unlockCards.map((card) => `${card.card_title} ${card.card_contents}`).join(' ')}`;
    const affectsSuspectSet = affectsSuspectSpace(effectText);
    const unlockStrong = node.unlockCards.some((card) => card.evidence_strength === 'strong');
    const chainDepth = getChainDepth(node.bundleId);
    const changesState = affectsSuspectSet || hasUnlockReuse || node.outgoing.size > 0;

    context.debug.connectivity.push({
      bundle_id: node.bundleId,
      in_degree: node.incoming.size,
      out_degree: node.outgoing.size,
      chain_depth: chainDepth
    });
    context.debug.state_change_flags.push(changesState);

    if (isIsolated && getBundleAct(node.bundleCards) !== 1 && !isTerminalStrongBundle(node)) {
      warn(context, node.bundleId, 'isolated_bundle', 'connectivity');
    }

    if (!hasUnlockReuse && node.outgoing.size === 0 && !affectsSuspectSet && !isTerminalStrongBundle(node)) {
      warn(context, node.bundleId, 'dead_unlocks', 'connectivity');
    }

    if (unlockStrong && node.outgoing.size === 0 && !affectsSuspectSet && !isTerminalStrongBundle(node)) {
      warn(context, node.bundleId, 'terminal_dead_end', 'connectivity');
    }
  }

  context.debug.longest_chain_length = Math.max(
    context.debug.longest_chain_length || 0,
    ...[...graph.keys()].map((bundleId) => getChainDepth(bundleId))
  );
}

function deriveGainType(actionableGain) {
  const text = normalizeText(actionableGain);
  if (text.includes('timeline') || text.includes('alibi') || text.includes('time')) {
    return 'timeline';
  }
  if (text.includes('access') || text.includes('route') || text.includes('door')) {
    return 'access';
  }
  if (text.includes('object') || text.includes('weapon') || text.includes('owner') || text.includes('link')) {
    return 'object';
  }
  return 'eliminate';
}

function validatePuzzleSemantics(bundle, context) {
  const bundleCards = Array.isArray(bundle?.cards) ? bundle.cards : [];
  const puzzle = bundleCards.find((card) => card.card_type === 'puzzle');
  if (!puzzle) {
    return { valid: true };
  }

  const cards = Array.isArray(context.cards) ? context.cards : [];
  const cardLookup = new Map(cards.map((card) => [card.card_id, card]));
  const requiredCards = (puzzle.required_card_ids || []).map((id) => cardLookup.get(id)).filter(Boolean);
  const unlockCards = (puzzle.unlock_card_ids || []).map((id) => cardLookup.get(id)).filter(Boolean);
  const upstreamCards = cards.filter((card) => !card.bundle_id || card.bundle_id !== bundle.bundle_id);

  if (!hasMultiCardReasoning(puzzle.solution_summary, requiredCards)) {
    return { valid: false, reason: 'single_concept_solution' };
  }
  if (isTrivialPuzzle(puzzle.solution_summary, requiredCards)) {
    return { valid: false, reason: 'trivial_puzzle' };
  }
  if (!requiredCardsInteract(requiredCards, puzzle.solution_summary)) {
    return { valid: false, reason: 'non_interacting_required_cards' };
  }
  if (isCircularUnlock(puzzle, unlockCards)) {
    return { valid: false, reason: 'circular_unlock' };
  }
  if (isRedundantUnlock(unlockCards, upstreamCards)) {
    return { valid: false, reason: 'redundant_unlock' };
  }
  if (isRedundantAgainstSingleRequiredCard(unlockCards, requiredCards)) {
    return { valid: false, reason: 'redundant_unlock' };
  }
  if (violatesSemanticStrength(puzzle, unlockCards, puzzle.solution_summary)) {
    return { valid: false, reason: 'semantic_strength_mismatch' };
  }

  return { valid: true };
}

function validatePuzzleBundles(cards, context) {
  const bundles = collectBundles(cards);

  for (const [bundleId, bundleCards] of bundles.entries()) {
    const puzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
    if (!puzzleCards.length) {
      continue;
    }

    const puzzle = puzzleCards[0];
    const requiredIds = Array.isArray(puzzle.required_card_ids) ? puzzle.required_card_ids : [];
    const unlockIds = Array.isArray(puzzle.unlock_card_ids) ? puzzle.unlock_card_ids : [];
    const cardIds = new Set(bundleCards.map((card) => card.card_id));
    const dedupe = new Set();

    for (const card of bundleCards) {
      const key = `${card.card_type}::${card.card_title}::${card.card_contents}`.toLowerCase().trim();
      if (dedupe.has(key)) {
        warn(context, bundleId, 'redundant_cards', 'semantic');
      }
      dedupe.add(key);
    }

    if (requiredIds.length < 2) {
      context.debug.rejection_log.push({ bundle_id: bundleId, reason: 'trivial_required_card_ids', stage: 'structural' });
      throw new Error(`Puzzle bundle ${bundleId} has trivial required_card_ids`);
    }
    if (!unlockIds.length) {
      context.debug.rejection_log.push({ bundle_id: bundleId, reason: 'missing_unlock_cards', stage: 'structural' });
      throw new Error(`Puzzle bundle ${bundleId} has no unlock cards`);
    }
    if (requiredIds.every((id) => cardIds.has(id)) && puzzle.difficulty === 'hard') {
      context.debug.rejection_log.push({ bundle_id: bundleId, reason: 'hard_self_contained_puzzle', stage: 'structural' });
      throw new Error(`Puzzle bundle ${bundleId} is a hard self-contained puzzle`);
    }

    const semanticResult = validatePuzzleSemantics(
      {
        bundle_id: bundleId,
        cards: bundleCards
      },
      context
    );
    if (!semanticResult.valid) {
      warn(context, bundleId, semanticResult.reason, 'semantic');
    }

    bumpCount(context.debug.gain_counts, deriveGainType(puzzle.actionable_gain));
    bumpCount(context.debug.strength_counts, bundleCards.some((card) => card.evidence_strength === 'strong') ? 'strong' : 'supporting');
  }

  rejectPuzzleIslands(cards, context);
}

export async function cardQualityAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  const valid = cards.filter(
    (c) => c && c.card_type && c.card_title?.trim() && c.card_contents?.trim()
  );

  const seen = new Set();
  context.cards = valid.filter((c) => {
    if (c.bundle_id) {
      return true;
    }

    const key = `${c.card_type}::${c.card_title}::${c.card_contents}`.toLowerCase().trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  validatePuzzleBundles(context.cards, context);

  return context;
}
