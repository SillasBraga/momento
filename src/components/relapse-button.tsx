"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { registerRelapse } from "@/features/relapse/actions";
import { RELAPSE_MESSAGES } from "@/lib/feedback";

export function RelapseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [relapseId, setRelapseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openConfirmation() {
    setRelapseId(crypto.randomUUID());
    setError(null);
    setNotice(null);
    setOpen(true);
  }

  function confirmRelapse() {
    if (!relapseId || pending) return;

    startTransition(async () => {
      try {
        const result = await registerRelapse(
          relapseId,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }

        setOpen(false);
        setNotice(RELAPSE_MESSAGES[Math.floor(Math.random() * RELAPSE_MESSAGES.length)]);
        router.refresh();
      } catch {
        setError("A resposta falhou. Tente novamente; o registro não será duplicado.");
      }
    });
  }

  return (
    <div className="mt-8 space-y-4">
      {notice && (
        <p role="status" className="relapse-notice rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm leading-6">
          {notice} Seu XP permanece.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={openConfirmation}
        className="min-h-11 w-full text-muted-foreground hover:text-foreground"
      >
        Registrar recaída
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar recaída?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro inicia uma nova sequência e pode reduzir seu nível visual em 1.
              A redução acontece no máximo uma vez por dia, conforme seu horário local.
              Seu XP e maior nível alcançado permanecem.
              Depois de confirmar, não será possível editar ou apagar o registro pela aplicação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction type="button" disabled={pending} onClick={confirmRelapse}>
              {pending ? "Registrando..." : "Registrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
