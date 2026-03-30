import fs from 'node:fs';
import path from 'node:path';

export function createRunDir(title = 'unknown') {
  const base = process.env.OUTPUT_DIR || './runs';
  title = makeWindowsSafe(title);
  const id = `${title}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.resolve(base, id);
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir };
}

/**
 * Replaces the leading title segment of an existing run folder to match story_title,
 * preserving the timestamp/random suffix from createRunDir.
 */
export function retitleExistingRunDir(oldDir, storyTitle) {
  const resolvedOld = path.resolve(oldDir);
  if (!fs.existsSync(resolvedOld)) {
    return { id: path.basename(resolvedOld), dir: resolvedOld };
  }

  const base = path.dirname(resolvedOld);
  const leaf = path.basename(resolvedOld);
  const safe = makeWindowsSafe(String(storyTitle || 'mystery').trim() || 'mystery').slice(0, 96);
  const suffixMatch = leaf.match(/-(\d{13,}-[a-z0-9]+)$/i);
  const suffix = suffixMatch
    ? suffixMatch[1]
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newLeaf = `${safe}-${suffix}`;
  const newDir = path.resolve(base, newLeaf);

  if (newDir === resolvedOld) {
    return { id: leaf, dir: resolvedOld };
  }

  if (fs.existsSync(newDir)) {
    throw new Error(`retitleExistingRunDir: target already exists: ${newDir}`);
  }

  fs.renameSync(resolvedOld, newDir);
  return { id: newLeaf, dir: newDir };
}

function makeWindowsSafe(title) {
  return title.replace(/[<>:"/\\|?*]/g, '-');
}
