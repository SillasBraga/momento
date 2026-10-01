"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { levelForXp, xpThresholdForLevel } from "@/lib/progression";
import { calculateCurrentStreak } from "@/lib/streak";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { calculateLifetimeXp } from "@/lib/xp";

const initialJourneySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("now") }),
  z.object({
    mode: z.literal("custom"),
    startedAt: z.iso.datetime({ offset: true }),
  }),
]);

export type InitializeJourneyResult = { error: string | null };

export async function initializeJourney(
  _previous: InitializeJourneyResult,
  formData: FormData,
): Promise<InitializeJourneyResult> {
  const userId = await requireAuthenticatedUserId();
  const input = initialJourneySchema.safeParse({
    mode: formData.get("mode"),
    startedAt: formData.get("startedAt"),
  });

  if (!input.success) {
    return { error: "Escolha uma data e horário válidos para iniciar." };
  }

  const now = new Date();
  const startedAt =
    input.data.mode === "now" ? now : new Date(input.data.startedAt);

  if (!Number.isFinite(startedAt.getTime()) || startedAt > now) {
    return { error: "A data inicial não pode estar no futuro." };
  }

  const initialSeconds = calculateCurrentStreak(startedAt.getTime(), now.getTime());
  const initialLevel = levelForXp(calculateLifetimeXp([], initialSeconds));

  const { error } = await createAdminSupabaseClient().from("app_state").insert({
    user_id: userId,
    journey_started_at: startedAt.toISOString(),
    current_streak_started_at: startedAt.toISOString(),
    display_level: initialLevel,
    highest_level_reached: initialLevel,
  });

  if (error && error.code !== "23505") {
    return { error: "Não foi possível salvar. Verifique a conexão com o Supabase e tente novamente." };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateJourneyStart(
  _previous: InitializeJourneyResult,
  formData: FormData,
): Promise<InitializeJourneyResult> {
  const userId = await requireAuthenticatedUserId();
  const input = z.iso.datetime({ offset: true }).safeParse(formData.get("startedAt"));
  if (!input.success) return { error: "Escolha uma data e horário válidos." };

  const startedAt = new Date(input.data);
  if (!Number.isFinite(startedAt.getTime()) || startedAt.getTime() > Date.now()) {
    return { error: "A data inicial não pode estar no futuro." };
  }

  const currentSeconds = calculateCurrentStreak(startedAt.getTime(), Date.now());
  const level = levelForXp(calculateLifetimeXp([], currentSeconds));
  const { error } = await createAdminSupabaseClient().rpc("update_journey_start", {
    p_user_id: userId,
    p_started_at: startedAt.toISOString(),
    p_level: level,
    p_required_xp: xpThresholdForLevel(level),
  });

  if (error) {
    return {
      error: error.message.includes("Journey start is locked after a relapse")
        ? "A data inicial não pode mudar após uma recaída."
        : "Não foi possível salvar a data inicial no banco.",
    };
  }

  revalidatePath("/");
  redirect("/");
}
