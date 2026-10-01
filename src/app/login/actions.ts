"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthSupabaseClient } from "@/lib/supabase/server";

export type AuthResult = { error: string | null; message: string | null };

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function signIn(_previous: AuthResult, formData: FormData): Promise<AuthResult> {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!credentials.success) return { error: "Informe um e-mail válido e senha com pelo menos 8 caracteres.", message: null };

  const client = await createAuthSupabaseClient();
  const { error } = await client.auth.signInWithPassword(credentials.data);
  if (error) return { error: "Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta.", message: null };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_previous: AuthResult, formData: FormData): Promise<AuthResult> {
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!credentials.success) return { error: "Informe um e-mail válido e senha com pelo menos 8 caracteres.", message: null };

  const siteUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const client = await createAuthSupabaseClient();
  const { data, error } = await client.auth.signUp({
    ...credentials.data,
    options: { emailRedirectTo: new URL("/auth/confirm", siteUrl).toString() },
  });
  if (error) return { error: "Não foi possível criar a conta. Tente novamente.", message: null };
  if (!data.session) return { error: null, message: "Confira seu e-mail para confirmar a conta. Depois, entre com sua senha." };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const client = await createAuthSupabaseClient();
  await client.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
