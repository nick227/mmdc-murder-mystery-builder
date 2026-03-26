import { steps } from '../pipeline/steps/index.js';
import { normalizeContext } from '../utils/context.js';

function makeInitialContext(index) {
  return normalizeContext({
    playerCount: 4,
    userPrompt: `Batch eval murder ${index + 1}`,
    storyStyle: 'Batch eval noir',
    cards: []
  });
}

async function runPipeline(index) {
  let context = makeInitialContext(index);

  for (const step of steps) {
    try {
      context = normalizeContext(await step.run(context));
    } catch (error) {
      return {
        ok: false,
        step: step.name,
        error,
        context: normalizeContext(context)
      };
    }
  }

  return {
    ok: true,
    context
  };
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumCounts(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + value;
  }
}

function printCounts(label, counts) {
  console.log(`\n${label}:`);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    console.log('  none');
    return;
  }
  for (const [key, value] of entries) {
    console.log(`  ${key}: ${value}`);
  }
}

async function main() {
  const runCount = Number(process.argv[2] || process.env.BATCH_RUNS || 20);
  const results = [];

  for (let i = 0; i < runCount; i += 1) {
    results.push(await runPipeline(i));
  }

  const bundleCounts = [];
  const avgCardsPerBundle = [];
  const rejectionCounts = [];
  const warningCounts = [];
  const allRejections = {};
  const allStages = {};
  const allWarnings = {};
  const allWarningStages = {};
  const edgePerBundle = [];
  const longestChains = [];
  const gainCounts = {};
  const strengthCounts = {};
  const stateChangeFlags = [];
  const hiddenUnlockCounts = [];
  let isolatedBeforeRejection = 0;
  let redundantUnlockWarnings = 0;

  for (const result of results) {
    const debug = result.context?.debug || {};
    const bundleStats = debug.bundle_stats || [];
    const rejectionLog = debug.rejection_log || [];
    const warningLog = debug.warning_log || [];
    const connectivity = debug.connectivity || [];

    bundleCounts.push(bundleStats.length);
    avgCardsPerBundle.push(average(bundleStats.map((item) => item.card_count || 0)));
    rejectionCounts.push(rejectionLog.length);
    warningCounts.push(warningLog.length);
    longestChains.push(debug.longest_chain_length || 0);
    stateChangeFlags.push(...(debug.state_change_flags || []));
    hiddenUnlockCounts.push(
      bundleStats.reduce((sum, item) => sum + Number(item.unlock_count || 0), 0)
    );

    for (const node of connectivity) {
      edgePerBundle.push((node.in_degree || 0) + (node.out_degree || 0));
      if ((node.in_degree || 0) === 0 && (node.out_degree || 0) === 0) {
        isolatedBeforeRejection += 1;
      }
    }

    for (const rejection of rejectionLog) {
      allRejections[rejection.reason] = (allRejections[rejection.reason] || 0) + 1;
      allStages[rejection.stage] = (allStages[rejection.stage] || 0) + 1;
    }
    for (const warning of warningLog) {
      allWarnings[warning.reason] = (allWarnings[warning.reason] || 0) + 1;
      allWarningStages[warning.stage] = (allWarningStages[warning.stage] || 0) + 1;
      if (warning.reason === 'redundant_unlock' || warning.reason === 'redundant_unlock_generation') {
        redundantUnlockWarnings += 1;
      }
    }

    sumCounts(gainCounts, debug.gain_counts || {});
    sumCounts(strengthCounts, debug.strength_counts || {});
  }

  const topRejections = Object.entries(allRejections)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topWarnings = Object.entries(allWarnings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log(`Batch runs: ${runCount}`);
  console.log(`Successful runs: ${results.filter((result) => result.ok).length}`);
  console.log(`Failed runs: ${results.filter((result) => !result.ok).length}`);
  console.log(`Average bundles per run: ${average(bundleCounts).toFixed(2)}`);
  console.log(`Average cards per bundle: ${average(avgCardsPerBundle).toFixed(2)}`);
  console.log(`Average rejection count per run: ${average(rejectionCounts).toFixed(2)}`);
  console.log(`Average warning count per run: ${average(warningCounts).toFixed(2)}`);
  console.log(`Average edges per bundle: ${average(edgePerBundle).toFixed(2)}`);
  console.log(`Average longest chain: ${average(longestChains).toFixed(2)}`);
  console.log(`Max longest chain: ${Math.max(0, ...longestChains)}`);
  console.log(`Isolated bundles observed: ${isolatedBeforeRejection}`);
  console.log(`Average hidden unlock cards per run: ${average(hiddenUnlockCounts).toFixed(2)}`);
  console.log(`Connectivity ratio: ${average(bundleCounts) ? (average(hiddenUnlockCounts) / average(bundleCounts)).toFixed(2) : '0.00'}`);
  console.log(`Redundant unlock warnings: ${redundantUnlockWarnings}`);
  console.log(`State-change rate: ${stateChangeFlags.length ? ((stateChangeFlags.filter(Boolean).length / stateChangeFlags.length) * 100).toFixed(1) : '0.0'}%`);

  console.log('\nTop rejection reasons:');
  if (!topRejections.length) {
    console.log('  none');
  } else {
    for (const [reason, count] of topRejections) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  printCounts('Rejection stages', allStages);
  console.log('\nTop warning reasons:');
  if (!topWarnings.length) {
    console.log('  none');
  } else {
    for (const [reason, count] of topWarnings) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  printCounts('Warning stages', allWarningStages);
  printCounts('Gain distribution', gainCounts);
  printCounts('Strength distribution', strengthCounts);

  const failedRuns = results.filter((result) => !result.ok);
  if (failedRuns.length) {
    console.log('\nFailed run summary:');
    for (const failed of failedRuns.slice(0, 10)) {
      console.log(`  step=${failed.step} error=${failed.error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
