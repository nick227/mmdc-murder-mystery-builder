import fs from 'node:fs';
import path from 'node:path';
import { buildPlayabilityReport } from './playabilityReport.js';

function resolveResultPaths(targetPath) {
  const resolved = path.resolve(targetPath || process.env.OUTPUT_DIR || './runs');
  const stats = fs.statSync(resolved);

  if (stats.isFile()) {
    return [resolved];
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const resultPaths = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const resultPath = path.join(resolved, entry.name, 'result.json');
    if (fs.existsSync(resultPath)) {
      resultPaths.push(resultPath);
    }
  }

  return resultPaths.sort();
}

function isCurrentPipelineRun(context) {
  return Boolean(context?.playability_report);
}

function buildLearningSummary(summary) {
  const actions = [];
  const recurring = summary.recurring_issues;

  if (recurring.some((issue) => issue.code === 'missing_solvability_validation')) {
    actions.push({
      priority: 1,
      code: 'missing_solvability_validation',
      action: 'Treat as legacy noise unless it appears in current-pipeline-only mode.'
    });
  }

  if (recurring.some((issue) => issue.code === 'unknown_roster_entities')) {
    actions.push({
      priority: 2,
      code: 'unknown_roster_entities',
      action: 'Tighten roster/world generation prompts and keep improving roster normalization.'
    });
  }

  if (recurring.some((issue) => issue.code.startsWith('timeline_'))) {
    actions.push({
      priority: 3,
      code: 'timeline_family',
      action: 'Promote timeline repair earlier in the pipeline, ideally before clue and puzzle finalization.'
    });
  }

  if (!actions.length) {
    actions.push({
      priority: 1,
      code: 'none',
      action: 'No recurring issues detected. Raise the minimum playability gate or add a new quality dimension.'
    });
  }

  return actions;
}

export function reviewBatch(targetPath, options = {}) {
  const { currentOnly = false } = options;
  const resultPaths = resolveResultPaths(targetPath);
  const reviews = [];

  for (const resultPath of resultPaths) {
    const raw = fs.readFileSync(resultPath, 'utf8');
    const context = JSON.parse(raw);
    if (currentOnly && !isCurrentPipelineRun(context)) {
      continue;
    }
    const report = buildPlayabilityReport(context, { partial: false, stepName: 'review-batch' });
    reviews.push({
      result_path: resultPath,
      run_id: context?.runId || path.basename(path.dirname(resultPath)),
      current_pipeline: isCurrentPipelineRun(context),
      score_10: report.score_10,
      grade: report.grade,
      status: report.status,
      issue_count: report.issue_count,
      top_issues: report.issues.slice(0, 5).map((issue) => issue.code),
      report
    });
  }

  const total = reviews.length || 1;
  const averageScore = Number((reviews.reduce((sum, item) => sum + item.score_10, 0) / total).toFixed(2));
  const statusCounts = Object.create(null);
  const issueCounts = Object.create(null);

  for (const review of reviews) {
    statusCounts[review.status] = (statusCounts[review.status] || 0) + 1;
    for (const issue of review.report.issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] || 0) + 1;
    }
  }

  const recurringIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  const worstRuns = [...reviews]
    .sort((a, b) => a.score_10 - b.score_10 || b.issue_count - a.issue_count)
    .slice(0, 10)
    .map((review) => ({
      run_id: review.run_id,
      result_path: review.result_path,
      score_10: review.score_10,
      status: review.status,
      top_issues: review.top_issues
    }));

  const summary = {
    reviewed_count: reviews.length,
    average_score_10: reviews.length ? averageScore : 0,
    current_only: currentOnly,
    status_counts: statusCounts,
    recurring_issues: recurringIssues,
    worst_runs: worstRuns,
    reviews
  };

  summary.learning_summary = buildLearningSummary(summary);
  return summary;
}

export function formatBatchReview(summary) {
  const lines = [];
  lines.push(`Reviewed ${summary.reviewed_count} run(s)`);
  lines.push(`Average score: ${summary.average_score_10}/10`);

  const statusParts = Object.entries(summary.status_counts).map(([status, count]) => `${status}=${count}`);
  if (statusParts.length) {
    lines.push(`Statuses: ${statusParts.join(', ')}`);
  }

  if (summary.recurring_issues.length) {
    lines.push('Top recurring issues:');
    for (const issue of summary.recurring_issues) {
      lines.push(`- ${issue.code}: ${issue.count}`);
    }
  }

  if (summary.learning_summary.length) {
    lines.push('Next actions:');
    for (const item of summary.learning_summary) {
      lines.push(`- [P${item.priority}] ${item.action}`);
    }
  }

  if (summary.worst_runs.length) {
    lines.push('Worst runs:');
    for (const review of summary.worst_runs) {
      lines.push(`- ${review.run_id}: ${review.score_10}/10 [${review.status}] ${review.top_issues.join(', ')}`);
    }
  }

  return lines.join('\n');
}
