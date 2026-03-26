import { validateBundleIntegrity } from '../utils/puzzleBundles.js';

export async function bundleIntegrityValidatorAgent(context) {
  validateBundleIntegrity(context, { allowIdRemap: true });
  return context;
}
