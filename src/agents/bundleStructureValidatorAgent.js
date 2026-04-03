function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value) {
  return normalizeText(value).split(' ').filter((token) => token.length >= 4);
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

function getSuspectNames(context) {
  const caseStateSuspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const names = caseStateSuspects
    .map((suspect) => String(suspect?.name || '').trim())
    .filter(Boolean);

  if (names.length) {
    return names;
  }

  return (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'character')
    .map((card) => String(card?.card_title || '').trim())
    .filter(Boolean);
}

function buildSuspectFragments(suspectNames) {
  const fragments = new Set();

  for (const name of suspectNames) {
    const normalizedName = normalizeText(name);
    if (!normalizedName) {
      continue;
    }
    fragments.add(normalizedName);
    for (const part of normalizedName.split(' ')) {
      if (part.length >= 3) {
        fragments.add(part);
      }
    }
  }

  return [...fragments];
}

function inferLinkedTermsFromEvidence(evidenceCards, suspectNames) {
  const terms = new Set();
  const suspectFragments = buildSuspectFragments(suspectNames);
  const patterns = [
    /\b(?:access(?:ed)?|badge|keycard|key card|key|lock|locked|unlocked|entry|entered|exit|door)\b/gi,
    /\b(?:vault|backstage|green room|dressing room|lab|study|tower|lighthouse|cove|caves|marina|dock|booth|office|hall|stage|cellar|corridor|gallery|theater|theatre)\b/gi,
    /\b(?:cord|cable|dagger|knife|poison|vial|glass|cup|badge|ledger|log|receipt|ticket|photo|photograph|mask|coat|glove|ring|skiff|boat|engine)\b/gi
  ];

  for (const card of evidenceCards) {
    const title = String(card?.card_title || '');
    const contents = String(card?.card_contents || '');
    const normalizedText = normalizeText(`${title} ${contents}`);
    const assigned = normalizeText(card?.assigned_suspect_name || '');
    const linked = normalizeText(card?.linked_character || '');
    const mentionsSuspect = suspectFragments.some((fragment) =>
      fragment
      && (normalizedText.includes(fragment) || assigned.includes(fragment) || linked.includes(fragment))
    );

    if (!mentionsSuspect) {
      continue;
    }

    for (const pattern of patterns) {
      for (const match of `${title} ${contents}`.matchAll(pattern)) {
        const term = normalizeText(match[0]);
        if (term) {
          terms.add(term);
        }
      }
    }
  }

  return [...terms];
}

function solutionReferencesSuspectContext(solutionText, suspectNames, evidenceCards) {
  const normalizedSolution = normalizeText(solutionText);
  const suspectFragments = buildSuspectFragments(suspectNames);

  for (const fragment of suspectFragments) {
    if (fragment && normalizedSolution.includes(fragment)) {
      return true;
    }
  }

  const linkedTerms = inferLinkedTermsFromEvidence(evidenceCards, suspectNames);
  return linkedTerms.some((term) => term && normalizedSolution.includes(term));
}

function hasSubstantialOverlap(a, b) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) {
    return false;
  }
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap >= 1;
}

function looksLikeStandaloneFinalSolve(solutionText) {
  const normalized = normalizeText(solutionText);
  const strongPatterns = [
    /\bthe killer\b/,
    /\bthe culprit\b/,
    /\bconfess(?:ed|ion)?\b/,
    /\bfingerprints?\b.*\b(?:on|match|matched|consistent)\b/,
    /\bdna\b/,
    /\bproved? guilt\b/
  ];

  return strongPatterns.some((pattern) => pattern.test(normalized));
}

function isOpeningSceneClue(solutionText) {
  const normalized = normalizeText(solutionText);
  return (
    /\b(found dead|body|murder|slain|killed)\b/.test(normalized)
    && /\b(last seen|vanish|vanished|missing|stolen)\b/.test(normalized)
  );
}

function extractAxes(text) {
  const normalized = normalizeText(text);
  const axes = new Set();
  if (/\b(access|key|passage|entry|backstage|room|study|cellar|stage)\b/.test(normalized)) {
    axes.add('access');
  }
  if (/\b(motive|jealous|revenge|legacy|blackmail|threat|inheritance|fear)\b/.test(normalized)) {
    axes.add('motive');
  }
  if (/\b(dagger|rope|poison|quill|weapon|scarf)\b/.test(normalized)) {
    axes.add('weapon');
  }
  if (/\b(time|before|after|during|while|timeline|arrived|left)\b/.test(normalized)) {
    axes.add('timeline');
  }
  if (/\b(contradict|alibi|elsewhere|despite|however|inconsistent|claims)\b/.test(normalized)) {
    axes.add('contradiction');
  }
  if (/\b(possess|carrying|held|owned|hidden|concealed|compartment|cache)\b/.test(normalized)) {
    axes.add('possession');
  }
  if (/\b(witness|observed|seen|recalled|guest|statement)\b/.test(normalized)) {
    axes.add('witness');
  }
  if (/\b(fingerprint|blood|trace|fabric|footprint|drag marks)\b/.test(normalized)) {
    axes.add('physical_trace');
  }
  return axes;
}

