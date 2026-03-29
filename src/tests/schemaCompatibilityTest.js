import { puzzleBundleSchema } from '../schemas/puzzleBundleSchema.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const DISALLOWED_KEYS = new Set([
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'dependencies',
  'dependentRequired',
  'dependentSchemas'
]);

function walk(value, path = []) {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, next] of Object.entries(value)) {
    assert(!DISALLOWED_KEYS.has(key), `Disallowed schema keyword "${key}" at ${path.concat(key).join('.')}`);
    walk(next, path.concat(key));
  }
}

function run() {
  walk(puzzleBundleSchema, ['puzzleBundleSchema']);
  console.log('SCHEMA COMPATIBILITY TEST PASSED');
}

run();
