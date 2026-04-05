import { Queue } from './queue/Queue.js';
import { runWorker } from './queue/Worker.js';
import { resetStore } from './storage/store.js';
import { createRunDir } from './storage/runDir.js';
import { loadEnv } from './utils/env.js';
import { buildPlayabilityReport } from './utils/playabilityReport.js';
import { reviewBatch, formatBatchReview } from './utils/playabilityBatchReview.js';
import { buildStructuralPreflight } from './utils/structuralPreflight.js';
import { buildStepAudit, formatStepAudits } from './utils/stepAudit.js';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { steps } from './pipeline/steps/index.js';
import { getCardsByType, getCharacterCards } from './utils/cards.js';
import {
  DEFAULT_CARDS_PER_PLAYER,
  DEFAULT_CLUES_PER_PLAYER,
  DEFAULT_PUZZLE_COUNT,
  DEFAULT_PROFILE_CARDS_PER_CHARACTER,
  coerceNonNegativeInt,
  coercePuzzleCount
} from './config/generationDefaults.js';

async function ask(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function askYesNo(question, defaultValue = true) {
  const suffix = defaultValue ? ' [Y/n]: ' : ' [y/N]: ';
  const answer = String(await ask(`${question}${suffix}`)).trim().toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  if (['y', 'yes'].includes(answer)) {
    return true;
  }
  if (['n', 'no'].includes(answer)) {
    return false;
  }
  return defaultValue;
}

function stripFlags(argv, flags) {
  const filtered = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (flags.has(arg)) {
      i += 1;
      continue;
    }
    filtered.push(arg);
  }
  return filtered;
}

