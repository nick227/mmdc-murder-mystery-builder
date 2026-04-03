import { extractJsonBlock } from './extractPromptJson.js';

let smokeSecretBatchSeq = 0;

function playableCharactersFromUser(opts) {
  return extractJsonBlock(String(opts?.user || ''), 'Playable characters:', 'World:');
}

function characterNameFromUserPrompt(opts) {
  const user = String(opts?.user || '');
  const label = 'Character:';
  const idx = user.lastIndexOf(label);
  let name = 'smoke character';
  if (idx !== -1) {
    const after = user.slice(idx + label.length).trimStart();
    const line = after.split('\n')[0]?.trim() || '';
    if (line) {
      name = line.replace(/\s+/g, ' ').slice(0, 80);
    }
  }
  return name;
}

function fakeSmokeCharacterSecrets(opts) {
  smokeSecretBatchSeq += 1;
  const batch = smokeSecretBatchSeq;
  const name = characterNameFromUserPrompt(opts);

  return {
    cards: [
      {
        card_title: `Smoke motive ${batch} — ${name}`,
        card_contents:
          `[${batch}] Resentment over inheritance and fear of blackmail pushed ${name} to seek leverage before the will reading.`
      },
      {
        card_title: `Smoke access ${batch} — ${name}`,
        card_contents:
          `[${batch}] ${name} had backstage access to the study, slipped inside near midnight, and were spotted by the cellar door.`
      }
    ]
  };
}

function fakeSmokeStoryActs() {
  return {
    cards: [
      {
        card_title: 'Smoke act I — gathering',
        card_contents:
          'The guests trade smiles while studying doorways and exits; alliances form in whispered asides before anyone names a fear. Suspicion has not yet hardened into accusation, but every polite greeting carries a second meaning in the ballroom haze.',
        act: 1,
        location_ref: 'Smoke ballroom'
      },
      {
        card_title: 'Smoke act II — fracture',
        card_contents:
          'Contradictions ripple through testimony as timelines refuse to align and motives surface from half-forgotten quarrels. What seemed like coincidence tightens into pattern, forcing players to choose which witnesses they still trust as pressure mounts.',
        act: 2,
        location_ref: 'Smoke ballroom'
      },
      {
        card_title: 'Smoke act III — reckoning',
        card_contents:
          'The final interval leaves no room for polite doubt: every player must commit to a theory and defend it against hard questions. The answer still hangs in the air, but the room demands resolution before the last clock chime.',
        act: 3,
        location_ref: 'Smoke ballroom'
      }
    ]
  };
}

function fakeSmokeHostSpeech() {
  return {
    cards: [
      {
        card_title: 'Smoke host — opening',
        card_contents: 'Welcome, detectives. The night is young and secrets stir beneath the chandeliers.',
        act: 1,
        location_ref: 'Smoke ballroom'
      },
      {
        card_title: 'Smoke host — act two',
        card_contents: 'Tighten your alibies—new whispers contradict what we thought we knew.',
        act: 2,
        location_ref: 'Smoke ballroom'
      },
      {
        card_title: 'Smoke host — finale',
        card_contents: 'Accusations in the air; one of you knows far more than they have admitted.',
        act: 3,
        location_ref: 'Smoke ballroom'
      }
    ]
  };
}

function fakeSmokeCoreTruth(opts) {
  const playableCharacters = playableCharactersFromUser(opts);
  const firstCharacter = Array.isArray(playableCharacters) ? playableCharacters[0] : null;
  const killer = String(firstCharacter?.card_title || firstCharacter?.name || 'Smoke Character 1').trim();

  return {
    murder: {
      killer,
      victim: 'Morgan Ashcroft',
      location: 'Smoke Test Ballroom',
      murder_solution: `${killer} poisoned Morgan Ashcroft during the toast in the Smoke Test Ballroom, seized a private moment with the glasses before guests gathered, and staged confusion after the band started. Motive: control of the disputed inheritance.`
    },
    treasure: {
      object: 'The smoke test inheritance ledger',
      hiding_place: 'Inside the false bottom of the ballroom podium',
      treasure_solution: 'Wrapped in sheet music beneath the podium drawer; proves who controls estate holdings. Players trace the podium key, the sheet music clue, and the hidden compartment.'
    }
  };
}

