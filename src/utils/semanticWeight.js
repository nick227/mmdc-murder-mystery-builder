export function semanticWeight(n) {
  const support = (n.supporting_evidence || []).length * 2;
  // Contradiction hooks are intentionally excluded from the balance score.
  // The true killer is expected to accumulate more contradiction hooks in Act 3
  // as the deduction arc tightens. Including them here would cause the
  // narrativeValidatorAgent to fight against intentional asymmetry via retries.
  const mislead = (n.misleading_evidence || []).length * 1;

  const motive = n.motive ? 1 : 0;
  const opportunity = n.opportunity ? 1 : 0;

  return support + motive + opportunity - mislead;
}

export function balanced(narratives) {
  const list = [narratives.a, narratives.b, narratives.c];
  const weights = list.map(semanticWeight);
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  // Tolerance raised from 2 → 4 to permit the killer's narrative to carry
  // more supporting evidence than red-herring suspects by Act 3 without
  // triggering unnecessary re-generation retries.
  return (max - min) <= 4;
}
