"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  format,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateDayProgress,
  calendarGridDays,
  formatDaySeconds,
  moveCalendarMonth,
} from "@/lib/calendar";

const subscribe = () => () => {};
const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dayClasses = {
  green: "calendar-day--green",
  yellow: "calendar-day--yellow",
  red: "calendar-day--red",
};

export function MonthlyCalendar({
  journeyStartedAt,
  relapseTimestamps,
  initialNow,
}: {
  journeyStartedAt: string;
  relapseTimestamps: string[];
  initialNow: number;
}) {
  const localTimeZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
  const [month, setMonth] = useState(() => startOfMonth(new Date(initialNow)));
  const [now, setNow] = useState(initialNow);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  if (!localTimeZone) {
    return (
      <section className="mt-10 border-t border-border pt-8" aria-label="Calendário de progresso">
        <h2 className="text-xl font-semibold">Calendário</h2>
        <p className="mt-2 text-sm text-muted-foreground">Carregando dias no horário local...</p>
      </section>
    );
  }

  const journeyStart = new Date(journeyStartedAt).getTime();
  const relapses = relapseTimestamps.map((timestamp) => new Date(timestamp).getTime());
  const days = calendarGridDays(month);
  const today = new Date(now);
  const selectedDate = selectedDay === null ? null : new Date(selectedDay);
  const selectedProgress = selectedDate
    ? calculateDayProgress({
        dayStartMilliseconds: selectedDate.getTime(),
        dayEndMilliseconds: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate() + 1,
        ).getTime(),
        journeyStartedAtMilliseconds: journeyStart,
        relapseMilliseconds: relapses,
        nowMilliseconds: now,
      })
    : null;

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="calendar-title">
      <h2 id="calendar-title" className="text-xl font-semibold">Calendário</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        A primeira recaída encerra o tempo limpo daquele dia no calendário.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-background/50 p-3 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonth((current) => moveCalendarMonth(current, -1))}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <h3 className="text-base font-semibold capitalize" aria-live="polite">
            {format(month, "LLLL yyyy", { locale: ptBR })}
          </h3>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonth((current) => moveCalendarMonth(current, 1))}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdayNames.map((name) => <span key={name}>{name}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayStart = day.getTime();
            const inMonth = day.getMonth() === month.getMonth();
            const progress = inMonth
              ? calculateDayProgress({
                  dayStartMilliseconds: dayStart,
                  dayEndMilliseconds: new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate() + 1,
                  ).getTime(),
                  journeyStartedAtMilliseconds: journeyStart,
                  relapseMilliseconds: relapses,
                  nowMilliseconds: now,
                })
              : null;
            const isToday = day.toDateString() === today.toDateString();

            if (!inMonth) return <span key={dayStart} aria-hidden="true" />;
            if (!progress) {
              return (
                <span
                  key={dayStart}
                  aria-label={`${format(day, "d 'de' MMMM", { locale: ptBR })}: sem dados`}
                  className="flex min-h-12 flex-col items-center justify-center rounded-lg border border-transparent text-muted-foreground/60"
                >
                  {day.getDate()}
                </span>
              );
            }

            const percentage = Math.floor(progress.cleanPercentage);
            return (
              <button
                key={dayStart}
                type="button"
                onClick={() => setSelectedDay(dayStart)}
                aria-label={`${format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}: ${percentage}% limpo, ${progress.relapseCount} ${progress.relapseCount === 1 ? "recaída" : "recaídas"}`}
                aria-current={isToday ? "date" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${dayClasses[progress.status]} ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                <span>{day.getDate()}</span>
                <span className="text-[10px] font-medium">{percentage}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda do calendário">
        <li><span aria-hidden="true" className="calendar-legend--green mr-1.5 inline-block size-2.5 rounded-full" />100% limpo</li>
        <li><span aria-hidden="true" className="calendar-legend--yellow mr-1.5 inline-block size-2.5 rounded-full" />Mais de 70%</li>
        <li><span aria-hidden="true" className="calendar-legend--red mr-1.5 inline-block size-2.5 rounded-full" />70% ou menos</li>
      </ul>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
        <DialogContent>
          {selectedDate && selectedProgress && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </DialogTitle>
                <DialogDescription>Progresso no horário local deste navegador.</DialogDescription>
              </DialogHeader>
              <p className="text-3xl font-semibold tabular-nums">
                {Math.floor(selectedProgress.cleanPercentage)}% <span className="text-base font-normal">limpo</span>
              </p>
              <dl className="space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
                <div className="flex justify-between gap-3"><dt>Tempo limpo</dt><dd className="font-medium tabular-nums">{formatDaySeconds(selectedProgress.cleanSeconds)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Fora da sequência</dt><dd className="font-medium tabular-nums">{formatDaySeconds(selectedProgress.outsideSeconds)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Recaídas registradas</dt><dd className="font-medium tabular-nums">{selectedProgress.relapseCount}</dd></div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
