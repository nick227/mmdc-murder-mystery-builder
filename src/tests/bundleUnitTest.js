import { testBundle } from './harness/bundleTestHarness.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(fn, pattern) {
  try {
    await fn();
  } catch (error) {
    if (pattern.test(String(error.message || ''))) {
      return;
    }
    throw error;
  }

  throw new Error(`Expected failure matching ${pattern}`);
}

const bundleCaseState = {
  suspects: [{ name: 'Max Vinyl' }]
};

async function run() {
  await testBundle([
    {
      card_type: 'evidence',
      card_contents: 'Max accessed the vault at 11:54 PM.'
    },
    {
      card_type: 'evidence',
      card_contents: 'The access log lists Max at the vault door.'
    },
    {
      card_type: 'puzzle',
      card_contents: 'Who accessed the vault?'
    },
    {
      card_type: 'solution',
      card_contents: 'Max accessed the vault at 11:54 PM.'
    }
  ], bundleCaseState);

  await expectFailure(
    () => testBundle([
      {
        card_type: 'evidence',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      },
      {
        card_type: 'evidence',
        card_contents: 'The access log lists Max at the vault door.'
      },
      {
        card_type: 'puzzle',
        card_contents: 'Who accessed the vault?'
      },
      {
        card_type: 'solution',
        hidden_until_solved: false,
        card_contents: 'Max accessed the vault at 11:54 PM.'
      }
    ]),
    /solution must remain hidden/
  );

  await expectFailure(
    () => testBundle([
      {
        card_type: 'evidence',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      },
      {
        card_type: 'evidence',
        card_contents: 'The access log lists Max at the vault door.'
      },
      {
        card_type: 'puzzle',
        card_contents: 'Who accessed the vault?'
      },
      {
        card_type: 'solution',
        card_contents: ''
      }
    ], bundleCaseState),
    /must have exactly 1 solution card/
  );

  await expectFailure(
    () => testBundle([
      {
        card_type: 'evidence',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      },
      {
        card_type: 'evidence',
        card_contents: 'The access log lists Max at the vault door.'
      },
      {
        card_type: 'puzzle',
        card_contents: 'Who accessed the vault? Max accessed the vault at 11:54 PM.'
      },
      {
        card_type: 'solution',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      }
    ]),
    /leaks its hidden solution/
  );

  await expectFailure(
    () => testBundle([
      {
        card_type: 'evidence',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      },
      {
        card_type: 'puzzle',
        card_contents: 'Who accessed the vault?'
      },
      {
        card_type: 'solution',
        card_contents: 'Max accessed the vault at 11:54 PM.'
      }
    ], bundleCaseState),
    /at least 2 evidence cards/
  );

  assert(true, 'bundle unit tests should complete');
  console.log('BUNDLE UNIT TEST PASSED');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
