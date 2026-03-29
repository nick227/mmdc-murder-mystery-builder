function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function isExactTimeFact(fact) {
  return typeof fact?.time === 'string' && /^\d{2}:\d{2}$/.test(fact.time);
}

function isContinuousPresenceStatement(statement) {
  const text = normalizeText(statement);
  return ['continuously', 'continuous', 'stayed', 'remained', 'present throughout'].some((term) => text.includes(term));
}

function getBundleVisibleEvidenceCards(context, bundleId) {
  return (Array.isArray(context?.cards) ? context.cards : []).filter((card) =>
    card?.bundle_id === bundleId
    && ['clue', 'item'].includes(card.card_type)
    && card.hidden_until_solved !== true
  );
}

function getBundleFacts(context, bundleId) {
  return getBundleVisibleEvidenceCards(context, bundleId)
    .flatMap((card) => Array.isArray(card.derived_facts) ? card.derived_facts : []);
}

function getBundleEvidenceTexts(context, bundleId) {
  return getBundleVisibleEvidenceCards(context, bundleId)
    .filter((card) => ['clue', 'item'].includes(card.card_type))
    .map((card) => ({
      card_id: card.card_id,
      text: String(card.card_contents || '').trim()
    }));
}

function getSuspectName(caseState, suspectId) {
  return caseState?.suspects?.find((suspect) => suspect.suspect_id === suspectId)?.name || suspectId;
}

function applyStateDelta(stateProgression, conclusionType, affectedIds, reason) {
  const current = stateProgression || {
    viable_suspects: [],
    eliminated_suspects: [],
    constraints: []
  };

  if (conclusionType === 'suggest_suspect' || conclusionType === 'hold_ambiguity') {
    return {
      viable_suspects: [...(current.viable_suspects || [])],
      eliminated_suspects: [...(current.eliminated_suspects || [])],
      constraints: [...(current.constraints || [])]
    };
  }

  if (conclusionType === 'eliminate_suspect') {
    const eliminationSet = new Set(affectedIds);
    return {
      viable_suspects: (current.viable_suspects || []).filter((id) => !eliminationSet.has(id)),
      eliminated_suspects: [...new Set([...(current.eliminated_suspects || []), ...affectedIds])],
      constraints: [
        ...(current.constraints || []),
        ...affectedIds.map((suspectId) => ({
          type: 'eliminated',
          suspect_id: suspectId,
          reason
        }))
      ]
    };
  }

  return {
    viable_suspects: [...(current.viable_suspects || [])],
    eliminated_suspects: [...(current.eliminated_suspects || [])],
    constraints: [
      ...(current.constraints || []),
      ...affectedIds.map((suspectId) => ({
        type: conclusionType,
        suspect_id: suspectId,
        reason
      }))
    ]
  };
}

function collectSuspectSignals(facts, murderLocation, viableSet) {
  const signals = new Map();

  for (const fact of facts) {
    if (!viableSet.has(fact.subject)) {
      continue;
    }
    if (!signals.has(fact.subject)) {
      signals.set(fact.subject, {
        subject: fact.subject,
        score: 0,
        exact_murder_location_facts: [],
        exact_elsewhere_facts: [],
        continuous_outside_facts: [],
        all_facts: []
      });
    }

    const entry = signals.get(fact.subject);
    entry.all_facts.push(fact);
    entry.score += 1;

    if (fact.location === murderLocation) {
      entry.score += 2;
      if (isExactTimeFact(fact)) {
        entry.score += 1;
        entry.exact_murder_location_facts.push(fact);
      }
    }

    if (fact.location && fact.location !== murderLocation && isExactTimeFact(fact)) {
      entry.score -= 1;
      entry.exact_elsewhere_facts.push(fact);
      if (isContinuousPresenceStatement(fact.statement)) {
        entry.score -= 1;
        entry.continuous_outside_facts.push(fact);
      }
    }
  }

  return signals;
}

