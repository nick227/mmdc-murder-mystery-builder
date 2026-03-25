
import { storyBlurbAgent } from '../../agents/storyBlurbAgent.js';

import { worldBuildingAgent } from '../../agents/worldBuildingAgent.js';

import { murderTruthAgent } from '../../agents/murderTruthAgent.js';
import { fortuneTruthAgent } from '../../agents/fortuneTruthAgent.js';

import { murderValidatorAgent } from '../../agents/murderValidatorAgent.js';
import { fortuneValidatorAgent } from '../../agents/fortuneValidatorAgent.js';

import { characterSecretAgent } from '../../agents/characterSecretAgent.js';
import { charactersBuilderAgent } from '../../agents/charactersBuilderAgent.js';

import { breadcrumbTrailAgent } from '../../agents/breadcrumbTrailAgent.js';
import { trailReviewAgent } from '../../agents/trailReviewAgent.js';

import { narrativeGeneratorAgent } from '../../agents/narrativeGeneratorAgent.js';
import { narrativeValidatorAgent } from '../../agents/narrativeValidatorAgent.js';

import { storyActsAgent } from '../../agents/storyActsAgent.js';
import { hostSpeechAgent } from '../../agents/hostSpeechAgent.js';

import { itemAgent } from '../../agents/itemAgent.js';
import { puzzleAgent } from '../../agents/puzzleAgent.js';
import { clueAgent } from '../../agents/clueAgent.js';

import { ambiguityBalancerAgent } from '../../agents/ambiguityBalancerAgent.js';
import { solvabilityValidatorAgent } from '../../agents/solvabilityValidatorAgent.js';

import { gameCardAgent } from '../../agents/gameCardAgent.js';
import { cardQualityAgent } from '../../agents/cardQualityAgent.js';
import { finalEditorAgent } from '../../agents/finalEditorAgent.js';

export const steps = [
  { name: 'story_blurb_agent', run: storyBlurbAgent },

  { name: 'world_building_agent', run: worldBuildingAgent },

  { name: 'characters_builder_agent', run: charactersBuilderAgent },

  { name: 'murder_truth_agent', run: murderTruthAgent },
  { name: 'murder_validator_agent', run: murderValidatorAgent },

  { name: 'fortune_truth_agent', run: fortuneTruthAgent },
  { name: 'fortune_validator_agent', run: fortuneValidatorAgent },

  { name: 'breadcrumb_trail_agent', run: breadcrumbTrailAgent },
  { name: 'trail_review_agent', run: trailReviewAgent },

  { name: 'narrative_generator_agent', run: narrativeGeneratorAgent },
  { name: 'narrative_validator_agent', run: narrativeValidatorAgent },

  { name: 'character_secret_agent', run: characterSecretAgent },

  { name: 'story_acts_agent', run: storyActsAgent },
  { name: 'host_speech_agent', run: hostSpeechAgent },

  { name: 'item_agent', run: itemAgent },
  { name: 'puzzle_agent', run: puzzleAgent },
  { name: 'clue_agent', run: clueAgent },

  { name: 'ambiguity_balancer_agent', run: ambiguityBalancerAgent },

  // <-- correct location
  { name: 'solvability_validator_agent', run: solvabilityValidatorAgent },

  { name: 'game_card_agent', run: gameCardAgent },
  { name: 'card_quality_agent', run: cardQualityAgent },
  { name: 'final_editor_agent', run: finalEditorAgent }
];
