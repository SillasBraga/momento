"use client";

import { useCurrentStreakSeconds } from "@/hooks/use-current-streak-seconds";
import { formatStreakDuration } from "@/lib/streak";

export function CurrentSequenceDuration({
  startedAt,
  initialNow,
}: {
  startedAt: string;
  initialNow: number;
}) {
  const seconds = useCurrentStreakSeconds(startedAt, initialNow);

  return <span className="tabular-nums">{formatStreakDuration(seconds)}</span>;
}
