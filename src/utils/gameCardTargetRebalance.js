function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSuspectAliases(suspect) {
  const name = String(suspect?.name || '').trim();
  const title = String(suspect?.title || '').trim();
  const base = (title.split(',')[0] || name).trim() || name;
  const tokens = base.split(/\s+/).filter(Boolean);
  const aliases = new Set([base, name].filter(Boolean));

  if (tokens.length >= 2) {
    aliases.add(tokens.slice(0, 2).join(' '));
    aliases.add(tokens.slice(-2).join(' '));
    aliases.add(`${tokens[0]} ${tokens[tokens.length - 1]}`);
  }

  return [...aliases].map(normalizeText).filter(Boolean);
}

export function buildSuspectRoster(caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  return suspects
    .map((suspect) => ({
      name: String(suspect?.name || '').trim(),
      suspect_id: String(suspect?.suspect_id || '').trim() || null,
      card_id: String(suspect?.card_id || '').trim() || null,
      aliases: getSuspectAliases(suspect)
    }))
    .filter((row) => row.name);
}

function leftmostSuspectName(card, roster) {
  const text = normalizeText(`${card?.card_title || ''} ${card?.card_contents || ''}`);
  if (!text) {
    return null;
  }

  let minIdx = Infinity;
  const tied = [];
  for (const row of roster) {
    let rowMin = Infinity;
    for (const alias of row.aliases) {
      const idx = text.indexOf(alias);
      if (idx !== -1) {
        rowMin = Math.min(rowMin, idx);
      }
    }
    if (rowMin === Infinity) {
      continue;
    }
    if (rowMin < minIdx) {
      minIdx = rowMin;
      tied.length = 0;
      tied.push(row.name);
    } else if (rowMin === minIdx) {
      tied.push(row.name);
    }
  }

  return tied[0] || null;
}

function resolveTargetId(roster, name) {
  if (!name) {
    return null;
  }
  const row = roster.find((r) => r.name === name);
  return row?.suspect_id || row?.card_id || null;
}

function hydrateTargets(cards, roster) {
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.game_card_type === 'flavor') {
      delete card.target_character;
      delete card.target_character_id;
      continue;
    }

    const existing = String(card?.target_character || '').trim();
    if (existing && roster.some((r) => r.name === existing)) {
      card.target_character = existing;
      card.target_character_id = resolveTargetId(roster, existing);
      continue;
    }

    const inferred = leftmostSuspectName(card, roster);
    if (inferred) {
      card.target_character = inferred;
      card.target_character_id = resolveTargetId(roster, inferred);
    } else {
      card.target_character = null;
      card.target_character_id = null;
    }
  }
}

function buildTargetCounts(cards, roster) {
  const names = roster.map((r) => r.name);
  const counts = Object.fromEntries(names.map((n) => [n, 0]));
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.game_card_type === 'flavor') {
      continue;
    }
    const t = String(card?.target_character || '').trim();
    if (t && counts[t] !== undefined) {
      counts[t] += 1;
    }
  }
  return counts;
}

function maxOverTargetedName(counts) {
  let best = null;
  let bestCount = -1;
  for (const [name, n] of Object.entries(counts)) {
    if (n > bestCount) {
      bestCount = n;
      best = name;
    }
  }
  return bestCount > 2 ? best : null;
}

function pickRecipient(counts, roster) {
  const candidates = roster
    .map((r) => ({ name: r.name, count: counts[r.name] || 0 }))
    .filter((c) => c.count < 2)
    .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
  return candidates[0]?.name || null;
}

function pickCardIndexToMove(cards, fromName) {
  for (let i = cards.length - 1; i >= 0; i -= 1) {
    const card = cards[i];
    if (card?.game_card_type === 'flavor') {
      continue;
    }
    if (String(card?.target_character || '').trim() === fromName) {
      return i;
    }
  }
  return -1;
}

/**
 * Deterministic post-LLM repair: cap named targets at 2 per character without
 * changing titles, contents, types, or acts. Only target_character fields change.
 */
export function rebalanceGameCardTargets(cards, caseState) {
  const list = Array.isArray(cards) ? cards : [];
  const roster = buildSuspectRoster(caseState);
  if (!roster.length) {
    return list;
  }

  hydrateTargets(list, roster);

  const maxIter = Math.max(list.length * roster.length, 64);
  for (let iter = 0; iter < maxIter; iter += 1) {
    const counts = buildTargetCounts(list, roster);
    const from = maxOverTargetedName(counts);
    if (!from) {
      break;
    }

    const to = pickRecipient(counts, roster);
    const idx = pickCardIndexToMove(list, from);
    if (idx === -1) {
      break;
    }

    if (to) {
      list[idx].target_character = to;
      list[idx].target_character_id = resolveTargetId(roster, to);
    } else {
      list[idx].target_character = null;
      list[idx].target_character_id = null;
    }
  }

  return list;
}

/** Metrics for validation (explicit target_character only; flavor excluded). */
export function collectGameCardTargetMetrics(cards, roster) {
  const primaryTargetCounts = Object.fromEntries(roster.map((r) => [r.name, 0]));
  let namedPrimaryTargetCardCount = 0;

  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.game_card_type === 'flavor') {
      continue;
    }
    const t = String(card?.target_character || '').trim();
    if (t && primaryTargetCounts[t] !== undefined) {
      primaryTargetCounts[t] += 1;
      namedPrimaryTargetCardCount += 1;
    }
  }

  return { primaryTargetCounts, namedPrimaryTargetCardCount };
}
