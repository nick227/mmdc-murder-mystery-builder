import { safeJson } from '../utils/json.js';
import { recordUsage } from './costLedger.js';
import { nextSmokeCallJson } from './smoke/smokeCallJson.js';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const SMOKE = process.env.SMOKE_MODE === 'true';

async function call(body) {
  const res = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${t}`);
  }

  return res.json();
}

function chatCompletionPayload(opts, extra) {
  return {
    model: MODEL,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user }
    ],
    ...extra
  };
}

export async function callText(opts) {
  if (SMOKE) {
    return 'SMOKE_MODE_TEXT';
  }

  const jsonResp = await call(
    chatCompletionPayload(opts, { temperature: opts.temperature ?? 0.7 })
  );

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
    return nextSmokeCallJson(opts);
  }

  if (!opts?.schemaName) {
    throw new Error('callJson requires schemaName');
  }
  if (!opts?.schema) {
    throw new Error('callJson requires schema');
  }

  const jsonResp = await call(
    chatCompletionPayload(opts, {
      temperature: opts.temperature ?? 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName,
          schema: opts.schema,
          strict: true
        }
      }
    })
  );

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
