import fs from 'node:fs';
import path from 'node:path';

import { bundleLinkerAgent } from '../agents/bundleLinkerAgent.js';
import { cardQualityAgent } from '../agents/cardQualityAgent.js';
import { bundleFinalizeAgent } from '../agents/bundleFinalizeAgent.js';
import { clueTargetAgent } from '../agents/clueTargetAgent.js';
import { puzzleAgent } from '../agents/puzzleAgent.js';
import { normalizeContext } from '../utils/context.js';

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasConcreteFact(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return false;
  }

  return /\b\d{1,2}[:.]\d{2}\b/.test(String(text || ''))
    || ['log', 'ledger', 'timestamp', 'key', 'door', 'schedule', 'fiber', 'receipt', 'map', 'booth', 'display', 'case', 'hall', 'corridor', 'inventory']
      .some((term) => normalized.includes(term));
}

function isGenericOutcome(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return true;
  }

  const weakPatterns = [
    'narrows the suspect space',
    'narrows suspicion',
    'narrows the field',
    'raises suspicion',
    'confirms opportunity',
    'confirms access',
    'suggests something unusual',
    'points toward',
    'makes someone look suspicious'
  ];

  return weakPatterns.some((pattern) => normalized.includes(pattern));
}

function detectSuspectFocus(text, suspectNames) {
  const normalized = normalizeText(text);
  return suspectNames.find((name) => normalized.includes(normalizeText(name))) || null;
}

function evaluateDifficultyCurve(summary) {
  const order = { easy: 1, medium: 2, hard: 3 };
  const difficulties = summary.map((bundle) => bundle.difficulty || 'easy');
  const notes = [];
  let score = 0;

  if (!difficulties.length) {
    return { score, notes };
  }

  const nonDecreasing = difficulties.every((value, index) => index === 0 || order[value] >= order[difficulties[index - 1]]);
  if (nonDecreasing) {
    score += 10;
  } else {
    notes.push('difficulty regresses between bundles');
  }

  if (difficulties[difficulties.length - 1] === 'hard') {
    score += 10;
  } else {
    notes.push('final bundle is not hard');
  }

  if (new Set(difficulties).size >= 2) {
    score += 5;
  } else {
    notes.push('all bundles share the same difficulty');
  }

  return { score, notes };
}

function evaluateRun(result) {
  const notes = [];
  const suspectNames = ['Evelyn Voss', 'Marco Vale', 'Nina Reed'];
  let score = 100;

  const summary = Array.isArray(result.summary) ? result.summary : [];
  const pacing = Array.isArray(result.pacing_report) ? result.pacing_report : [];
  const connectivity = Array.isArray(result.connectivity) ? result.connectivity : [];

  if (result.rejection_log.length) {
    score -= 40;
    notes.push(`rejections: ${result.rejection_log.map((entry) => entry.reason).join(', ')}`);
  }

  if (result.warning_log.length) {
    score -= Math.min(20, result.warning_log.length * 3);
    notes.push(`warnings: ${result.warning_log.map((entry) => entry.reason).join(', ')}`);
  }

  const expectedActs = [1, 2, 2, 3];
  const actualActs = summary.map((bundle) => bundle.act);
  if (actualActs.length === expectedActs.length && actualActs.every((value, index) => value === expectedActs[index])) {
    score += 5;
  } else {
    score -= 10;
    notes.push(`act shape is ${actualActs.join(', ') || 'missing'} instead of 1,2,2,3`);
  }

  const linearChain = connectivity.length === 4 && connectivity.every((node, index) => {
    const expectedIncoming = index === 0 ? 0 : 1;
    const expectedOutgoing = index === connectivity.length - 1 ? 0 : 1;
    return node.in_degree === expectedIncoming && node.out_degree === expectedOutgoing;
  });
  if (linearChain) {
    score += 10;
  } else {
    score -= 15;
    notes.push('bundle graph is not a clean linear chain');
  }

  const opener = summary[0];
  if (!opener?.board_state_change || isGenericOutcome(opener.board_state_change)) {
    score -= 10;
    notes.push('opener board-state change is weak or generic');
  } else {
    score += 5;
  }

  let priorFocus = null;
  let repeatedFocusCount = 0;
  let genericOutcomeCount = 0;
  let concreteUnlockCount = 0;

  summary.forEach((bundle, index) => {
    const outcomeText = `${bundle.board_state_change || ''} ${bundle.solution_summary || ''}`.trim();
    const focus = detectSuspectFocus(outcomeText, suspectNames);
    if (focus && focus === priorFocus) {
      repeatedFocusCount += 1;
    }
    priorFocus = focus || priorFocus;

    if (isGenericOutcome(outcomeText)) {
      genericOutcomeCount += 1;
    }

    const pacingNode = pacing[index];
    if (hasConcreteFact(`${pacingNode?.concrete_unlock_fact || ''} ${bundle.solution_title || ''}`)) {
      concreteUnlockCount += 1;
    }

    if ((bundle.evidence_count || 0) < 2) {
      score -= 15;
      notes.push(`${bundle.bundle_id} has fewer than 2 evidence cards`);
    }

    if ((bundle.required_count || 0) < 2) {
      score -= 5;
      notes.push(`${bundle.bundle_id} depends on too little visible evidence`);
    }
  });

  if (repeatedFocusCount > 0) {
    score -= repeatedFocusCount * 8;
    notes.push(`same suspect focus repeats across ${repeatedFocusCount + 1} adjacent bundles`);
  }

  if (genericOutcomeCount > 0) {
    score -= genericOutcomeCount * 5;
    notes.push(`${genericOutcomeCount} bundles use generic board-state changes`);
  }

  if (concreteUnlockCount === summary.length && summary.length > 0) {
    score += 10;
  } else if (summary.length > 0) {
    score -= (summary.length - concreteUnlockCount) * 4;
    notes.push('some unlocks are still too abstract');
  }

  const difficultyCurve = evaluateDifficultyCurve(summary);
  score += difficultyCurve.score;
  notes.push(...difficultyCurve.notes);

  return {
    score: Math.max(0, Math.min(100, score)),
    repeated_focus_count: repeatedFocusCount,
    generic_outcome_count: genericOutcomeCount,
    concrete_unlock_count: concreteUnlockCount,
    notes: [...new Set(notes)]
  };
}

