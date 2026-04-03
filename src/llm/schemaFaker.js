/** Generate JSON-shaped objects from a JSON Schema (for smoke / test doubles). */

export function fakeFromSchema(schema, parentKey = 'root', index = 0) {
  if (!schema?.properties) {
    return {};
  }

  const obj = {};
  for (const key of Object.keys(schema.properties)) {
    obj[key] = fakeValue(schema.properties[key], `${parentKey}.${key}`, index);
  }
  return obj;
}

function fakeValue(def, key, index) {
  if (!def) {
    return null;
  }

  if (Array.isArray(def.enum) && def.enum.length > 0) {
    return def.enum[0];
  }

  const types = Array.isArray(def.type) ? def.type : [def.type];

  if (types.includes('string')) {
    return `mock_${key || 'string'}_${index}`;
  }
  if (types.includes('integer') || types.includes('number')) {
    return 1;
  }
  if (types.includes('boolean')) {
    return true;
  }

  if (types.includes('array')) {
    const length = Number.isInteger(def.minItems) ? def.minItems : 1;
    return Array.from({ length }, (_v, i) => fakeValue(def.items, key, i + 1));
  }

  if (types.includes('object')) {
    return fakeFromSchema(def, key, index);
  }

  return `mock_${key || 'value'}_${index}`;
}
