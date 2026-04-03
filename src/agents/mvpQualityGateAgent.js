import { buildCardSurface } from '../utils/cardSurface.js';
import { buildHostUiHints } from '../utils/hostUiHints.js';
import { buildMvpQualityGate } from '../utils/mvpQualityGate.js';

export async function mvpQualityGateAgent(context) {
  context.mvp_quality_gate = buildMvpQualityGate(context);
  context.card_surface = buildCardSurface(context);
  context.host_ui_hints = buildHostUiHints(context);
  return context;
}
