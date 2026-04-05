import crypto from 'node:crypto';

import { callJson } from '../llm/client.js';
import { buildClueBriefsPrompt, buildClueProsePrompt } from '../prompts/cluesPrompt.js';
import { clueBriefsArraySchema } from '../schemas/clueBriefSchema.js';
import { clueProseArraySchema } from '../schemas/clueProseSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb, getStoryMetaForPrompts } from '../utils/context.js';
import { truncateToWordCount, MAX_STANDALONE_CLUE_WORDS } from '../utils/clueTextSanitize.js';
import { getMurderCanonRef } from '../utils/canonFacts.js';
import { DEFAULT_CLUES_PER_PLAYER, coerceNonNegativeInt } from '../config/generationDefaults.js';

const DEFAULT_CLUE_WEIGHT = 'mid';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSuspectRoster(context, characters = []) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  if (suspects.length) {
    return suspects.map((suspect) => ({
      suspect_id: String(suspect?.suspect_id || '').trim(),
      name: String(suspect?.name || '').trim(),
      title: String(suspect?.title || suspect?.name || '').trim()
    })).filter((s) => s.suspect_id && (s.name || s.title));
  }

  return (Array.isArray(characters) ? characters : [])
    .map((c) => String(c?.card_title || '').split(',')[0].trim())
    .filter(Boolean)
    .map((name) => ({
      suspect_id: normalizeText(name).replace(/\s+/g, '_'),
      name,
      title: name
    }));
}

function normalizeCardTitle(value, index) {
  const title = String(value || '').trim();
  return title || `Clue ${index + 1}`;
}

function resolveTargetId(targetName, suspectRoster) {
  const normalized = normalizeText(targetName);
  if (!normalized) {
    return null;
  }
  const match = suspectRoster.find((suspect) =>
    normalizeText(suspect.name) === normalized
    || normalizeText(suspect.title) === normalized
  );
  return match?.suspect_id || null;
}

function normalizeWeight(value) {
  const weight = String(value || '').trim().toLowerCase();
  if (weight === 'low' || weight === 'mid' || weight === 'high') {
    return weight;
  }
  return DEFAULT_CLUE_WEIGHT;
}

async function generateClueBriefs(context, totalClues, suspectRoster, callJsonImpl = callJson) {
  const prompt = buildClueBriefsPrompt({
    storyBlurb: getStoryBlurb(context),
    storyMeta: getStoryMetaForPrompts(context),
    coreTruth: context.coreTruth,
    suspectRoster,
    totalClues
  });

  const result = await callJsonImpl({
    ...prompt,
    schemaName: 'clue_briefs',
    schema: clueBriefsArraySchema(totalClues, totalClues)
  });

  const briefs = Array.isArray(result?.briefs) ? result.briefs : [];
  if (briefs.length < totalClues) {
    throw new Error(`clue_agent expected ${totalClues} briefs, got ${briefs.length}`);
  }

  return briefs.slice(0, totalClues);
}

async function generateClueProse(context, briefs, callJsonImpl = callJson) {
  const prompt = buildClueProsePrompt({
    storyBlurb: getStoryBlurb(context),
    storyMeta: getStoryMetaForPrompts(context),
    victim: String(context?.coreTruth?.murder?.victim || 'the victim').trim(),
    location: String(context?.coreTruth?.murder?.location || 'the crime scene').trim(),
    briefs
  });

  const result = await callJsonImpl({
    ...prompt,
    schemaName: 'clue_prose',
    schema: clueProseArraySchema(briefs.length, briefs.length)
  });

  const cards = Array.isArray(result?.cards) ? result.cards : [];
  if (cards.length < briefs.length) {
    throw new Error(`clue_agent expected ${briefs.length} prose cards, got ${cards.length}`);
  }

  return cards.slice(0, briefs.length);
}

export async function clueAgent(context, options = {}) {
  const callJsonImpl = typeof options.callJsonImpl === 'function' ? options.callJsonImpl : callJson;
  const numPlayers = Number.isFinite(Number(options.numPlayers))
    ? Number(options.numPlayers)
    : Number(context?.playerCount || 4);
  const cluesPerPlayer = Number.isFinite(Number(options.cluesPerPlayer))
    ? coerceNonNegativeInt(options.cluesPerPlayer, DEFAULT_CLUES_PER_PLAYER)
    : coerceNonNegativeInt(context?.cluesPerPlayer, DEFAULT_CLUES_PER_PLAYER);
  if (cluesPerPlayer === 0) {
    return context;
  }
  const totalClues = Math.max(0, numPlayers * cluesPerPlayer);
  if (totalClues === 0) {
    return context;
  }

  const characters = getCharacterCards(context?.cards);
  const suspectRoster = buildSuspectRoster(context, characters);

  const briefs = await generateClueBriefs(context, totalClues, suspectRoster, callJsonImpl);
  const proseCards = await generateClueProse(context, briefs, callJsonImpl);
  const murderCanon = getMurderCanonRef(context.coreTruth);

  const cards = briefs.map((brief, index) => {
    const rawTargetName = brief?.target_name === null ? null : String(brief?.target_name || '').trim();
    const targetId = rawTargetName ? resolveTargetId(rawTargetName, suspectRoster) : null;
    const targetName = targetId ? rawTargetName : null;
    if (rawTargetName && !targetId) {
      context.debug ??= {};
      context.debug.warning_log ??= [];
      context.debug.warning_log.push({
        stage: 'clue_agent',
        reason: 'unmatched_target_name',
        message: `brief ${index + 1} target_name "${rawTargetName}" not in suspect roster`
      });
    }

    return {
      card_id: crypto.randomUUID(),
      card_type: 'clue',
      card_title: normalizeCardTitle(brief?.item_name, index),
      murder_canon: { ...murderCanon },
      card_contents: truncateToWordCount(proseCards[index]?.card_contents, MAX_STANDALONE_CLUE_WORDS),
      target_name: targetName,
      target_id: targetId,
      weight: normalizeWeight(brief?.strength),
      bundle_id: null,
      evidence_type: null
    };
  });

  if (!Array.isArray(context.cards)) {
    context.cards = [];
  }
  context.cards.push(...cards);
  return context;
}
