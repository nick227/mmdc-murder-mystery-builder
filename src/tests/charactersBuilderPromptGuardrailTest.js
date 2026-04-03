import assert from 'node:assert/strict';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';

const prompt = buildCharactersBuilderPrompt({
  storyBlurb: 'A noble host is found dead beneath the willow arbor.',
  world: 'A dramatic Shakespeare garden party.',
  worldPeople: [
    { name: 'Lady Viola', summary: 'The central hostess.' },
    { name: 'Sir Edmund', summary: 'A suspicious manuscript collector.' }
  ],
  playerCount: 4
});

assert(prompt.system.includes('exactly 4'));
assert(prompt.user.includes('Player count: 4'));
assert(prompt.user.includes('Lady Viola'));
assert(!prompt.user.includes('Reserved victim'));

console.log('charactersBuilderPromptGuardrailTest passed');