function makeMockContext() {
  return normalizeContext({
    playerCount: 4,
    userPrompt: 'Isolated puzzle review',
    case_state: {
      killer_id: 'mock-suspect-evelyn',
      killer_name: 'Evelyn Voss',
      suspects: [
        { suspect_id: 'mock-suspect-evelyn', name: 'Evelyn Voss' },
        { suspect_id: 'mock-suspect-marco', name: 'Marco Vale' },
        { suspect_id: 'mock-suspect-nina', name: 'Nina Reed' }
      ]
    },
    storyBlurb: [
      'At the Blue Ember Club, jazz singer Lila Voss is found dead in a private backstage room.',
      'A rare black-opal necklace has vanished from a locked display nearby.',
      'Players must determine who had access, who broke their alibi, and how the theft connects to the murder.'
    ].join(' '),
    world: 'A smoke-noir jazz club with backstage rooms, a locked display, stage access routes, and staff logs.',
    trails: [
      {
        title: 'Backstage Access',
        goal: 'Identify who could physically reach the private room.',
        location_ref: 'mock_location_backstage',
        beats: [
          { information: 'Only staff and featured performers can open the backstage corridor door.', game: 'Compare role claims with access evidence.' },
          { information: 'One guest was seen near the locked display before the murder.', game: 'Ask who had reason to approach the display.' },
          { information: 'A witness heard an argument behind the stage curtain.', game: 'Cross-check who was missing from the floor.' }
        ]
      },
      {
        title: 'Timeline Pressure',
        goal: 'Break one suspect alibi during the murder window.',
        location_ref: 'mock_location_stage',
        beats: [
          { information: 'The victim was last seen alive shortly before the second set.', game: 'Order movements against the stage schedule.' },
          { information: 'A staff log recorded a side-door latch from inside.', game: 'Compare the log to witness timing.' },
          { information: 'A performer disappeared between songs.', game: 'Test whether the gap permits the murder.' }
        ]
      },
      {
        title: 'Object Chain',
        goal: 'Connect the theft to the murder weapon or method.',
        location_ref: 'mock_location_display',
        beats: [
          { information: 'The display lock shows fresh tool marks.', game: 'Match the marks to an object or habit.' },
          { information: 'Fibers on the victim match a costume detail.', game: 'Compare physical traces across suspects.' },
          { information: 'The necklace case was moved before the body was found.', game: 'Decide whether theft preceded the murder.' }
        ]
      }
    ],
    narratives: {
      a: {
        suspect: 'Evelyn Voss',
        motive: 'Protect her career and hide a debt tied to the necklace.',
        opportunity: 'She had access to backstage and a gap in her set break.',
        supporting_evidence: ['Seen near backstage', 'Knew the display routine'],
        misleading_evidence: ['Argued publicly with the victim'],
        contradiction_hooks: ['Was also expected on stage'],
        narrative_arc: 'Appears guilty through access and pressure.'
      },
      b: {
        suspect: 'Marco Vale',
        motive: 'Wanted the necklace to pay off a gambling debt.',
        opportunity: 'Moved equipment through the corridor before the murder.',
        supporting_evidence: ['Worked near the display', 'Handled backstage crates'],
        misleading_evidence: ['Claims he never entered the room'],
        contradiction_hooks: ['No witness places him alone with Lila'],
        narrative_arc: 'Looks like the practical thief.'
      },
      c: {
        suspect: 'Nina Reed',
        motive: 'Believed Lila stole her spotlight and sabotaged her contract.',
        opportunity: 'Left the audience floor during the set break.',
        supporting_evidence: ['Was angry with Lila', 'Knew the private room layout'],
        misleading_evidence: ['Was seen speaking with patrons near the bar'],
        contradiction_hooks: ['Bar witnesses may overlap with the murder window'],
        narrative_arc: 'Feels emotionally volatile but not fully pinned down.'
      },
      true_narrative: 'a'
    },
    cards: [
      {
        card_id: 'mock-location-backstage',
        card_type: 'location',
        card_title: 'Backstage Corridor',
        card_contents: 'A restricted hall linking the stage, dressing rooms, and private backstage room.',
        act: 1
      },
      {
        card_id: 'mock-location-stage',
        card_type: 'location',
        card_title: 'Main Stage',
        card_contents: 'The stage where the second set was performed under heavy audience attention.',
        act: 1
      },
      {
        card_id: 'mock-location-display',
        card_type: 'location',
        card_title: 'Locked Necklace Display',
        card_contents: 'A glass case near the lounge wall that held the black-opal necklace.',
        act: 1
      },
      {
        card_id: 'mock-character-evelyn',
        card_type: 'character',
        card_title: 'Evelyn Voss',
        card_contents: 'Featured performer with backstage access and financial pressure.',
        act: 1
      },
      {
        card_id: 'mock-character-marco',
        card_type: 'character',
        card_title: 'Marco Vale',
        card_contents: 'Club manager who moved equipment and knew the display routine.',
        act: 1
      },
      {
        card_id: 'mock-character-nina',
        card_type: 'character',
        card_title: 'Nina Reed',
        card_contents: 'Rival singer with motive and venue familiarity.',
        act: 1
      },
      {
        card_id: 'mock-clue-001',
        card_type: 'clue',
        card_title: 'Backstage Corridor Log',
        card_contents: 'A corridor log shows the backstage door latch clicked from inside at 11:20 PM.',
        suspect_name: 'Evelyn Voss',
        clue_type: 'timeline',
        clue_weight: 'mid',
        act: 1
      },
      {
        card_id: 'mock-clue-002',
        card_type: 'clue',
        card_title: 'Display Case Tool Marks',
        card_contents: 'Fresh tool marks on the necklace display match a wrench kept in the manager’s kit.',
        suspect_name: 'Marco Vale',
        clue_type: 'object',
        clue_weight: 'mid',
        act: 1
      },
      {
        card_id: 'mock-clue-003',
        card_type: 'clue',
        card_title: 'Stage Schedule Gap',
        card_contents: 'The stage schedule confirms Nina was off the floor for a full song between sets.',
        suspect_name: 'Nina Reed',
        clue_type: 'timeline',
        clue_weight: 'low',
        act: 1
      },
      {
        card_id: 'mock-clue-004',
        card_type: 'clue',
        card_title: 'Private Room Access Note',
        card_contents: 'Only staff and featured performers can open the private room’s backstage lock.',
        suspect_name: 'Evelyn Voss',
        clue_type: 'access',
        clue_weight: 'high',
        act: 1
      }
    ],
    puzzle_bundles: [],
    debug: {
      bundle_stats: [],
      rejection_log: [],
      warning_log: [],
      connectivity: [],
      gain_counts: {},
      strength_counts: {},
      state_change_flags: []
    }
  });
}

