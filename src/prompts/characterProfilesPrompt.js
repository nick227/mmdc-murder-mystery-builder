export function buildCharacterProfilesPrompt({ storyBlurb, trails, playerCount, narratives }) {
  // Each character profile is biased toward one narrative to create divergence.
  // The true_narrative is not exposed — all three are presented as equally plausible.
  const narrativeEntries = [
    { key: "a", narrative: narratives?.a },
    { key: "b", narrative: narratives?.b },
    { key: "c", narrative: narratives?.c }
  ].filter((n) => n.narrative);

  const assignments = [];

  for (let i = 0; i < playerCount; i++) {
    const entry = narrativeEntries[i % narrativeEntries.length];

    assignments.push({
      playerIndex: i + 1,
      narrativeKey: entry.key,
      suspect: entry.narrative?.suspect,
      mustBeDistinctCharacter: true
    });
  }

  return {
    system: [
      "You write concise, vivid, playable murder mystery character profile cards.",
      "Every character must feel distinct, deeply involved, and plausibly suspect.",
      "Use the competing suspect narratives to preserve ambiguity.",
      "Each character has a narrative bias — they have information or perspective that makes one narrative feel most plausible to them.",
      "This creates natural information asymmetry between players.",
      "Characters must be different people.",
      "Do not create multiple versions of the same person.",
      "Each character should be a unique role in the story world.",
      "Characters may be allies, rivals, staff, relatives, or witnesses.",
      "They are not required to be the suspects themselves."
    ].join(" "),
    user: `
Using the story blurb, breadcrumbs, and suspect narratives below, write exactly ${playerCount} character profile cards.

Story blurb:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives (all are plausible — do not treat any as confirmed truth):
${JSON.stringify(narratives, null, 2)}

Narrative assignments per character:
${JSON.stringify(assignments, null, 2)}

Each card must clearly establish:
- who the character is
- their public identity and role in the setting
- their relationship to the victim or fortune
- their personal stake in the events
- why others could suspect them
- what kind of information or leverage they are likely to hold
- a subtle lean toward their assigned narrative (without making it obvious or conclusive)

Rules:
- do not include secrets
- do not name any character as the confirmed killer
- make each character socially distinct
- the narrative bias should create natural suspicion and information asymmetry
- all ${playerCount} characters must feel like plausible suspects to others
`.trim()
  };
}
