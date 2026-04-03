import { suspectRosterKey } from './coreTruthChecks.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function extractDisplayName(value) {
  const title = String(value || '').trim();
  const commaStripped = title.split(',')[0].trim();
  return commaStripped || title;
}

function inferAccessLevel(characterName, whyOthersCouldNot, isKiller) {
  if (isKiller) {
    return 'possible';
  }

  const normalizedName = normalizeText(characterName);
  const matchingReason = (Array.isArray(whyOthersCouldNot) ? whyOthersCouldNot : []).find((entry) =>
    normalizeText(entry).includes(normalizedName)
  );

  if (!matchingReason) {
    return 'unknown';
  }

  const text = normalizeText(matchingReason);
  if (text.includes('no physical access') || text.includes('had no access')) {
    return 'impossible';
  }
  if (text.includes('monitoring') || text.includes('distracted')) {
    return 'limited';
  }
  return 'unknown';
}

function inferBaselineConstraints(characterId, characterName, whyOthersCouldNot, accessLevel) {
  const normalizedName = normalizeText(characterName);
  const matchingReason = (Array.isArray(whyOthersCouldNot) ? whyOthersCouldNot : []).find((entry) =>
    normalizeText(entry).includes(normalizedName)
  );

  const constraints = [];
  if (accessLevel === 'impossible') {
    constraints.push({
      type: 'access_blocked',
      suspect_id: characterId,
      status: 'locked',
      reason: String(matchingReason || `${characterName} lacked access`).trim()
    });
  }

  return constraints;
}

function deriveVictimName(context, murder) {
  const explicitVictim = String(murder?.victim || '').trim();
  if (explicitVictim) {
    return explicitVictim;
  }

  const summary = String(murder?.murder_solution || murder?.summary || '').trim();
  const killerText = String(murder?.killer || '').trim();
  const killerDisplayName = extractDisplayName(killerText);
  const killerAliases = new Set(
    [killerText, killerDisplayName, killerText.split(',')[0]?.trim()]
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const candidatePeople = (Array.isArray(context?.storyEntities?.people) ? context.storyEntities.people : [])
    .concat(Array.isArray(context?.worldEntities?.people) ? context.worldEntities.people : [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean);

  for (const name of candidatePeople) {
    const normalizedCandidate = normalizeText(name);
    const isKillerAlias = [...killerAliases].some((alias) =>
      alias === normalizedCandidate ||
      alias.startsWith(normalizedCandidate) ||
      normalizedCandidate.startsWith(alias)
    );

    if (
      normalizeText(summary).includes(normalizedCandidate) &&
      !isKillerAlias
    ) {
      return name;
    }
  }

  const match = summary.match(/confronted\s+([^.,]+?)\s+(?:in|where|with)/i);
  return match ? match[1].trim() : '';
}

export function buildCaseState(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const characterCards = cards.filter((card) => card?.card_type === 'character');
  const murder = context?.coreTruth?.murder || {};
  const treasure = context?.coreTruth?.treasure || {};
  const killerText = String(murder.killer || '').trim();
  const whyOthersCouldNot = Array.isArray(murder.why_others_could_not) ? murder.why_others_could_not : [];

  assert(characterCards.length > 0, 'case_state_builder_agent: no character cards available');
  assert(killerText, 'case_state_builder_agent: coreTruth.murder.killer missing');

  const killerKey = suspectRosterKey(killerText);

  const suspects = characterCards.map((card) => {
    const displayName = extractDisplayName(card.card_title);
    const fullLabel = String(card.card_title || '').trim();
    const isKiller =
      normalizeText(displayName) === normalizeText(extractDisplayName(killerText))
      || normalizeText(fullLabel) === normalizeText(killerText)
      || Boolean(
        killerKey
        && suspectRosterKey(fullLabel) === killerKey
      );
    const suspectId = toSlug(displayName);
    const access = inferAccessLevel(displayName, whyOthersCouldNot, isKiller);

    return {
      suspect_id: suspectId,
      name: displayName,
      title: fullLabel,
      card_id: card.card_id,
      playable: true,
      is_killer: isKiller,
      baseline: {
        access,
        motive: isKiller ? 'possible' : 'unknown',
        means: isKiller ? 'possible' : 'unknown',
        alibi: 'unknown'
      },
      baseline_constraints: inferBaselineConstraints(suspectId, displayName, whyOthersCouldNot, access)
    };
  });

  const killer = suspects.find((suspect) => suspect.is_killer);
  assert(killer, `case_state_builder_agent: killer "${killerText}" not found in playable suspect roster`);

  const openingConstraints = suspects.flatMap((suspect) => suspect.baseline_constraints);

  return {
    suspects,
    killer_id: killer.suspect_id,
    killer_name: killer.name,
    victim_name: deriveVictimName(context, murder),
    murder: {
      location: String(murder.location || '').trim(),
      method: String(murder.method || '').trim(),
      motive: String(murder.motive || '').trim(),
      summary: String(murder.murder_solution || murder.summary || '').trim(),
      opportunity: String(murder.opportunity || '').trim(),
      window_start: null,
      window_end: null
    },
    treasure: {
      object: String(treasure.object || '').trim(),
      hiding_place: String(treasure.hiding_place || '').trim(),
      concealment: String(treasure.concealment || '').trim(),
      discovery_path: String(treasure.discovery_path || '').trim()
    },
    state_progression: {
      viable_suspects: suspects.map((suspect) => suspect.suspect_id),
      eliminated_suspects: [],
      constraints: openingConstraints
    }
  };
}
