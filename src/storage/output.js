import fs from 'fs';
import path from 'path';

function isEmptyEntityBag(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (!keys.length) {
    return true;
  }
  return keys.every((key) => Array.isArray(value[key]) && value[key].length === 0);
}

function sanitizeContextForOutput(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return context;
  }

  const sanitized = { ...context };
  delete sanitized.story_blurb;
  delete sanitized.player_count;
  delete sanitized.story_style;
  delete sanitized.solutions;
  delete sanitized.murder_truth;
  delete sanitized.fortune_truth;
  delete sanitized.solution;
  delete sanitized.playability_history;

  // Internal / debug / validation output should not ship in final story export.
  delete sanitized.structural_preflight;
  delete sanitized.solvability_validation;
  delete sanitized.mvp_quality_gate;
  delete sanitized.card_surface;
  delete sanitized.playability_report;
  delete sanitized.debug;

  // Internal orchestration / bookkeeping.
  delete sanitized.costAccounting;
  delete sanitized.case_state;
  delete sanitized.clue_targets;
  delete sanitized.puzzle_bundle_drafts;
  delete sanitized.worker_error;
  delete sanitized.pipeline_failure;
  delete sanitized.error;
  delete sanitized.runDir;
  delete sanitized.runId;
  delete sanitized.userPrompt;
  delete sanitized.playerCount;
  delete sanitized.storyStyle;
  delete sanitized.cardsPerPlayer;
  delete sanitized.cluesPerPlayer;
  delete sanitized.puzzleCount;
  delete sanitized.profileCardsPerCharacter;
  delete sanitized.includeMetadata;
  delete sanitized.includeWorldbuilding;
  delete sanitized.includeHostSpeeches;
  delete sanitized.includeSecrets;
  delete sanitized.includeItems;

  if (isEmptyEntityBag(sanitized.storyEntities)) {
    delete sanitized.storyEntities;
  }
  if (isEmptyEntityBag(sanitized.worldEntities)) {
    delete sanitized.worldEntities;
  }

  return sanitized;
}

export function writeOutput(runDir, context) {
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(
    path.join(runDir, 'result.json'),
    JSON.stringify(sanitizeContextForOutput(context), null, 2)
  );
}
