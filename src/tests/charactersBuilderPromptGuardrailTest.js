import assert from 'node:assert/strict';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';

const prompt = buildCharactersBuilderPrompt({
  storyBlurb: 'A noble host is found dead beneath the willow arbor.',
  world: 'A dramatic Shakespeare garden party.',
  worldPeople: [
    { name: 'Lady Viola', summary: 'The central hostess and eventual victim.' },
    { name: 'Sir Edmund', summary: 'A suspicious manuscript collector.' }
  ],
  playerCount: 4,
  reservedVictimName: 'Lady Viola',
  rejectionReasons: [
    'characters_builder_agent reserved victim leaked into playable roster: Lady Viola'
  ]
});

assert(prompt.system.includes('NEVER include the reserved victim in the playable suspect roster'));
assert(prompt.user.includes('Reserved victim:\nLady Viola'));
assert(prompt.user.includes('do not include the reserved victim as a suspect'));
assert(prompt.user.includes('reserved victim leaked into playable roster: Lady Viola'));

console.log('charactersBuilderPromptGuardrailTest passed');
