import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function supabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Configure SUPABASE_URL.");
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" &&
      !(parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname))) {
    throw new Error("SUPABASE_URL deve usar HTTPS ou apontar para o Supabase local.");
  }
  return url;
}

export function createAdminSupabaseClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Configure SUPABASE_SECRET_KEY.");
  return createClient(supabaseUrl(), secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function createAuthSupabaseClient() {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("Configure SUPABASE_PUBLISHABLE_KEY.");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), publishableKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}
