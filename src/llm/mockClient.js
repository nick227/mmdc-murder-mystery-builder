export async function callText() {
  return 'mock response';
}

export async function callJson({ schema }) {
  return fakeFromSchema(schema);
}

function fakeFromSchema(schema) {
  if (!schema?.properties) {
    return {};
  }

  const obj = {};

  for (const key of Object.keys(schema.properties)) {
    obj[key] = fakeValue(schema.properties[key], key);
  }

  // auto-fix cards
  if (Array.isArray(obj.cards)) {
    obj.cards = obj.cards.map((c, i) => ({
      card_type: c.card_type || 'mock',
      card_title: c.card_title || `Mock Card ${i + 1}`,
      card_contents: c.card_contents || 'mock',
      act: normalizeAct(c.act, i)
    }));
  }

  return obj;
}

function normalizeAct(v, i) {
  if (v === 1 || v === 2 || v === 3) {
    return v;
  }
  return (i % 3) + 1;
}

function fakeValue(def, _key) {
  if (!def) {
    return null;
  }

  if (def.type === 'string') {
    return 'mock';
  }
  if (def.type === 'number') {
    return 1;
  }
  if (def.type === 'boolean') {
    return true;
  }
  if (def.type === 'array') {
    return [];
  }
  if (def.type === 'object') {
    return {};
  }
  return null;
}
