import "server-only";
import { z } from "zod";
import { createLocalSupabaseClient } from "@/lib/supabase/server";

const appStateSchema = z.object({
  id: z.uuid(),
  journey_started_at: z.iso.datetime({ offset: true }),
  current_streak_started_at: z.iso.datetime({ offset: true }),
  display_level: z.int().min(1),
  highest_level_reached: z.int().min(1),
  last_level_penalty_date: z.string().nullable(),
});

export type AppState = z.infer<typeof appStateSchema>;

export async function getAppStateSnapshot(): Promise<{
  state: AppState | null;
  observedAtMilliseconds: number;
}> {
  const { data, error } = await createLocalSupabaseClient()
    .from("app_state")
    .select(
      "id, journey_started_at, current_streak_started_at, display_level, highest_level_reached, last_level_penalty_date",
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível ler o estado local: ${error.message}`);
  }

  return {
    state: data ? appStateSchema.parse(data) : null,
    observedAtMilliseconds: Date.now(),
  };
}