function summarizeBundle(context, bundleId) {
  const cards = (context.cards || []).filter((card) => card.bundle_id === bundleId);
  const puzzle = cards.find((card) => card.card_type === 'puzzle');
  const solution = cards.find((card) => card.card_type === 'solution');
  const evidence = cards.filter((card) => card.card_type === 'clue' || card.card_type === 'item');
  const pacing = (context.debug?.pacing_report || []).find((entry) => entry.bundle_id === bundleId) || null;

  return {
    bundle_id: bundleId,
    role: pacing?.role || null,
    act: puzzle?.act || null,
    difficulty: puzzle?.difficulty || null,
    puzzle_title: puzzle?.card_title || null,
    evidence_count: evidence.length,
    required_count: Array.isArray(puzzle?.required_card_ids) ? puzzle.required_card_ids.length : 0,
    unlock_count: Array.isArray(puzzle?.unlock_card_ids) ? puzzle.unlock_card_ids.length : 0,
    board_state_change: puzzle?.actionable_gain || null,
    solution_summary: puzzle?.solution_summary || null,
    solution_title: solution?.card_title || null
  };
}

async function runOnce(index) {
  let context = makeMockContext();
  context.runId = `isolated-puzzle-review-${Date.now()}-${index}`;

  context = normalizeContext(await clueTargetAgent(context));
  context = normalizeContext(await puzzleAgent(context));
  context = normalizeContext(await bundleFinalizeAgent(context));
  context = normalizeContext(await bundleLinkerAgent(context));
  context = normalizeContext(await cardQualityAgent(context));

  const bundleIds = (context.puzzle_bundles || []).map((bundle) => bundle.bundle_id);
  const summary = bundleIds.map((bundleId) => summarizeBundle(context, bundleId));
  const review = evaluateRun({
    summary,
    warning_log: context.debug?.warning_log || [],
    rejection_log: context.debug?.rejection_log || [],
    connectivity: context.debug?.connectivity || [],
    pacing_report: context.debug?.pacing_report || []
  });

  return {
    ok: true,
    review,
    summary,
    warning_log: context.debug?.warning_log || [],
    rejection_log: context.debug?.rejection_log || [],
    connectivity: context.debug?.connectivity || [],
    pacing_report: context.debug?.pacing_report || [],
    cards: context.cards,
    puzzle_bundles: context.puzzle_bundles
  };
}

