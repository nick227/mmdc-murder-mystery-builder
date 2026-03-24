
export async function solvabilityValidatorAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  const clues = cards.filter((c) => c?.card_type === "clue");
  const puzzles = cards.filter((c) => c?.card_type === "puzzle");

  if (clues.length < 3) {
    throw new Error("Not enough clues generated");
  }

  if (puzzles.length < 1) {
    throw new Error("No puzzles generated");
  }

  const seen = new Set();
  for (const clue of clues) {
    const key = `${clue.card_title || ""}::${clue.card_contents || ""}`.trim().toLowerCase();
    if (!key || key === "::") {
      throw new Error("Invalid clue detected");
    }
    if (seen.has(key)) {
      throw new Error("Duplicate clues detected");
    }
    seen.add(key);
  }

  const forbidden = [
    "is the killer",
    "was the killer",
    "killed",
    "murdered",
    "confirms that",
    "definitively proves"
  ];

  for (const clue of clues) {
    const t = String(clue.card_contents || "").toLowerCase();
    if (forbidden.some((phrase) => t.includes(phrase))) {
      throw new Error("Clue directly states the solution");
    }
  }

  return context;
}
