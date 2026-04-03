import {
  assertBundleVisibleMurderCanon,
  assertMurderClueSuspectNames,
  assertPuzzleDraftsMurderCanon
} from '../utils/canonValidate.js';

function smokeSkip() {
  return process.env.SMOKE_MODE === 'true';
}

export async function clueRosterValidatorAgent(context) {
  if (smokeSkip()) {
    return context;
  }
  assertMurderClueSuspectNames(context);
  return context;
}

export async function puzzleDraftCanonValidatorAgent(context) {
  if (smokeSkip()) {
    return context;
  }
  assertPuzzleDraftsMurderCanon(context);
  return context;
}

export async function bundleVisibleCanonValidatorAgent(context) {
  if (smokeSkip()) {
    return context;
  }
  assertBundleVisibleMurderCanon(context);
  return context;
}
