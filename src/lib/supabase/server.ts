import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createLocalSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local.");
  }

  const parsedUrl = new URL(url);
  if (
    parsedUrl.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)
  ) {
    throw new Error("SUPABASE_URL deve apontar para o Supabase local.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
