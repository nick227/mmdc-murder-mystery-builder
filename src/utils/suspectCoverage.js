import { getCardsByType, getCharacterCards } from './cards.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

const SAFE_ROLE_TOKENS = [
  'detective',
  'inspector',
  'constable',
  'officer',
  'investigator'
];

function countNarrativeMentions(name, narratives) {
  const normalizedName = normalizeText(name);
  const blob = normalizeText(JSON.stringify(narratives || {}));
  if (!normalizedName || !blob) {
    return 0;
  }
  return blob.includes(normalizedName) ? 1 : 0;
}

function getNarrativeTextsForName(name, narratives) {
  const normalizedName = normalizeText(name);
  if (!normalizedName || !narratives || typeof narratives !== 'object') {
    return [];
  }

  const collected = [];
  for (const value of Object.values(narratives)) {
    const text = JSON.stringify(value);
    if (normalizeText(text).includes(normalizedName)) {
      collected.push(text);
    }
  }
  return collected;
}

const SIGNAL_PATTERNS = {
  motive: /\b(debt|jealous|blackmail|threat|inheritance|fortune|power|legacy|revenge|fear|expose|silence|desperate|resentment|reputation|career|fame|role|endorsement|criticized|rivalry)\b/i,
  access: /\b(access|key|backstage|cellar|study|vault|alcove|garden|room|entry|prop|storage|route|passage)\b/i,
  movement: /\b(moving|arrived|left|walked|crossed|approached|departed|whereabouts|route|entering|entered|slipping|slipped)\b/i,
  location: /\b(near|at|inside|outside|beside|within|through|around|alcove|maze|amphitheater|stage|garden)\b/i,
  object: /\b(rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|print|ledger|letter|glove|key)\b/i,
  opportunity: /\b(seen|spotted|present|near|alone|during|before|after|between|moving|arrived|left|whereabouts)\b/i,
  weapon: /\b(rope|dagger|poison|weapon|scarf|quill|blood|fingerprint|print|checked out|carrying|holding)\b/i,
  contradiction: /\b(contradict|claims|despite|though|however|alibi|elsewhere|denied|inconsistent)\b/i
};

function collectSignalTypes(texts = []) {
  const types = new Set();
  for (const text of texts) {
    const value = String(text || '');
    for (const [type, pattern] of Object.entries(SIGNAL_PATTERNS)) {
      if (pattern.test(value)) {
        types.add(type);
      }
    }
  }
  return [...types];
}

export function buildSuspectCoverageReport(context) {
  const characters = getCharacterCards(context.cards);
  const secrets = getCardsByType(context.cards, 'secret');
  const underused = [];
  const safeRoles = [];
  const suspectSignals = [];
  const viableCounts = {
    motive: 0,
    access: 0,
    opportunity: 0,
    weapon: 0
  };

  for (const character of characters) {
    const characterId = String(character?.card_id || '').trim();
    const name = baseName(character?.card_title);
    const title = String(character?.card_title || '').trim();
    const linkedSecrets = secrets.filter((card) => String(card?.linked_character_id || '').trim() === characterId);
    const secretCount = linkedSecrets.length;
    const narrativeCount = countNarrativeMentions(name, context?.narratives);
    const normalizedTitle = normalizeText(title);
    const supportingTexts = [
      character?.card_contents,
      ...linkedSecrets.map((card) => card?.card_contents),
      ...getNarrativeTextsForName(name, context?.narratives)
    ];
    const signalTypes = collectSignalTypes(supportingTexts);
    const logisticalHooks = signalTypes.filter((type) => ['access', 'movement', 'location', 'object', 'weapon'].includes(type));
    const competitiveHooks = signalTypes.filter((type) => ['contradiction', 'motive', 'opportunity'].includes(type));

    if (SAFE_ROLE_TOKENS.some((token) => normalizedTitle.includes(token))) {
      safeRoles.push(name || title);
    }

    if (signalTypes.includes('motive')) {
      viableCounts.motive += 1;
    }
    if (signalTypes.includes('access')) {
      viableCounts.access += 1;
    }
    if (signalTypes.includes('opportunity')) {
      viableCounts.opportunity += 1;
    }
    if (signalTypes.includes('weapon')) {
      viableCounts.weapon += 1;
    }

    if ((secretCount + narrativeCount) === 0 || signalTypes.length < 2 || logisticalHooks.length === 0 || competitiveHooks.length === 0) {
      underused.push(name || title);
    }

    suspectSignals.push({
      name: name || title,
      signal_count: signalTypes.length,
      secret_count: secretCount,
      narrative_count: narrativeCount,
      signal_types: signalTypes,
      logistical_hooks: logisticalHooks,
      competitive_hooks: competitiveHooks
    });
  }

  const issues = [];
  const missingMaterialHooks = suspectSignals
    .filter((entry) => entry.logistical_hooks.length === 0 || entry.competitive_hooks.length === 0)
    .map((entry) => ({
      name: entry.name,
      missing_logistical_hook: entry.logistical_hooks.length === 0,
      missing_competitive_hook: entry.competitive_hooks.length === 0
    }));
  if (safeRoles.length) {
    issues.push({
      severity: 'major',
      code: 'safe_suspect_roles',
      message: `Playable suspects contain structurally weak safe-role archetypes: ${safeRoles.join(', ')}`,
      suspects: safeRoles
    });
  }
  if (underused.length) {
    issues.push({
      severity: 'major',
      code: 'underused_suspects',
      message: `Playable suspects are not yet carrying enough suspicion load: ${underused.join(', ')}`,
      suspects: underused
    });
  }
  if (missingMaterialHooks.length) {
    issues.push({
      severity: 'major',
      code: 'missing_material_suspect_hooks',
      message: `Playable suspects are missing required logistical or competitive hooks: ${missingMaterialHooks.map((entry) => entry.name).join(', ')}`,
      suspects: missingMaterialHooks
    });
  }
  if (viableCounts.access < Math.min(3, characters.length)) {
    issues.push({
      severity: 'major',
      code: 'insufficient_access_competition',
      message: `Too few suspects carry viable access paths before clue targets: ${viableCounts.access}/${characters.length}.`,
      counts: viableCounts
    });
  }
  if (viableCounts.motive < Math.min(3, characters.length)) {
    issues.push({
      severity: 'major',
      code: 'insufficient_motive_competition',
      message: `Too few suspects carry viable motive paths before clue targets: ${viableCounts.motive}/${characters.length}.`,
      counts: viableCounts
    });
  }
  if (viableCounts.weapon < Math.min(2, characters.length)) {
    issues.push({
      severity: 'major',
      code: 'insufficient_weapon_competition',
      message: `Too few suspects remain plausible on weapon or means before clue targets: ${viableCounts.weapon}/${characters.length}.`,
      counts: viableCounts
    });
  }

  const requiredEarlySuspects = suspectSignals
    .slice()
    .sort((a, b) => {
      if (a.signal_count !== b.signal_count) {
        return a.signal_count - b.signal_count;
      }
      if (a.secret_count !== b.secret_count) {
        return a.secret_count - b.secret_count;
      }
      return a.name.localeCompare(b.name);
    })
    .map((entry) => entry.name)
    .filter(Boolean)
    .slice(0, 3);

  return {
    pass: issues.length === 0,
    status: issues.length ? 'needs_repair' : 'ready',
    issue_count: issues.length,
    issues,
    underused_suspects: underused,
    required_early_suspects: requiredEarlySuspects,
    viable_counts: viableCounts,
    suspect_signals: suspectSignals
  };
}
