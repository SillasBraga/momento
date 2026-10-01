import "server-only";
import { redirect } from "next/navigation";
import { createAuthSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const client = await createAuthSupabaseClient();
  const { data, error } = await client.auth.getClaims();
  return error ? null : data?.claims?.sub ?? null;
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/login");
  return userId;
}
