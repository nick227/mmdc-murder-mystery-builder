function line(value) {
  return String(value || '').trim();
}

function joinLines(lines) {
  return lines.map(line).filter(Boolean).join('\n');
}

function buildPromptVars(card, context) {
  const cardType = line(card?.card_type);
  const cardTitle = line(card?.card_title);
  const cardContents = line(card?.card_contents);

  const storyTitle = line(context?.story_title);
  const storyThemes = line(context?.story_themes);
  const storyStyle = line(context?.storyStyle || context?.story_style);

  return {
    card_type: cardType,
    card_title: cardTitle,
    card_contents: cardContents,

    linked_character: line(card?.linked_character),
    target_name: line(card?.target_name),
    role: line(card?.role),
    secret_type: line(card?.secret_type),

    story_title: storyTitle || cardTitle,
    story_themes: storyThemes,
    story_style: storyStyle
  };
}

function renderTemplate(template, vars) {
  const text = line(template);
  if (!text) {
    return '';
  }
  return text.replace(/\{([a-z0-9_]+)\}/gi, (_, key) => line(vars?.[key]));
}

const STYLE_KIT = {
  portrait: [
    'High-resolution photorealistic portrait photo.',
    'Single subject, centered. Story-themed wardrobe and styling.',
    'detailed face eyes eyelashes expressive face features',
    'solid background, no text, no letters, no watermarks, no logos.',
    'ultra-realism, photographic quality, 8k, dramatic cinematic lighting'
  ],
  cinematic: [
    'Photorealistic cinematic scene photo.',
    'Highly-stylized, haunting, atmospheric, dramatic, and cinematic.',
    'story-themed set dressing and mood.',
    'no text, no letters, no watermarks, no logos.',
    'ultra-realism, photographic quality, 8k, dramatic cinematic lighting'
  ],
  product_photo: [
    'High-resolution product photo of a single object.',
    'Photorealistic, studio lighting, sharp focus, centered composition. Story-themed materials and styling.',
    'plain neutral background, no people.',
    'no text, no letters, no watermarks, no logos.',
    'ultra-realism, 8k, dramatic but clean lighting'
  ],
  evidence_photo: [
    'High-resolution photo of a physical evidence object.',
    'Photorealistic, forensic vibe, studio lighting, sharp focus. Story-themed prop realism.',
    'plain neutral background, no people.',
    'no text, no letters, no watermarks, no logos.',
    'ultra-realism, 8k, dramatic lighting'
  ],
  icon: [
    'Photorealistic minimal prop photo that reads like an icon.',
    'Single small object or symbol, centered, high contrast, simple composition.',
    'studio lighting, sharp focus, clean background. story-themed styling.',
    'no text, no letters, no watermarks, no logos.',
    'ultra-realism, photographic quality, 8k'
  ],
  symbolic: [
    'Symbolic, minimal still-life photo (photorealistic).',
    'Moody low-key lighting, shallow depth of field, cinematic shadows. story-themed symbolism.',
    'no people, no text, no letters, no watermarks, no logos.'
  ],
  reveal: [
    'Dramatic reveal-style photorealistic cinematic photo.',
    'High contrast, spotlight lighting, suspenseful atmosphere. Story-themed evidence and revelation mood.',
    'no people, no text, no letters, no watermarks, no logos.'
  ],
  diagrammatic: [
    'Photorealistic tabletop puzzle diagram setup (no text).',
    'Clean geometric layout using physical objects: pins, string, tokens, cards, evidence markers.',
    'no text, no letters, no watermarks, no logos.',
    'ultra-realism, photographic quality, top-down lighting, sharp focus'
  ],
  environment: [
    'Cinematic environmental photo of a location (no people).',
    'Wide angle, atmospheric lighting, rich texture. Story-themed set dressing.',
    'no text, no letters, no watermarks, no logos.'
  ],
  cover: [
    'Cover-style photorealistic cinematic key art for a murder mystery story.',
    'High-end poster composition, dramatic lighting, atmospheric mood. Story-themed.',
    'no text, no letters, no watermarks, no logos.'
  ]
};

function buildPromptFromSpec(card, context, spec) {
  const vars = buildPromptVars(card, context);
  const kit = STYLE_KIT[spec.style] || [];
  const templates = Array.isArray(spec.templates) ? spec.templates : [];

  return joinLines([
    ...kit,
    ...templates.map((t) => renderTemplate(t, vars))
  ]);
}

const PROMPT_SPECS = {
  character: {
    style: 'portrait',
    templates: ['{card_title} - {card_contents} - {story_themes}']
  },
  person: {
    style: 'portrait',
    templates: ['{card_title} - {card_contents} - {story_themes}']
  },
  story_act: {
    style: 'cinematic',
    templates: ['{card_title} - {card_contents} - {story_themes}']
  },

  item: {
    style: 'product_photo',
    templates: ['Owned by: {linked_character}', '{card_title} - {card_contents} - {story_themes}']
  },
  treasure: {
    style: 'product_photo',
    templates: ['{card_title} - {card_contents} - {story_themes}']
  },
  clue: {
    style: 'evidence_photo',
    templates: ['Associated suspect: {target_name}', '{card_title} - {card_contents} - {story_themes}']
  },

  game_card: {
    style: 'icon',
    templates: ['For: {linked_character}', '{card_title} - {card_contents} - {story_themes}']
  },
  host_speech: {
    style: 'icon',
    templates: ['{card_title} - {story_themes}']
  },

  secret: {
    style: 'symbolic',
    templates: ['Character: {linked_character}', 'Secret type: {secret_type}', '{card_title} - {story_themes}']
  },
  solution: {
    style: 'reveal',
    templates: ['Solution role: {role}', '{card_title} - {story_themes}']
  },
  puzzle: {
    style: 'diagrammatic',
    templates: ['{card_title} - {story_themes}']
  },

  location: {
    style: 'environment',
    templates: ['{card_title} - {card_contents} - {story_themes}']
  },
  story_meta: {
    style: 'cover',
    templates: ['Style: {story_style}', '{story_title} - {story_themes}']
  }
};

export function defaultPromptBuilder(card, context) {
  const vars = buildPromptVars(card, context);
  return joinLines([
    'Illustration of:',
    joinLines([vars.card_title, vars.card_contents, vars.story_themes])
  ]);
}

export const promptBuilders = Object.fromEntries(
  Object.entries(PROMPT_SPECS).map(([cardType, spec]) => [
    cardType,
    (card, context) => buildPromptFromSpec(card, context, spec)
  ])
);