function fakeSmokeClueTargets(opts) {
  const playableCharacters = playableCharactersFromUser(opts);
  const coreTruth = extractJsonBlock(String(opts?.user || ''), 'Core truth:', 'Playable characters:');
  const chars = Array.isArray(playableCharacters) ? playableCharacters : [];
  const fallbackKiller = String(coreTruth?.murder?.killer || 'mock_root3.cards.card_title_1').trim();
  const titles = [0, 1, 2, 3].map((i) =>
    String(chars[i]?.card_title || fallbackKiller).trim()
  );
  const names = titles.map((t) => t.split(',')[0].trim());
  const loc = String(coreTruth?.murder?.location || 'Smoke Test Ballroom');
  const obj = String(coreTruth?.treasure?.object || 'smoke test inheritance ledger');

  const targetDefs = [
    {
      fact: `${names[0]} was recorded in ${loc} before the toast.`,
      category: 'location',
      act: 1,
      puzzle_type_hint: 'cross_reference',
      difficulty_hint: 'easy'
    },
    {
      fact: `${names[1]} had access to the champagne service during the crime window.`,
      category: 'access',
      act: 2,
      puzzle_type_hint: 'elimination',
      difficulty_hint: 'medium'
    },
    {
      fact: `${names[2]} was seen in the foyer at 9:12 PM per the security log.`,
      category: 'movement',
      act: 3,
      puzzle_type_hint: 'timeline',
      difficulty_hint: 'medium'
    },
    {
      fact: `The ${obj} shows fingerprints consistent with ${names[3]} on the podium latch.`,
      category: 'object',
      act: 3,
      puzzle_type_hint: 'item_combination',
      difficulty_hint: 'hard'
    }
  ];

  return { targets: targetDefs };
}

function fakeSmokeTreasureHunt(opts) {
  const user = String(opts?.user || '');
  const countMatch = user.match(/Clue count:\s*(\d+)/i);
  const n = Math.min(32, Math.max(1, parseInt(String(countMatch?.[1] || '1'), 10)));
  const clues = Array.from({ length: n }, (_, i) => ({
    card_title: `Treasure hint ${i + 1}`,
    card_contents: `Short concrete hint toward the treasure thread (${i + 1}).`
  }));

  return { clues };
}

function fakeSmokePuzzleBundle(opts) {
  const user = String(opts?.user || '');
  const targetFactMatch = user.match(/Target clue fact:\s*([\s\S]*?)\n\s*Target category:/i);
  const targetFact = String(targetFactMatch?.[1] || 'A smoke clue fact.').trim();
  let canonVictim = 'Morgan Ashcroft';
  let canonLocation = 'Smoke Test Ballroom';
  const vm = user.match(/Victim:\s*([^\n\r]+)/i);
  const lm = user.match(/Location:\s*([^\n\r]+)/i);
  if (vm) {
    canonVictim = vm[1].trim();
  }
  if (lm) {
    canonLocation = lm[1].trim();
  }
  const vParts = user.split('<<<CANON_VICTIM>>>');
  if (vParts.length > 1) {
    const rest = vParts[1].split('<<<CANON_LOCATION>>>');
    const firstLine = (block) => String(block || '')
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) || '';
    canonVictim = firstLine(rest[0]) || canonVictim;
    canonLocation = firstLine(rest[1]) || canonLocation;
  }
  const tagged = (body) => `${body}\n${canonVictim}\n${canonLocation}`;

  return {
    cards: [
      {
        card_type: 'evidence',
        card_title: 'Evidence A',
        card_contents: tagged(targetFact)
      },
      {
        card_type: 'evidence',
        card_title: 'Evidence B',
        card_contents: tagged(`Second record: ${targetFact}`)
      },
      {
        card_type: 'evidence',
        card_title: 'Evidence C',
        card_contents: tagged('Third visible evidence record confirming the same event.')
      },
      {
        card_type: 'puzzle',
        card_title: 'Smoke Puzzle',
        card_contents: tagged('Use the visible evidence to identify the single concrete fact it reveals.'),
        unlocked_item: 'The confirmed timeline or access fact from the evidence set.'
      },
      {
        card_type: 'solution',
        card_title: 'Smoke Clue',
        card_contents: targetFact
      }
    ]
  };
}

const NAMED_SMOKE = {
  core_truth: fakeSmokeCoreTruth,
  clue_targets: fakeSmokeClueTargets,
  puzzle_bundle: fakeSmokePuzzleBundle,
  treasure_hunt: fakeSmokeTreasureHunt,
  character_secrets: fakeSmokeCharacterSecrets,
  story_acts: fakeSmokeStoryActs,
  host_speech: fakeSmokeHostSpeech
};

export function fakeSmokeResponse(opts) {
  const schemaName = String(opts?.schemaName || '').trim();
  const handler = NAMED_SMOKE[schemaName];
  return handler ? handler(opts) : null;
}
