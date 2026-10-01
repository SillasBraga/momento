"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentStreakSeconds } from "@/hooks/use-current-streak-seconds";
import { calculateCurrentStreak, splitStreakSeconds, streakMilestones } from "@/lib/streak";

const milestoneMessages = {
  "24-hours": "24 HORAS · Um dia de novas escolhas.",
  "new-record": "NOVO RECORDE · Sua sequência mais longa até agora.",
};

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function StreakCounter({
  startedAt,
  initialNow,
  previousRecordSeconds,
}: {
  startedAt: string;
  initialNow: number;
  previousRecordSeconds: number;
}) {
  const previousVisibleSeconds = useRef(calculateCurrentStreak(Date.parse(startedAt), initialNow));
  const [notices, setNotices] = useState<string[]>([]);
  const onElapsed = useCallback((elapsedSeconds: number) => {
    if (document.visibilityState !== "visible") return;

    const before = previousVisibleSeconds.current;
    previousVisibleSeconds.current = elapsedSeconds;
    const nextNotices = streakMilestones(before, elapsedSeconds, previousRecordSeconds)
      .map((milestone) => milestoneMessages[milestone]);
    if (nextNotices.length > 0) setNotices(nextNotices);
  }, [previousRecordSeconds]);
  const elapsedSeconds = useCurrentStreakSeconds(startedAt, initialNow, onElapsed);
  const { days, hours, minutes, seconds } = splitStreakSeconds(elapsedSeconds);
  const clock = [
    { label: "HORAS", value: twoDigits(hours) },
    { label: "MIN", value: twoDigits(minutes) },
    { label: "SEG", value: twoDigits(seconds) },
  ];

  useEffect(() => {
    if (notices.length === 0) return;
    const timeout = window.setTimeout(() => setNotices([]), 6_000);
    return () => window.clearTimeout(timeout);
  }, [notices]);

  return (
    <section
      role="timer"
      aria-label={`${days} ${days === 1 ? "dia" : "dias"}, ${hours} horas, ${minutes} minutos e ${seconds} segundos de tempo limpo`}
      aria-live="off"
      className="streak-enter mt-8 rounded-2xl border border-primary/20 bg-background/60 p-6 shadow-inner shadow-black/10 sm:p-8"
    >
      <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
        Tempo limpo
      </p>
      <div className="mt-5 flex items-baseline gap-3 tabular-nums">
        <span className="text-7xl leading-none font-semibold tracking-tight text-foreground sm:text-8xl">
          {days}
        </span>
        <span className="text-lg font-medium text-muted-foreground">
          {days === 1 ? "dia" : "dias"}
        </span>
      </div>
      <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-6 tabular-nums sm:gap-4">
        {clock.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <div className="text-2xl font-semibold tracking-tight sm:text-4xl">
              {value}
            </div>
            <div className="mt-1 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground sm:text-xs">
              {label}
            </div>
          </div>
        ))}
      </div>
      {notices.length > 0 && (
        <div role="status" className="mt-5 space-y-2" aria-live="polite">
          {notices.map((notice) => (
            <p key={notice} className="milestone-notice rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {notice}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
