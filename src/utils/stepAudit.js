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

function addFinding(findings, category, severity, code, message, details = {}) {
  findings.push({ category, severity, code, message, ...details });
}

/** Matches `src/pipeline/steps/index.js` (single default pipeline). */
const STEP_ORDER = [
  'story_blurb_agent',
  'story_metadata_agent',
  'world_building_agent',
  'characters_builder_agent',
  'core_truth_agent',
  'treasure_hunt_agent',
  'core_truth_validator_agent',
  'case_state_builder_agent',
  'character_secret_agent',
  'item_agent',
  'treasure_item_agent',
  'host_speech_agent',
  'clue_agent',
  'clue_roster_validator_agent',
  'clue_target_agent',
  'puzzle_agent',
  'puzzle_draft_canon_validator_agent',
  'bundle_finalize_agent',
  'puzzle_evidence_agent',
  'bundle_visible_canon_validator_agent',
  'bundle_linker_agent',
  'structural_preflight_agent',
  'solvability_validator_agent',
  'bundle_structure_validator_agent',
  'post_final_invariants_agent',
  'bundle_integrity_validator_agent',
  'mvp_quality_gate_agent'
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

  const structuralCategoryMap = {
    duplicate_character_systems: 'pollution',
    missing_victim_identity: 'leak'
  };
  const stageThresholds = {
    duplicate_character_systems: 'characters_builder_agent',
    missing_victim_identity: 'case_state_builder_agent'
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
    if (issue.code === 'unknown_roster_entities' && !atOrAfter(stepName, 'bundle_integrity_validator_agent')) {
      continue;
    }
    if (['unknown_roster_entities', 'roster_validator_noise'].includes(issue.code)) {
      addFinding(
        findings,
        'pollution',
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
