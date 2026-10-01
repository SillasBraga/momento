import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDayProgress,
  calendarGridDays,
  moveCalendarMonth,
} from "../src/lib/calendar";
import { isValidTimeZone } from "../src/lib/dates";
import { getLevelTheme } from "../src/lib/level-theme";
import { levelForXp, progressionForXp, xpThresholdForLevel } from "../src/lib/progression";
import { calculateCurrentStreak, splitStreakSeconds, streakMilestones } from "../src/lib/streak";
import { calculateLifetimeXp } from "../src/lib/xp";

const SECOND = 1_000;
const HOUR = 3_600 * SECOND;
const DAY = 24 * HOUR;
const dayStart = Date.parse("2026-10-01T00:00:00Z");

function progress({
  start = dayStart,
  end = dayStart + DAY,
  journey = start,
  relapses = [],
  now = end,
}: {
  start?: number;
  end?: number;
  journey?: number;
  relapses?: number[];
  now?: number;
} = {}) {
  return calculateDayProgress({
    dayStartMilliseconds: start,
    dayEndMilliseconds: end,
    journeyStartedAtMilliseconds: journey,
    relapseMilliseconds: relapses,
    nowMilliseconds: now,
  });
}

test("sequência usa segundos completos e nunca fica negativa", () => {
  const start = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(calculateCurrentStreak(start, start + 61_999), 61);
  assert.equal(calculateCurrentStreak(start, start - SECOND), 0);
  assert.deepEqual(splitStreakSeconds(90_061), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
  });
});

test("avisos surgem apenas ao cruzar 24 horas ou o recorde anterior", () => {
  assert.deepEqual(streakMilestones(86_399, 86_400, 90_000), ["24-hours"]);
  assert.deepEqual(streakMilestones(90_000, 90_001, 90_000), ["new-record"]);
  assert.deepEqual(streakMilestones(86_399, 86_401, 86_400), ["24-hours", "new-record"]);
  assert.deepEqual(streakMilestones(90_001, 90_002, 90_000), []);
  assert.deepEqual(streakMilestones(10, 11, 0), []);
});

test("XP aproveita segundos restantes entre recaídas e nunca cai", () => {
  assert.equal(calculateLifetimeXp([59], 0), 0);
  assert.equal(calculateLifetimeXp([59], 1), 1);
  assert.equal(calculateLifetimeXp([59, 1], 0), 1);
  assert.equal(calculateLifetimeXp([3_600, 125], 35), 62);
});

test("níveis mudam somente nos limiares acumulados, inclusive após o 10", () => {
  const firstTen = [0, 1_000, 2_500, 5_000, 9_000, 15_000, 23_000, 33_000, 46_000, 62_000];
  firstTen.forEach((threshold, index) => {
    const level = index + 1;
    assert.equal(xpThresholdForLevel(level), threshold);
    assert.equal(levelForXp(threshold), level);
    if (level > 1) assert.equal(levelForXp(threshold - 1), level - 1);
  });
  assert.equal(xpThresholdForLevel(11), 81_000);
  assert.equal(xpThresholdForLevel(12), 103_000);
  assert.equal(progressionForXp(33_000).nextLevelXp, 46_000);
  assert.equal(progressionForXp(33_000).progressPercent, 0);
  assert.throws(() => xpThresholdForLevel(0), RangeError);
});

test("tema acompanha nível visual e continua mudando acima do 10", () => {
  assert.equal(getLevelTheme(1).name, "Início");
  assert.equal(getLevelTheme(10).key, "10");
  assert.equal(getLevelTheme(11).key, "advanced");
  assert.notEqual(getLevelTheme(11).properties?.["--theme-hue"], getLevelTheme(12).properties?.["--theme-hue"]);
  assert.notEqual(getLevelTheme(11).texture, getLevelTheme(21).texture);
});

test("calendário distingue 100%, mais de 70% e 70% ou menos", () => {
  assert.equal(progress()?.status, "green");
  assert.equal(progress({ relapses: [dayStart + 18 * HOUR] })?.status, "yellow");
  assert.equal(progress({ relapses: [dayStart + 16.8 * HOUR] })?.status, "red");
  assert.equal(progress({ relapses: [dayStart + 18 * HOUR] })?.cleanPercentage, 75);
});

test("primeira recaída encerra tempo limpo, mas todas entram na contagem", () => {
  const result = progress({
    relapses: [dayStart + 20 * HOUR, dayStart + 3 * HOUR],
  });
  assert.equal(result?.cleanSeconds, 3 * 3_600);
  assert.equal(result?.outsideSeconds, 21 * 3_600);
  assert.equal(result?.relapseCount, 2);
  assert.equal(result?.status, "red");
});

test("dia atual usa somente tempo transcorrido e início da jornada", () => {
  const today = progress({
    now: dayStart + 8 * HOUR,
    relapses: [dayStart + 6 * HOUR, dayStart + 12 * HOUR],
  });
  assert.equal(today?.consideredSeconds, 8 * 3_600);
  assert.equal(today?.cleanPercentage, 75);
  assert.equal(today?.relapseCount, 1);
  assert.equal(progress({ journey: dayStart + 12 * HOUR })?.cleanPercentage, 50);
  assert.equal(progress({ journey: dayStart + DAY }), null);
});

test("meia-noite separa recaídas de dois dias", () => {
  const midnight = dayStart + DAY;
  assert.equal(progress({ relapses: [midnight] })?.relapseCount, 0);
  assert.equal(progress({ start: midnight, end: midnight + DAY, relapses: [midnight], now: midnight + DAY })?.relapseCount, 1);
});

test("dias locais com horário de verão usam 23 ou 25 horas reais", () => {
  const springStart = Date.parse("2026-03-08T05:00:00Z");
  const springEnd = Date.parse("2026-03-09T04:00:00Z");
  const fallStart = Date.parse("2026-11-01T04:00:00Z");
  const fallEnd = Date.parse("2026-11-02T05:00:00Z");

  assert.equal(progress({ start: springStart, end: springEnd })?.consideredSeconds, 23 * 3_600);
  assert.equal(progress({ start: fallStart, end: fallEnd })?.consideredSeconds, 25 * 3_600);
  assert.equal(progress({ start: springStart, end: springEnd, relapses: [springStart + 11.5 * HOUR] })?.cleanPercentage, 50);
});

test("navegação mensal preserva dia 1 e grade inclui bordas do mês", () => {
  const january = new Date(2028, 0, 31);
  const february = moveCalendarMonth(january, 1);
  assert.equal(february.getFullYear(), 2028);
  assert.equal(february.getMonth(), 1);
  assert.equal(february.getDate(), 1);
  assert.equal(moveCalendarMonth(february, -1).getMonth(), 0);
  assert.equal(moveCalendarMonth(february, 1).getMonth(), 2);

  const grid = calendarGridDays(february);
  assert.equal(grid[0].getDay(), 0);
  assert.equal(grid.at(-1)?.getDay(), 6);
  assert.ok(grid.some((day) => day.getMonth() === 1 && day.getDate() === 29));
});

test("fuso IANA válido é aceito e inválido rejeitado", () => {
  assert.equal(isValidTimeZone("America/Sao_Paulo"), true);
  assert.equal(isValidTimeZone("Pacific/Kiritimati"), true);
  assert.equal(isValidTimeZone("Invalid/Zone"), false);
  assert.equal(isValidTimeZone(""), false);
});
