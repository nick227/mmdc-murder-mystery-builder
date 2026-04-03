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

async function ask(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function getStartInputs(args) {
  let userPrompt = args[0];
  let playerCount = args[1];
  let storyStyle = args[2];

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

  return {
    userPrompt,
    playerCount: parseInt(playerCount, 10) || 4,
    storyStyle
  };
}

loadEnv();

const queue = new Queue();
const cmd = process.argv[2];
const args = process.argv.slice(3);

function printHelp() {
  console.log('Commands:');
  console.log('  node src/cli.js start "<userPrompt>" <playerCount> ["storyStyle"]');
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

function inferResumeStep(context) {
  if (!context?.storyBlurb) {
    return 'story_blurb_agent';
  }
  if (!hasCardType(context, 'world_person') && !hasCardType(context, 'world_location')) {
    return 'world_building_agent';
  }
  if (!hasCardType(context, 'character_profile')) {
    return 'characters_builder_agent';
  }
  if (!context?.coreTruth) {
    return 'core_truth_agent';
  }
  if (!hasCardType(context, 'story_clue')) {
    return 'clue_agent';
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

      context.pipeline_resume = {
        from_file: sourcePath,
        resumed_step: resumedStep,
        resumed_at: new Date().toISOString()
      };

      const job = queue.createJob(context);
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

    const { userPrompt, playerCount, storyStyle } = await getStartInputs(args);

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
      cards: []
    });

    console.log('────────────────────────────────────────');
    console.log('Starting Murder Mystery Build');
    console.log('Run ID :', run.id);
    console.log('Players:', playerCount);
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
    const { userPrompt, playerCount, storyStyle } = await getStartInputs(args);

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
    const { userPrompt, playerCount, storyStyle } = await getStartInputs(filteredArgs);

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
