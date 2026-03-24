const ledger = [];
let activeRunId = null;
let activeStepName = null;

export function setActiveLlmRunContext({ runId = null, stepName = null } = {}) {
  activeRunId = runId;
  activeStepName = stepName;
}

export function clearActiveLlmRunContext() {
  activeRunId = null;
  activeStepName = null;
}

export function recordUsage({
  requestType,
  schemaName = null,
  model = null,
  usage = {},
  runId = activeRunId,
  stepName = activeStepName
}) {
  const prompt_tokens = Number(usage?.prompt_tokens ?? 0);
  const completion_tokens = Number(usage?.completion_tokens ?? 0);
  const total_tokens = Number(usage?.total_tokens ?? (prompt_tokens + completion_tokens));

  ledger.push({
    index: ledger.length + 1,
    runId,
    stepName,
    requestType,
    schemaName,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    created_at: new Date().toISOString()
  });
}

export function getCostSummary(runId = null) {
  const requests = runId
    ? ledger.filter((entry) => entry.runId === runId)
    : [...ledger];

  const totals = requests.reduce(
    (acc, entry) => {
      acc.prompt_tokens += Number(entry.prompt_tokens || 0);
      acc.completion_tokens += Number(entry.completion_tokens || 0);
      acc.total_tokens += Number(entry.total_tokens || 0);
      return acc;
    },
    { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  );

  return {
    runId,
    requestCount: requests.length,
    requests,
    totals
  };
}
