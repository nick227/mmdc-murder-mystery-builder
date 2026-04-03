import assert from 'node:assert/strict';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';

const prompt = buildCharactersBuilderPrompt({
  storyBlurb: 'A noble host is found dead beneath the willow arbor.',
  storyMeta: 'Theme tags: garden noir, ensemble\nHost pitch: A garden party where old rivals trade barbs.',
  world:
    'A dramatic Shakespeare garden party. Supporting figures: Lady Viola (hostess), Sir Edmund (manuscript collector).',
  playerCount: 4
});

assert(prompt.system.includes('exactly 4'));
assert(prompt.user.includes('Player count: 4'));
assert(prompt.user.includes('Lady Viola'));
assert(!prompt.user.includes('Reserved victim'));

console.log('charactersBuilderPromptGuardrailTest passed');
