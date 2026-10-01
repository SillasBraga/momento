"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppStateSnapshot } from "@/lib/app-state";
import { isValidTimeZone } from "@/lib/dates";
import { levelForXp, xpThresholdForLevel } from "@/lib/progression";
import { getRelapseHistory } from "@/lib/relapse-history";
import { calculateCurrentStreak } from "@/lib/streak";
import { createLocalSupabaseClient } from "@/lib/supabase/server";
import { calculateLifetimeXp } from "@/lib/xp";

export type RegisterRelapseResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerRelapse(
  relapseId: string,
  timeZone: string,
): Promise<RegisterRelapseResult> {
  if (!z.uuid().safeParse(relapseId).success || !isValidTimeZone(timeZone)) {
    return { ok: false, error: "Não foi possível validar este registro." };
  }

  const { state } = await getAppStateSnapshot();
  if (!state) return { ok: false, error: "Inicie a jornada antes de registrar uma recaída." };

  const relapses = await getRelapseHistory(state.id);
  const currentSeconds = calculateCurrentStreak(
    Date.parse(state.current_streak_started_at),
    Date.now(),
  );
  const lifetimeXp = calculateLifetimeXp(
    relapses.map((relapse) => relapse.previous_streak_seconds),
    currentSeconds,
  );
  const earnedLevel = levelForXp(lifetimeXp);

  const { error } = await createLocalSupabaseClient().rpc("register_relapse", {
    p_relapse_id: relapseId,
    p_time_zone: timeZone,
    p_earned_level: earnedLevel,
    p_required_xp: xpThresholdForLevel(earnedLevel),
  });

  if (error) {
    return {
      ok: false,
      error: "Não foi possível registrar agora. Verifique o banco local e tente novamente.",
    };
  }

  revalidatePath("/");
  return { ok: true };
}
