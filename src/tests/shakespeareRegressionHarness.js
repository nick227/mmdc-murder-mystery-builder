import fs from 'node:fs';
import path from 'node:path';
import { Queue } from '../queue/Queue.js';
import { runWorker } from '../queue/Worker.js';
import { createRunDir } from '../storage/runDir.js';
import { loadEnv } from '../utils/env.js';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';
import { buildStructuralPreflight } from '../utils/structuralPreflight.js';

const DEFAULT_PROMPT = 'Shakespeare garden party murder mystery';
const DEFAULT_STYLE = 'Shakespeare style creative fun';
const DEFAULT_RUN_COUNT = 3;
const REPORT_FILENAME = 'shakespeare_regression_report.json';

function parseArgs(argv) {
  const runCount = Number.parseInt(argv[0], 10);
  return {
    runCount: Number.isFinite(runCount) && runCount > 0 ? runCount : DEFAULT_RUN_COUNT,
    prompt: String(argv[1] || DEFAULT_PROMPT).trim(),
    style: String(argv[2] || DEFAULT_STYLE).trim()
  };
}

function createBatchDir() {
  const base = process.env.OUTPUT_DIR || './runs';
  const id = `shakespeare-regression-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.resolve(base, id);
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir };
}

function readResultContext(runDir, fallbackContext) {
  const resultPath = path.join(runDir, 'result.json');
  if (fs.existsSync(resultPath)) {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  }
  return fallbackContext || {};
}

function collectCodes(report) {
  return new Set((report?.issues || []).map((issue) => issue.code).filter(Boolean));
}

function collectEarlyCollapseReasons(context) {
  const workerError = String(context?.worker_error || '').trim();
  const rejectionLog = Array.isArray(context?.debug?.rejection_log) ? context.debug.rejection_log : [];
  const joinedReasons = rejectionLog
    .filter((entry) => entry?.stage === 'clue_target_agent')
    .flatMap((entry) => Array.isArray(entry?.rejection_reasons) ? entry.rejection_reasons : [entry?.reason])
    .filter(Boolean)
    .join('; ');
  const haystack = `${workerError}; ${joinedReasons}`;

  const reasons = [];
  if (/early_viability_below_two/i.test(haystack)) {
    reasons.push('early_viability_below_two');
  }
  if (/midgame_material_competition_below_three/i.test(haystack)) {
    reasons.push('midgame_material_competition_below_three');
  }
  if (/early_suspect_collapse/i.test(haystack)) {
    reasons.push('early_suspect_collapse');
  }
  if (/early_overweighted_suspect:/i.test(haystack)) {
    reasons.push('early_overweighted_suspect');
  }
  return [...new Set(reasons)];
}

function analyzeRun(context, lastStepName) {
  const playability = buildPlayabilityReport(context, {
    partial: true,
    stepName: lastStepName || 'regression_harness'
  });
  const structural = buildStructuralPreflight(context);
  const playabilityCodes = collectCodes(playability);
  const structuralCodes = collectCodes(structural);
  const earlyCollapseReasons = collectEarlyCollapseReasons(context);

  const flags = {
    structural_invalid: structural.status !== 'ready',
    playability_blocked: playability.status === 'blocked',
    roster_unknown_entities: playabilityCodes.has('unknown_roster_entities'),
    early_suspect_collapse: earlyCollapseReasons.length > 0
  };

  const failReasons = [];
  if (flags.early_suspect_collapse) {
    failReasons.push(...(earlyCollapseReasons.length ? earlyCollapseReasons : ['early_suspect_collapse']));
  }
  if (flags.structural_invalid) {
    failReasons.push('structural_invalid');
  }
  if (flags.playability_blocked) {
    failReasons.push('playability_blocked');
  }
  if (flags.roster_unknown_entities) {
    failReasons.push('unknown_roster_entities');
  }

  return {
    playability,
    structural,
    flags,
    failReasons: [...new Set(failReasons)]
  };
}

function incrementCount(counter, key) {
  counter[key] = (counter[key] || 0) + 1;
}

async function runSingleRegression(index, options) {
  const queue = new Queue();
  const run = createRunDir();
  let latestContext = null;
  let lastStepName = null;
  const job = queue.createJob({
    runId: run.id,
    runDir: run.dir,
    playerCount: 4,
    userPrompt: options.prompt,
    storyStyle: options.style,
    cards: []
  });

  try {
    await runWorker(queue, {
      targetJobId: job.id,
      stopAfterStepName: 'structural_preflight_agent',
      onStepStart: ({ stepName, job: currentJob }) => {
        lastStepName = stepName;
        latestContext = currentJob?.context || latestContext;
      },
      onStepDone: ({ stepName, job: currentJob }) => {
        lastStepName = stepName;
        latestContext = currentJob?.context || latestContext;
      },
      onStepError: ({ stepName, job: currentJob }) => {
        lastStepName = stepName;
        latestContext = currentJob?.context || latestContext;
      }
    });
  } catch {
    // Keep partial output; the harness is measuring instability.
  }

  const context = readResultContext(run.dir, latestContext);
  const analysis = analyzeRun(context, lastStepName);
  return {
    index,
    run_id: run.id,
    run_dir: run.dir,
    last_step: lastStepName,
    worker_error: context?.worker_error || null,
    structural_status: analysis.structural.status,
    playability_status: analysis.playability.status,
    playability_score_10: analysis.playability.score_10,
    counts: analysis.flags,
    fail_reasons: analysis.failReasons
  };
}

async function main() {
  loadEnv();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.');
  }

  const options = parseArgs(process.argv.slice(2));
  const priorOutputDir = process.env.OUTPUT_DIR;
  const batch = createBatchDir();
  process.env.OUTPUT_DIR = batch.dir;

  const summary = {
    total_runs: options.runCount,
    passed_runs: 0,
    failed_runs: 0,
    issue_counts: {
      structural_invalid: 0,
      playability_blocked: 0,
      unknown_roster_entities: 0,
      early_suspect_collapse: 0,
      final_bundle_redundant_confirmation: 0
    },
    fail_reason_counts: {}
  };

  const runs = [];
  for (let index = 0; index < options.runCount; index += 1) {
    const runResult = await runSingleRegression(index + 1, options);
    runs.push(runResult);

    const passed = runResult.structural_status === 'ready'
      && runResult.playability_status === 'ready_for_playtest';

    if (passed) {
      summary.passed_runs += 1;
    } else {
      summary.failed_runs += 1;
    }

    if (runResult.counts.structural_invalid) {
      summary.issue_counts.structural_invalid += 1;
    }
    if (runResult.counts.playability_blocked) {
      summary.issue_counts.playability_blocked += 1;
    }
    if (runResult.counts.roster_unknown_entities) {
      summary.issue_counts.unknown_roster_entities += 1;
    }
    if (runResult.counts.early_suspect_collapse) {
      summary.issue_counts.early_suspect_collapse += 1;
    }

    for (const reason of runResult.fail_reasons) {
      incrementCount(summary.fail_reason_counts, reason);
    }
  }

  const report = {
    batch_id: batch.id,
    prompt: options.prompt,
    style: options.style,
    run_count: options.runCount,
    summary,
    runs
  };

  const reportPath = path.join(batch.dir, REPORT_FILENAME);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    batch_id: batch.id,
    report_file: reportPath,
    summary
  }, null, 2));

  process.env.OUTPUT_DIR = priorOutputDir;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
