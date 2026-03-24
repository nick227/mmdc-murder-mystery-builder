
import { storyBlurbAgent } from "../../agents/storyBlurbAgent.js";
import { solutionAgent } from "../../agents/solutionAgent.js";
import { breadcrumbTrailAgent } from "../../agents/breadcrumbTrailAgent.js";
import { trailReviewAgent } from "../../agents/trailReviewAgent.js";
import { narrativeGeneratorAgent } from "../../agents/narrativeGeneratorAgent.js";
import { narrativeValidatorAgent } from "../../agents/narrativeValidatorAgent.js";
import { storyActsAgent } from "../../agents/storyActsAgent.js";
import { hostSpeechAgent } from "../../agents/hostSpeechAgent.js";
import { characterProfileAgent } from "../../agents/characterProfileAgent.js";
import { characterSecretAgent } from "../../agents/characterSecretAgent.js";
import { itemAgent } from "../../agents/itemAgent.js";
import { puzzleAgent } from "../../agents/puzzleAgent.js";
import { clueAgent } from "../../agents/clueAgent.js";
import { deductionValidatorAgent } from "../../agents/deductionValidatorAgent.js";
import { gameCardAgent } from "../../agents/gameCardAgent.js";
import { cardQualityAgent } from "../../agents/cardQualityAgent.js";
import { finalEditorAgent } from "../../agents/finalEditorAgent.js";
import { solvabilityValidatorAgent } from "../../agents/solvabilityValidatorAgent.js";

export const steps = [
  { name: "story_blurb_agent", run: storyBlurbAgent },
  { name: "solution_agent", run: solutionAgent },

  { name: "breadcrumb_trail_agent", run: breadcrumbTrailAgent },
  { name: "trail_review_agent", run: trailReviewAgent },

  { name: "narrative_generator_agent", run: narrativeGeneratorAgent },
  { name: "narrative_validator_agent", run: narrativeValidatorAgent },

  { name: "story_acts_agent", run: storyActsAgent },
  { name: "host_speech_agent", run: hostSpeechAgent },

  { name: "character_profile_agent", run: characterProfileAgent },
  { name: "character_secret_agent", run: characterSecretAgent },

  { name: "item_agent", run: itemAgent },
  { name: "puzzle_agent", run: puzzleAgent },
  { name: "clue_agent", run: clueAgent },
  { name: "deduction_validator_agent", run: deductionValidatorAgent },

  { name: "solvability_validator_agent", run: solvabilityValidatorAgent },

  { name: "game_card_agent", run: gameCardAgent },
  { name: "card_quality_agent", run: cardQualityAgent },
  { name: "final_editor_agent", run: finalEditorAgent }
];
