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

function fakeValue(def) {
  if (!def) {
    return null;
  }

  if (Array.isArray(def.enum) && def.enum.length > 0) {
    return def.enum[0];
  }

  const types = Array.isArray(def.type) ? def.type : [def.type];

  if (types.includes('string')) {
    return 'mock';
  }
  if (types.includes('integer') || types.includes('number')) {
    return 1;
  }
  if (types.includes('boolean')) {
    return true;
  }
  if (types.includes('array')) {
    const length = Number.isInteger(def.minItems) ? def.minItems : 1;
    return Array.from({ length }, () => fakeValue(def.items));
  }
  if (types.includes('object')) {
    return fakeFromSchema(def);
  }
  return null;
}
