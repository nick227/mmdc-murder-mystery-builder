export function buildNarrativeSummary(narratives) {
  if (!narratives) {
    return undefined;
  }

  const pick = (n) =>
    n
      ? {
        suspect: n.suspect,
        motive: n.motive,
        opportunity: n.opportunity,
        contradiction_hooks: n.contradiction_hooks || []
      }
      : undefined;

  return {
    a: pick(narratives.a),
    b: pick(narratives.b),
    c: pick(narratives.c)
  };
}
