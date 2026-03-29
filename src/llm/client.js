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
    const smokeOverride = fakeSmokeResponse(opts);
    if (smokeOverride) {
      return smokeOverride;
    }
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

function fakeSmokeResponse(opts) {
  const schemaName = String(opts?.schemaName || '').trim();
  if (schemaName === 'core_truth') {
    return fakeSmokeCoreTruth(opts);
  }
  if (schemaName === 'clue_targets') {
    return fakeSmokeClueTargets(opts);
  }
  if (schemaName === 'puzzle_bundle') {
    return fakeSmokePuzzleBundle(opts);
  }
  return null;
}

function fakeSmokeCoreTruth(opts) {
  const user = String(opts?.user || '');
  const playableCharacters = extractJsonBlock(user, 'Playable characters:', 'World:');
  const firstCharacter = Array.isArray(playableCharacters) ? playableCharacters[0] : null;
  const killer = String(firstCharacter?.card_title || firstCharacter?.name || 'Smoke Character 1').trim();

  return {
    murder: {
      killer,
      location: 'Smoke Test Ballroom',
      method: 'Poisoned champagne flute',
      motive: 'To seize control of the disputed inheritance',
      summary: `${killer} poisoned the host during the toast in the Smoke Test Ballroom and staged the scene as confusion after the band started.`,
      opportunity: `${killer} controlled the toast setup and had a private moment with the glasses before guests gathered.`,
      why_others_could_not: [
        'Second Smoke Character was on stage when the toast began.',
        'Third Smoke Character was seen in the foyer greeting late arrivals.',
        'Fourth Smoke Character had no access to the champagne service table.'
      ]
    },
    treasure: {
      object: 'The smoke test inheritance ledger',
      hiding_place: 'Inside the false bottom of the ballroom podium',
      concealment: 'Wrapped in sheet music beneath the podium drawer',
      significance: 'It proves who controls the estate holdings.',
      discovery_path: 'Players can trace the podium key, the sheet music clue, and the hidden compartment.'
    }
  };
}

function fakeSmokeClueTargets(opts) {
  const user = String(opts?.user || '');
  const playableCharacters = extractJsonBlock(user, 'Playable characters:', 'World:');
  const coreTruth = extractJsonBlock(user, 'Core truth:', 'Playable characters:');
  const chars = Array.isArray(playableCharacters) ? playableCharacters : [];
  const fallbackKiller = String(coreTruth?.murder?.killer || 'mock_root3.cards.card_title_1').trim();
  const t0 = String(chars[0]?.card_title || fallbackKiller).trim();
  const t1 = String(chars[1]?.card_title || fallbackKiller).trim();
  const t2 = String(chars[2]?.card_title || fallbackKiller).trim();
  const t3 = String(chars[3]?.card_title || fallbackKiller).trim();
  const name0 = t0.split(',')[0].trim();
  const name1 = t1.split(',')[0].trim();
  const name2 = t2.split(',')[0].trim();
  const name3 = t3.split(',')[0].trim();
  const loc = String(coreTruth?.murder?.location || 'Smoke Test Ballroom');
  const obj = String(coreTruth?.treasure?.object || 'smoke test inheritance ledger');

  return {
    targets: [
      {
        fact: `${name0} was recorded in ${loc} before the toast.`,
        category: 'location',
        act: 1,
        puzzle_type_hint: 'cross_reference',
        difficulty_hint: 'easy'
      },
      {
        fact: `${name1} had access to the champagne service during the crime window.`,
        category: 'access',
        act: 2,
        puzzle_type_hint: 'elimination',
        difficulty_hint: 'medium'
      },
      {
        fact: `${name2} was seen in the foyer at 9:12 PM per the security log.`,
        category: 'movement',
        act: 3,
        puzzle_type_hint: 'timeline',
        difficulty_hint: 'medium'
      },
      {
        fact: `The ${obj} shows fingerprints consistent with ${name3} on the podium latch.`,
        category: 'object',
        act: 3,
        puzzle_type_hint: 'item_combination',
        difficulty_hint: 'hard'
      }
    ]
  };
}

function fakeSmokePuzzleBundle(opts) {
  const user = String(opts?.user || '');
  const targetFactMatch = user.match(/Target clue fact:\s*([\s\S]*?)\n\s*Target category:/i);
  const targetFact = String(targetFactMatch?.[1] || 'A smoke clue fact.').trim();

  return {
    cards: [
      {
        card_type: 'evidence',
        card_title: 'Evidence A',
        card_contents: targetFact
      },
      {
        card_type: 'evidence',
        card_title: 'Evidence B',
        card_contents: `A second visible evidence record that supports this same fact: ${targetFact}`
      },
      {
        card_type: 'evidence',
        card_title: 'Evidence C',
        card_contents: 'A third visible evidence record that confirms the same event.'
      },
      {
        card_type: 'puzzle',
        card_title: 'Smoke Puzzle',
        card_contents: 'Use the visible evidence to identify the single concrete fact it reveals.'
      },
      {
        card_type: 'solution',
        card_title: 'Smoke Clue',
        card_contents: targetFact
      }
    ]
  };
}

function extractJsonBlock(text, startLabel, endLabel) {
  const source = String(text || '');
  const start = source.indexOf(startLabel);
  if (start === -1) {
    return null;
  }

  const afterStart = source.slice(start + startLabel.length);
  const end = endLabel ? afterStart.indexOf(endLabel) : -1;
  const block = (end === -1 ? afterStart : afterStart.slice(0, end)).trim();

  try {
    return safeJson(block);
  } catch {
    return null;
  }
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
