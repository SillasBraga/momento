import { NextResponse, type NextRequest } from "next/server";
import { createAuthSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? request.url;
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (code || tokenHash) {
    const client = await createAuthSupabaseClient();
    const { error } = tokenHash
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : await client.auth.exchangeCodeForSession(code!);
    if (!error) return NextResponse.redirect(new URL("/", appUrl));
  }
  return NextResponse.redirect(new URL("/login?confirmacao=erro", appUrl));
}
