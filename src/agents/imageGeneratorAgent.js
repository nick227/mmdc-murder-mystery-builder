import fs from 'node:fs';
import path from 'node:path';

import { generateFluxPngBuffer } from '../providers/dezgo/dezgoFluxClient.js';
import { cloudflareR2Service } from '../storage/cloudflare/CloudflareR2Service.js';
import { defaultPromptBuilder, promptBuilders } from './image/promptBuilders.js';

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getFallbackUrl({ runId, cardType, cardId, suffix, size = 1024 }) {
  const seed = encodeURIComponent(`${runId || 'run'}-${cardType || 'card'}-${cardId || 'id'}${suffix || ''}`);
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function shouldRegenerate(card, { force }) {
  if (force === true) {
    return true;
  }
  return card?.regenerate_image === true;
}

function shouldSkip(card, { force }) {
  if (shouldRegenerate(card, { force })) {
    return false;
  }
  return Boolean(card?.image_url);
}

function buildPrompt(card, context) {
  const type = String(card?.card_type || '').trim();
  const builder = promptBuilders[type];
  if (typeof builder === 'function') {
    return builder(card, context);
  }
  return defaultPromptBuilder(card, context);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getLocalImagePath({ runDir, cardType, cardId, suffix }) {
  return path.join(runDir, 'images', cardType, `${cardId}${suffix}.png`);
}

function getR2Key({ runId, cardType, cardId, suffix }) {
  return `images/${runId}/${cardType}/${cardId}${suffix}.png`;
}

function assertConfigured({ runId, runDir }) {
  if (!runId || !String(runId).trim()) {
    throw new Error('image_agent: context.runId is required');
  }
  if (!runDir || !String(runDir).trim()) {
    throw new Error('image_agent: context.runDir is required');
  }
}

export async function imageGeneratorAgent(context, options = {}) {
  const types = Array.isArray(options.types) ? options.types.map(String) : [];
  const force = options.force === true;

  if (!types.length) {
    return context;
  }

  const runId = context?.runId;
  const runDir = context?.runDir;

  // In SMOKE_MODE we avoid external calls but still exercise the pipeline mutation.
  const smoke = process.env.SMOKE_MODE === 'true';

  if (!smoke) {
    assertConfigured({ runId, runDir });
  }

  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const eligible = cards.filter((card) => types.includes(card?.card_type));

  for (const card of eligible) {
    const cardType = String(card?.card_type || '').trim();
    const cardId = String(card?.card_id || '').trim();
    if (!cardId) {
      throw new Error(`image_agent: card is missing card_id (type=${cardType})`);
    }

    if (shouldSkip(card, { force })) {
      console.log(`image_agent: skip card_id=${cardId} type=${cardType} (has image_url)`);
      continue;
    }

    const regenerate = shouldRegenerate(card, { force });
    const suffix = regenerate ? `-${nowStamp()}` : '';
    const action = regenerate ? 'regenerate' : 'generate';
    const reason = force ? 'force' : (card?.regenerate_image === true ? 'per-card' : '');

    console.log(
      regenerate
        ? `image_agent: ${action} card_id=${cardId} type=${cardType} reason=${reason}`
        : `image_agent: ${action} card_id=${cardId} type=${cardType}`
    );

    const prompt = buildPrompt(card, context);

    const localDir = path.join(runDir, 'images', cardType);
    ensureDir(localDir);

    const localPath = getLocalImagePath({ runDir, cardType, cardId, suffix });
    const r2Key = getR2Key({ runId, cardType, cardId, suffix });

    try {
      if (smoke) {
        card.image_url = `smoke://images/${runId}/${cardType}/${cardId}${suffix}.png`;
        console.log(`image_agent: uploaded key=${r2Key} url=${card.image_url}`);
        continue;
      }

      if (!cloudflareR2Service.isInitialized()) {
        const fallbackUrl = getFallbackUrl({ runId, cardType, cardId, suffix });
        card.image_url = fallbackUrl;
        console.log(`image_agent: fallback card_id=${cardId} type=${cardType} url=${fallbackUrl}`);
        continue;
      }

      const buffer = await generateFluxPngBuffer(prompt);
      fs.writeFileSync(localPath, buffer);

      const url = await cloudflareR2Service.saveImage(buffer, r2Key, { contentType: 'image/png' });
      card.image_url = url;

      console.log(`image_agent: uploaded key=${r2Key} url=${url}`);
    } catch (err) {
      const msg = String(err?.message || err);
      console.log(`image_agent: error card_id=${cardId} provider=dezgo|r2 msg=${msg}`);
      const fallbackUrl = getFallbackUrl({ runId, cardType, cardId, suffix });
      card.image_url = fallbackUrl;
      console.log(`image_agent: fallback card_id=${cardId} type=${cardType} url=${fallbackUrl}`);
    }
  }

  return context;
}

