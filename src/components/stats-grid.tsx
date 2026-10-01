"use client";

import { Clock3, RotateCcw, Trophy } from "lucide-react";
import { useCurrentStreakSeconds } from "@/hooks/use-current-streak-seconds";
import { formatStreakDuration } from "@/lib/streak";

export function StatsGrid({
  startedAt,
  previousStreakSeconds,
  initialNow,
}: {
  startedAt: string;
  previousStreakSeconds: number[];
  initialNow: number;
}) {
  const currentSeconds = useCurrentStreakSeconds(startedAt, initialNow);
  const previousRecord = previousStreakSeconds.reduce((record, seconds) => Math.max(record, seconds), 0);
  const totalPrevious = previousStreakSeconds.reduce((total, seconds) => total + seconds, 0);
  const stats = [
    { label: "Recorde", value: formatStreakDuration(Math.max(previousRecord, currentSeconds)), icon: Trophy },
    { label: "Tempo limpo acumulado", value: formatStreakDuration(totalPrevious + currentSeconds), icon: Clock3 },
    { label: "Recaídas registradas", value: String(previousStreakSeconds.length), icon: RotateCcw },
  ];

  return (
    <section aria-label="Estatísticas da jornada" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <article key={label} className="rounded-xl border border-border bg-background/50 p-4 last:col-span-2 sm:last:col-span-1">
          <Icon aria-hidden="true" className="size-4 text-primary" />
          <h2 className="mt-3 text-xs leading-4 text-muted-foreground">{label}</h2>
          <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
        </article>
      ))}
    </section>
  );
}
