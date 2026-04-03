
import { steps } from '../pipeline/steps/index.js';
import { retitleExistingRunDir } from '../storage/runDir.js';
import { writeOutput } from '../storage/output.js';
import { saveJobs } from '../storage/store.js';
import { section } from '../cli/logger.js';
import { setActiveLlmRunContext, clearActiveLlmRunContext } from '../llm/costLedger.js';
import { validateContext } from '../pipeline/validate.js';
import { normalizeContext } from '../utils/context.js';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';
import { getPlayabilityGateDecision } from '../utils/playabilityGate.js';

function ensureJobContext(job) {
  if (!job.context) {
    job.context = {
      runId: job.runId ?? job.id ?? null,
      runDir: job.runDir ?? null,
      userPrompt: job.userPrompt ?? '',
      playerCount: job.playerCount ?? job.player_count ?? 4,
      storyStyle: job.storyStyle ?? job.story_style ?? '',
      cards: []
    };
  }

  if (job.context.userPrompt == null && job.userPrompt != null) {
    job.context.userPrompt = job.userPrompt;
  }
  if (job.context.playerCount == null && (job.playerCount != null || job.player_count != null)) {
    job.context.playerCount = job.playerCount ?? job.player_count;
  }
  if (job.context.storyStyle == null && (job.storyStyle != null || job.story_style != null)) {
    job.context.storyStyle = job.storyStyle ?? job.story_style;
  }

  return normalizeContext(job.context);
}

function syncJobIdentity(job) {
  job.context ??= {};
  if (job.runId && job.context.runId !== job.runId) {
    job.context.runId = job.runId;
  }
  if (job.runDir && job.context.runDir !== job.runDir) {
    job.context.runDir = job.runDir;
  }
}

/** Partial saves must not lose context if playability scoring throws on broken state. */
function safePartialPlayabilityReport(context, stepName) {
  if (context?.playability_report) {
    return context.playability_report;
  }
  try {
    return buildPlayabilityReport(context, { partial: true, stepName });
  } catch (reportErr) {
    return {
      score_10: 0,
      score_percent: 0,
      grade: 'F',
      pass: false,
      status: 'blocked',
      partial: true,
      step_name: stepName,
      issue_count: 1,
      issues: [
        {
          severity: 'major',
          code: 'playability_report_build_failed',
          message: String(reportErr),
          points: 0
        }
      ]
    };
  }
}

// FIX: added exponential backoff with jitter and retryable-error detection.
// The old version retried immediately on every error, which meant a 429
// rate-limit response would just get rate-limited again on the next attempt.
// Non-retryable errors (e.g. JSON schema violations, solvability failures)
// are surfaced immediately without burning retry slots.
function isRetryable(error) {
  const msg = String(error);
  // OpenAI/Azure rate limits and server errors are worth retrying.
  if (/429|rate.?limit|too many requests/i.test(msg)) {
    return true;
  }
  if (/5\d\d|server error|service unavailable|timeout/i.test(msg)) {
    return true;
  }
  return false;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWithRetry(fn, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Surface non-retryable errors immediately.
      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt === retries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s … with ±20 % jitter.
      const base = 1000 * Math.pow(2, attempt);
      const jitter = base * 0.2 * (Math.random() * 2 - 1);
      await sleep(Math.round(base + jitter));
    }
  }

  throw lastError;
}

export async function runWorker(queue, hooks = {}) {
  const repairGateIndex = steps.findIndex((step) => step.name === 'playability_repair_agent');
  const stopAfterStepName = typeof hooks.stopAfterStepName === 'string' ? hooks.stopAfterStepName : null;

  while (true) {
    const job = hooks.targetJobId
      ? queue.jobs.find((candidate) => candidate.id === hooks.targetJobId && candidate.status === 'pending')
      : queue.next();
    if (!job) {
      break;
    }

    ensureJobContext(job);
    syncJobIdentity(job);
    validateContext(job.context, { allowPartial: true });

    job.status = 'running';
    saveJobs(queue.jobs);

    try {
      while (job.stepIndex < steps.length) {
        const step = steps[job.stepIndex];

        setActiveLlmRunContext({
          runId: job.context?.runId ?? null,
          stepName: step.name
        });

        section(`STEP ${job.stepIndex + 1}/${steps.length} — ${step.name}`);

        hooks.onStepStart?.({ stepName: step.name, index: job.stepIndex, total: steps.length, job });

        const next = await runWithRetry(() => step.run(job.context), 2);

        if (!next) {
          throw new Error(`${step.name} returned undefined`);
        }

        job.context = normalizeContext(next);
        syncJobIdentity(job);

        if (step.name === 'story_metadata_agent' && job.context?.runDir) {
          const title = String(job.context.story_title || '').trim();
          if (title) {
            const { id, dir } = retitleExistingRunDir(job.context.runDir, title);
            job.context.runDir = dir;
            job.context.runId = id;
            syncJobIdentity(job);
          }
        }

        validateContext(job.context, { allowPartial: true });

        const report = buildPlayabilityReport(job.context, {
          partial: repairGateIndex === -1 ? false : job.stepIndex < repairGateIndex,
          stepName: step.name
        });
        job.context.playability_report = report;
        job.context.playability_history ??= [];
        job.context.playability_history.push({
          step_name: step.name,
          score_10: report.score_10,
          status: report.status,
          issue_count: report.issue_count
        });
        saveJobs(queue.jobs);
        writeOutput(job.context.runDir, job.context);

        const forceCaseStateGate = step.name === 'case_state_builder_agent'
          && report.issues.some((issue) => issue.code === 'killer_equals_victim');
        const gateDecision = getPlayabilityGateDecision(report, {
          allowPartial: !forceCaseStateGate
        });
        if (gateDecision.blocked) {
          throw new Error(
            `PLAYABILITY_GATE_BLOCKED at ${step.name}\n` +
            gateDecision.reasons.join('\n')
          );
        }

        hooks.onStepDone?.({ stepName: step.name, index: job.stepIndex, total: steps.length, job });

        job.stepIndex++;
        saveJobs(queue.jobs);
        writeOutput(job.context.runDir, job.context);

        if (stopAfterStepName && step.name === stopAfterStepName) {
          clearActiveLlmRunContext();
          job.status = 'done';
          saveJobs(queue.jobs);
          writeOutput(job.context.runDir, job.context);
          return;
        }
      }

      clearActiveLlmRunContext();

      job.status = 'done';
      saveJobs(queue.jobs);
      writeOutput(job.context.runDir, job.context);

    } catch (error) {
      clearActiveLlmRunContext();
      job.status = 'error';
      job.error = String(error);
      saveJobs(queue.jobs);
      const failedStepName = steps[job.stepIndex]?.name ?? 'unknown_step';
      const runDir = job.context?.runDir || job.runDir;
      if (runDir) {
        syncJobIdentity(job);
        const pipelineFailure = {
          failed_step: failedStepName,
          failed_step_index: job.stepIndex,
          saved_at: new Date().toISOString()
        };
        try {
          writeOutput(runDir, {
            ...job.context,
            worker_error: String(error),
            pipeline_failure: pipelineFailure,
            playability_report: safePartialPlayabilityReport(job.context, failedStepName)
          });
        } catch (writeErr) {
          console.error('[worker] Failed to write partial result.json:', writeErr);
        }
      }
      hooks.onStepError?.({ stepName: failedStepName, error, index: job.stepIndex, total: steps.length, job });
      throw error;
    }
  }
}
