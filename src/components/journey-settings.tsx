"use client";

import { useActionState, useRef } from "react";
import { updateJourneyStart } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LocalDateTime } from "@/components/local-date-time";

export function JourneySettings({
  startedAt,
  canEditStart,
}: {
  startedAt: string;
  canEditStart: boolean;
}) {
  const localInput = useRef<HTMLInputElement>(null);
  const isoInput = useRef<HTMLInputElement>(null);
  const [result, formAction, pending] = useActionState(updateJourneyStart, { error: null });

  return (
    <details className="mt-8 border-t border-border pt-6 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">Configurações</summary>
      <div className="mt-4 space-y-4 rounded-xl border border-border bg-background/50 p-4">
        <p className="text-muted-foreground">Tema automático conforme o nível visual.</p>
        <p>Data inicial: <LocalDateTime iso={startedAt} /></p>
        {canEditStart ? (
          <form
            action={formAction}
            onSubmit={() => {
              if (!isoInput.current) return;
              const chosenDate = localInput.current?.value ? new Date(localInput.current.value) : null;
              isoInput.current.value = chosenDate && Number.isFinite(chosenDate.getTime())
                ? chosenDate.toISOString()
                : "";
            }}
            className="space-y-3"
          >
            <p className="text-xs leading-5 text-muted-foreground">
              Você pode corrigir a data antes da primeira recaída. XP e nível serão recalculados.
            </p>
            <label htmlFor="adjust-journey-start" className="block font-medium">Nova data e horário locais</label>
            <input
              id="adjust-journey-start"
              ref={localInput}
              type="datetime-local"
              required
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <input ref={isoInput} type="hidden" name="startedAt" defaultValue="" />
            {result.error && <p role="alert" className="text-destructive">{result.error}</p>}
            <Button type="submit" variant="secondary" disabled={pending} className="min-h-11 w-full">
              {pending ? "Salvando..." : "Salvar data inicial"}
            </Button>
          </form>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            Data inicial bloqueada após a primeira recaída para preservar o histórico.
          </p>
        )}
      </div>
    </details>
  );
}
