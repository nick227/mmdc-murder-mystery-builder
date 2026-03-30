import { storyBlurbAgent } from '../../agents/storyBlurbAgent.js';

import { worldBuildingAgent } from '../../agents/worldBuildingAgent.js';

import { coreTruthAgent } from '../../agents/coreTruthAgent.js';
import { treasureHuntAgent } from '../../agents/treasureHuntAgent.js';
import { coreTruthValidatorAgent } from '../../agents/coreTruthValidatorAgent.js';
import { caseStateBuilderAgent } from '../../agents/caseStateBuilderAgent.js';

import { characterSecretAgent } from '../../agents/characterSecretAgent.js';
import { charactersBuilderAgent } from '../../agents/charactersBuilderAgent.js';

import { breadcrumbTrailAgent } from '../../agents/breadcrumbTrailAgent.js';
import { trailReviewAgent } from '../../agents/trailReviewAgent.js';

import { narrativeGeneratorAgent } from '../../agents/narrativeGeneratorAgent.js';
import { narrativeValidatorAgent } from '../../agents/narrativeValidatorAgent.js';

import { characterProfileRefinementAgent } from '../../agents/characterProfileRefinementAgent.js';
import { suspectCoverageAgent } from '../../agents/suspectCoverageAgent.js';

import { storyActsAgent } from '../../agents/storyActsAgent.js';
import { hostSpeechAgent } from '../../agents/hostSpeechAgent.js';

import { itemAgent } from '../../agents/itemAgent.js';
import { clueTargetAgent } from '../../agents/clueTargetAgent.js';
import { puzzleAgent } from '../../agents/puzzleAgent.js';
import { bundleLinkerAgent } from '../../agents/bundleLinkerAgent.js';
import { clueAgent } from '../../agents/clueAgent.js';
import { postClueDedupAgent } from '../../agents/postClueDedupAgent.js';
import { structuralPreflightAgent } from '../../agents/structuralPreflightAgent.js';
import { evidenceCanonicalizerAgent } from '../../agents/evidenceCanonicalizerAgent.js';
import { rosterIntegrityValidatorAgent } from '../../agents/rosterIntegrityValidatorAgent.js';

import { ambiguityBalancerAgent } from '../../agents/ambiguityBalancerAgent.js';
import { solvabilityValidatorAgent } from '../../agents/solvabilityValidatorAgent.js';

import { gameCardAgent } from '../../agents/gameCardAgent.js';
import { cardQualityAgent } from '../../agents/cardQualityAgent.js';
import { finalEditorAgent } from '../../agents/finalEditorAgent.js';
import { targetedPlayabilityRepairAgent } from '../../agents/targetedPlayabilityRepairAgent.js';
import { playabilityRepairAgent } from '../../agents/playabilityRepairAgent.js';
import { postFinalInvariantsAgent } from '../../agents/postFinalInvariantsAgent.js';
import { bundleIntegrityValidatorAgent } from '../../agents/bundleIntegrityValidatorAgent.js';
import { bundleStructureValidatorAgent } from '../../agents/bundleStructureValidatorAgent.js';
import { mvpQualityGateAgent } from '../../agents/mvpQualityGateAgent.js';

export const steps = [
  { name: 'story_blurb_agent', run: storyBlurbAgent },

  { name: 'world_building_agent', run: worldBuildingAgent },

  { name: 'characters_builder_agent', run: charactersBuilderAgent },

  { name: 'core_truth_agent', run: coreTruthAgent },
  { name: 'treasure_hunt_agent', run: treasureHuntAgent },
  { name: 'core_truth_validator_agent', run: coreTruthValidatorAgent },
  { name: 'case_state_builder_agent', run: caseStateBuilderAgent },

  { name: 'breadcrumb_trail_agent', run: breadcrumbTrailAgent },
  { name: 'trail_review_agent', run: trailReviewAgent },

  { name: 'narrative_generator_agent', run: narrativeGeneratorAgent },
  { name: 'narrative_validator_agent', run: narrativeValidatorAgent },

  { name: 'character_profile_refinement_agent', run: characterProfileRefinementAgent },

  { name: 'character_secret_agent', run: characterSecretAgent },
  { name: 'suspect_coverage_agent', run: suspectCoverageAgent },

  { name: 'story_acts_agent', run: storyActsAgent },
  { name: 'host_speech_agent', run: hostSpeechAgent },

  { name: 'item_agent', run: itemAgent },
  { name: 'clue_agent', run: clueAgent },
  { name: 'post_clue_dedup_agent', run: postClueDedupAgent },
  { name: 'clue_target_agent', run: clueTargetAgent },
  { name: 'puzzle_agent', run: puzzleAgent },
  { name: 'bundle_linker_agent', run: bundleLinkerAgent },
  { name: 'structural_preflight_agent', run: structuralPreflightAgent },

  { name: 'ambiguity_balancer_agent', run: ambiguityBalancerAgent },

  { name: 'solvability_validator_agent', run: solvabilityValidatorAgent },

  { name: 'game_card_agent', run: gameCardAgent },

  { name: 'roster_integrity_validator_agent', run: rosterIntegrityValidatorAgent },

  { name: 'card_quality_agent', run: cardQualityAgent },
  { name: 'final_editor_agent', run: finalEditorAgent },
  { name: 'targeted_playability_repair_agent', run: targetedPlayabilityRepairAgent },
  { name: 'playability_repair_agent', run: playabilityRepairAgent },
  { name: 'evidence_canonicalizer_agent', run: evidenceCanonicalizerAgent },
  { name: 'bundle_structure_validator_agent', run: bundleStructureValidatorAgent },
  { name: 'post_final_invariants_agent', run: postFinalInvariantsAgent },
  { name: 'bundle_integrity_validator_agent', run: bundleIntegrityValidatorAgent },
  { name: 'mvp_quality_gate_agent', run: mvpQualityGateAgent }
];
