import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  dotenv.config({ path: envPath, override: false });
}
