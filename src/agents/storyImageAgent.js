import fs from 'node:fs';
import path from 'node:path';

import { generateFluxPngBuffer } from '../providers/dezgo/dezgoFluxClient.js';
import { cloudflareR2Service } from '../storage/cloudflare/CloudflareR2Service.js';
import { getStoryBlurb } from '../utils/context.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getFallbackUrl({ runId, size = 1024 }) {
  const seed = encodeURIComponent(`${runId || 'run'}-story`);
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function buildStoryPrompt(context) {
  const storyBlurb = getStoryBlurb(context);
  const title = String(context?.story_title || '').trim();
  const themes = String(context?.story_themes || '').trim();
  const rating = String(context?.story_rating || '').trim();
  const description = String(context?.story_description || '').trim();

  return [
    'Cover illustration for a murder mystery party story.',
    'No text, no letters, no watermarks, no logos.',
    title ? `Title: ${title}` : '',
    themes ? `Themes: ${themes}` : '',
    rating ? `Rating: ${rating}` : '',
    description ? `Description: ${description}` : '',
    storyBlurb ? `Story blurb: ${storyBlurb}` : ''
  ].filter(Boolean).join('\n');
}

export async function storyImageAgent(context) {
  const runId = context?.runId;
  const runDir = context?.runDir;
  const smoke = process.env.SMOKE_MODE === 'true';

  if (context?.storyImage) {
    return context;
  }

  if (!runId || !String(runId).trim()) {
    throw new Error('story_image_agent: context.runId is required');
  }
  if (!runDir || !String(runDir).trim()) {
    throw new Error('story_image_agent: context.runDir is required');
  }

  const localDir = path.join(runDir, 'images', 'story');
  ensureDir(localDir);
  const localPath = path.join(localDir, 'story.png');
  const r2Key = `images/${runId}/story/story.png`;

  console.log('story_image_agent: generate');

  if (smoke) {
    context.storyImage = `smoke://images/${runId}/story/story.png`;
    console.log(`story_image_agent: uploaded key=${r2Key} url=${context.storyImage}`);
    return context;
  }

  if (!cloudflareR2Service.isInitialized()) {
    const fallbackUrl = getFallbackUrl({ runId });
    context.storyImage = fallbackUrl;
    console.log(`story_image_agent: fallback url=${fallbackUrl}`);
    return context;
  }

  try {
    const prompt = buildStoryPrompt(context);
    const buffer = await generateFluxPngBuffer(prompt);
    fs.writeFileSync(localPath, buffer);
    const url = await cloudflareR2Service.saveImage(buffer, r2Key, { contentType: 'image/png' });
    context.storyImage = url;
    console.log(`story_image_agent: uploaded key=${r2Key} url=${url}`);
    return context;
  } catch (err) {
    const msg = String(err?.message || err);
    console.log(`story_image_agent: error provider=dezgo|r2 msg=${msg}`);
    const fallbackUrl = getFallbackUrl({ runId });
    context.storyImage = fallbackUrl;
    console.log(`story_image_agent: fallback url=${fallbackUrl}`);
    return context;
  }
}

