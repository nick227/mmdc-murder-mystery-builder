import { buildCardSurface } from '../utils/cardSurface.js';
import { buildMvpQualityGate } from '../utils/mvpQualityGate.js';

export async function mvpQualityGateAgent(context) {
  context.mvp_quality_gate = buildMvpQualityGate(context);
  context.card_surface = buildCardSurface(context);
  return context;
}
