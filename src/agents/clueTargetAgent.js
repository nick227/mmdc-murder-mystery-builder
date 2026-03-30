import { getCardsByType } from '../utils/cards.js';

function buildSuspectRoster(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  return suspects.map((suspect) => ({
    suspectId: String(suspect?.suspect_id || '').trim(),
    displayName: String(suspect?.name || suspect?.title || '').trim()
  })).filter((entry) => entry.suspectId && entry.displayName);
}

function annotateClueCard(clue, suspectEntry) {
  return {
    ...clue
  };
}

function distributeClues(clues, roster, killerId) {
  const killerClues = [];
  const nonKillerEntries = roster.filter((entry) => entry.suspectId !== killerId);
  const assignments = new Map(nonKillerEntries.map((entry) => [entry.suspectId, []]));
  let roundRobinIndex = 0;

  for (const clue of clues) {
    const clueWeight = String(clue?.clue_weight || '').trim();
    if (clueWeight === 'high' || !nonKillerEntries.length) {
      killerClues.push(clue);
      continue;
    }

    const recipient = nonKillerEntries[roundRobinIndex % nonKillerEntries.length];
    assignments.get(recipient.suspectId).push(clue);
    roundRobinIndex += 1;
  }

  return { killerClues, assignments };
}

export async function clueTargetAgent(context) {
  const clueCards = getCardsByType(context?.cards, 'clue');
  const roster = buildSuspectRoster(context);
  const killerId = String(context?.case_state?.killer_id || '').trim();
  const killerEntry = roster.find((entry) => entry.suspectId === killerId) || null;

  if (!clueCards.length) {
    throw new Error('clue_target_agent requires clue cards in context.cards');
  }
  if (!roster.length || !killerEntry) {
    throw new Error('clue_target_agent requires a playable suspect roster and killer');
  }

  const { killerClues, assignments } = distributeClues(clueCards, roster, killerId);
  const nextCards = Array.isArray(context.cards) ? [...context.cards] : [];
  const assignedByClue = new Map();

  for (const clue of killerClues) {
    assignedByClue.set(clue, killerEntry);
  }

  for (const suspectEntry of roster) {
    if (suspectEntry.suspectId === killerId) {
      continue;
    }
    const assigned = assignments.get(suspectEntry.suspectId) || [];
    for (const clue of assigned) {
      assignedByClue.set(clue, suspectEntry);
    }
  }

  for (let index = 0; index < nextCards.length; index += 1) {
    const card = nextCards[index];
    if (card?.card_type !== 'clue') {
      continue;
    }
    const suspectEntry = assignedByClue.get(card);
    if (suspectEntry) {
      nextCards[index] = annotateClueCard(card, suspectEntry);
    }
  }

  context.cards = nextCards;
  delete context.clue_targets;
  return context;
}
