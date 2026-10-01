import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { CurrentSequenceDuration } from "@/components/current-sequence-duration";
import { LocalDateTime } from "@/components/local-date-time";
import { getAppStateSnapshot } from "@/lib/app-state";
import { getRelapseHistory } from "@/lib/relapse-history";
import { formatStreakDuration } from "@/lib/streak";
import { requireAuthenticatedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const userId = await requireAuthenticatedUserId();
  const { state, observedAtMilliseconds } = await getAppStateSnapshot(userId);
  if (!state) redirect("/");

  const relapses = await getRelapseHistory(state.id);

  return (
    <AppFrame active="history" level={state.display_level} authenticated>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Histórico</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Cada sequência faz parte do seu progresso. As mais recentes aparecem primeiro.
      </p>

      <ol aria-label="Sequências" className="mt-8 space-y-3">
        <li className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-primary">Sequência atual</h2>
            <span className="text-xs font-medium text-primary">Em andamento</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            <CurrentSequenceDuration
              startedAt={state.current_streak_started_at}
              initialNow={observedAtMilliseconds}
            />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {relapses.length > 0 ? "Nova sequência iniciada" : "Jornada iniciada"} em{" "}
            <LocalDateTime iso={state.current_streak_started_at} />
          </p>
        </li>

        {relapses.map((relapse, index) => (
          <li key={relapse.id} className="rounded-2xl border border-border bg-background/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Sequência {relapses.length - index}</h2>
              <span className="text-xs text-muted-foreground">Encerrada</span>
            </div>
            <p className="mt-3 text-xl font-semibold tabular-nums">
              {formatStreakDuration(relapse.previous_streak_seconds)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Recaída registrada em <LocalDateTime iso={relapse.occurred_at} />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {relapse.level_after < relapse.level_before
                ? `Nível visual: ${relapse.level_before} para ${relapse.level_after}`
                : `Nível visual mantido em ${relapse.level_after}`}
            </p>
          </li>
        ))}
      </ol>
    </AppFrame>
  );
}
