"use client";

import { useEffect, useState } from "react";
import { calculateCurrentStreak } from "@/lib/streak";

export function useCurrentStreakSeconds(
  startedAt: string,
  initialNow: number,
  onElapsed?: (seconds: number) => void,
): number {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const refresh = () => {
      const currentNow = Date.now();
      onElapsed?.(calculateCurrentStreak(Date.parse(startedAt), currentNow));
      setNow(currentNow);
    };
    const timer = window.setInterval(refresh, 1000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [startedAt, onElapsed]);

  return calculateCurrentStreak(Date.parse(startedAt), now);
}
