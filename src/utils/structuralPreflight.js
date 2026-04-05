import { getCardsByType, getCharacterCards } from './cards.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseName(title) {
  const raw = String(title || '').trim();
  return raw.split(',')[0].trim();
}

function addIssue(issues, severity, code, message, details = {}) {
  issues.push({
    severity,
    code,
    message,
    ...details
  });
}

function collectDuplicateCharacterIssues(context, issues) {
  const people = getCardsByType(context.cards, 'person').map((card) => baseName(card.card_title));
  const characters = getCharacterCards(context.cards).map((card) => baseName(card.card_title));
  const characterSet = new Set(characters.map((name) => normalizeText(name)).filter(Boolean));
  const duplicates = people.filter((name) => characterSet.has(normalizeText(name)));

  if (duplicates.length) {
    addIssue(
      issues,
      'major',
      'duplicate_character_systems',
      `Canonical suspects are duplicated across person and character cards: ${[...new Set(duplicates)].slice(0, 6).join(', ')}`,
      { duplicates: [...new Set(duplicates)] }
    );
  }
}

function collectVictimIssue(context, issues) {
  const victimName = String(context?.case_state?.victim_name || '').trim();
  if (!victimName) {
    addIssue(
      issues,
      'critical',
      'missing_victim_identity',
      'Case state has no victim_name; downstream clues refer to an unnamed victim.'
    );
  }
}

export function buildStructuralPreflight(context) {
  const issues = [];

  collectDuplicateCharacterIssues(context, issues);
  collectVictimIssue(context, issues);

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  const majorCount = issues.filter((issue) => issue.severity === 'major').length;

  return {
    pass: criticalCount === 0 && majorCount === 0,
    status: criticalCount > 0 ? 'blocked' : (majorCount > 0 ? 'needs_repair' : 'ready'),
    issue_count: issues.length,
    issues
  };
}

