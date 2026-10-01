const SECONDS_PER_XP = 60;

export function calculateLifetimeXp(
  previousStreakSeconds: readonly number[],
  currentStreakSeconds: number,
): number {
  const totalCleanSeconds = previousStreakSeconds.reduce(
    (sum, seconds) => sum + seconds,
    currentStreakSeconds,
  );
  return Math.floor(totalCleanSeconds / SECONDS_PER_XP);
}
