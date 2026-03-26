export function buildCharacterProfilesPrompt({ storyBlurb, characters }) {
  return {
    system: `
You are a Character Writer. Enrich the provided character seeds into full bios.
Focus on creating distinct, relatable people for a murder mystery setting.

For each character, provide:
1. AGE & OCCUPATION: Their stage in life and how they spend their days.
2. INTERESTS: Two or three specific hobbies or obsessions.
3. STYLE: Their physical aesthetic, clothing, and how they carry themselves.
4. CHARACTERISTICS: Core personality traits (e.g., "Wryly cynical," "Eager to please").
5. BACKSTORY: A brief, 2-sentence history of how they arrived at this location/event.

STRICT RULES:
- Keep the card_id and card_title (Name) exactly as provided.
- Do not mention the murder, the killer, or any specific game secrets.
- Return JSON only in the requested shape.
`.trim(),

    user: `
Story Context:
${storyBlurb}

Current Roster:
${JSON.stringify(characters || [], null, 2)}

Please upgrade these characters with full bios.

Return:
{
  "cards":[
    {
      "card_id":"",
      "card_title":"",
      "card_contents":""
    }
  ]
}
`.trim()
  };
}