function deriveContradictionElimination(signals) {
  const eliminated = [];
  const statements = [];

  for (const [subject, signal] of signals.entries()) {
    const byTime = new Map();
    for (const fact of [...signal.exact_murder_location_facts, ...signal.exact_elsewhere_facts]) {
      const prior = byTime.get(fact.time);
      if (prior && prior.location !== fact.location) {
        if (!eliminated.includes(subject)) {
          eliminated.push(subject);
          statements.push(prior.statement, fact.statement);
        }
      } else {
        byTime.set(fact.time, fact);
      }
    }
  }

  return {
    affected_suspects: eliminated,
    derived_from_statements: [...new Set(statements)],
    reason: 'same_time_different_location_conflict'
  };
}

function sortSignals(signals) {
  return [...signals.values()].sort((a, b) => b.score - a.score || b.all_facts.length - a.all_facts.length);
}

function renderConclusion(conclusion, caseState, bundleIndex) {
  const suspectNames = (conclusion.affected_suspects || []).map((id) => getSuspectName(caseState, id));
  const joinedFacts = (conclusion.derived_from_statements || []).join(' ');

  if (conclusion.conclusion_type === 'eliminate_suspect') {
    return {
      title: `Bundle ${bundleIndex + 1} Eliminates ${suspectNames.join(', ')}`,
      contents: `${suspectNames.join(', ')} is no longer plausible based on a direct conflict inside this bundle's evidence. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.conclusion_type === 'link_to_location') {
    return {
      title: `Bundle ${bundleIndex + 1} Links ${suspectNames[0]} to the Vault`,
      contents: `${suspectNames[0]} is linked to the murder location by this bundle's evidence, which keeps suspicion focused without closing the case. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.conclusion_type === 'weaken_alibi') {
    return {
      title: `Bundle ${bundleIndex + 1} Weakens ${suspectNames[0]}'s Position`,
      contents: `${suspectNames[0]}'s position becomes less convincing once this bundle's location evidence is considered. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.conclusion_type === 'strengthen_suspicion') {
    return {
      title: `Bundle ${bundleIndex + 1} Strengthens Suspicion`,
      contents: `${suspectNames[0]} accumulates the strongest bundle-local signals, making them the leading suspect at this stage. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.conclusion_type === 'suggest_suspect') {
    return {
      title: `Bundle ${bundleIndex + 1} Suggests a Suspect`,
      contents: `${suspectNames[0]} emerges as the most plausible suspect from this bundle's evidence, but the mystery remains open. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.conclusion_type === 'hold_ambiguity') {
    return {
      title: `Bundle ${bundleIndex + 1} Keeps the Field Open`,
      contents: `This bundle adds atmosphere and context without cleanly narrowing the suspect field. ${joinedFacts}`.trim()
    };
  }

  if (conclusion.reason === 'final_bundle_elimination_collapse') {
    return {
      title: `Bundle ${bundleIndex + 1} Final Identification`,
      contents: `${suspectNames[0]} is the final identified killer because this bundle removes the last competing suspect through direct contradiction. ${joinedFacts}`.trim()
    };
  }

  return {
    title: `Bundle ${bundleIndex + 1} Final Identification`,
    contents: `${suspectNames[0]} is the final identified killer because this bundle directly ties them to the critical evidence. ${joinedFacts}`.trim()
  };
}

function deriveSoftConclusion(signals, _murderLocation) {
  const ranked = sortSignals(signals);
  if (!ranked.length) {
    return null;
  }

  const top = ranked[0];
  const topStatements = top.all_facts.map((fact) => fact.statement);

  if (top.exact_murder_location_facts.length > 0) {
    if (top.all_facts.length >= 2) {
      return {
        conclusion_type: 'strengthen_suspicion',
        affected_suspects: [top.subject],
        derived_from_statements: [...new Set(topStatements)],
        reason: 'multiple_bundle_signals'
      };
    }
    return {
      conclusion_type: 'link_to_location',
      affected_suspects: [top.subject],
      derived_from_statements: [...new Set(top.exact_murder_location_facts.map((fact) => fact.statement))],
      reason: 'linked_to_murder_location'
    };
  }

  if (top.continuous_outside_facts.length > 0 || top.exact_elsewhere_facts.length > 0) {
    const statements = top.continuous_outside_facts.length
      ? top.continuous_outside_facts.map((fact) => fact.statement)
      : top.exact_elsewhere_facts.map((fact) => fact.statement);

    return {
      conclusion_type: 'weaken_alibi',
      affected_suspects: [top.subject],
      derived_from_statements: [...new Set(statements)],
      reason: 'exact_time_presence_elsewhere'
    };
  }

  return {
    conclusion_type: 'suggest_suspect',
    affected_suspects: [top.subject],
    derived_from_statements: [...new Set(topStatements)],
    reason: 'bundle_local_plausibility'
  };
}

function deriveMentionFallback(context, bundleId, currentStateProgression) {
  const evidenceTexts = getBundleEvidenceTexts(context, bundleId);
  const viable = Array.isArray(currentStateProgression?.viable_suspects) ? currentStateProgression.viable_suspects : [];
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const candidates = viable
    .map((suspectId) => suspects.find((suspect) => suspect.suspect_id === suspectId))
    .filter(Boolean)
    .map((suspect) => {
      const tokens = [normalizeText(suspect.name), normalizeText(suspect.title)].filter(Boolean);
      const supportingTexts = evidenceTexts
        .map((entry) => entry.text)
        .filter((text) => {
          const normalized = normalizeText(text);
          return tokens.some((token) => token && normalized.includes(token));
        });

      return {
        suspect_id: suspect.suspect_id,
        supportingTexts
      };
    })
    .filter((entry) => entry.supportingTexts.length > 0);

  if (candidates.length !== 1) {
    return null;
  }

  return {
    conclusion_type: 'suggest_suspect',
    affected_suspects: [candidates[0].suspect_id],
    derived_from_statements: candidates[0].supportingTexts,
    reason: 'single_suspect_mentioned_in_bundle'
  };
}

export function deriveBundleConclusion({ context, bundleId, bundleIndex, currentStateProgression }) {
  const caseState = context?.case_state;
  assert(caseState, 'bundle_derivation_agent: case_state missing');

  const bundleFacts = getBundleFacts(context, bundleId).filter((fact) => fact?.subject && fact.subject !== 'scene');
  const murderLocation = toSlug(caseState?.murder?.location || '');
  const viableSet = new Set(currentStateProgression?.viable_suspects || []);

  const signals = collectSuspectSignals(bundleFacts, murderLocation, viableSet);

  const contradiction = deriveContradictionElimination(signals);
  const contradictionNextState = contradiction.affected_suspects.length
    ? applyStateDelta(currentStateProgression, 'eliminate_suspect', contradiction.affected_suspects, contradiction.reason)
    : null;

  if (bundleIndex === 3) {
    if (contradictionNextState && contradictionNextState.viable_suspects.length === 1 && contradictionNextState.viable_suspects[0] === caseState.killer_id) {
      return {
        conclusion: {
          conclusion_type: 'final_identification',
          affected_suspects: [caseState.killer_id],
          remaining_viable: contradictionNextState.viable_suspects,
          derived_from_statements: contradiction.derived_from_statements,
          reason: 'final_bundle_elimination_collapse'
        },
        nextState: {
          ...contradictionNextState,
          constraints: [
            ...(contradictionNextState.constraints || []),
            {
              type: 'final_identification',
              suspect_id: caseState.killer_id,
              reason: 'final_bundle_elimination_collapse'
            }
          ]
        }
      };
    }

    const contradictionTouchesKiller = contradiction.affected_suspects.includes(caseState.killer_id);

    const killerSignal = signals.get(caseState.killer_id);
    const hasStrongKillerSupport = Boolean(
      !contradictionTouchesKiller
      && (!contradictionNextState || contradictionNextState.viable_suspects.includes(caseState.killer_id))
      && killerSignal
      && (
        killerSignal.exact_murder_location_facts.length > 0
        || killerSignal.all_facts.length >= 2
      )
    );

    assert(
      hasStrongKillerSupport,
      `bundle_derivation_agent: final bundle ${bundleId} must reference bundle evidence for killer_id`
    );

    const nextState = {
      viable_suspects: [caseState.killer_id],
      eliminated_suspects: [...new Set([
        ...(currentStateProgression.eliminated_suspects || []),
        ...(currentStateProgression.viable_suspects || []).filter((id) => id !== caseState.killer_id)
      ])],
      constraints: [
        ...(currentStateProgression.constraints || []),
        {
          type: 'final_identification',
          suspect_id: caseState.killer_id,
          reason: 'final_bundle_plausibility'
        }
      ]
    };

    return {
      conclusion: {
        conclusion_type: 'final_identification',
        affected_suspects: [caseState.killer_id],
        remaining_viable: nextState.viable_suspects,
        derived_from_statements: [...new Set(killerSignal.all_facts.map((fact) => fact.statement))],
        reason: 'final_bundle_plausibility'
      },
      nextState
    };
  }

  if (contradiction.affected_suspects.length) {
    return {
      conclusion: {
        conclusion_type: 'eliminate_suspect',
        affected_suspects: contradiction.affected_suspects,
        remaining_viable: contradictionNextState.viable_suspects,
        derived_from_statements: contradiction.derived_from_statements,
        reason: contradiction.reason
      },
      nextState: contradictionNextState
    };
  }

  const softConclusion = deriveSoftConclusion(signals, murderLocation);
  const fallbackConclusion = softConclusion || deriveMentionFallback(context, bundleId, currentStateProgression);
  const finalConclusion = fallbackConclusion || {
    conclusion_type: 'hold_ambiguity',
    affected_suspects: [],
    derived_from_statements: getBundleVisibleEvidenceCards(context, bundleId)
      .map((card) => String(card.card_contents || '').trim())
      .filter(Boolean)
      .slice(0, 2),
    reason: 'no_clear_bundle_local_signal'
  };

  const nextState = applyStateDelta(
    currentStateProgression,
    finalConclusion.conclusion_type,
    finalConclusion.affected_suspects,
    finalConclusion.reason
  );

  return {
    conclusion: {
      conclusion_type: finalConclusion.conclusion_type,
      affected_suspects: finalConclusion.affected_suspects,
      remaining_viable: nextState.viable_suspects,
      derived_from_statements: finalConclusion.derived_from_statements,
      reason: finalConclusion.reason
    },
    nextState
  };
}

export function applyBundleDerivation({ context, bundleId, bundleIndex, conclusion }) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const caseState = context?.case_state;
  const rendered = renderConclusion(conclusion, caseState, bundleIndex);

  context.cards = cards.map((card) => {
    if (card?.bundle_id !== bundleId) {
      return card;
    }
    if (card.card_type === 'solution') {
      return {
        ...card,
        card_title: rendered.title,
        card_contents: rendered.contents,
        derived_conclusion: conclusion
      };
    }
    if (card.card_type === 'puzzle') {
      const actionableGainMap = {
        suggest_suspect: 'Use the visible evidence to suggest the most plausible suspect in this bundle.',
        strengthen_suspicion: 'Use the visible evidence to strengthen suspicion around one suspect.',
        weaken_alibi: 'Use the visible evidence to weaken one suspect position or alibi.',
        link_to_location: 'Use the visible evidence to link one suspect to the murder location.',
        eliminate_suspect: 'Use the visible evidence to eliminate one suspect through direct contradiction.',
        hold_ambiguity: 'Use the visible evidence to keep the suspect field open while preserving ambiguity.',
        final_identification: 'Use the visible evidence to make the final identification.'
      };

      return {
        ...card,
        actionable_gain: actionableGainMap[conclusion.conclusion_type] || card.actionable_gain,
        solution_summary: rendered.contents,
        derived_conclusion: conclusion
      };
    }
    return card;
  });

  const bundle = (context.puzzle_bundles || []).find((entry) => entry.bundle_id === bundleId);
  if (bundle) {
    bundle.actionable_gain = context.cards.find((card) => card.bundle_id === bundleId && card.card_type === 'puzzle')?.actionable_gain || bundle.actionable_gain;
    bundle.solution_summary = rendered.contents;
  }

  return context;
}
