
export function buildWorldBuildingPrompt(context) {
  const storyEntities = context.storyEntities || { people: [], locations: [], items: [] };
  return {
    system:`You are a world building expert.

    Add back-story to the time and place of the story blurb. Identify key locations and significance.

    Provide context for the setting. Enrich the physical details and atmosphere.

    Avoid generic or obvious language. Find the emotional core that makes this world memorable.

    Return structured worldbuilding plus card-ready entities.
    Do not duplicate entities already supplied unless you are sharpening their significance.
    `,
    user:`
    World building prompt:

${context.storyBlurb || ''}

Existing story entities:
${JSON.stringify(storyEntities, null, 2)}

Requirements:
- world should be concise but rich prose describing the setting, mood, and why the place matters
- people should be additional supporting world figures only if they add real setting value
- locations should be investigation-relevant places that deserve their own card presence
- items should be recurring world objects, mechanisms, records, or treasures that deserve card presence

Return:
{
  "world": "",
  "people": [
    { "name": "", "summary": "" }
  ],
  "locations": [
    { "name": "", "summary": "" }
  ],
  "items": [
    { "name": "", "summary": "" }
  ]
}`
  };
}
