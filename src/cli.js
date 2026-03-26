import { Queue } from './queue/Queue.js';
import { runWorker } from './queue/Worker.js';
import { resetStore } from './storage/store.js';
import { createRunDir } from './storage/runDir.js';
import { loadEnv } from './utils/env.js';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

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
  console.log('  node src/cli.js status');
  console.log('  node src/cli.js resume');
  console.log('  node src/cli.js reset');
}

async function main() {
  if (cmd === 'start') {
    const { userPrompt, playerCount, storyStyle } = await getStartInputs(args);

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.');
      process.exit(1);
    }

    const run = createRunDir();
    queue.createJob({
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
    console.log('Output :', run.dir);
    console.log('────────────────────────────────────────');

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

    console.log('────────────────────────────────────────');
    console.log(`Done. Inspect: ${run.dir}`);
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

  printHelp();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
