
export async function cardQualityAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  // Remove structurally invalid cards (missing required fields).
  const valid = cards.filter(
    (c) => c && c.card_type && c.card_title?.trim() && c.card_contents?.trim()
  );

  // Deduplicate by title+contents key (case-insensitive).
  // Runs after ambiguityBalancerAgent may have rewritten text, so catches
  // any rewrites that converged on identical content.
  const seen = new Set();
  context.cards = valid.filter((c) => {
    const key = `${c.card_type}::${c.card_title}::${c.card_contents}`.toLowerCase().trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return context;
}
