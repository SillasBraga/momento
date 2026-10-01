import "server-only";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const relapseSchema = z.object({
  id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  previous_streak_seconds: z.coerce.number().int().nonnegative(),
  level_before: z.int().min(1),
  level_after: z.int().min(1),
});

export type RelapseHistoryItem = z.infer<typeof relapseSchema>;

export async function getRelapseHistory(appStateId: string): Promise<RelapseHistoryItem[]> {
  const client = createAdminSupabaseClient();
  const pageSize = 500;
  const history: RelapseHistoryItem[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("relapses")
      .select("id, occurred_at, previous_streak_seconds, level_before, level_after")
      .eq("app_state_id", appStateId)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Não foi possível ler o histórico: ${error.message}`);
    }

    history.push(...z.array(relapseSchema).parse(data));
    if (data.length < pageSize) break;
  }

  return history;
}
