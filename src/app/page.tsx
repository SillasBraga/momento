import { AppFrame } from "@/components/app-frame";
import { JourneyStartForm } from "@/components/journey-start-form";
import { JourneySettings } from "@/components/journey-settings";
import { LocalDateTime } from "@/components/local-date-time";
import { MonthlyCalendar } from "@/components/monthly-calendar";
import { RelapseButton } from "@/components/relapse-button";
import { StreakCounter } from "@/components/streak-counter";
import { StatsGrid } from "@/components/stats-grid";
import { XpProgress } from "@/components/xp-progress";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getAppStateSnapshot } from "@/lib/app-state";
import { getRelapseHistory } from "@/lib/relapse-history";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireAuthenticatedUserId();
  const { state: appState, observedAtMilliseconds } = await getAppStateSnapshot(userId);
  const relapses = appState ? await getRelapseHistory(appState.id) : [];

  return (
    <AppFrame active={appState ? "dashboard" : undefined} level={appState?.display_level} authenticated>
        {appState ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Seu tempo, sua jornada.
            </h1>
            <StreakCounter
              key={`streak-${appState.current_streak_started_at}`}
              startedAt={appState.current_streak_started_at}
              initialNow={observedAtMilliseconds}
              previousRecordSeconds={relapses.reduce(
                (record, relapse) => Math.max(record, relapse.previous_streak_seconds),
                0,
              )}
            />
            <XpProgress
              key={`xp-${appState.current_streak_started_at}`}
              startedAt={appState.current_streak_started_at}
              previousStreakSeconds={relapses.map((relapse) => relapse.previous_streak_seconds)}
              displayLevel={appState.display_level}
              highestLevelReached={appState.highest_level_reached}
              initialNow={observedAtMilliseconds}
            />
            <StatsGrid
              startedAt={appState.current_streak_started_at}
              previousStreakSeconds={relapses.map((relapse) => relapse.previous_streak_seconds)}
              initialNow={observedAtMilliseconds}
            />
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              Jornada iniciada em <LocalDateTime iso={appState.journey_started_at} />.
              Cada segundo conta.
            </p>
            <RelapseButton />
            <MonthlyCalendar
              key={`calendar-${appState.current_streak_started_at}`}
              journeyStartedAt={appState.journey_started_at}
              relapseTimestamps={relapses.map((relapse) => relapse.occurred_at)}
              initialNow={observedAtMilliseconds}
            />
            <JourneySettings
              startedAt={appState.journey_started_at}
              canEditStart={relapses.length === 0}
            />
          </>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium tracking-[0.18em] text-primary uppercase">
              Seu espaço de recomeço
            </p>
            <h1 className="max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">
              Cada momento conta.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Escolha o início da jornada. Seu progresso ficará vinculado à sua conta.
            </p>
            <JourneyStartForm />
          </>
        )}
    </AppFrame>
  );
}
