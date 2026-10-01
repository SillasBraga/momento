const INITIAL_LEVEL_THRESHOLDS = [
  0,
  1000,
  2500,
  5000,
  9000,
  15000,
  23000,
  33000,
  46000,
  62000,
] as const;

export function xpThresholdForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError("O nível deve ser um inteiro positivo.");
  }

  if (level <= INITIAL_LEVEL_THRESHOLDS.length) {
    return INITIAL_LEVEL_THRESHOLDS[level - 1];
  }

  const levelsAfterTen = level - INITIAL_LEVEL_THRESHOLDS.length;
  return 62000 + 16000 * levelsAfterTen + 1500 * levelsAfterTen * (levelsAfterTen + 1);
}

export function levelForXp(lifetimeXp: number): number {
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= lifetimeXp) level += 1;
  return level;
}

export function progressionForXp(lifetimeXp: number) {
  const level = levelForXp(lifetimeXp);
  const levelStartXp = xpThresholdForLevel(level);
  const nextLevelXp = xpThresholdForLevel(level + 1);

  return {
    level,
    levelStartXp,
    nextLevelXp,
    progressPercent: ((lifetimeXp - levelStartXp) / (nextLevelXp - levelStartXp)) * 100,
  };
}