async function getStartInputs(args) {
  const cardsPerPlayerFlag = getFlagValue(args, '--cards-per-player');
  const cluesPerPlayerFlag = getFlagValue(args, '--clues-per-player');
  const puzzleCountFlag = getFlagValue(args, '--puzzle-count');
  const profileCardsFlag = getFlagValue(args, '--profile-cards-per-character');
  const withMetadataFlag = getFlagValue(args, '--with-metadata');
  const withWorldbuildingFlag = getFlagValue(args, '--with-worldbuilding');
  const withHostSpeechesFlag = getFlagValue(args, '--with-host-speeches');
  const withSecretsFlag = getFlagValue(args, '--with-secrets');
  const withItemsFlag = getFlagValue(args, '--with-items');

  const positional = stripFlags(
    args,
    new Set([
      '--cards-per-player',
      '--clues-per-player',
      '--puzzle-count',
      '--profile-cards-per-character',
      '--with-metadata',
      '--with-worldbuilding',
      '--with-host-speeches',
      '--with-secrets',
      '--with-items'
    ])
  );

  let userPrompt = positional[0];
  let playerCount = positional[1];
  let storyStyle = positional[2];
  let cardsPerPlayer = positional[3];
  let cluesPerPlayer = positional[4];
  let puzzleCount = positional[5];

  // Support `start "<prompt>" "<style>"` by treating a non-numeric second arg as storyStyle.
  if (playerCount && !storyStyle) {
    const asNumber = parseInt(playerCount, 10);
    if (!Number.isFinite(asNumber)) {
      storyStyle = playerCount;
      playerCount = undefined;
    }
  }

  if (!userPrompt) {
    userPrompt = await ask('Murder mystery prompt: ');
  }

  if (!playerCount) {
    playerCount = await ask('Number of players: ');
  }

  if (!storyStyle) {
    storyStyle = await ask('Story style and theme: ');
  }

  if (!cardsPerPlayerFlag && !cardsPerPlayer) {
    cardsPerPlayer = await ask(`Game cards per player (default ${DEFAULT_CARDS_PER_PLAYER}, min 0): `);
  }

  if (!cluesPerPlayerFlag && !cluesPerPlayer) {
    cluesPerPlayer = await ask(`Clues per player (default ${DEFAULT_CLUES_PER_PLAYER}, min 0): `);
  }

  if (!puzzleCountFlag && !puzzleCount) {
    puzzleCount = await ask(`Number of puzzles (default ${DEFAULT_PUZZLE_COUNT}, min 0): `);
  }

  if (!profileCardsFlag) {
    const profileAnswer = await ask(`Profile cards per character (default ${DEFAULT_PROFILE_CARDS_PER_CHARACTER}, min 0): `);
    if (profileAnswer) {
      // Only treat it as explicitly provided when user types a value.
      args.push('--profile-cards-per-character', profileAnswer);
    }
  }

  const includeMetadata = withMetadataFlag == null
    ? await askYesNo('Generate story metadata?', true)
    : !['n', 'no', 'false', '0'].includes(String(withMetadataFlag).trim().toLowerCase());
  const includeWorldbuilding = withWorldbuildingFlag == null
    ? await askYesNo('Generate worldbuilding?', true)
    : !['n', 'no', 'false', '0'].includes(String(withWorldbuildingFlag).trim().toLowerCase());
  const includeHostSpeeches = withHostSpeechesFlag == null
    ? await askYesNo('Generate host speeches?', true)
    : !['n', 'no', 'false', '0'].includes(String(withHostSpeechesFlag).trim().toLowerCase());
  const includeSecrets = withSecretsFlag == null
    ? await askYesNo('Generate character secrets?', true)
    : !['n', 'no', 'false', '0'].includes(String(withSecretsFlag).trim().toLowerCase());
  const includeItems = withItemsFlag == null
    ? await askYesNo('Generate character items?', true)
    : !['n', 'no', 'false', '0'].includes(String(withItemsFlag).trim().toLowerCase());

  return {
    userPrompt,
    playerCount: parseInt(playerCount, 10) || 4,
    storyStyle,
    cardsPerPlayer: coerceNonNegativeInt(cardsPerPlayerFlag ?? cardsPerPlayer, DEFAULT_CARDS_PER_PLAYER),
    cluesPerPlayer: coerceNonNegativeInt(cluesPerPlayerFlag ?? cluesPerPlayer, DEFAULT_CLUES_PER_PLAYER),
    puzzleCount: coercePuzzleCount(puzzleCountFlag ?? puzzleCount, DEFAULT_PUZZLE_COUNT),
    profileCardsPerCharacter: coerceNonNegativeInt(
      profileCardsFlag ?? getFlagValue(args, '--profile-cards-per-character'),
      DEFAULT_PROFILE_CARDS_PER_CHARACTER
    ),
    includeMetadata,
    includeWorldbuilding,
    includeHostSpeeches,
    includeSecrets,
    includeItems
  };
}

loadEnv();

const queue = new Queue();
const cmd = process.argv[2];
const args = process.argv.slice(3);

function printHelp() {
  console.log('Commands:');
  console.log('  node src/cli.js start "<userPrompt>" <playerCount> ["storyStyle"] [cardsPerPlayer] [cluesPerPlayer] [puzzleCount]');
  console.log('    Optional flags: --cards-per-player N --clues-per-player N --puzzle-count N --profile-cards-per-character N --with-metadata y|n --with-worldbuilding y|n --with-host-speeches y|n --with-secrets y|n --with-items y|n');
  console.log('  node src/cli.js start --from <runDir|result.json> [--step <stepName>]');
  console.log('  node src/cli.js start-fast "<userPrompt>" <playerCount> ["storyStyle"]');
  console.log('  node src/cli.js audit-steps "<userPrompt>" <playerCount> ["storyStyle"] [--json] [--full]');
  console.log('  node src/cli.js status');
  console.log('  node src/cli.js resume');
  console.log('  node src/cli.js reset');
  console.log('  node src/cli.js review <runDir|result.json>');
  console.log('  node src/cli.js preflight <runDir|result.json>');
  console.log('  node src/cli.js review-batch [runsDir] [--json] [--current-only]');
}

