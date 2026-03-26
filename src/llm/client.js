import { safeJson } from '../utils/json.js';
import { recordUsage } from './costLedger.js';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const SMOKE = process.env.SMOKE_MODE === 'true';
let smokeCallSeq = 0;

async function call(body) {
  const res = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error('OpenAI error: ' + t);
  }

  return res.json();
}

export async function callText(opts) {
  if (SMOKE) {
    return 'SMOKE_MODE_TEXT';
  }

  const jsonResp = await call({
    model: MODEL,
    temperature: opts.temperature ?? 0.7,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user }
    ]
  });

  recordUsage({
    requestType: 'text',
    schemaName: null,
    model: jsonResp?.model || MODEL,
    usage: jsonResp?.usage || {}
  });

  return jsonResp.choices?.[0]?.message?.content?.trim?.() || '';
}

export async function callJson(opts) {
  if (SMOKE) {
    smokeCallSeq += 1;
    return fakeFromSchema(opts?.schema, `root${smokeCallSeq}`, 0);
  }

  if (!opts?.schemaName) {
    throw new Error('callJson requires schemaName');
  }
  if (!opts?.schema) {
    throw new Error('callJson requires schema');
  }

  const jsonResp = await call({
    model: MODEL,
    temperature: opts.temperature ?? 0.4,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: opts.schemaName,
        schema: opts.schema,
        strict: true
      }
    },
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user }
    ]
  });

  recordUsage({
    requestType: 'json',
    schemaName: opts.schemaName ?? null,
    model: jsonResp?.model || MODEL,
    usage: jsonResp?.usage || {}
  });

  const content = jsonResp.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM returned empty JSON response');
  }

  const parsed = safeJson(content);

  if (!parsed || Object.keys(parsed).length === 0) {
    console.log('INVALID JSON FROM LLM:');
    console.log(content);
    throw new Error('LLM returned empty JSON object');
  }

  return parsed;
}

function fakeFromSchema(schema, parentKey = 'root', index = 0) {
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
