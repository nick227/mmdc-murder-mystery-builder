import { buildCaseState } from '../utils/caseState.js';

export async function caseStateBuilderAgent(context) {
  context.case_state = buildCaseState(context);
  return context;
}
