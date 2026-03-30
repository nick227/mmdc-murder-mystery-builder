function getBaseCharacterName(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return text.split(',')[0].trim() || text;
}

function buildCastSummary(caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  if (!suspects.length) {
    return '- No cast provided.';
  }

  return suspects.map((suspect) => {
    const name = String(suspect?.name || '').trim();
    const title = String(suspect?.title || '').trim();
    const role = title.includes(',') ? title.split(',').slice(1).join(',').trim() : '';
    return `- ${name}${role ? `: ${role}` : ''}`;
  }).join('\n');
}

function buildSecretSummary(caseState, secretCards) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  const suspectByCardId = new Map(
    suspects
      .filter((suspect) => suspect?.card_id)
      .map((suspect) => [String(suspect.card_id).trim(), String(suspect?.name || '').trim()])
  );
  const cards = Array.isArray(secretCards) ? secretCards : [];
  if (!cards.length) {
    return '- No secrets provided.';
  }

  return cards.map((card) => {
    const linkedName = suspectByCardId.get(String(card?.linked_character_id || '').trim());
    const fallbackTitle = String(card?.card_title || '').replace(/\s+Secret$/i, '').trim();
    const owner = linkedName || getBaseCharacterName(fallbackTitle) || 'Unknown character';
    return `- ${owner}: ${String(card?.card_contents || '').trim()}`;
  }).join('\n');
}

function buildNarrativeSummary(narratives) {
  const entries = Object.entries(narratives || {});
  if (!entries.length) {
    return '- No suspect narratives provided.';
  }

  return entries.map(([key, narrative]) => {
    const suspect = String(narrative?.suspect || '').trim() || `Narrative ${key.toUpperCase()}`;
    const pieces = [
      String(narrative?.claim || '').trim(),
      String(narrative?.summary || '').trim(),
      String(narrative?.angle || '').trim()
    ].filter(Boolean);
    const detail = pieces[0] || 'Keep this suspect socially active and plausible.';
    return `- ${key.toUpperCase()} -> ${suspect}: ${detail}`;
  }).join('\n');
}

export function buildGameCardsPrompt({ storyBlurb, playerCount, narratives, caseState, secretCards, rejectionReasons = [] }) {
  const killerName = String(caseState?.killer_name || '').trim();
  const castSummary = buildCastSummary(caseState);
  const secretSummary = buildSecretSummary(caseState, secretCards);
  const narrativeSummary = buildNarrativeSummary(narratives);
  const suspectCount = Array.isArray(caseState?.suspects) ? caseState.suspects.length : 0;
  const maxNamedPrimaryTargets = suspectCount > 0 ? suspectCount * 2 : Math.max(playerCount, 4);
  const rejectionBlock = Array.isArray(rejectionReasons) && rejectionReasons.length
    ? `\nFix these issues from the previous draft:\n${rejectionReasons.map((reason) => `- ${reason}`).join('\n')}\n`
    : '';

  return {
    system: [
      'You write social action cards for a murder mystery party game.',
      'Each card must drive live play through a distinct social mechanic and feel specific to this cast and case.',
      'Favor playable, dramatic instructions over exposition.',
      'Every card must use one of exactly eight game card types: performance, conversation, search, flavor, accusation, alibi, trade, revelation.',
      'Card contents must be written in second person as a directed action instruction to the player holding the card.'
    ].join(' '),
    user: `
Write exactly ${playerCount * 5} game cards.

Story blurb:
${storyBlurb}

Full cast:
${castSummary}

Killer identity:
- ${killerName || 'Unknown'}

Character secrets:
${secretSummary}

Suspect narratives:
${narrativeSummary}

Required output fields on every card:
- game_card_type
- card_title
- card_contents
- act

Allowed game_card_type values and their mechanics:
- performance: the player performs a scene, reenactment, toast, or dramatic bit that reveals a clue
- conversation: the player must question or pressure a specific character in conversation
- search: the player must find, reveal, or call for a hidden item, note, or location detail
- flavor: atmospheric drama or social fun with no hard mechanical requirement
- accusation: the player must formally accuse a suspect and make the case aloud
- alibi: the player must challenge another player to account for their whereabouts
- trade: the player must exchange a clue, note, or useful information with another player
- revelation: the player must hold and then dramatically reveal a piece of information at the right moment

Act assignment rules:
- Act 1: 40% of cards. Open social dynamics, introductions, positioning, low-stakes pressure, scene-setting.
- Act 2: 20% of cards. Interrogation, alibi pressure, trade pressure, and search escalation.
- Act 3: 40% of cards. Accusation, commitment, dramatic reveal, late information release, final social pressure.
- For this run, target exactly ${playerCount * 2} act 1 cards, exactly ${playerCount} act 2 cards, and exactly ${playerCount * 2} act 3 cards.

Quality priorities:
- Write compact, vivid cards. One sharp action is better than a long explanation.
- Give the set range: some cards should be theatrical, some investigative, some confrontational, some socially manipulative.
- Most cards should rely on one relevant secret, one suspicion, or one relationship tension, not multiple lore threads at once.
- Do not force every card to carry a major clue. Some cards should create pressure, misdirection, or atmosphere that still moves the room.
- Keep card titles short and stageable.

Rules:
- Distribute cards roughly evenly across all eight game_card_type values.
- Before writing, spread attention across the cast so no named character becomes the repeated center of the set.
- Treat "primary target" as the person being questioned, accused, challenged, exposed, traded with, or otherwise made central to the card.
- Across the full set, use no more than ${maxNamedPrimaryTargets} cards with a named primary target.
- Use specific character names when writing targeted cards so the instruction clearly tells the player who to engage.
- Use the killer identity and character secrets to create pointed accusation, revelation, conversation, and alibi cards with real dramatic weight.
- Keep several cards centered on objects, locations, scenes, rumors, or public actions instead of making every non-flavor card about a suspect.
- Flavor cards may be broader and atmospheric, but all other types should usually involve named characters or named knowledge.
- No repeated premise. No two cards should ask for the same action, same reveal, or same confrontation.
- No two cards of the same type may target the same character for the same purpose.
- Do not use any named character as the primary target more than twice across the full set unless the card is flavor. If a draft would exceed that limit, retarget the card to a different character or rewrite it around an item, location, or public scene.
- Card contents must be a clear second-person instruction telling the player what to do, who to engage, and what they are trying to reveal, pressure, trade, conceal, or expose.
- Avoid direct solved conclusions or explicit statements that the killer is proven guilty.
- Every card must include act as 1, 2, or 3.
${rejectionBlock}
`.trim()
  };
}
