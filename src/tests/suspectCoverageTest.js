import assert from 'node:assert/strict';
import { buildSuspectCoverageReport } from '../utils/suspectCoverage.js';

const context = {
  cards: [
    { card_id: 'c1', card_type: 'character', card_title: 'Detective Lila Crane, The Investigator', card_contents: '...' },
    { card_id: 'c2', card_type: 'character', card_title: 'Jasper Vale, The Fixer', card_contents: '...' },
    { card_id: 'c3', card_type: 'character', card_title: 'Mara Quinn, The Heiress', card_contents: '...' },
    { card_id: 'c4', card_type: 'character', card_title: 'Theo Ward, The Bartender', card_contents: '...' },
    { card_id: 's1', card_type: 'secret', card_title: 'Secret', card_contents: 'Jasper hid the key.', linked_character_id: 'c2' },
    { card_id: 's2', card_type: 'secret', card_title: 'Secret', card_contents: 'Mara lied about the necklace.', linked_character_id: 'c3' }
  ],
  narratives: {
    a: { suspect: 'Jasper Vale' },
    b: { suspect: 'Mara Quinn' }
  }
};

const report = buildSuspectCoverageReport(context);

assert.equal(report.pass, false);
assert(report.issues.some((issue) => issue.code === 'safe_suspect_roles'));
assert(report.issues.some((issue) => issue.code === 'underused_suspects'));
assert(report.required_early_suspects.length >= 1);

const materiallyBalanced = buildSuspectCoverageReport({
  cards: [
    { card_id: 'c1', card_type: 'character', card_title: 'Jasper Vale, The Fixer', card_contents: 'He had backstage access and debt pressure.' },
    { card_id: 'c2', card_type: 'character', card_title: 'Mara Quinn, The Heiress', card_contents: 'She was seen near the vault and feared exposure.' },
    { card_id: 'c3', card_type: 'character', card_title: 'Theo Ward, The Bartender', card_contents: 'He handled the poison and moved through the cellar.' },
    { card_id: 'c4', card_type: 'character', card_title: 'Iris Cole, The Archivist', card_contents: 'She held the key and argued about the fortune.' },
    { card_id: 's1', card_type: 'secret', card_title: 'Secret', card_contents: 'Jasper used a backstage key, carried a rope, and feared his debt would be exposed after the argument.', linked_character_id: 'c1' },
    { card_id: 's2', card_type: 'secret', card_title: 'Secret', card_contents: 'Mara was present near the vault during the murder window and wanted the fortune before anyone could expose her claim.', linked_character_id: 'c2' },
    { card_id: 's3', card_type: 'secret', card_title: 'Secret', card_contents: 'Theo checked out the poison vial from storage and was seen crossing the cellar before the confrontation.', linked_character_id: 'c3' },
    { card_id: 's4', card_type: 'secret', card_title: 'Secret', card_contents: 'Iris hid the key after a threat over the inheritance and used the study passage to reach the archive unnoticed.', linked_character_id: 'c4' }
  ],
  narratives: {}
});

assert.equal(materiallyBalanced.pass, true);
assert.equal(materiallyBalanced.underused_suspects.length, 0);

console.log('suspectCoverageTest passed');
