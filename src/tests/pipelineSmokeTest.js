import { steps } from '../pipeline/steps/index.js';

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

function validateContext(context, stepName) {
  assert(context, `${stepName}: context missing`);

  if (stepName === 'story_blurb_agent') {
    assert(context.story_blurb, 'story_blurb missing');
  }

  if (stepName === 'world_building_agent') {
    assert(context.world, 'world missing');
  }

  if (stepName === 'murder_truth_agent') {
    assert(context.murder_truth, 'murder_truth missing');
  }

  if (stepName === 'fortune_truth_agent') {
    assert(context.fortune_truth, 'fortune_truth missing');
  }

  if (stepName === 'solution_assembler_agent') {
    assert(context.solutions, 'solutions missing');
    assert(context.solutions.killer, 'solution.killer missing');
  }

  if (stepName.includes('agent') && context.cards) {
    assert(Array.isArray(context.cards), 'cards not array');
  }
}

async function runSmoke() {
  let context = {
    playerCount: 4,
    userPrompt: 'Smoke test murder',
    cards: []
  };

  console.log('\nRunning pipeline smoke test\n');

  for (const step of steps) {
    const name = step.name;

    try {
      console.log('→', name);

      context = await step.run(context);

      validateContext(context, name);

      console.log('✓', name);

    } catch (err) {
      console.error('\nFAILED:', name);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log('\nSMOKE TEST PASSED\n');
}

runSmoke();
