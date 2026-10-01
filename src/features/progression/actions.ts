"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getAppStateSnapshot } from "@/lib/app-state";
import { progressionForXp, xpThresholdForLevel } from "@/lib/progression";
import { getRelapseHistory } from "@/lib/relapse-history";
import { calculateCurrentStreak } from "@/lib/streak";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { calculateLifetimeXp } from "@/lib/xp";

export async function syncEarnedLevel(): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireAuthenticatedUserId();
  const { state } = await getAppStateSnapshot(userId);
  if (!state) return { ok: false, error: "Inicie a jornada antes de sincronizar o nível." };

  const relapses = await getRelapseHistory(state.id);
  const currentSeconds = calculateCurrentStreak(
    Date.parse(state.current_streak_started_at),
    Date.now(),
  );
  const lifetimeXp = calculateLifetimeXp(
    relapses.map((relapse) => relapse.previous_streak_seconds),
    currentSeconds,
  );
  const { level } = progressionForXp(lifetimeXp);
  if (level <= state.highest_level_reached) return { ok: true };

  const { error } = await createAdminSupabaseClient().rpc("promote_level", {
    p_user_id: userId,
    p_target_level: level,
    p_required_xp: xpThresholdForLevel(level),
  });
  if (error) {
    return { ok: false, error: "Não foi possível salvar o nível no banco." };
  }

  revalidatePath("/");
  return { ok: true };
}
