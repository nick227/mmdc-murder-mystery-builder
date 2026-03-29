import assert from 'node:assert/strict';
import { buildClueTargetsPrompt } from '../prompts/clueTargetsPrompt.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';

const cluePrompt = buildClueTargetsPrompt({
  storyBlurb: 'Test story',
  coreTruth: { murder: { location: 'The Willow Glade' } },
  characters: [{ card_title: 'Lady Viola Ravenscroft, The Enigmatic Hostess' }],
  locations: [{ card_title: 'The Willow Glade' }, { card_title: 'The Moonlit Fountain' }],
  world: 'Garden mystery'
});

assert(cluePrompt.system.includes('MUST use established geography only'));
assert(cluePrompt.system.includes('MUST keep at least 2 viable suspect paths alive after target 2'));
assert(cluePrompt.user.includes('Established locations'));

const puzzlePrompt = buildPuzzlePrompt({
  storyBlurb: 'Test story',
  puzzleType: 'cross_reference',
  clueTarget: { fact: 'Lady Viola was seen at The Willow Glade.', category: 'location', act: 1 },
  characters: ['Lady Viola Ravenscroft, The Enigmatic Hostess'],
  locations: ['The Willow Glade', 'The Moonlit Fountain'],
  priorClueTargets: []
});

assert(puzzlePrompt.system.includes('use only the provided established location names'));
assert(puzzlePrompt.user.includes('Established locations'));

console.log('rosterPromptGuardrailTest passed');
