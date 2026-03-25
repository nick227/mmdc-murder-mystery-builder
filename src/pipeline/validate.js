function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateContext(context, options = {}) {
  const { allowPartial = false } = options;

  assert(isObject(context), 'pipeline context must be an object');

  if (!allowPartial || context.runId !== undefined) {
    assert(typeof context.runId === 'string' || context.runId === null, 'context.runId must be a string or null');
  }

  if (!allowPartial || context.runDir !== undefined) {
    assert(typeof context.runDir === 'string' || context.runDir === null, 'context.runDir must be a string or null');
  }

  if (!allowPartial || context.userPrompt !== undefined) {
    assert(typeof context.userPrompt === 'string', 'context.userPrompt must be a string');
  }

  if (context.playerCount !== undefined && context.playerCount !== null) {
    context.playerCount = Number(context.playerCount);
  }

  if (!allowPartial || context.playerCount !== undefined) {
    assert(Number.isFinite(context.playerCount), 'context.playerCount must be a finite number');
  }

  if (context.cards !== undefined) {
    assert(Array.isArray(context.cards), 'context.cards must be an array');

    for (const [index, card] of context.cards.entries()) {
      assert(isObject(card), `context.cards[${index}] must be an object`);

      if (card.card_type !== undefined) {
        assert(typeof card.card_type === 'string', `context.cards[${index}].card_type must be a string`);
      }
      if (card.card_title !== undefined) {
        assert(typeof card.card_title === 'string', `context.cards[${index}].card_title must be a string`);
      }
      if (card.card_contents !== undefined) {
        assert(typeof card.card_contents === 'string', `context.cards[${index}].card_contents must be a string`);
      }
      if (card.act !== undefined && card.act !== null) {
        assert([1, 2, 3].includes(card.act), `context.cards[${index}].act must be 1, 2, or 3`);
      }
    }
  }

  return context;
}