function getFlagValue(argv, flag) {
  const index = argv.findIndex((arg) => arg === flag);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function hasCardType(context, cardType) {
  return Array.isArray(context?.cards) && context.cards.some((card) => card?.card_type === cardType);
}

function isTreasureTrailClue(card) {
  if (card?.card_type !== 'clue') {
    return false;
  }
  if (String(card?.role || '').trim() === 'treasure') {
    return true;
  }
  return String(card?.meta?.treasure_stage || '').trim() === 'clue';
}

function applyResumePruneForStep(next, resumedStep) {
  next.cards ??= [];

  const removeCards = (predicate) => {
    next.cards = next.cards.filter((card) => !predicate(card));
  };

  const clearGeneratedTailState = () => {
    delete next.playability_report;
    delete next.structural_preflight;
    delete next.solvability_validation;
    delete next.mvp_quality_gate;
    delete next.card_surface;
    delete next.host_ui_hints;
    delete next.worker_error;
    delete next.pipeline_failure;
    delete next.error;
  };

  const clearResumeOnlyState = () => {
    delete next.playability_report;
    delete next.worker_error;
    delete next.pipeline_failure;
    delete next.error;
  };

  const clearBundleState = () => {
    delete next.puzzle_bundle_drafts;
    delete next.puzzle_bundles;
    delete next.truth_trail;
  };

  switch (resumedStep) {
    case 'story_blurb_agent':
      next.cards = [];
      delete next.storyBlurb;
      delete next.storyEntities;
      delete next.story_title;
      delete next.story_description;
      delete next.story_rating;
      delete next.story_themes;
      delete next.world;
      delete next.worldEntities;
      delete next.coreTruth;
      delete next.case_state;
      delete next.clue_targets;
      clearBundleState();
      clearGeneratedTailState();
      break;
    case 'story_metadata_agent':
      removeCards((card) => card?.card_type === 'story_meta');
      delete next.story_title;
      delete next.story_description;
      delete next.story_rating;
      delete next.story_themes;
      clearGeneratedTailState();
      break;
    case 'world_building_agent':
      removeCards((card) => card?.card_type === 'world_person' || card?.card_type === 'world_location');
      delete next.world;
      delete next.worldEntities;
      clearGeneratedTailState();
      break;
    case 'characters_builder_agent':
      removeCards((card) => card?.card_type === 'character');
      clearGeneratedTailState();
      break;
    case 'core_truth_agent':
      delete next.coreTruth;
      delete next.case_state;
      delete next.clue_targets;
      clearBundleState();
      clearGeneratedTailState();
      break;
    case 'treasure_hunt_agent':
      removeCards((card) => card?.card_type === 'clue' && String(card?.role || '').trim() === 'treasure' && !card?.meta?.treasure_stage);
      clearGeneratedTailState();
      break;
    case 'case_state_builder_agent':
      delete next.case_state;
      clearGeneratedTailState();
      break;
    case 'character_secret_agent':
      removeCards((card) => card?.card_type === 'secret');
      clearGeneratedTailState();
      break;
    case 'item_agent':
      removeCards((card) => card?.card_type === 'item' && !card?.bundle_id);
      clearGeneratedTailState();
      break;
    case 'treasure_item_agent':
      removeCards((card) =>
        card?.card_type === 'treasure'
        || (card?.card_type === 'clue' && String(card?.meta?.treasure_stage || '').trim() === 'clue')
      );
      clearGeneratedTailState();
      break;
    case 'story_acts_agent':
      removeCards((card) => card?.card_type === 'story_act');
      clearGeneratedTailState();
      break;
    case 'host_speech_agent':
      removeCards((card) => card?.card_type === 'host_speech');
      clearGeneratedTailState();
      break;
    case 'clue_agent':
      removeCards((card) =>
        card?.card_type === 'clue'
        && !isTreasureTrailClue(card)
        && !card?.bundle_id
      );
      delete next.clue_targets;
      clearBundleState();
      clearGeneratedTailState();
      break;
    case 'clue_target_agent':
      delete next.clue_targets;
      clearBundleState();
      clearGeneratedTailState();
      break;
    case 'puzzle_agent':
      delete next.puzzle_bundle_drafts;
      delete next.puzzle_bundles;
      delete next.truth_trail;
      clearGeneratedTailState();
      break;
    case 'bundle_finalize_agent':
      removeCards((card) => Boolean(card?.bundle_id));
      delete next.puzzle_bundles;
      delete next.truth_trail;
      clearGeneratedTailState();
      break;
    case 'game_card_agent':
      removeCards((card) => card?.card_type === 'game_card');
      delete next.mvp_quality_gate;
      delete next.card_surface;
      delete next.host_ui_hints;
      clearResumeOnlyState();
      break;
    case 'bundle_structure_validator_agent':
    case 'post_final_invariants_agent':
    case 'bundle_integrity_validator_agent':
      clearResumeOnlyState();
      break;
    case 'truth_trail_validator_agent':
      delete next.truth_trail;
      clearGeneratedTailState();
      break;
    case 'structural_preflight_agent':
      delete next.structural_preflight;
      clearGeneratedTailState();
      break;
    case 'solvability_validator_agent':
      delete next.solvability_validation;
      clearGeneratedTailState();
      break;
    case 'mvp_quality_gate_agent':
      delete next.mvp_quality_gate;
      delete next.card_surface;
      delete next.host_ui_hints;
      clearResumeOnlyState();
      break;
    default:
      clearResumeOnlyState();
      break;
  }

  return next;
}

function pruneResumeContext(context, resumedStep) {
  const next = {
    ...context,
    cards: Array.isArray(context?.cards) ? [...context.cards] : []
  };

  const startIndex = steps.findIndex((step) => step.name === resumedStep);
  if (startIndex === -1) {
    return applyResumePruneForStep(next, resumedStep);
  }

  for (let index = startIndex; index < steps.length; index += 1) {
    applyResumePruneForStep(next, steps[index].name);
  }

  return next;
}

function inferResumeStep(context) {
  const failedStep = String(context?.pipeline_failure?.failed_step || '').trim();
  if (
    failedStep
    && steps.some((step) => step.name === failedStep)
    && (failedStep === 'solvability_validator_agent' || context?.solvability_validation)
  ) {
    return failedStep;
  }

  if (!context?.storyBlurb) {
    return 'story_blurb_agent';
  }
  if (context?.includeMetadata !== false && !String(context?.story_title || '').trim()) {
    return 'story_metadata_agent';
  }
  if (
    context?.includeWorldbuilding !== false
    && !hasCardType(context, 'world_person')
    && !hasCardType(context, 'world_location')
  ) {
    return 'world_building_agent';
  }
  if (!hasCardType(context, 'character_profile')) {
    return 'characters_builder_agent';
  }
  if (!context?.coreTruth) {
    return 'core_truth_agent';
  }

  const charCards = getCharacterCards(context.cards || []);
  if (charCards.length > 0) {
    if (context?.includeSecrets !== false) {
      const secretN = getCardsByType(context.cards || [], 'secret').length;
      if (secretN < charCards.length * 2) {
        return 'character_secret_agent';
      }
    }
  }

  const itemCards = getCardsByType(context.cards || [], 'item');
  if (itemCards.length === 0) {
    return 'item_agent';
  }
  if (getCardsByType(context.cards || [], 'treasure').length < 1) {
    return 'treasure_item_agent';
  }
  if (getCardsByType(context.cards || [], 'story_act').length < 3) {
    return 'story_acts_agent';
  }
  if (context?.includeHostSpeeches !== false && getCardsByType(context.cards || [], 'host_speech').length < 3) {
    return 'host_speech_agent';
  }

  if (!hasCardType(context, 'clue')) {
    return 'clue_agent';
  }
  if (!context?.solvability_validation) {
    return 'solvability_validator_agent';
  }
  return null;
}

function printPlayabilityReport(report) {
  console.log('Playability score:', `${report.score_10}/10`, `(${report.grade})`);
  console.log('Status:', report.status);
  console.log('Issues:', report.issue_count);
  for (const issue of report.issues.slice(0, 10)) {
    console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  }
}

function printStructuralPreflight(report) {
  console.log('Structural preflight:', report.status);
  console.log('Issues:', report.issue_count);
  for (const issue of report.issues.slice(0, 10)) {
    console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  }
}

function resolveReviewPath(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    throw new Error('Missing path for review command.');
  }
  const fullPath = path.resolve(raw);
  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) {
    return path.join(fullPath, 'result.json');
  }
  return fullPath;
}

