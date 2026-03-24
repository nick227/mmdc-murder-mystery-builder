
import { callJson } from "../llm/client.js";
import { ambiguityReviewSchema } from "../schemas/ambiguityReviewSchema.js";

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

export async function ambiguityBalancerAgent(context) {

  const cards = ensureArray(context.cards);

  const candidates = cards
    .map((c, i) => ({ ...c, card_index: i }))
    .filter(c =>
      c.card_type === "clue" ||
      c.card_type === "puzzle" ||
      c.card_type === "item"
    );

  if (!candidates.length) {
    return context;
  }

  const prompt = {
    system: `
You balance ambiguity in a deduction-based murder mystery.

The killer must not be identifiable until multiple clues are combined.

If one suspect accumulates too many strong clues, redistribute or weaken them.

No suspect should simultaneously have:
- clear motive
- clear opportunity
- weapon linkage

before act 3.

Distribute:
- motive across suspects
- opportunity across suspects
- weapon access across suspects

You may:
- rewrite clues
- shift acts later
- introduce shared access
- weaken direct attribution
- remove exclusive evidence
`.trim(),

    user: `
Story:
${context.storyBlurb || ""}

True killer:
${context.solutions?.killer || "unknown"}

Solution:
${JSON.stringify(context.solutions || {}, null, 2)}

Cards:
${JSON.stringify(candidates, null, 2)}

Review and rebalance ambiguity.
Rewrite only when necessary.
Return rewritten card text where needed.
`.trim()
  };

  const result = await callJson({
    ...prompt,
    schemaName: "ambiguity_review",
    schema: ambiguityReviewSchema
  });

  const adjustments = ensureArray(result.adjustments);

  adjustments.forEach(adj => {
    const card = cards[adj.card_index];
    if (!card) return;

    if (typeof adj.title === "string" && adj.title.trim().length > 3) {
      card.card_title = adj.title.trim();
    }

    if (typeof adj.rewrite === "string" && adj.rewrite.trim().length > 10) {
      card.card_contents = adj.rewrite.trim();
    }

    if (adj.act === 1 || adj.act === 2 || adj.act === 3) {
      card.act = adj.act;
    }
  });

  context.cards = cards;
  context.ambiguity_review = result.summary;

  return context;
}
