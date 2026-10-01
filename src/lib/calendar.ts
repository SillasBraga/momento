import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function moveCalendarMonth(month: Date, offset: number): Date {
  return startOfMonth(addMonths(startOfMonth(month), offset));
}

export function calendarGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
}

export type DayProgress = {
  cleanSeconds: number;
  outsideSeconds: number;
  consideredSeconds: number;
  cleanPercentage: number;
  relapseCount: number;
  status: "green" | "yellow" | "red";
};

/** The first relapse ends clean time for that calendar day. */
export function calculateDayProgress({
  dayStartMilliseconds,
  dayEndMilliseconds,
  journeyStartedAtMilliseconds,
  relapseMilliseconds,
  nowMilliseconds,
}: {
  dayStartMilliseconds: number;
  dayEndMilliseconds: number;
  journeyStartedAtMilliseconds: number;
  relapseMilliseconds: readonly number[];
  nowMilliseconds: number;
}): DayProgress | null {
  const consideredEnd = Math.min(dayEndMilliseconds, nowMilliseconds);
  if (
    dayEndMilliseconds <= dayStartMilliseconds ||
    consideredEnd <= dayStartMilliseconds ||
    journeyStartedAtMilliseconds >= consideredEnd
  ) {
    return null;
  }

  const consideredSeconds = Math.floor((consideredEnd - dayStartMilliseconds) / 1000);
  if (consideredSeconds <= 0) return null;

  const todayRelapses = relapseMilliseconds.filter(
    (instant) =>
      instant >= Math.max(dayStartMilliseconds, journeyStartedAtMilliseconds) &&
      instant < consideredEnd,
  );
  const firstRelapse = todayRelapses.length ? Math.min(...todayRelapses) : consideredEnd;
  const cleanStart = Math.max(dayStartMilliseconds, journeyStartedAtMilliseconds);
  const cleanSeconds = Math.max(0, Math.floor((firstRelapse - cleanStart) / 1000));
  const outsideSeconds = consideredSeconds - cleanSeconds;
  const cleanPercentage = (cleanSeconds / consideredSeconds) * 100;

  return {
    cleanSeconds,
    outsideSeconds,
    consideredSeconds,
    cleanPercentage,
    relapseCount: todayRelapses.length,
    status: cleanPercentage === 100 ? "green" : cleanPercentage > 70 ? "yellow" : "red",
  };
}

export function formatDaySeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min ${String(seconds).padStart(2, "0")}s`;
}
