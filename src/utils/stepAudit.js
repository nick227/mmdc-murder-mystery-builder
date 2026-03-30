import { getCardsByType, getCharacterCards } from './cards.js';
import { buildPlayabilityReport } from './playabilityReport.js';
import { buildStructuralPreflight } from './structuralPreflight.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseName(title) {
  return String(title || '').split(',')[0].trim();
}

function buildSuspectMatchers(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const source = suspects.length
    ? suspects.map((suspect) => String(suspect?.name || suspect?.title || '').trim())
    : getCharacterCards(context.cards).map((card) => baseName(card.card_title));

  return source
    .filter(Boolean)
    .map((name) => {
      const normalized = normalizeText(name);
      const tokens = normalized.split(' ').filter(Boolean);
      const phrases = new Set([normalized]);
      if (tokens.length >= 2) {
        phrases.add(tokens.slice(0, 2).join(' '));
        phrases.add(tokens.slice(-2).join(' '));
      }
      for (const token of tokens) {
        if (token.length >= 5) {
          phrases.add(token);
        }
      }
      return { name, phrases: [...phrases] };
    });
}

function mentionSuspects(text, suspectMatchers) {
  const normalized = normalizeText(text);
  return suspectMatchers
    .filter((suspect) => suspect.phrases.some((phrase) => normalized.includes(phrase)))
    .map((suspect) => suspect.name);
}

function overlappingTargets(targets = []) {
  const overlaps = [];
  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const a = new Set(normalizeText(targets[i]).split(' ').filter((token) => token.length >= 4));
      const b = new Set(normalizeText(targets[j]).split(' ').filter((token) => token.length >= 4));
      if (!a.size || !b.size) {
        continue;
      }
      let common = 0;
      for (const token of a) {
        if (b.has(token)) {
          common += 1;
        }
      }
      const smaller = Math.min(a.size, b.size);
      if (smaller >= 4 && common / smaller >= 0.7) {
        overlaps.push([targets[i], targets[j]]);
      }
    }
  }
  return overlaps;
}

function addFinding(findings, category, severity, code, message, details = {}) {
  findings.push({ category, severity, code, message, ...details });
}

const STEP_ORDER = [
  'story_metadata_agent',
  'story_blurb_agent',
  'world_building_agent',
  'characters_builder_agent',
  'core_truth_agent',
  'core_truth_validator_agent',
  'case_state_builder_agent',
  'breadcrumb_trail_agent',
  'trail_review_agent',
  'narrative_generator_agent',
  'narrative_validator_agent',
  'character_profile_refinement_agent',
  'character_secret_agent',
  'story_acts_agent',
  'host_speech_agent',
  'item_agent',
  'clue_target_agent',
  'puzzle_agent',
  'bundle_linker_agent',
  'clue_agent',
  'structural_preflight_agent'
];

function atOrAfter(stepName, targetStepName) {
  return STEP_ORDER.indexOf(stepName) >= STEP_ORDER.indexOf(targetStepName);
}

