import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve('data');
const jobsFile = path.join(dataDir, 'jobs.json');

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(jobsFile)) {
    fs.writeFileSync(jobsFile, '[]', 'utf8');
  }
}

export function loadJobs() {
  ensureStore();
  return JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
}

export function saveJobs(jobs) {
  ensureStore();
  fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2), 'utf8');
}

export function resetStore() {
  ensureStore();
  fs.writeFileSync(jobsFile, '[]', 'utf8');
}
