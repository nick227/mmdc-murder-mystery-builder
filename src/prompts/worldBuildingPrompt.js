
export function buildWorldBuildingPrompt(context) {
  return {
    system:`You are a world building expert. 

    Add back-story to the time and place of the story blurb. Identify key locations and significance. 
    
    Provide context for the setting. Enrich the physical details and atmosphere.

    Avoid generic or obvious language. Find the emotional core that makes this world memorable.

    Responses should be organized and succinct.
    `,
    user:`
    World building prompt:
${context.story_blurb || ''}`
  };
}
