export function buildHostSpeechPrompt({ storyBlurb, narratives, locations }) {
  return {
    system: [
      'You write host speech cards for a live murder mystery game.',
      'The host introduces the scenario and punctuates act transitions.',
      'Speeches must be dramatic and engaging without giving away the answer.',
      'You do not know who the killer is. Work only from the competing narratives.',
      'Each speech card must be tagged with its act number.'
    ].join(' '),
    user: `
Write exactly 3 host speech cards: an opening speech, an Act 2 transition, and an Act 3 final call.

Public blurb:
${storyBlurb}

Competing suspect narratives (all are plausible - do not treat any as confirmed truth):
${JSON.stringify(narratives ?? [], null, 2)}

Known locations:
${JSON.stringify(locations || [], null, 2)}

Act assignments:
- Opening speech -> act: 1 - sets the scene, introduces the victim and setting, welcomes players
- Act 2 transition -> act: 2 - introduces a new tension, redirects suspicion toward a different angle
- Act 3 final call -> act: 3 - calls players to make their final accusation, raises dramatic stakes

Rules:
- no speech may state the killer as fact
- no speech may reveal the fortune location as settled truth
- tone should be theatrical, fun, and slightly dramatic
- keep each speech under 120 words
- every card must include the correct act field (1, 2, or 3)
- return exactly 3 cards
`.trim()
  };
}
