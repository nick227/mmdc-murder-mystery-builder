import fs from 'node:fs';
import path from 'node:path';

export function createRunDir() {
  const base = process.env.OUTPUT_DIR || './runs';
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.resolve(base, id);
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir };
}
