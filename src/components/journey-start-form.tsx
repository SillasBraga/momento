"use client";

import { useActionState, useRef, useState } from "react";
import { initializeJourney } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function JourneyStartForm() {
  const [mode, setMode] = useState<"now" | "custom">("now");
  const localInput = useRef<HTMLInputElement>(null);
  const isoInput = useRef<HTMLInputElement>(null);
  const [result, formAction, pending] = useActionState(initializeJourney, {
    error: null,
  });

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (mode !== "custom" || !isoInput.current) return;
        const chosenDate = localInput.current?.value ? new Date(localInput.current.value) : null;
        isoInput.current.value = chosenDate && Number.isFinite(chosenDate.getTime())
          ? chosenDate.toISOString()
          : "";
      }}
      className="mt-9 space-y-6"
    >
      <fieldset>
        <legend className="mb-4 text-sm font-medium text-foreground">
          Quando você quer considerar que esta jornada começou?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/60 px-4 has-checked:border-primary has-checked:bg-primary/10">
            <input
              type="radio"
              name="mode"
              value="now"
              checked={mode === "now"}
              onChange={() => setMode("now")}
              className="accent-primary"
            />
            Agora
          </label>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/60 px-4 has-checked:border-primary has-checked:bg-primary/10">
            <input
              type="radio"
              name="mode"
              value="custom"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
              className="accent-primary"
            />
            Escolher data e horário
          </label>
        </div>
      </fieldset>

      {mode === "custom" && (
        <div className="space-y-2">
          <label htmlFor="journey-start" className="block text-sm font-medium">
            Data e horário locais
          </label>
          <input
            id="journey-start"
            ref={localInput}
            type="datetime-local"
            required
            className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <p className="text-xs text-muted-foreground">
            O horário será salvo em UTC e exibido no seu horário local.
          </p>
        </div>
      )}

      <input ref={isoInput} type="hidden" name="startedAt" defaultValue="" />
      {result.error && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="min-h-12 w-full">
        {pending ? "Salvando..." : "Começar jornada"}
      </Button>
    </form>
  );
}
