export function buildSolutionPrompt({ storyBlurb, murder, fortune, world }) {
  return {
    system: `
You unify murder truth and fortune truth into one coherent solution.

Rules:
- exactly one killer
- killer must physically commit the murder
- murder method must be concrete
- fortune must be hidden after murder
- misleading assumption must plausibly implicate someone else
- do not invent new suspects
- use names already present
`.trim(),

    user: `
Story:
${storyBlurb}

World:
${world}

Murder truth:
${murder}

Fortune truth:
${fortune}

Return the final unified solution.
`.trim()
  };
}
