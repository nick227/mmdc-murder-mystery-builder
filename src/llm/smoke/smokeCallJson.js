import { fakeFromSchema } from '../schemaFaker.js';
import { fakeSmokeResponse } from './namedResponses.js';

let smokeCallSeq = 0;

/** Next deterministic JSON object for SMOKE_MODE callJson (named schema → fixture, else schema shape). */
export function nextSmokeCallJson(opts) {
  smokeCallSeq += 1;
  const named = fakeSmokeResponse(opts);
  if (named) {
    return named;
  }
  return fakeFromSchema(opts?.schema, `root${smokeCallSeq}`, 0);
}
