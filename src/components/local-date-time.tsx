"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }),
    () => "Carregando horário local...",
  );

  return <time dateTime={iso}>{text}</time>;
}
