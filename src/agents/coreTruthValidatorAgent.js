import { collectCoreTruthDeterministicIssues } from '../utils/coreTruthChecks.js';

export async function coreTruthValidatorAgent(context) {
  const deterministicIssues = collectCoreTruthDeterministicIssues(context.coreTruth, context);
  if (deterministicIssues.length === 0) {
    return context;
  }
  throw new Error(
    'Core truth validation failed\n' +
    JSON.stringify(deterministicIssues || [], null, 2)
  );
}
