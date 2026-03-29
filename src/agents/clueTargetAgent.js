import { callJson } from '../llm/client.js';
import { buildClueTargetsPrompt } from '../prompts/clueTargetsPrompt.js';
import { clueTargetsSchema } from '../schemas/clueTargetsSchema.js';
import { isClueTargetAnchored } from '../utils/clueTargetAnchors.js';
import { getCardsByType, getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { findMentionedSuspectIds } from '../utils/factLedger.js';
import {
  addPressureFromText,
  createSuspectPressureMap,
  getActiveSuspects,
  getPressureBalance
} from '../utils/suspectPressureMap.js';

const PUZZLE_TARGET_COUNT = 4;
const DEFAULT_ACTS = [1, 2, 3, 3];
const OUTER_MAX_ATTEMPTS = 3;
const SLOT_MAX_ATTEMPTS = 2;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCharacterMatchers(characterCards = []) {
  return characterCards.map((card) => {
    const full = String(card?.card_title || '').trim();
    const base = full.split(',')[0].trim() || full;
    const variants = new Set(
      [full, base]
        .map((entry) => normalizeText(entry))
        .filter(Boolean)
    );
    const tokens = normalizeText(base).split(' ').filter(Boolean);
    if (tokens.length >= 2) {
      variants.add(tokens.slice(0, 2).join(' '));
      variants.add(tokens.slice(-2).join(' '));
    }
    return {
      label: base,
      variants: [...variants]
    };
  });
}

function getBaseCharacterNames(characterCards = []) {
  return characterCards
    .map((card) => String(card?.card_title || '').split(',')[0].trim())
    .filter(Boolean);
}

function findMentionedCharacters(text, matchers = []) {
  const normalized = normalizeText(text);
  return matchers
    .filter((matcher) => matcher.variants.some((variant) => normalized.includes(variant)))
    .map((matcher) => matcher.label);
}

function buildSuspectNameIndex(caseState) {
  const index = new Map();
  for (const suspect of Array.isArray(caseState?.suspects) ? caseState.suspects : []) {
    const suspectId = String(suspect?.suspect_id || '').trim();
    if (!suspectId) {
      continue;
    }
    for (const raw of [suspect?.name, suspect?.title]) {
      const normalized = normalizeText(raw);
      if (normalized) {
        index.set(normalized, suspectId);
      }
    }
  }
  return index;
}

function buildSuspectRoster(characterCards = [], caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  const displayByNormalizedName = new Map();
  const suspectIdByNormalizedName = new Map();
  for (const suspect of suspects) {
    const displayName = String(suspect?.name || suspect?.title || '').trim();
    const suspectId = String(suspect?.suspect_id || '').trim();
    if (displayName) {
      const normalized = normalizeText(displayName);
      displayByNormalizedName.set(normalized, displayName);
      if (suspectId) {
        suspectIdByNormalizedName.set(normalized, suspectId);
      }
    }
  }

  return characterCards.map((card) => {
    const planName = String(card?.card_title || '').trim();
    const baseName = planName.split(',')[0].trim() || planName;
    const normalizedBaseName = normalizeText(baseName);
    const suspectId = suspectIdByNormalizedName.get(normalizedBaseName)
      || normalizeText(planName).replace(/\s+/g, '_');
    return {
      suspectId,
      displayName: displayByNormalizedName.get(normalizedBaseName) || baseName || suspectId,
      planName
    };
  }).filter((entry) => entry.planName && entry.suspectId);
}

function buildRosterIndexes(roster = []) {
  return {
    bySuspectId: new Map(roster.map((entry) => [entry.suspectId, entry])),
    byPlanName: new Map(roster.map((entry) => [normalizeText(entry.planName), entry])),
    byDisplayName: new Map(roster.map((entry) => [normalizeText(entry.displayName), entry]))
  };
}

function getRosterEntryByAnyName(value, rosterIndexes) {
  const normalized = normalizeText(value);
  return rosterIndexes.byPlanName.get(normalized)
    || rosterIndexes.byDisplayName.get(normalized)
    || rosterIndexes.bySuspectId.get(String(value || '').trim())
    || null;
}

function chooseEarlySuspectPlan(requiredEarlySuspects = [], baseCharacterNames = [], killerName = '') {
  const normalizedKiller = normalizeText(killerName);
  const source = [...requiredEarlySuspects, ...baseCharacterNames]
    .map((name) => String(name || '').trim())
    .filter(Boolean);
  const deduped = [...new Set(source)];
  const nonKiller = deduped.filter((name) => normalizeText(name) !== normalizedKiller);
  const killer = deduped.filter((name) => normalizeText(name) === normalizedKiller);
  return [...nonKiller, ...killer].slice(0, 3);
}

function getSlotSuspectCandidates(slotIndex, targetSuspectPlan, pressureMap, context, selectedPrimaryIds = [], rosterIndexes) {
  const plannedEntry = getRosterEntryByAnyName(targetSuspectPlan?.[slotIndex], rosterIndexes);
  const plannedId = plannedEntry?.suspectId || null;
  if (slotIndex < 3) {
    return plannedId ? [plannedId] : [];
  }
  return [null];
}

function buildCandidateSet(rawTargets, context) {
  const isAnchored = context?.__isClueTargetAnchored || isClueTargetAnchored;
  const normalizedTargets = (rawTargets || [])
    .map((target, index) => normalizeTarget(target, index))
    .filter((target) => target.fact);

  const dedupedTargets = [];
  for (const target of normalizedTargets) {
    if (dedupedTargets.some((existing) => areTargetsOverlapping(existing.fact, target.fact))) {
      continue;
    }
    if (!isAnchored(target.fact, context)) {
      continue;
    }
    dedupedTargets.push(target);
  }
  return dedupedTargets;
}

function getTargetPrimarySuspectId(target, preferredSuspectId, context) {
  const mentioned = findMentionedSuspectIds(target?.fact, context?.case_state);
  if (preferredSuspectId && mentioned.includes(preferredSuspectId)) {
    return preferredSuspectId;
  }
  return mentioned[0] || null;
}

function validateCandidateForSlot(target, slotIndex, selectedTargets, preferredSuspectId, context) {
  const reasons = [];
  const text = String(target?.fact || '').trim();
  const mentionedSuspectIds = findMentionedSuspectIds(text, context?.case_state);
  const priorPrimaryIds = selectedTargets.map((entry) => entry.primarySuspectId).filter(Boolean);
  const priorFirstTwo = priorPrimaryIds.slice(0, 2);

  if (!mentionedSuspectIds.length) {
    reasons.push(`target_${slotIndex + 1}_missing_suspect_reference`);
    return reasons;
  }

  if (slotIndex < 3 && preferredSuspectId && !mentionedSuspectIds.includes(preferredSuspectId)) {
    reasons.push(`target_${slotIndex + 1}_misses_planned_suspect:${preferredSuspectId}`);
  }

  if (slotIndex === 0 && mentionedSuspectIds.length > 1) {
    reasons.push('target_1_implicates_multiple_suspects');
  }

  if (slotIndex === 1 && priorPrimaryIds[0] && mentionedSuspectIds.length === 1 && mentionedSuspectIds[0] === priorPrimaryIds[0]) {
    reasons.push('target_2_repeats_target_1_suspect');
  }

  if (
    slotIndex === 2 &&
    (Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects.length : 0) > 2 &&
    priorFirstTwo.length >= 2 &&
    mentionedSuspectIds.length === 1 &&
    priorFirstTwo.includes(mentionedSuspectIds[0])
  ) {
    reasons.push('target_3_repeats_early_suspect');
  }

  if (slotIndex < 3 && (hasDirectConfirmationLanguage(text) || hasAccessWeaponLockLanguage(text))) {
    reasons.push(`target_${slotIndex + 1}_too_decisive`);
  }

  const currentMap = buildDraftPressureMap(selectedTargets.map((entry) => entry.target), context);
  const currentBalance = getPressureBalance(currentMap);
  const scoreBySuspect = new Map(
    (currentBalance.by_suspect || []).map((entry) => [entry.suspect_id, entry.total_score || 0])
  );
  for (const suspectId of mentionedSuspectIds) {
    if (slotIndex < 3 && (scoreBySuspect.get(suspectId) || 0) >= 2 && priorPrimaryIds.includes(suspectId)) {
      reasons.push(`target_${slotIndex + 1}_overweights_existing_suspect:${suspectId}`);
    }
  }

  if (slotIndex === 3 && selectedTargets[2]) {
    const priorAxes = extractEvidenceAxes(selectedTargets[2].target?.fact);
    const nextAxes = extractEvidenceAxes(text);
    const sharedAxes = [...priorAxes].filter((axis) => nextAxes.has(axis));
    if (sharedAxes.length > 0) {
      reasons.push(`target_4_reuses_target_3_axis:${sharedAxes.join(',')}`);
    }
  }

  if (selectedTargets.some((entry) => areTargetsOverlapping(entry.target?.fact, text))) {
    reasons.push(`target_${slotIndex + 1}_duplicates_prior_target`);
  }

  return reasons;
}

function buildEscalatingSlotOverrides(slotIndex, slotFailureReasons = [], selectedTargets = [], context) {
  return [];
}

function getBaseTitle(value) {
  return String(value || '').split(',')[0].trim();
}

function buildLocationPool(context) {
  const cards = getCardsByType(context?.cards, 'location');
  const titles = cards
    .map((card) => getBaseTitle(card?.card_title))
    .filter(Boolean);

  const coreTruthLocations = [
    context?.coreTruth?.murder?.location,
    context?.coreTruth?.treasure?.hiding_place
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set([...titles, ...coreTruthLocations])];
}

function buildObjectPool(context) {
  const itemTitles = getCardsByType(context?.cards, 'item')
    .map((card) => getBaseTitle(card?.card_title))
    .filter(Boolean);

  const coreTruthObjects = [
    context?.coreTruth?.treasure?.object,
    context?.coreTruth?.murder?.method
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set([...itemTitles, ...coreTruthObjects])];
}

function chooseDistinctCategory(slotIndex, selectedTargets = []) {
  const fixed = ['movement', 'location', 'object'];
  return fixed[slotIndex] || 'access';
}

function removeStrongGravityWords(text) {
  return String(text || '')
    .replace(/\b(only|solely|directly|confirmed|unique|exclusively|unrestricted)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDeterministicTarget({ suspectName, category, act, location, object }) {
  const safeSuspect = String(suspectName || '').trim();
  const safeLocation = String(location || '').trim();
  const safeObject = String(object || '').trim();
  let fact = '';

  switch (category) {
  case 'movement':
    fact = `Shortly before the alarm, observers placed ${safeSuspect} moving through ${safeLocation}.`;
    break;
  case 'access':
    fact = `Shortly before the alarm, observers placed ${safeSuspect} using the route toward ${safeLocation}.`;
    break;
  case 'location':
    fact = `Shortly before the alarm, observers placed ${safeSuspect} near ${safeLocation}.`;
    break;
  case 'object':
  default:
    fact = `Shortly before the alarm, observers placed ${safeSuspect} handling ${safeObject} near ${safeLocation}.`;
    category = 'object';
    break;
  }

  return {
    fact: removeStrongGravityWords(fact),
    category,
    act,
    puzzle_type_hint: category === 'object'
      ? 'item_combination'
      : (category === 'movement' ? 'timeline' : 'cross_reference'),
    difficulty_hint: 'medium'
  };
}

function buildTemplateTargetForSlot(slotIndex, fallbackSuspectId, selectedTargets, context, rosterIndexes) {
  const rosterEntry = rosterIndexes.bySuspectId.get(fallbackSuspectId)
    || getRosterEntryByAnyName(fallbackSuspectId, rosterIndexes);
  const suspectName = rosterEntry?.displayName || rosterEntry?.planName || String(fallbackSuspectId || '').trim();
  const locations = buildLocationPool(context);
  const objects = buildObjectPool(context);
  const category = chooseDistinctCategory(slotIndex, selectedTargets);
  const location = locations[slotIndex % Math.max(locations.length, 1)]
    || String(context?.coreTruth?.murder?.location || '').trim()
    || 'the garden';
  const object = objects[slotIndex % Math.max(objects.length, 1)]
    || String(context?.coreTruth?.treasure?.object || '').trim()
    || String(context?.coreTruth?.murder?.method || '').trim()
    || 'the missing item';

  return normalizeTarget(
    buildDeterministicTarget({
      suspectName,
      category,
      act: DEFAULT_ACTS[slotIndex] || 2,
      location,
      object
    }),
    slotIndex
  );
}

function buildFinalConvergenceTarget(selectedTargets, context, rosterIndexes) {
  const priorTarget = selectedTargets[2]?.target || selectedTargets[selectedTargets.length - 1]?.target || null;
  const priorAxes = extractEvidenceAxes(priorTarget?.fact);
  const killerId = String(context?.case_state?.killer_id || '').trim();
  const killerEntry = rosterIndexes.bySuspectId.get(killerId);
  const killerName = killerEntry?.displayName
    || String((Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [])
      .find((suspect) => String(suspect?.suspect_id || '').trim() === killerId)?.name || '').trim()
    || 'The killer';
  const method = String(context?.coreTruth?.murder?.method || '').trim()
    || String(context?.coreTruth?.treasure?.object || '').trim()
    || getBaseTitle(getCardsByType(context?.cards, 'item')[0]?.card_title)
    || 'the missing item';

  let category = 'access';
  let fact = `${killerName} retained the master key and controlled the private route into the restricted grounds.`;

  if (priorAxes.has('access')) {
    category = 'ownership';
    fact = `Recovered notes placed ${method} in ${killerName}'s custody alongside the master key.`;
  }
  if (priorAxes.has('location') && category === 'ownership') {
    category = 'access';
    fact = `${killerName} retained the master key and controlled the private route into the restricted grounds.`;
  }
  if (priorAxes.has('object') && category === 'ownership') {
    category = 'access';
    fact = `${killerName} retained the master key and controlled the private route into the restricted grounds.`;
  }
  if (priorAxes.has('access') && priorAxes.has('object')) {
    category = 'forensic';
    fact = `Fresh ink residue on the recovered note matched marks linked to ${killerName}.`;
  }
  if (priorAxes.has('location') && priorAxes.has('object')) {
    category = 'access';
    fact = `${killerName} retained the master key and controlled the private route into the restricted grounds.`;
  }

  return normalizeTarget({
    fact,
    category: category === 'forensic' ? 'ownership' : category,
    act: 3,
    puzzle_type_hint: category === 'ownership' || category === 'forensic' ? 'cross_reference' : 'elimination',
    difficulty_hint: 'hard'
  }, 3);
}

function scoreCandidateForSlot(target, slotIndex, selectedTargets, preferredSuspectId, context) {
  const text = String(target?.fact || '').trim();
  const mentionedSuspectIds = findMentionedSuspectIds(text, context?.case_state);
  const currentMap = buildDraftPressureMap(selectedTargets.map((entry) => entry.target), context);
  const currentBalance = getPressureBalance(currentMap);
  const scoreBySuspect = new Map(
    (currentBalance.by_suspect || []).map((entry) => [entry.suspect_id, entry.total_score || 0])
  );

  let score = 0;
  if (preferredSuspectId && mentionedSuspectIds.includes(preferredSuspectId)) {
    score += 10;
  }
  for (const suspectId of mentionedSuspectIds) {
    score -= scoreBySuspect.get(suspectId) || 0;
  }
  if (slotIndex < 3 && mentionedSuspectIds.length === 1) {
    score += 2;
  }
  if (slotIndex === 3 && selectedTargets[2]) {
    const priorAxes = extractEvidenceAxes(selectedTargets[2].target?.fact);
    const nextAxes = extractEvidenceAxes(text);
    const sharedAxes = [...priorAxes].filter((axis) => nextAxes.has(axis));
    score -= sharedAxes.length * 3;
  }
  return score;
}

function hasDirectConfirmationLanguage(text) {
  return /\b(fingerprint|prints|dna|blood(?:stain)?|confess(?:ed|ion)?|matched|forensic|murder weapon|used to strangle|used to kill|present at the murder|at the scene)\b/i.test(String(text || ''));
}

function hasAccessWeaponLockLanguage(text) {
  return /\b(had access|checked out|unrestricted access|carrying|holding|possess(?:ed|ion)?|found with)\b/i.test(String(text || ''))
    && /\b(rope|dagger|knife|quill|scarf|weapon|poison)\b/i.test(String(text || ''))
    && /\b(shortly before|at the time|during the murder|during the scene|moments before)\b/i.test(String(text || ''));
}

function extractEvidenceAxes(text) {
  const normalized = String(text || '').toLowerCase();
  const axes = new Set();
  if (/\b(access|key|passage|route|backstage|entry|storage|cellar|study|room)\b/.test(normalized)) {
    axes.add('access');
  }
  if (/\b(seen|spotted|moving|walk|walkway|enter|leave|through|near|present|whereabouts)\b/.test(normalized)) {
    axes.add('movement');
  }
  if (/\b(stage|arbor|maze|garden|tree|fountain|alcove|pavilion|grove|walk)\b/.test(normalized)) {
    axes.add('location');
  }
  if (/\b(rope|dagger|scarf|quill|prop|cache|floorboard|compartment|crown|folio|treasure)\b/.test(normalized)) {
    axes.add('object');
  }
  if (/\b(fingerprint|dna|blood|forensic|matched)\b/.test(normalized)) {
    axes.add('forensic');
  }
  return axes;
}

function validateTargetAmbiguity(targets, characterCards) {
  const reasons = [];
  const matchers = buildCharacterMatchers(characterCards);
  const firstTwoTargets = targets.slice(0, 2);
  const earlyTargets = targets.filter((target) => target.act === 1 || target.act === 2);
  const earlyMentions = new Set(firstTwoTargets.flatMap((target) => findMentionedCharacters(target.fact, matchers)));
  if (earlyMentions.size < 2) {
    reasons.push('early_viability_below_two');
  }

  const decisivePattern = /\bonly\s+[a-z]|\bexclusive access\b|\bexclusively\b/i;
  for (const target of firstTwoTargets.length ? firstTwoTargets : earlyTargets) {
    const mentions = findMentionedCharacters(target.fact, matchers);
    if (mentions.length === 1 && decisivePattern.test(target.fact)) {
      reasons.push(`early_target_too_decisive:${mentions[0]}`);
    }
  }

  const firstThree = targets.slice(0, 3);
  const firstThreeMentions = new Set(firstThree.flatMap((target) => findMentionedCharacters(target.fact, matchers)));
  if (firstThreeMentions.size < Math.min(3, characterCards.length)) {
    reasons.push('midgame_material_competition_below_three');
  }

  const penultimate = targets[2];
  if (penultimate) {
    const mentions = findMentionedCharacters(penultimate.fact, matchers);
    if (mentions.length === 1 && (hasDirectConfirmationLanguage(penultimate.fact) || hasAccessWeaponLockLanguage(penultimate.fact))) {
      reasons.push(`target_three_too_decisive:${mentions[0]}`);
    }
  }

  const finalTarget = targets[targets.length - 1];
  if (penultimate && finalTarget) {
    const penultimateMentions = findMentionedCharacters(penultimate.fact, matchers);
    const finalMentions = findMentionedCharacters(finalTarget.fact, matchers);
    const penultimateAxes = extractEvidenceAxes(penultimate.fact);
    const finalAxes = extractEvidenceAxes(finalTarget.fact);
    const sharedAxes = [...penultimateAxes].filter((axis) => finalAxes.has(axis));
    if (
      penultimateMentions.length === 1 &&
      finalMentions.length === 1 &&
      penultimateMentions[0] === finalMentions[0] &&
      (areTargetsOverlapping(penultimate.fact, finalTarget.fact) || sharedAxes.length >= 2)
    ) {
      reasons.push(`final_target_restates_target_three:${finalMentions[0]}`);
    }
  }

  return reasons;
}

function buildDraftPressureMap(targets, context) {
  const map = createSuspectPressureMap(context?.case_state);
  for (const target of Array.isArray(targets) ? targets : []) {
    addPressureFromText(map, target?.fact, context, {
      weight: 'material',
      source: 'clue_target_agent'
    });
  }
  return map;
}

function validatePressureBalance(targets, context) {
  const reasons = [];
  const firstThree = targets.slice(0, 3);
  const map = buildDraftPressureMap(firstThree, context);
  const balance = getPressureBalance(map);
  const suspectIds = new Set(
    firstThree.flatMap((target) => findMentionedSuspectIds(target?.fact, context?.case_state))
  );
  if (suspectIds.size < Math.min(3, (context?.case_state?.suspects || []).length)) {
    reasons.push('midgame_material_competition_below_three');
  }

  if (getActiveSuspects(map, { materialOnly: true }).length < Math.min(3, (context?.case_state?.suspects || []).length)) {
    reasons.push('midgame_material_competition_below_three');
  }

  for (const suspectId of balance.overweighted_suspects || []) {
    reasons.push(`early_overweighted_suspect:${suspectId}`);
  }

  for (const entry of balance.by_suspect || []) {
    for (const [axis, count] of Object.entries(entry.axes || {})) {
      if (count >= 2) {
        reasons.push(`early_same_axis_overstack:${entry.suspect_id}:${axis}`);
      }
    }
  }

  return reasons;
}

function validateRequiredEarlySuspects(targets, characterCards, requiredEarlySuspects = [], context) {
  const reasons = [];
  const normalizedKiller = normalizeText(context?.case_state?.killer_name || '');
  const required = requiredEarlySuspects
    .map((name) => normalizeText(name))
    .filter(Boolean)
    .filter((name) => name !== normalizedKiller)
    .slice(0, 3);
  if (required.length < 2) {
    return;
  }

  const matchers = buildCharacterMatchers(characterCards);
  const firstThreeMentions = new Set(
    targets
      .slice(0, 3)
      .flatMap((target) => findMentionedCharacters(target?.fact, matchers))
      .map((name) => normalizeText(name))
  );

  const missing = required.filter((name) => !firstThreeMentions.has(name));
  if (missing.length) {
    reasons.push(`missing_required_early_suspects:${missing.join(',')}`);
  }

  return reasons;
}

function validateTargetPlanDistribution(targets, targetSuspectPlan = [], context, rosterIndexes) {
  const reasons = [];
  const firstThree = targets.slice(0, 3);
  for (let index = 0; index < Math.min(firstThree.length, targetSuspectPlan.length, 3); index += 1) {
    const plannedEntry = getRosterEntryByAnyName(targetSuspectPlan[index], rosterIndexes);
    const plannedSuspectId = plannedEntry?.suspectId;
    if (!plannedSuspectId) {
      continue;
    }
    const mentioned = findMentionedSuspectIds(firstThree[index]?.fact, context?.case_state);
    if (!mentioned.includes(plannedSuspectId)) {
      reasons.push(`target_${index + 1}_misses_planned_suspect:${plannedSuspectId}`);
    }
  }
  return reasons;
}

function derivePuzzleTypeFromCategory(category) {
  switch (category) {
  case 'timing':
    return 'timeline';
  case 'location':
    return 'cross_reference';
  case 'access':
    return 'elimination';
  case 'ownership':
    return 'cross_reference';
  case 'movement':
    return 'timeline';
  case 'object':
    return 'item_combination';
  default:
    return 'cross_reference';
  }
}

function deriveDifficultyFromCategory(category) {
  switch (category) {
  case 'timing':
  case 'movement':
    return 'medium';
  case 'access':
    return 'hard';
  case 'ownership':
  case 'location':
  case 'object':
  default:
    return 'medium';
  }
}

function areTargetsOverlapping(a, b) {
  const aTokens = new Set(normalizeText(a).split(' ').filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) {
    return false;
  }

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection += 1;
    }
  }

  const smaller = Math.min(aTokens.size, bTokens.size);
  return smaller > 0 && (intersection / smaller) >= 0.7;
}

function normalizeTarget(target, index) {
  const category = String(target?.category || 'object').trim();
  return {
    target_id: `clue_target_${String(index + 1).padStart(3, '0')}`,
    fact: String(target?.fact || '').trim(),
    category,
    act: target?.act === 1 || target?.act === 2 || target?.act === 3 ? target.act : DEFAULT_ACTS[index] || 2,
    puzzle_type_hint: String(target?.puzzle_type_hint || '').trim() || derivePuzzleTypeFromCategory(category),
    difficulty_hint: String(target?.difficulty_hint || '').trim() || deriveDifficultyFromCategory(category)
  };
}

function collectDraftRejectionReasons(targets, characterCards, context, requiredEarlySuspects, targetSuspectPlan, rosterIndexes) {
  const reasons = [
    ...validateTargetAmbiguity(targets, characterCards),
    ...validatePressureBalance(targets, context),
    ...validateRequiredEarlySuspects(targets, characterCards, requiredEarlySuspects, context),
    ...validateTargetPlanDistribution(targets, targetSuspectPlan, context, rosterIndexes)
  ];

  return [...new Set(reasons)];
}

export async function clueTargetAgent(context, deps = {}) {
  const callJsonImpl = deps.callJson || callJson;
  const buildClueTargetsPromptImpl = deps.buildClueTargetsPrompt || buildClueTargetsPrompt;
  const isClueTargetAnchoredImpl = deps.isClueTargetAnchored || isClueTargetAnchored;
  const getCardsByTypeImpl = deps.getCardsByType || getCardsByType;
  const getCharacterCardsImpl = deps.getCharacterCards || getCharacterCards;
  const getStoryBlurbImpl = deps.getStoryBlurb || getStoryBlurb;
  const stopAfterSlot = Number.isFinite(Number(deps.stopAfterSlot)) ? Number(deps.stopAfterSlot) : null;
  context.debug ??= {};
  context.debug.warning_log ??= [];
  context.debug.rejection_log ??= [];
  const characterCards = getCharacterCardsImpl(context.cards);
  const suspectRoster = buildSuspectRoster(characterCards, context?.case_state);
  const rosterIndexes = buildRosterIndexes(suspectRoster);
  const baseCharacterNames = getBaseCharacterNames(characterCards);
  const requiredEarlySuspects = Array.isArray(context?.suspect_coverage?.required_early_suspects)
    && context.suspect_coverage.required_early_suspects.length
    ? context.suspect_coverage.required_early_suspects
    : baseCharacterNames.slice(0, 3);
  const killerName = String(context?.case_state?.killer_name || '').trim();

  let lastError = null;
  for (let attempt = 1; attempt <= OUTER_MAX_ATTEMPTS; attempt += 1) {
    try {
      const targetSuspectPlan = chooseEarlySuspectPlan(requiredEarlySuspects, baseCharacterNames, killerName);
      const selectedTargets = [];
      const pressureMap = createSuspectPressureMap(context?.case_state);

      for (let slotIndex = 0; slotIndex < PUZZLE_TARGET_COUNT; slotIndex += 1) {
        const selectedPrimaryIds = selectedTargets.map((entry) => entry.primarySuspectId).filter(Boolean);
        const suspectCandidates = slotIndex < 3
          ? getSlotSuspectCandidates(slotIndex, targetSuspectPlan, pressureMap, context, selectedPrimaryIds, rosterIndexes)
          : [null];
        let slotSelected = null;
        let slotFailureReasons = [];

        for (const fallbackSuspectId of suspectCandidates) {
          let previousReasonSignature = '';
          for (let slotAttempt = 1; slotAttempt <= SLOT_MAX_ATTEMPTS; slotAttempt += 1) {
            const rejectionReasons = context.debug.rejection_log
              .filter((entry) => entry?.stage === 'clue_target_agent')
              .map((entry) => entry.reason)
              .slice(-4);
            if (slotFailureReasons.length) {
              rejectionReasons.push(`slot_${slotIndex + 1}_retry:${slotFailureReasons.join('; ')}`);
            }
            const preferredEntry = fallbackSuspectId ? rosterIndexes.bySuspectId.get(fallbackSuspectId) : null;
            if (preferredEntry) {
              rejectionReasons.push(`slot_${slotIndex + 1}_prefer:${preferredEntry.displayName}`);
            }

            let candidateTargets = [];
            if (slotIndex < 3) {
              const templateTarget = buildTemplateTargetForSlot(
                slotIndex,
                fallbackSuspectId,
                selectedTargets,
                context,
                rosterIndexes
              );

              candidateTargets = buildCandidateSet([templateTarget], {
                ...context,
                __isClueTargetAnchored: isClueTargetAnchoredImpl
              });
            } else if (slotIndex === 3) {
              const templateTarget = buildFinalConvergenceTarget(selectedTargets, context, rosterIndexes);
              candidateTargets = buildCandidateSet([templateTarget], {
                ...context,
                __isClueTargetAnchored: isClueTargetAnchoredImpl
              });
            } else {
              const prompt = buildClueTargetsPromptImpl({
                storyBlurb: getStoryBlurbImpl(context),
                coreTruth: context.coreTruth,
                characters: characterCards,
                locations: getCardsByTypeImpl(context.cards, 'location'),
                world: context.world,
                priorTargets: selectedTargets.map((entry) => entry.target),
                rejectionReasons
              });

              const result = await callJsonImpl({
                ...prompt,
                schemaName: 'clue_targets',
                schema: clueTargetsSchema
              });

              candidateTargets = buildCandidateSet(result.targets || [], {
                ...context,
                __isClueTargetAnchored: isClueTargetAnchoredImpl
              });
            }

            const evaluated = candidateTargets
              .map((target) => ({
                target,
                reasons: validateCandidateForSlot(target, slotIndex, selectedTargets, fallbackSuspectId, context),
                score: scoreCandidateForSlot(target, slotIndex, selectedTargets, fallbackSuspectId, context)
              }))
              .sort((a, b) => b.score - a.score);

            const accepted = evaluated.find((entry) => entry.reasons.length === 0);
            if (accepted) {
              const normalizedTarget = {
                ...accepted.target,
                target_id: `clue_target_${String(slotIndex + 1).padStart(3, '0')}`,
                act: DEFAULT_ACTS[slotIndex] || accepted.target.act
              };
              const primarySuspectId = getTargetPrimarySuspectId(normalizedTarget, fallbackSuspectId, context);
              slotSelected = {
                target: normalizedTarget,
                primarySuspectId
              };
              if (normalizedTarget.fact) {
                addPressureFromText(pressureMap, normalizedTarget.fact, context, {
                  weight: 'material',
                  source: 'clue_target_agent'
                });
              }
              break;
            }

            const reasons = evaluated[0]?.reasons?.length
              ? evaluated[0].reasons
              : [`slot_${slotIndex + 1}_no_valid_candidate`];
            slotFailureReasons = reasons;
            const reasonSignature = reasons.join('|');
            context.debug.rejection_log.push({
              stage: 'clue_target_agent',
              attempt,
              slot: slotIndex + 1,
              retry: slotAttempt,
              reason: reasons.join('; '),
              rejection_reasons: reasons
            });
            if (previousReasonSignature && previousReasonSignature === reasonSignature) {
              break;
            }
            previousReasonSignature = reasonSignature;
          }

          if (slotSelected) {
            break;
          }
        }

        if (!slotSelected) {
          const error = new Error(`clue_target_agent could not place target ${slotIndex + 1}: ${slotFailureReasons.join('; ')}`);
          error.rejectionReasons = slotFailureReasons.length ? slotFailureReasons : [`slot_${slotIndex + 1}_placement_failed`];
          throw error;
        }

        selectedTargets.push(slotSelected);
        if (stopAfterSlot && (slotIndex + 1) >= stopAfterSlot) {
          context.clue_targets = selectedTargets.map((entry) => entry.target);
          return context;
        }
      }

      context.clue_targets = selectedTargets.map((entry) => entry.target);

      if (context.clue_targets.length < PUZZLE_TARGET_COUNT) {
        throw new Error(`clue_target_agent produced ${context.clue_targets.length} clue targets; expected at least ${PUZZLE_TARGET_COUNT}`);
      }

      const rejectionReasons = collectDraftRejectionReasons(
        context.clue_targets,
        characterCards,
        context,
        requiredEarlySuspects,
        targetSuspectPlan,
        rosterIndexes
      );
      if (rejectionReasons.length) {
        const error = new Error(`clue_target_agent self_score_reject: ${rejectionReasons.join('; ')}`);
        error.rejectionReasons = rejectionReasons;
        throw error;
      }
      return context;
    } catch (error) {
      lastError = error;
      const rejectionReasons = Array.isArray(error?.rejectionReasons) && error.rejectionReasons.length
        ? error.rejectionReasons
        : [String(error?.message || error)];
      context.debug.rejection_log.push({
        stage: 'clue_target_agent',
        attempt,
        reason: rejectionReasons.join('; '),
        rejection_reasons: rejectionReasons
      });
    }
  }

  throw lastError || new Error('clue_target_agent failed to generate valid clue targets');

}
