"use client";

import { useEffect, useState, useTransition } from "react";
import { syncEarnedLevel } from "@/features/progression/actions";
import { useCurrentStreakSeconds } from "@/hooks/use-current-streak-seconds";
import { levelUpMessage } from "@/lib/feedback";
import { progressionForXp } from "@/lib/progression";
import { calculateLifetimeXp } from "@/lib/xp";

const numberFormat = new Intl.NumberFormat("pt-BR");

export function XpProgress({
  startedAt,
  previousStreakSeconds,
  displayLevel,
  highestLevelReached,
  initialNow,
}: {
  startedAt: string;
  previousStreakSeconds: number[];
  displayLevel: number;
  highestLevelReached: number;
  initialNow: number;
}) {
  const currentStreakSeconds = useCurrentStreakSeconds(startedAt, initialNow);
  const lifetimeXp = calculateLifetimeXp(previousStreakSeconds, currentStreakSeconds);
  const { level, levelStartXp, nextLevelXp, progressPercent } = progressionForXp(lifetimeXp);
  const recoveringLevel = displayLevel < level;
  const nextVisualLevel = recoveringLevel ? displayLevel + 1 : level + 1;
  const [syncError, setSyncError] = useState<string | null>(null);
  const [celebratedLevel, setCelebratedLevel] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (level <= highestLevelReached) return;

    startTransition(async () => {
      try {
        const result = await syncEarnedLevel();
        if (result.ok) {
          setCelebratedLevel(level);
          setSyncError(null);
        } else {
          setSyncError(result.error ?? "Não foi possível salvar o nível.");
        }
      } catch {
        setSyncError("Não foi possível salvar o nível no banco local.");
      }
    });
  }, [level, highestLevelReached]);

  useEffect(() => {
    if (celebratedLevel === null) return;
    const timeout = window.setTimeout(() => setCelebratedLevel(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [celebratedLevel]);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-background/50 p-5 sm:p-6" aria-labelledby="xp-title">
      {celebratedLevel !== null && (
        <div role="status" className="level-up-notice mb-5 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">LEVEL UP</p>
          <p className="mt-1 text-base font-semibold">Você alcançou o nível {celebratedLevel}.</p>
          <p className="mt-1 text-sm text-muted-foreground">{levelUpMessage(celebratedLevel)}</p>
        </div>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Nível {displayLevel}
          </p>
          <h2 id="xp-title" className="text-sm font-semibold text-muted-foreground">XP acumulado</h2>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {numberFormat.format(lifetimeXp)} <span className="text-sm font-medium text-muted-foreground">XP</span>
          </p>
        </div>
        <p className="text-right text-xs leading-5 text-muted-foreground">
          Próxima meta: nível {nextVisualLevel}<br />{numberFormat.format(nextLevelXp)} XP
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Progresso para o nível ${nextVisualLevel}`}
        aria-valuemin={levelStartXp}
        aria-valuemax={nextLevelXp}
        aria-valuenow={lifetimeXp}
        aria-valuetext={`${numberFormat.format(lifetimeXp)} de ${numberFormat.format(nextLevelXp)} XP acumulados`}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-primary/15"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Maior nível alcançado: {highestLevelReached}. Recaídas não reduzem XP.
      </p>
      {recoveringLevel && (
        <p className="mt-2 text-xs leading-5 text-primary">
          Seu nível visual volta a acompanhar o progresso ao atingir a próxima meta de XP.
        </p>
      )}
      {syncError && <p role="alert" className="mt-2 text-xs text-destructive">{syncError} Recarregue para tentar novamente.</p>}
    </section>
  );
}