function printPartialFailureSummary(runDir, context) {
  const failure = context?.pipeline_failure;
  if (!failure || !runDir) {
    return;
  }
  console.log('');
  console.log(`Pipeline failed at: ${failure.failed_step || 'unknown_step'}`);
  console.log('');
  console.log('Partial run saved:');
  console.log(path.join(runDir, 'result.json'));
  console.log('');
  console.log('You can inspect this file.');
}

async function main() {
  if (cmd === 'start') {
    const fromPathArg = getFlagValue(args, '--from');
    const overrideStep = getFlagValue(args, '--step');
    if (fromPathArg) {
      const sourcePath = resolveReviewPath(fromPathArg);
      const sourceDir = path.dirname(sourcePath);
      const context = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      const resumedStep = overrideStep || inferResumeStep(context);
      if (!resumedStep) {
        console.log('Run appears complete.');
        console.log('Nothing to resume.');
        return;
      }
      const stepIndex = steps.findIndex((step) => step.name === resumedStep);
      if (stepIndex < 0) {
        throw new Error(`Unknown step for --step: ${resumedStep}`);
      }

      const prunedContext = pruneResumeContext(context, resumedStep);

      prunedContext.pipeline_resume = {
        from_file: sourcePath,
        resumed_step: resumedStep,
        resumed_at: new Date().toISOString()
      };

      const job = queue.createJob(prunedContext);
      job.stepIndex = stepIndex;

      console.log('────────────────────────────────────────');
      console.log('Resuming Murder Mystery Build');
      console.log('File :', sourcePath);
      console.log('Step :', resumedStep);
      console.log('Output :', sourceDir);
      console.log('────────────────────────────────────────');

      try {
        await runWorker(queue, {
          targetJobId: job.id,
          onStepStart: ({ stepName, index, total }) => {
            console.log(`→ [${index + 1}/${total}] ${stepName}`);
          },
          onStepDone: ({ stepName }) => {
            console.log(`✓ ${stepName}`);
          },
          onStepError: ({ stepName, error }) => {
            console.log(`✗ ${stepName}`);
            console.log(String(error));
          }
        });
      } catch (error) {
        const finalDir = job.context?.runDir || sourceDir;
        const resultPath = path.join(finalDir, 'result.json');
        if (fs.existsSync(resultPath)) {
          const failedContext = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
          printPartialFailureSummary(finalDir, failedContext);
        }
        throw error;
      }

      const outDir = job.context?.runDir || sourceDir;
      console.log('────────────────────────────────────────');
      console.log(`Done. Inspect: ${outDir}`);
      console.log('────────────────────────────────────────');
      return;
    }

    const {
      userPrompt,
      playerCount,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      profileCardsPerCharacter,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems
    } = await getStartInputs(args);

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.');
      process.exit(1);
    }

    const run = createRunDir('pending');
    const job = queue.createJob({
      runId: run.id,
      runDir: run.dir,
      playerCount,
      userPrompt,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      profileCardsPerCharacter,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems,
      cards: []
    });

    console.log('────────────────────────────────────────');
    console.log('Starting Murder Mystery Build');
    console.log('Run ID :', run.id);
    console.log('Players:', playerCount);
    console.log('Cards/player:', cardsPerPlayer);
    console.log('Clues/player:', cluesPerPlayer);
    console.log('Puzzles:', puzzleCount);
    console.log('Profile cards/character:', profileCardsPerCharacter);
    console.log('Metadata:', includeMetadata ? 'yes' : 'no');
    console.log('Worldbuilding:', includeWorldbuilding ? 'yes' : 'no');
    console.log('Host speeches:', includeHostSpeeches ? 'yes' : 'no');
    console.log('Secrets:', includeSecrets ? 'yes' : 'no');
    console.log('Items:', includeItems ? 'yes' : 'no');
    console.log('Prompt :', userPrompt);
    console.log('Style :', storyStyle);
    console.log('Output :', run.dir, '(folder renames after story title is generated)');
    console.log('────────────────────────────────────────');

    try {
      await runWorker(queue, {
        targetJobId: job.id,
        onStepStart: ({ stepName, index, total }) => {
          console.log(`→ [${index + 1}/${total}] ${stepName}`);
        },
        onStepDone: ({ stepName }) => {
          console.log(`✓ ${stepName}`);
        },
        onStepError: ({ stepName, error }) => {
          console.log(`✗ ${stepName}`);
          console.log(String(error));
        }
      });
    } catch (error) {
      const finalDir = job.context?.runDir || run.dir;
      const resultPath = path.join(finalDir, 'result.json');
      if (fs.existsSync(resultPath)) {
        const context = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        printPartialFailureSummary(finalDir, context);
      }
      throw error;
    }

    const outDir = job.context?.runDir || run.dir;
    console.log('────────────────────────────────────────');
    console.log(`Done. Inspect: ${outDir}`);
    console.log('────────────────────────────────────────');
    return;
  }

  if (cmd === 'status') {
    console.log(JSON.stringify(queue.list(), null, 2));
    return;
  }

  if (cmd === 'resume') {
    await runWorker(queue, {
      onStepStart: ({ stepName, index, total }) => {
        console.log(`→ [${index + 1}/${total}] ${stepName}`);
      },
      onStepDone: ({ stepName }) => {
        console.log(`✓ ${stepName}`);
      },
      onStepError: ({ stepName, error }) => {
        console.log(`✗ ${stepName}`);
        console.log(String(error));
      }
    });
    return;
  }

  if (cmd === 'reset') {
    resetStore();
    console.log('Job store reset.');
    return;
  }

  if (cmd === 'start-fast') {
    const {
      userPrompt,
      playerCount,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems
    } = await getStartInputs(args);

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.');
      process.exit(1);
    }

    const run = createRunDir('pending');
    let latestContext = null;
    const job = queue.createJob({
      runId: run.id,
      runDir: run.dir,
      playerCount,
      userPrompt,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      profileCardsPerCharacter,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems,
      cards: []
    });

    console.log('Fast structural build');
    console.log('Run ID :', run.id);
    console.log('Output :', run.dir);

    const resultPathInitial = path.join(run.dir, 'result.json');
    try {
      await runWorker(queue, {
        targetJobId: job.id,
        stopAfterStepName: 'structural_preflight_agent',
        onStepStart: ({ stepName, index, total, job }) => {
          latestContext = job?.context || latestContext;
          console.log(`→ [${index + 1}/${total}] ${stepName}`);
        },
        onStepDone: ({ stepName }) => {
          console.log(`✓ ${stepName}`);
        },
        onStepError: ({ stepName, error, job }) => {
          latestContext = job?.context || latestContext;
          console.log(`✗ ${stepName}`);
          console.log(String(error));
        }
      });
    } catch (error) {
      const finalDir = job.context?.runDir || run.dir;
      const resultPathFinal = path.join(finalDir, 'result.json');
      if (!fs.existsSync(resultPathFinal) && !fs.existsSync(resultPathInitial) && !latestContext) {
        throw error;
      }
    }

    const finalDir = job.context?.runDir || run.dir;
    const resultPath = path.join(finalDir, 'result.json');
    const context = fs.existsSync(resultPath)
      ? JSON.parse(fs.readFileSync(resultPath, 'utf8'))
      : latestContext;
    printStructuralPreflight(context.structural_preflight || buildStructuralPreflight(context));
    printPlayabilityReport(buildPlayabilityReport(context, { partial: true, stepName: 'start-fast' }));
    return;
  }

  if (cmd === 'audit-steps') {
    const jsonMode = args.includes('--json');
    const fullMode = args.includes('--full');
    const filteredArgs = args.filter((arg) => arg !== '--json' && arg !== '--full');
    const {
      userPrompt,
      playerCount,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      profileCardsPerCharacter,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems
    } = await getStartInputs(filteredArgs);

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.');
      process.exit(1);
    }

    const run = createRunDir('pending');
    const audits = [];
    let latestContext = null;
    const job = queue.createJob({
      runId: run.id,
      runDir: run.dir,
      playerCount,
      userPrompt,
      storyStyle,
      cardsPerPlayer,
      cluesPerPlayer,
      puzzleCount,
      profileCardsPerCharacter,
      includeMetadata,
      includeWorldbuilding,
      includeHostSpeeches,
      includeSecrets,
      includeItems,
      cards: []
    });

    console.log('Step audit build');
    console.log('Run ID :', run.id);
    console.log('Output :', run.dir);

    try {
      await runWorker(queue, {
        targetJobId: job.id,
        stopAfterStepName: fullMode ? null : 'structural_preflight_agent',
        onStepStart: ({ stepName, index, total, job }) => {
          latestContext = job?.context || latestContext;
          console.log(`→ [${index + 1}/${total}] ${stepName}`);
        },
        onStepDone: ({ stepName, job }) => {
          latestContext = job?.context || latestContext;
          const audit = buildStepAudit(job.context, stepName);
          audits.push(audit);
          console.log(`✓ ${stepName} (${audit.finding_count} findings, ${audit.playability_score_10}/10)`);
        },
        onStepError: ({ stepName, error, job }) => {
          if (job?.context) {
            audits.push(buildStepAudit(job.context, stepName));
          }
          console.log(`✗ ${stepName}`);
          console.log(String(error));
        }
      });
    } catch {
      // Keep the partial audit output; caller asked for iterative diagnostics.
    }

    const finalDir = job.context?.runDir || run.dir;
    const auditPath = path.join(finalDir, 'step_audit.json');
    fs.writeFileSync(auditPath, JSON.stringify(audits, null, 2));
    if (latestContext && !fs.existsSync(path.join(finalDir, 'result.json'))) {
      fs.writeFileSync(path.join(finalDir, 'result.json'), JSON.stringify(latestContext, null, 2));
    }

    if (jsonMode) {
      console.log(JSON.stringify({ run_id: job.context?.runId || run.id, run_dir: finalDir, audits }, null, 2));
    } else {
      console.log(formatStepAudits(audits));
      console.log(`Audit JSON: ${auditPath}`);
    }
    return;
  }

  if (cmd === 'review') {
    const targetPath = resolveReviewPath(args[0]);
    const context = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const report = buildPlayabilityReport(context, { partial: false, stepName: 'review' });
    printPlayabilityReport(report);
    return;
  }

  if (cmd === 'preflight') {
    const targetPath = resolveReviewPath(args[0]);
    const context = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    printStructuralPreflight(buildStructuralPreflight(context));
    return;
  }

  if (cmd === 'review-batch') {
    const jsonMode = args.includes('--json');
    const currentOnly = args.includes('--current-only');
    const target = args.find((arg) => arg !== '--json' && arg !== '--current-only');
    const summary = reviewBatch(target, { currentOnly });
    if (jsonMode) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(formatBatchReview(summary));
    }
    return;
  }

  printHelp();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