export async function bundleStructureValidatorAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];
  const bundles = collectBundles(context.cards);
  const bundleMeta = new Map(
    (Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [])
      .map((bundle) => [bundle.bundle_id, bundle])
  );
  const suspectNames = getSuspectNames(context);

  for (const [bundleId, bundleCards] of bundles.entries()) {
    const puzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
    const solutionCards = bundleCards.filter((card) => card.card_type === 'solution');
    const evidenceCards = bundleCards.filter((card) => ['clue', 'item'].includes(card.card_type));

    assert(puzzleCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 puzzle card`);
    assert(solutionCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 solution card`);
    assert(evidenceCards.length >= 2, `bundle_structure_validator_agent: bundle ${bundleId} must have at least 2 evidence cards`);

    const puzzle = puzzleCards[0];
    const solution = solutionCards[0];
    const meta = bundleMeta.get(bundleId) || null;

    assert(puzzle.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must remain visible`);
    for (const evidenceCard of evidenceCards) {
      assert(evidenceCard.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} evidence must remain visible`);
    }
    assert(solution.hidden_until_solved === true, `bundle_structure_validator_agent: bundle ${bundleId} solution must remain hidden`);
    assert(typeof solution.card_contents === 'string' && solution.card_contents.trim(), `bundle_structure_validator_agent: bundle ${bundleId} solution must have card_contents`);
    assert(typeof puzzle.puzzle_type === 'string' && puzzle.puzzle_type.trim(), `bundle_structure_validator_agent: bundle ${bundleId} puzzle must have puzzle_type`);
    assert(Array.isArray(puzzle.unlock_card_ids) && puzzle.unlock_card_ids.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must unlock exactly one hidden clue`);

    if (meta) {
      assert(
        meta.puzzle_type === puzzle.puzzle_type,
        `bundle_structure_validator_agent: bundle ${bundleId} puzzle_type metadata drift`
      );
      assert(
        meta.act === puzzle.act,
        `bundle_structure_validator_agent: bundle ${bundleId} act metadata drift`
      );
      if (meta.clue_target) {
        assert(
          solution.card_contents === meta.clue_target,
          `bundle_structure_validator_agent: bundle ${bundleId} hidden clue must match selected clue target`
        );
      }
    }

    const normalizedPuzzle = normalizeText(puzzle.card_contents);
    const normalizedSolution = normalizeText(solution.card_contents);
    assert(!normalizedPuzzle.includes(normalizedSolution), `bundle_structure_validator_agent: bundle ${bundleId} puzzle leaks its hidden solution`);
    const allBundleIds = [...bundleMeta.keys()].sort();
    const isFirstBundle = bundleId === allBundleIds[0];
    const isFinalBundle = bundleId === allBundleIds[allBundleIds.length - 1];
    const hasSuspectContext = solutionReferencesSuspectContext(solution.card_contents, suspectNames, evidenceCards);

    assert(
      hasSuspectContext || (isFirstBundle && isOpeningSceneClue(solution.card_contents)),
      `bundle_structure_validator_agent: bundle ${bundleId} hidden clue must reference a suspect or suspect-linked evidence`
    );

    if (isFinalBundle) {
      const priorTargets = allBundleIds
        .filter((id) => id !== bundleId)
        .map((id) => bundleMeta.get(id)?.clue_target)
        .filter(Boolean);

      if (looksLikeStandaloneFinalSolve(solution.card_contents)) {
        context.debug.warning_log.push({
          stage: 'bundle_structure_validator_agent',
          bundle_id: bundleId,
          reason: 'final_bundle_too_decisive',
          clue: solution.card_contents
        });
      }

      if (priorTargets.length && !priorTargets.some((target) => hasSubstantialOverlap(solution.card_contents, target))) {
        context.debug.warning_log.push({
          stage: 'bundle_structure_validator_agent',
          bundle_id: bundleId,
          reason: 'final_bundle_not_confirming_prior_chain',
          clue: solution.card_contents
        });
      }
    }
  }

  const orderedMeta = [...bundleMeta.values()]
    .filter(Boolean)
    .sort((a, b) => String(a.bundle_id || '').localeCompare(String(b.bundle_id || '')));
  if (orderedMeta.length >= 4) {
    const third = orderedMeta[2];
    const fourth = orderedMeta[3];
    const thirdAxes = extractAxes(third?.clue_target || third?.solution_summary || '');
    const fourthAxes = extractAxes(fourth?.clue_target || fourth?.solution_summary || '');
    const sharedAxes = [...thirdAxes].filter((axis) => fourthAxes.has(axis));
    assert(
      sharedAxes.length === 0,
      `bundle_structure_validator_agent: bundle ${fourth.bundle_id} must introduce a new deduction axis beyond ${third.bundle_id}`
    );
  }

  return context;
}
