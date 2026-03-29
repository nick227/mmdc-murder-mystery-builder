import { applyBundleDerivation, deriveBundleConclusion } from '../utils/bundleDerivation.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const context = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_001',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'e1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false,
        derived_facts: [
          {
            subject: 'lila_groove',
            time: '23:53',
            location: 'listening_lounge',
            statement: 'Lila Groove stayed in the Listening Lounge at 11:53 PM.',
            source_card_id: 'e1'
          }
        ]
      },
      {
        card_id: 'e2',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false,
        derived_facts: [
          {
            subject: 'max_vinyl',
            time: '23:53',
            location: 'rare_vinyl_vault',
            statement: 'Max Vinyl was in the Rare Vinyl Vault at 11:53 PM.',
            source_card_id: 'e2'
          }
        ]
      },
      {
        card_id: 's1',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'p1',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_001',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const result = deriveBundleConclusion({
    context,
    bundleId: 'puzzle_bundle_001',
    bundleIndex: 0,
    currentStateProgression: context.case_state.state_progression
  });

  assert(result.conclusion.conclusion_type === 'link_to_location', 'should produce a soft bundle-local location link before the final bundle');
  assert(result.conclusion.affected_suspects.includes('max_vinyl'), 'should link Max to the murder location');
  assert(result.nextState.viable_suspects.length === 2, 'soft conclusions should not narrow viable suspects');

  applyBundleDerivation({
    context,
    bundleId: 'puzzle_bundle_001',
    bundleIndex: 0,
    conclusion: result.conclusion
  });

  const solutionCard = context.cards.find((card) => card.card_type === 'solution');
  assert(solutionCard.card_contents.includes('Max Vinyl'), 'rendered solution should mention the linked suspect');

  const fallbackContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl', title: 'Max Vinyl – The Rival' },
        { suspect_id: 'lila_groove', name: 'Lila Groove', title: 'Lila Groove – The Keeper' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_002',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'fx1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_002',
        hidden_until_solved: false,
        card_title: 'Collector Rumor',
        card_contents: 'Max Vinyl kept circling the vault door during the party.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'The hallway was noisy and crowded.',
            source_card_id: 'fx1'
          }
        ]
      },
      {
        card_id: 'fx2',
        card_type: 'item',
        bundle_id: 'puzzle_bundle_002',
        hidden_until_solved: false,
        card_title: 'Guest Note',
        card_contents: 'Several guests mentioned Max Vinyl by name.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'Guests whispered in the lounge.',
            source_card_id: 'fx2'
          }
        ]
      },
      {
        card_id: 'fs2',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_002',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'fp2',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_002',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const fallbackResult = deriveBundleConclusion({
    context: fallbackContext,
    bundleId: 'puzzle_bundle_002',
    bundleIndex: 1,
    currentStateProgression: fallbackContext.case_state.state_progression
  });

  assert(fallbackResult.conclusion.conclusion_type === 'suggest_suspect', 'mention fallback should suggest a suspect');
  assert(fallbackResult.conclusion.affected_suspects[0] === 'max_vinyl', 'mention fallback should choose the named suspect');
  assert(fallbackResult.nextState.viable_suspects.length === 2, 'suggest_suspect should not narrow viable suspects');

  const duplicateMentionContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl', title: 'Max Vinyl – The Rival' },
        { suspect_id: 'lila_groove', name: 'Lila Groove', title: 'Lila Groove – The Keeper' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_dup',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'dm1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_dup',
        hidden_until_solved: false,
        card_title: 'Repeated Rumor',
        card_contents: 'Max Vinyl, Max Vinyl, Max Vinyl kept hovering by the vault.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'The hallway stayed crowded.',
            source_card_id: 'dm1'
          }
        ]
      },
      {
        card_id: 'dm2',
        card_type: 'item',
        bundle_id: 'puzzle_bundle_dup',
        hidden_until_solved: false,
        card_title: 'Neutral Item',
        card_contents: 'A generic backstage tool case sat under a table.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'No one claimed the tool case.',
            source_card_id: 'dm2'
          }
        ]
      },
      {
        card_id: 'ds1',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_dup',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'dp1',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_dup',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const duplicateMentionResult = deriveBundleConclusion({
    context: duplicateMentionContext,
    bundleId: 'puzzle_bundle_dup',
    bundleIndex: 1,
    currentStateProgression: duplicateMentionContext.case_state.state_progression
  });

  assert(duplicateMentionResult.conclusion.conclusion_type === 'suggest_suspect', 'single-card repeated mention should still only produce a soft suggestion');
  assert(duplicateMentionResult.conclusion.derived_from_statements.length === 1, 'repeated mention in one card should count as one supporting statement');

  const ambiguousContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl', title: 'Max Vinyl – The Rival' },
        { suspect_id: 'lila_groove', name: 'Lila Groove', title: 'Lila Groove – The Keeper' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_003',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'ax1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_003',
        hidden_until_solved: false,
        card_title: 'Crowd Noise',
        card_contents: 'People talked over the music near the register.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'The room stayed loud and crowded.',
            source_card_id: 'ax1'
          }
        ]
      },
      {
        card_id: 'ax2',
        card_type: 'item',
        bundle_id: 'puzzle_bundle_003',
        hidden_until_solved: false,
        card_title: 'Blurred Snapshot',
        card_contents: 'A blurry image shows a busy aisle with no clear subject.',
        derived_facts: [
          {
            subject: 'scene',
            time: null,
            location: null,
            statement: 'No single guest is clearly identifiable.',
            source_card_id: 'ax2'
          }
        ]
      },
      {
        card_id: 'as3',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_003',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'ap3',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_003',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const ambiguousResult = deriveBundleConclusion({
    context: ambiguousContext,
    bundleId: 'puzzle_bundle_003',
    bundleIndex: 2,
    currentStateProgression: ambiguousContext.case_state.state_progression
  });

  assert(ambiguousResult.conclusion.conclusion_type === 'hold_ambiguity', 'ambiguous bundle should degrade to a no-op conclusion');
  assert(ambiguousResult.nextState.viable_suspects.length === 2, 'hold_ambiguity should not narrow viable suspects');

  const finalEliminationContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_004',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'f1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_004',
        hidden_until_solved: false,
        card_contents: 'Lila Groove was seen in the Listening Lounge at 11:53 PM.',
        derived_facts: [
          {
            subject: 'lila_groove',
            time: '23:53',
            location: 'listening_lounge',
            statement: 'Lila Groove was seen in the Listening Lounge at 11:53 PM.',
            source_card_id: 'f1'
          }
        ]
      },
      {
        card_id: 'f2',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_004',
        hidden_until_solved: false,
        card_contents: 'Lila Groove also appeared at the Rare Vinyl Vault at 11:53 PM.',
        derived_facts: [
          {
            subject: 'lila_groove',
            time: '23:53',
            location: 'rare_vinyl_vault',
            statement: 'Lila Groove also appeared at the Rare Vinyl Vault at 11:53 PM.',
            source_card_id: 'f2'
          }
        ]
      },
      {
        card_id: 'fs4',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_004',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'fp4',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_004',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const finalEliminationResult = deriveBundleConclusion({
    context: finalEliminationContext,
    bundleId: 'puzzle_bundle_004',
    bundleIndex: 3,
    currentStateProgression: finalEliminationContext.case_state.state_progression
  });

  assert(finalEliminationResult.conclusion.conclusion_type === 'final_identification', 'final bundle should collapse by eliminating the last non-killer');
  assert(finalEliminationResult.conclusion.affected_suspects[0] === 'max_vinyl', 'final bundle should identify the coreTruth killer');
  assert(finalEliminationResult.conclusion.remaining_viable.length === 1 && finalEliminationResult.conclusion.remaining_viable[0] === 'max_vinyl', 'final bundle should leave only the killer viable');
  assert(finalEliminationResult.conclusion.derived_from_statements.length === 2, 'final collapse should cite the contradiction evidence from the bundle');
  assert(finalEliminationResult.conclusion.reason === 'final_bundle_elimination_collapse', 'final elimination path should preserve its conclusion reason');

  applyBundleDerivation({
    context: finalEliminationContext,
    bundleId: 'puzzle_bundle_004',
    bundleIndex: 3,
    conclusion: finalEliminationResult.conclusion
  });

  const finalEliminationSolutionCard = finalEliminationContext.cards.find((card) => card.bundle_id === 'puzzle_bundle_004' && card.card_type === 'solution');
  assert(finalEliminationSolutionCard.card_contents.includes('removes the last competing suspect'), 'final elimination render should describe collapse by removing the last rival');

  const finalSupportContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl', 'lila_groove'],
        eliminated_suspects: [],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_support_final',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'sf1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_support_final',
        hidden_until_solved: false,
        card_contents: 'Max Vinyl was in the Rare Vinyl Vault at 11:53 PM.',
        derived_facts: [
          {
            subject: 'max_vinyl',
            time: '23:53',
            location: 'rare_vinyl_vault',
            statement: 'Max Vinyl was in the Rare Vinyl Vault at 11:53 PM.',
            source_card_id: 'sf1'
          }
        ]
      },
      {
        card_id: 'sf2',
        card_type: 'item',
        bundle_id: 'puzzle_bundle_support_final',
        hidden_until_solved: false,
        card_contents: 'Max Vinyl handled the vault latch minutes before the murder.',
        derived_facts: [
          {
            subject: 'max_vinyl',
            time: null,
            location: 'rare_vinyl_vault',
            statement: 'Max Vinyl handled the vault latch minutes before the murder.',
            source_card_id: 'sf2'
          }
        ]
      },
      {
        card_id: 'ss1',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_support_final',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'sp1',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_support_final',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  const finalSupportResult = deriveBundleConclusion({
    context: finalSupportContext,
    bundleId: 'puzzle_bundle_support_final',
    bundleIndex: 3,
    currentStateProgression: finalSupportContext.case_state.state_progression
  });

  assert(finalSupportResult.conclusion.reason === 'final_bundle_plausibility', 'direct-support final path should preserve its conclusion reason');

  applyBundleDerivation({
    context: finalSupportContext,
    bundleId: 'puzzle_bundle_support_final',
    bundleIndex: 3,
    conclusion: finalSupportResult.conclusion
  });

  const finalSupportSolutionCard = finalSupportContext.cards.find((card) => card.bundle_id === 'puzzle_bundle_support_final' && card.card_type === 'solution');
  assert(finalSupportSolutionCard.card_contents.includes('directly ties them to the critical evidence'), 'direct-support final render should describe a killer-linked evidence path');

  const wrongFinalContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ],
      state_progression: {
        viable_suspects: ['lila_groove'],
        eliminated_suspects: ['max_vinyl'],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_wrong_final',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'wf1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_wrong_final',
        hidden_until_solved: false,
        card_contents: 'Lila Groove appeared at the Rare Vinyl Vault at 11:53 PM.',
        derived_facts: [
          {
            subject: 'lila_groove',
            time: '23:53',
            location: 'rare_vinyl_vault',
            statement: 'Lila Groove appeared at the Rare Vinyl Vault at 11:53 PM.',
            source_card_id: 'wf1'
          }
        ]
      },
      {
        card_id: 'ws1',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_wrong_final',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'wp1',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_wrong_final',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  let wrongFinalError = null;
  try {
    deriveBundleConclusion({
      context: wrongFinalContext,
      bundleId: 'puzzle_bundle_wrong_final',
      bundleIndex: 3,
      currentStateProgression: wrongFinalContext.case_state.state_progression
    });
  } catch (error) {
    wrongFinalError = error;
  }
  assert(wrongFinalError, 'final bundle should fail when the remaining viable suspect is not the killer');

  const zeroFinalContext = {
    case_state: {
      killer_id: 'max_vinyl',
      murder: {
        location: 'Rare Vinyl Vault'
      },
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ],
      state_progression: {
        viable_suspects: ['max_vinyl'],
        eliminated_suspects: ['lila_groove'],
        constraints: []
      }
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_zero_final',
        actionable_gain: '',
        solution_summary: ''
      }
    ],
    cards: [
      {
        card_id: 'zf1',
        card_type: 'clue',
        bundle_id: 'puzzle_bundle_zero_final',
        hidden_until_solved: false,
        card_contents: 'Max Vinyl was in the Rare Vinyl Vault at 11:53 PM and the Listening Lounge at 11:53 PM.',
        derived_facts: [
          {
            subject: 'max_vinyl',
            time: '23:53',
            location: 'rare_vinyl_vault',
            statement: 'Max Vinyl was in the Rare Vinyl Vault at 11:53 PM.',
            source_card_id: 'zf1'
          },
          {
            subject: 'max_vinyl',
            time: '23:53',
            location: 'listening_lounge',
            statement: 'Max Vinyl was in the Listening Lounge at 11:53 PM.',
            source_card_id: 'zf1'
          }
        ]
      },
      {
        card_id: 'zs1',
        card_type: 'solution',
        bundle_id: 'puzzle_bundle_zero_final',
        hidden_until_solved: true,
        card_title: 'placeholder',
        card_contents: 'placeholder'
      },
      {
        card_id: 'zp1',
        card_type: 'puzzle',
        bundle_id: 'puzzle_bundle_zero_final',
        card_title: 'Bundle puzzle',
        card_contents: 'Bundle puzzle'
      }
    ]
  };

  let zeroFinalError = null;
  try {
    deriveBundleConclusion({
      context: zeroFinalContext,
      bundleId: 'puzzle_bundle_zero_final',
      bundleIndex: 3,
      currentStateProgression: zeroFinalContext.case_state.state_progression
    });
  } catch (error) {
    zeroFinalError = error;
  }
  assert(zeroFinalError, 'final bundle should fail when contradiction removes the killer instead of confirming them');

  console.log('BUNDLE DERIVATION TEST PASSED');
}

run();
