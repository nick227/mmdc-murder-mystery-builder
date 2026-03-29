import { buildMvpQualityGate } from '../utils/mvpQualityGate.js';

export async function mvpQualityGateAgent(context) {
  context.mvp_quality_gate = buildMvpQualityGate(context);
  return context;
}
