import { storyBlurbAgent } from '../../agents/storyBlurbAgent.js';
import { storyMetadataAgent } from '../../agents/storyMetadataAgent.js';

import { worldBuildingAgent } from '../../agents/worldBuildingAgent.js';

import { coreTruthAgent } from '../../agents/coreTruthAgent.js';
import { coreTruthValidatorAgent } from '../../agents/coreTruthValidatorAgent.js';
import { caseStateBuilderAgent } from '../../agents/caseStateBuilderAgent.js';

import { charactersBuilderAgent } from '../../agents/charactersBuilderAgent.js';
import { characterProfileAgent } from '../../agents/characterProfileAgent.js';
import { characterSecretAgent } from '../../agents/characterSecretAgent.js';
import { storyActsAgent } from '../../agents/storyActsAgent.js';
import { imageGeneratorAgent } from '../../agents/imageGeneratorAgent.js';
import { hostSpeechAgent } from '../../agents/hostSpeechAgent.js';

import { itemAgent } from '../../agents/itemAgent.js';
import { clueAgent } from '../../agents/clueAgent.js';
import {
  clueRosterValidatorAgent
} from '../../agents/canonValidatorAgents.js';
import { structuralPreflightAgent } from '../../agents/structuralPreflightAgent.js';

import { solvabilityValidatorAgent } from '../../agents/solvabilityValidatorAgent.js';
import { gameCardAgent } from '../../agents/gameCardAgent.js';

import { postFinalInvariantsAgent } from '../../agents/postFinalInvariantsAgent.js';
import { mvpQualityGateAgent } from '../../agents/mvpQualityGateAgent.js';

/** Core generation + gameplay (game_card) + validators. */
export const steps = [
  { name: 'story_blurb_agent', run: storyBlurbAgent },
  { name: 'story_metadata_agent', run: storyMetadataAgent },

  { name: 'world_building_agent', run: worldBuildingAgent },

  { name: 'characters_builder_agent', run: charactersBuilderAgent },
  {
    name: 'character_image_agent',
    run: (context) => imageGeneratorAgent(context, { types: ['character'] })
  },
  { name: 'character_profile_agent', run: characterProfileAgent },

  { name: 'core_truth_agent', run: coreTruthAgent },
  { name: 'core_truth_validator_agent', run: coreTruthValidatorAgent },
  { name: 'case_state_builder_agent', run: caseStateBuilderAgent },

  { name: 'character_secret_agent', run: characterSecretAgent },
  { name: 'item_agent', run: itemAgent },
  { name: 'story_acts_agent', run: storyActsAgent },
  {
    name: 'story_act_image_agent',
    run: (context) => imageGeneratorAgent(context, { types: ['story_act'] })
  },
  { name: 'host_speech_agent', run: hostSpeechAgent },
  { name: 'clue_agent', run: clueAgent },
  { name: 'clue_roster_validator_agent', run: clueRosterValidatorAgent },
  { name: 'structural_preflight_agent', run: structuralPreflightAgent },

  { name: 'solvability_validator_agent', run: solvabilityValidatorAgent },

  { name: 'game_card_agent', run: gameCardAgent },

  { name: 'post_final_invariants_agent', run: postFinalInvariantsAgent },
  { name: 'mvp_quality_gate_agent', run: mvpQualityGateAgent }
];
