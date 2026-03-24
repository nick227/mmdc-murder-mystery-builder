export function semanticWeight(n) {
  const support = (n.supporting_evidence || []).length * 2;
  const contradictions = (n.contradiction_hooks || []).length * 2;
  const mislead = (n.misleading_evidence || []).length * 1;

  const motive = n.motive ? 1 : 0;
  const opportunity = n.opportunity ? 1 : 0;

  return support + contradictions + motive + opportunity - mislead;
}

export function balanced(narratives) {
  const list = [narratives.a, narratives.b, narratives.c];
  const weights = list.map(semanticWeight);
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  return (max - min) <= 2;
}