export function buildStepAudit(context, stepName) {
  const findings = [];
  const characterCards = getCharacterCards(context.cards);
  const personCards = getCardsByType(context.cards, 'person');
  const clueTargets = Array.isArray(context?.clue_targets) ? context.clue_targets : [];
  const puzzleBundles = Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [];
  const suspectMatchers = buildSuspectMatchers(context);
  const playability = buildPlayabilityReport(context, { partial: true, stepName });
  const structural = buildStructuralPreflight(context);

  const duplicatePeople = personCards
    .map((card) => baseName(card.card_title))
    .filter((name) => characterCards.some((character) => normalizeText(baseName(character.card_title)) === normalizeText(name)));
  if (atOrAfter(stepName, 'characters_builder_agent') && duplicatePeople.length) {
    addFinding(
      findings,
      'pollution',
      'major',
      'duplicate_canonical_entities',
      `Same suspect exists in both person and character systems: ${[...new Set(duplicatePeople)].slice(0, 6).join(', ')}`
    );
  }

  if (atOrAfter(stepName, 'characters_builder_agent') && personCards.length > characterCards.length && characterCards.length) {
    addFinding(
      findings,
      'waste',
      'minor',
      'too_many_side_entities',
      `World scaffolding is larger than the playable roster at this step (${personCards.length} people vs ${characterCards.length} suspects).`
    );
  }

  const overlapPairs = overlappingTargets(clueTargets.map((target) => target.fact));
  if (atOrAfter(stepName, 'clue_target_agent') && overlapPairs.length) {
    addFinding(
      findings,
      'waste',
      'major',
      'redundant_clue_targets',
      `Clue targets overlap too heavily: ${overlapPairs[0][0]} / ${overlapPairs[0][1]}`
    );
  }

  const earlyFacts = [
    ...clueTargets.filter((target) => Number(target?.act || 0) < 3).map((target) => target.fact),
    ...puzzleBundles.filter((bundle) => Number(bundle?.act || 0) < 3).map((bundle) => bundle.solution_summary || bundle.clue_target)
  ].filter(Boolean);
  const earlySuspects = new Set(earlyFacts.flatMap((fact) => mentionSuspects(fact, suspectMatchers)));
  if (atOrAfter(stepName, 'clue_target_agent') && earlyFacts.length >= 2 && earlySuspects.size <= 1 && suspectMatchers.length >= 3) {
    addFinding(
      findings,
      'leak',
      'major',
      'early_suspect_collapse',
      `By Act 2 the chain effectively centers on ${[...earlySuspects][0] || 'one suspect'} only.`
    );
  }

  const structuralCategoryMap = {
    duplicate_character_systems: 'pollution',
    missing_victim_identity: 'leak',
    early_killer_leak: 'leak',
    dead_suspect_slots: 'waste',
    duplicate_evidence_weighting: 'waste'
  };
  const stageThresholds = {
    duplicate_character_systems: 'characters_builder_agent',
    missing_victim_identity: 'case_state_builder_agent',
    early_killer_leak: 'clue_target_agent',
    dead_suspect_slots: 'character_secret_agent',
    duplicate_evidence_weighting: 'clue_agent'
  };
  for (const issue of structural.issues) {
    if (!atOrAfter(stepName, stageThresholds[issue.code] || 'story_blurb_agent')) {
      continue;
    }
    addFinding(
      findings,
      structuralCategoryMap[issue.code] || 'pollution',
      issue.severity,
      issue.code,
      issue.message
    );
  }

  for (const issue of playability.issues) {
    if (['underused_suspects', 'safe_suspect_roles'].includes(issue.code) && !atOrAfter(stepName, 'suspect_coverage_agent')) {
      continue;
    }
    if (issue.code === 'unknown_roster_entities' && !atOrAfter(stepName, 'roster_integrity_validator_agent')) {
      continue;
    }
    if (['unknown_roster_entities', 'roster_validator_noise', 'underused_suspects', 'safe_suspect_roles'].includes(issue.code)) {
      addFinding(
        findings,
        ['underused_suspects', 'safe_suspect_roles'].includes(issue.code) ? 'waste' : 'pollution',
        issue.severity,
        issue.code,
        issue.message
      );
    }
  }

  return {
    step_name: stepName,
    counts: {
      cards: Array.isArray(context?.cards) ? context.cards.length : 0,
      characters: characterCards.length,
      people: personCards.length,
      clue_targets: clueTargets.length,
      puzzle_bundles: puzzleBundles.length
    },
    playability_score_10: playability.score_10,
    playability_status: playability.status,
    structural_status: structural.status,
    finding_count: findings.length,
    findings
  };
}

export function formatStepAudits(audits = []) {
  const lines = [];
  for (const audit of audits) {
    lines.push(`${audit.step_name}: score ${audit.playability_score_10}/10, ${audit.finding_count} findings`);
    for (const finding of audit.findings.slice(0, 5)) {
      lines.push(`- [${finding.category}/${finding.severity}] ${finding.code}: ${finding.message}`);
    }
  }
  return lines.join('\n');
}
