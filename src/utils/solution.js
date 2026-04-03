function cleanedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function deriveTruths(context) {
  const coreTruth = context?.coreTruth;
  if (!coreTruth || typeof coreTruth !== 'object' || Array.isArray(coreTruth)) {
    return {};
  }

  const murder = coreTruth.murder && typeof coreTruth.murder === 'object' ? coreTruth.murder : undefined;
  const treasure = coreTruth.treasure && typeof coreTruth.treasure === 'object' ? coreTruth.treasure : undefined;

  return {
    murder_truth: murder,
    fortune_truth: treasure
  };
}

export function deriveSolution(context) {
  const murderTruth = deriveTruths(context).murder_truth;
  if (!murderTruth || typeof murderTruth !== 'object' || Array.isArray(murderTruth)) {
    return undefined;
  }

  const narrative = cleanedString(murderTruth.murder_solution || murderTruth.summary || '');
  const solution = {
    killer: cleanedString(murderTruth.killer),
    method: cleanedString(murderTruth.method) || narrative,
    location: cleanedString(murderTruth.location) || narrative,
    motive: cleanedString(murderTruth.motive) || narrative
  };

  if (!solution.killer || !narrative) {
    return undefined;
  }

  return solution;
}
