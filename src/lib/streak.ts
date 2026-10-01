export type StreakDuration = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function calculateCurrentStreak(
  startedAtMilliseconds: number,
  nowMilliseconds: number,
): number {
  return Math.max(0, Math.floor((nowMilliseconds - startedAtMilliseconds) / 1000));
}

export function streakMilestones(
  previousSeconds: number,
  currentSeconds: number,
  previousRecordSeconds: number,
): Array<"24-hours" | "new-record"> {
  const milestones: Array<"24-hours" | "new-record"> = [];
  if (previousSeconds < 86_400 && currentSeconds >= 86_400) milestones.push("24-hours");
  if (
    previousRecordSeconds > 0 &&
    previousSeconds <= previousRecordSeconds &&
    currentSeconds > previousRecordSeconds
  ) {
    milestones.push("new-record");
  }
  return milestones;
}

export function splitStreakSeconds(totalSeconds: number): StreakDuration {
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function unit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function formatStreakDuration(totalSeconds: number): string {
  const { days, hours, minutes, seconds } = splitStreakSeconds(totalSeconds);

  if (days > 0) {
    return hours > 0
      ? `${unit(days, "dia", "dias")} ${unit(hours, "hora", "horas")}`
      : unit(days, "dia", "dias");
  }
  if (hours > 0) {
    return minutes > 0
      ? `${unit(hours, "hora", "horas")} ${unit(minutes, "minuto", "minutos")}`
      : unit(hours, "hora", "horas");
  }
  if (minutes > 0) {
    return seconds > 0
      ? `${unit(minutes, "minuto", "minutos")} ${unit(seconds, "segundo", "segundos")}`
      : unit(minutes, "minuto", "minutos");
  }
  return unit(seconds, "segundo", "segundos");
}
