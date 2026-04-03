import { safeJson } from '../../utils/json.js';

export function extractJsonBlock(text, startLabel, endLabel) {
  const source = String(text || '');
  const start = source.indexOf(startLabel);
  if (start === -1) {
    return null;
  }

  const afterStart = source.slice(start + startLabel.length);
  const end = endLabel ? afterStart.indexOf(endLabel) : -1;
  const block = (end === -1 ? afterStart : afterStart.slice(0, end)).trim();

  try {
    return safeJson(block);
  } catch {
    return null;
  }
}
