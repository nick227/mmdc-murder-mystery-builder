
import { steps } from '../pipeline/steps/index.js';
import { writeOutput } from '../storage/output.js';
import { saveJobs } from '../storage/store.js';
import { section } from '../cli/logger.js';
import { setActiveLlmRunContext, clearActiveLlmRunContext } from '../llm/costLedger.js';
import { validateContext } from '../pipeline/validate.js';
import { normalizeContext } from '../utils/context.js';

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

  while (true) {
    const job = queue.next();
    if (!job) {
      break;
    }

    ensureJobContext(job);
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

        validateContext(job.context, { allowPartial: true });

        hooks.onStepDone?.({ stepName: step.name, index: job.stepIndex, total: steps.length, job });

        job.stepIndex++;
        saveJobs(queue.jobs);
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
      hooks.onStepError?.({ stepName: steps[job.stepIndex]?.name ?? 'unknown_step', error, index: job.stepIndex, total: steps.length, job });
      throw error;
    }
  }
}
