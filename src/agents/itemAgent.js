import { callJson } from '../llm/client.js';
import { buildItemsPromptForCharacter } from '../prompts/itemsPrompt.js';
import { cardsArraySchema } from '../schemas/cardsSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const ITEMS_PER_CHARACTER = 3;
const MAX_ATTEMPTS = 2;

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function usedTitlesCsvFromContext(context) {
  const existing = getCardsByType(context.cards, 'item');
  const titles = existing
    .map((c) => String(c?.card_title || '').trim())
    .filter(Boolean);
  return titles.join(', ');
}

function assertNoDuplicateTitles(items) {
  const seen = new Set();
  for (const card of items) {
    const key = normalizeTitle(card?.card_title);
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      throw new Error(`item_agent produced duplicate item title: "${card.card_title}"`);
    }
    seen.add(key);
  }
}

function assertItemsPerCharacter(items, characterNames) {
  const counts = new Map(characterNames.map((n) => [n, 0]));
  for (const card of items) {
    const who = String(card?.linked_character || '').trim();
    if (!who || !counts.has(who)) {
      throw new Error(`item_agent produced an item with missing/unknown linked_character: "${who || '(missing)'}"`);
    }
    counts.set(who, (counts.get(who) || 0) + 1);
  }
  for (const [who, count] of counts.entries()) {
    if (count !== ITEMS_PER_CHARACTER) {
      throw new Error(`item_agent must produce exactly ${ITEMS_PER_CHARACTER} items for ${who}; got ${count}`);
    }
  }
}

export async function itemAgent(context) {
  context.debug ??= {};
  context.debug.rejection_log ??= [];
  context.debug.warning_log ??= [];

  const characters = getCharacterCards(context.cards || []);
  const playerCount = context.playerCount || 4;
  if (characters.length < playerCount) {
    throw new Error(`item_agent requires at least ${playerCount} character cards`);
  }

  const players = characters.slice(0, playerCount).map((card) => ({
    name: String(card?.card_title || '').split(',')[0].trim(),
    bio: String(card?.card_contents || '').trim()
  }));

  let best = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const items = [];
    let usedCsv = usedTitlesCsvFromContext(context);
    const usedNormalized = new Set(
      usedCsv
        .split(',')
        .map((t) => normalizeTitle(t))
        .filter(Boolean)
    );

    try {
      for (const player of players) {
        const otherNames = players
          .map((p) => p.name)
          .filter((n) => n && n !== player.name)
          .join(', ');
        const prompt = buildItemsPromptForCharacter({
          storyTitle: String(context?.story_title || '').trim(),
          storyBlurb: getStoryBlurb(context),
          characterName: player.name,
          characterBio: player.bio,
          otherCharacterNamesCsv: otherNames,
          usedItemTitlesCsv: usedCsv,
          itemCount: ITEMS_PER_CHARACTER
        });

        const result = await callJson({
          ...prompt,
          schemaName: 'items',
          schema: cardsArraySchema(ITEMS_PER_CHARACTER, ITEMS_PER_CHARACTER)
        });

        for (const raw of result.cards || []) {
          const title = String(raw?.card_title || '').trim();
          const key = normalizeTitle(title);
          if (key && usedNormalized.has(key)) {
            throw new Error(`item_agent produced duplicate title "${title}" already in used list`);
          }
          usedNormalized.add(key);
          usedCsv = `${usedCsv}${usedCsv ? ', ' : ''}${title}`;

          items.push({
            ...raw,
            linked_character: player.name
          });
        }
      }

      assertNoDuplicateTitles(items);
      assertItemsPerCharacter(items, players.map((p) => p.name));
      return pushCards(context, 'item', items);
    } catch (error) {
      best = items.length > best.length ? items : best;
      context.debug.rejection_log.push({
        stage: 'item_agent',
        attempt,
        reason: String(error?.message || error),
        used_titles: usedCsv
      });
    }
  }

  context.debug.warning_log.push({
    stage: 'item_agent',
    reason: 'best_effort_items',
    message: `item_agent failed strict per-character item generation; emitting best-effort set (${best.length} items).`
  });

  return pushCards(context, 'item', best);
}
