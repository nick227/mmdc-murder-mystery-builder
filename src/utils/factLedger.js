import { buildEvidenceSignature } from './evidenceFacts.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAxes(text) {
  const normalized = normalizeText(text);
  const axes = new Set();
  if (/\b(access|key|passage|entry|backstage|room|study|cellar|stage|storage|route)\b/.test(normalized)) {
    axes.add('access');
  }
  if (/\b(motive|jealous|revenge|legacy|blackmail|threat|inheritance|fear|ambition)\b/.test(normalized)) {
    axes.add('motive');
  }
  if (/\b(dagger|rope|poison|quill|weapon|scarf|blade)\b/.test(normalized)) {
    axes.add('weapon');
  }
  if (/\b(time|before|after|during|while|timeline|arrived|left|between)\b/.test(normalized)) {
    axes.add('timeline');
  }
  if (/\b(contradict|alibi|elsewhere|despite|however|inconsistent|claims|denied|impossible)\b/.test(normalized)) {
    axes.add('contradiction');
  }
  if (/\b(possess|carrying|held|owned|hidden|concealed|compartment|cache|kept|found with)\b/.test(normalized)) {
    axes.add('possession');
  }
  if (/\b(witness|observed|seen|recalled|guest|statement|testimony)\b/.test(normalized)) {
    axes.add('witness');
  }
  if (/\b(fingerprint|blood|trace|fabric|footprint|drag marks|stain|sample)\b/.test(normalized)) {
    axes.add('physical_trace');
  }
  return [...axes];
}

export function buildSuspectMatchers(caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  return suspects.map((suspect) => {
    const variants = new Set();
    for (const raw of [suspect?.name, suspect?.title]) {
      const normalized = normalizeText(raw);
      if (!normalized) {
        continue;
      }
      variants.add(normalized);
      const tokens = normalized.split(' ').filter(Boolean);
      if (tokens.length >= 2) {
        variants.add(tokens.slice(0, 2).join(' '));
        variants.add(tokens.slice(-2).join(' '));
      }
    }
    return {
      id: String(suspect?.suspect_id || '').trim(),
      name: String(suspect?.name || '').trim(),
      variants: [...variants]
    };
  });
}

export function findMentionedSuspectIds(text, caseState) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }
  return buildSuspectMatchers(caseState)
    .filter((suspect) => suspect.variants.some((variant) => normalized.includes(variant)))
    .map((suspect) => suspect.id);
}

function signatureParts(signature) {
  const [subject = 'scene', object = 'generic', property = 'plain', location = 'unknown_location'] = String(signature || '').split('|');
  return { subject, object, property, location };
}

function addSignatureRecord(ledger, record) {
  const signature = String(record?.signature || '').trim();
  if (!signature) {
    return;
  }

  ledger.signatures.add(signature);
  ledger.records.push({
    signature,
    source_agent: String(record?.source_agent || 'unknown').trim() || 'unknown',
    card_type: String(record?.card_type || '').trim() || null,
    source_id: String(record?.source_id || '').trim() || null,
    source_title: String(record?.source_title || '').trim() || null,
    raw_text: String(record?.raw_text || '').trim(),
    act: Number(record?.act || 0) || null
  });
}

export function buildPressureEntriesFromText(text, context) {
  const suspectIds = findMentionedSuspectIds(text, context?.case_state);
  const axes = extractAxes(text);
  const signature = buildEvidenceSignature({
    card_title: '',
    card_contents: text
  }, context);
  const parts = signatureParts(signature);
  return suspectIds.flatMap((suspectId) =>
    axes.map((axis) => ({
      suspectId,
      axis,
      object: parts.object,
      property: parts.property,
      location: parts.location,
      signature
    }))
  );
}

export function buildFactLedger(context) {
  const signatures = new Set();
  const pressureEntries = [];
  const records = [];
  const signatureClusters = new Map();
  const ledger = {
    signatures,
    pressureEntries,
    records,
    signatureClusters
  };

  for (const card of Array.isArray(context?.cards) ? context.cards : []) {
    if (!['item', 'clue'].includes(card?.card_type)) {
      continue;
    }
    const signature = buildEvidenceSignature(card, context);
    addSignatureRecord(ledger, {
      signature,
      source_agent: card?.card_type === 'item' ? 'item_agent' : 'clue_agent',
      card_type: card?.card_type,
      source_id: card?.card_id,
      source_title: card?.card_title,
      raw_text: `${card.card_title || ''} ${card.card_contents || ''}`.trim()
    });
    pressureEntries.push(...buildPressureEntriesFromText(`${card.card_title || ''} ${card.card_contents || ''}`, context));
  }

  for (const record of records) {
    if (!record.signature) {
      continue;
    }
    if (!signatureClusters.has(record.signature)) {
      signatureClusters.set(record.signature, []);
    }
    signatureClusters.get(record.signature).push(record);
  }

  return ledger;
}

export function hasDuplicateSignature(signature, ledger) {
  return Boolean(signature) && ledger.signatures.has(signature);
}

export function findSameDirectionConflicts(signature, text, ledger, context) {
  const parts = signatureParts(signature);
  const nextEntries = buildPressureEntriesFromText(text, context);
  const conflicts = [];

  for (const entry of nextEntries) {
    for (const existing of ledger.pressureEntries) {
      if (
        existing.suspectId === entry.suspectId &&
        existing.axis === entry.axis &&
        existing.object === (parts.object || entry.object) &&
        existing.property === (parts.property || entry.property) &&
        existing.location === (parts.location || entry.location)
      ) {
        conflicts.push({
          suspectId: entry.suspectId,
          axis: entry.axis,
          object: entry.object,
          property: entry.property,
          location: entry.location,
          signature: existing.signature
        });
      }
    }
  }

  return conflicts;
}

export function addsSameDirectionPressure(signature, text, ledger, context) {
  return findSameDirectionConflicts(signature, text, ledger, context).length > 0;
}

export function buildTargetPressureSummary(targets, context) {
  const summary = new Map();
  for (const target of Array.isArray(targets) ? targets : []) {
    for (const entry of buildPressureEntriesFromText(target?.fact, context)) {
      const key = `${entry.suspectId}|${entry.axis}`;
      summary.set(key, (summary.get(key) || 0) + 1);
    }
  }
  return summary;
}