async function main() {
  const runCount = Math.max(1, Number(process.argv[2] || process.env.PUZZLE_REVIEW_RUNS || 1));
  const outDir = path.join(process.cwd(), 'runs', 'isolated-puzzle-review');
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (let index = 0; index < runCount; index += 1) {
    results.push(await runOnce(index));
  }

  const artifact = {
    generated_at: new Date().toISOString(),
    run_count: runCount,
    results,
    ranking: results
      .map((result, index) => ({
        run: index + 1,
        score: result.review?.score || 0,
        notes: result.review?.notes || []
      }))
      .sort((a, b) => b.score - a.score)
  };

  const outPath = path.join(outDir, `review-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));

  console.log(`Isolated puzzle review runs: ${runCount}`);
  console.log(`Artifact: ${outPath}`);

  results.forEach((result, index) => {
    console.log(`\nRun ${index + 1}`);
    console.log(`  review score=${result.review?.score ?? 0}`);
    if (result.review?.notes?.length) {
      console.log(`  review notes: ${result.review.notes.join(' | ')}`);
    }
    result.summary.forEach((bundle) => {
      console.log(
        `  ${bundle.bundle_id} | role=${bundle.role} | act=${bundle.act} | difficulty=${bundle.difficulty} | evidence=${bundle.evidence_count} | required=${bundle.required_count} | unlock=${bundle.unlock_count}`
      );
      console.log(`    puzzle: ${bundle.puzzle_title}`);
      console.log(`    change: ${bundle.board_state_change}`);
      console.log(`    solved: ${bundle.solution_title}`);
    });
    if (result.warning_log.length) {
      console.log(`  warnings: ${result.warning_log.map((entry) => entry.reason).join(', ')}`);
    }
    if (result.rejection_log.length) {
      console.log(`  rejections: ${result.rejection_log.map((entry) => entry.reason).join(', ')}`);
    }
  });

  if (artifact.ranking.length > 1) {
    console.log('\nRanking');
    artifact.ranking.forEach((entry) => {
      console.log(`  run ${entry.run}: score=${entry.score}`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
