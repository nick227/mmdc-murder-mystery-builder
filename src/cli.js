import { Queue } from "./queue/Queue.js";
import { runWorker } from "./queue/Worker.js";
import { resetStore } from "./storage/store.js";
import { createRunDir } from "./storage/runDir.js";
import { loadEnv } from "./utils/env.js";

loadEnv();

const queue = new Queue();
const cmd = process.argv[2];

function printHelp() {
  console.log("Commands:");
  console.log('  node src/cli.js start "<prompt>" <players>');
  console.log("  node src/cli.js status");
  console.log("  node src/cli.js resume");
  console.log("  node src/cli.js reset");
}

async function main() {
  if (cmd === "start") {
    const userPrompt = process.argv[3];
    const playerCount = Number(process.argv[4] || 4);

    if (!userPrompt) {
      console.error("Missing prompt.");
      printHelp();
      process.exit(1);
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.");
      process.exit(1);
    }

    const run = createRunDir();
    const job = queue.createJob({
      runId: run.id,
      runDir: run.dir,
      playerCount,
      userPrompt,
      cards: []
    });

    console.log("────────────────────────────────────────");
    console.log("Starting Murder Mystery Build");
    console.log("Run ID :", run.id);
    console.log("Players:", playerCount);
    console.log("Prompt :", userPrompt);
    console.log("Output :", run.dir);
    console.log("────────────────────────────────────────");

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

    console.log("────────────────────────────────────────");
    console.log(`Done. Inspect: ${run.dir}`);
    console.log("────────────────────────────────────────");
    return;
  }

  if (cmd === "status") {
    console.log(JSON.stringify(queue.list(), null, 2));
    return;
  }

  if (cmd === "resume") {
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

  if (cmd === "reset") {
    resetStore();
    console.log("Job store reset.");
    return;
  }

  printHelp();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
