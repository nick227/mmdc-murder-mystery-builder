
export function assignEvidenceDefaults(cards) {
  return cards.map((c, i) => {
    if (c.card_type !== 'clue') {
      return c;
    }

    if (!c.clue_id) {
      c.clue_id = `clue_${i}`;
    }

    if (!c.evidence_strength) {
      if (c.act === 1) {
        c.evidence_strength = 'weak';
      } else if (c.act === 2) {
        c.evidence_strength = 'supporting';
      } else {
        c.evidence_strength = 'strong';
      }
    }

    if (!c.requires) {
      c.requires = c.evidence_strength === 'strong' ? ['cross_reference'] : [];
    }

    return c;
  });
}
