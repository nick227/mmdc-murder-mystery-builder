
export function validateEvidenceStructure(cards) {
  const errors = [];

  for (const c of cards) {
    if (c.card_type !== 'clue') {
      continue;
    }

    if (!c.evidence_strength) {
      errors.push(`missing evidence_strength: ${c.card_title}`);
    }

    if (c.evidence_strength === 'strong' && (!c.requires || !c.requires.length)) {
      errors.push(`strong clue missing requires: ${c.card_title}`);
    }

    if (c.evidence_strength === 'decisive') {
      errors.push(`decisive clues not allowed: ${c.card_title}`);
    }
  }

  return errors;
}
