import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { storyMetadataAgent } from '../agents/storyMetadataAgent.js';
import { retitleExistingRunDir } from '../storage/runDir.js';

process.env.SMOKE_MODE = 'true';

{
  const ctx = await storyMetadataAgent({
    userPrompt: 'A manor dinner',
    playerCount: 4,
    storyStyle: 'Cozy',
    cards: [],
    debug: { warning_log: [], rejection_log: [], bundle_stats: [] }
  });
  assert.ok(ctx.story_title);
  assert.equal(ctx.cards.filter((c) => c.card_type === 'story_meta').length, 4);
}

{
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'run-dir-test-'));
  const id = `pending-${Date.now()}-abc12x`;
  const subDir = path.join(base, id);
  fs.mkdirSync(subDir, { recursive: true });
  const { id: newId, dir } = retitleExistingRunDir(subDir, 'My Myst-ery / Tale');
  assert.match(newId, /^My Myst-ery - Tale-/);
  assert.ok(fs.existsSync(dir));
  assert.ok(!fs.existsSync(subDir));
  fs.rmSync(base, { recursive: true, force: true });
}

console.log('storyMetadataAgentTest OK');
