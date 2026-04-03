import { storyBlurbAgent } from '../../agents/storyBlurbAgent.js';
import { storyMetadataAgent } from '../../agents/storyMetadataAgent.js';

import { worldBuildingAgent } from '../../agents/worldBuildingAgent.js';

import { coreTruthAgent } from '../../agents/coreTruthAgent.js';
import { treasureHuntAgent } from '../../agents/treasureHuntAgent.js';
import { coreTruthValidatorAgent } from '../../agents/coreTruthValidatorAgent.js';
import { caseStateBuilderAgent } from '../../agents/caseStateBuilderAgent.js';

import { charactersBuilderAgent } from '../../agents/charactersBuilderAgent.js';
import { characterSecretAgent } from '../../agents/characterSecretAgent.js';
import { storyActsAgent } from '../../agents/storyActsAgent.js';
import { hostSpeechAgent } from '../../agents/hostSpeechAgent.js';

import { itemAgent } from '../../agents/itemAgent.js';
import { treasureItemAgent } from '../../agents/treasureItemAgent.js';
import { clueAgent } from '../../agents/clueAgent.js';
import { puzzleAgent } from '../../agents/puzzleAgent.js';
import { bundleFinalizeAgent } from '../../agents/bundleFinalizeAgent.js';
import { puzzleEvidenceAgent } from '../../agents/puzzleEvidenceAgent.js';
import { bundleLinkerAgent } from '../../agents/bundleLinkerAgent.js';
import { truthTrailValidatorAgent } from '../../agents/truthTrailValidatorAgent.js';
import {
  bundleVisibleCanonValidatorAgent,
  clueRosterValidatorAgent,
  puzzleDraftCanonValidatorAgent
} from '../../agents/canonValidatorAgents.js';
import { clueTargetAgent } from '../../agents/clueTargetAgent.js';
import { structuralPreflightAgent } from '../../agents/structuralPreflightAgent.js';

import { solvabilityValidatorAgent } from '../../agents/solvabilityValidatorAgent.js';

import { postFinalInvariantsAgent } from '../../agents/postFinalInvariantsAgent.js';
import { bundleIntegrityValidatorAgent } from '../../agents/bundleIntegrityValidatorAgent.js';
import { bundleStructureValidatorAgent } from '../../agents/bundleStructureValidatorAgent.js';
import { mvpQualityGateAgent } from '../../agents/mvpQualityGateAgent.js';

/** Core generation + structural glue + hard validators only. */
export const steps = [
  { name: 'story_blurb_agent', run: storyBlurbAgent },
  { name: 'story_metadata_agent', run: storyMetadataAgent },

  { name: 'world_building_agent', run: worldBuildingAgent },

  { name: 'characters_builder_agent', run: charactersBuilderAgent },

  { name: 'core_truth_agent', run: coreTruthAgent },
  { name: 'treasure_hunt_agent', run: treasureHuntAgent },
  { name: 'core_truth_validator_agent', run: coreTruthValidatorAgent },
  { name: 'case_state_builder_agent', run: caseStateBuilderAgent },

  { name: 'character_secret_agent', run: characterSecretAgent },
  { name: 'item_agent', run: itemAgent },
  { name: 'treasure_item_agent', run: treasureItemAgent },
  { name: 'story_acts_agent', run: storyActsAgent },
  { name: 'host_speech_agent', run: hostSpeechAgent },
  { name: 'clue_agent', run: clueAgent },
  { name: 'clue_roster_validator_agent', run: clueRosterValidatorAgent },
  { name: 'clue_target_agent', run: clueTargetAgent },
  { name: 'puzzle_agent', run: puzzleAgent },
  { name: 'puzzle_draft_canon_validator_agent', run: puzzleDraftCanonValidatorAgent },
  { name: 'bundle_finalize_agent', run: bundleFinalizeAgent },
  { name: 'puzzle_evidence_agent', run: puzzleEvidenceAgent },
  { name: 'bundle_visible_canon_validator_agent', run: bundleVisibleCanonValidatorAgent },
  { name: 'bundle_linker_agent', run: bundleLinkerAgent },
  { name: 'truth_trail_validator_agent', run: truthTrailValidatorAgent },
  { name: 'structural_preflight_agent', run: structuralPreflightAgent },

  { name: 'solvability_validator_agent', run: solvabilityValidatorAgent },

  { name: 'bundle_structure_validator_agent', run: bundleStructureValidatorAgent },
  { name: 'post_final_invariants_agent', run: postFinalInvariantsAgent },
  { name: 'bundle_integrity_validator_agent', run: bundleIntegrityValidatorAgent },
  { name: 'mvp_quality_gate_agent', run: mvpQualityGateAgent }
];
