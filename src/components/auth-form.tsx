"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthResult } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const initial: AuthResult = { error: null, message: null };

function CredentialsForm({ mode }: { mode: "login" | "register" }) {
  const [result, action, pending] = useActionState(mode === "login" ? signIn : signUp, initial);
  return (
    <form action={action} className="mt-7 space-y-4">
      <div>
        <label htmlFor={`${mode}-email`} className="mb-2 block text-sm font-medium">E-mail</label>
        <input id={`${mode}-email`} name="email" type="email" autoComplete="email" required
          className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground" />
      </div>
      <div>
        <label htmlFor={`${mode}-password`} className="mb-2 block text-sm font-medium">Senha</label>
        <input id={`${mode}-password`} name="password" type="password" minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"} required
          className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-foreground" />
      </div>
      {result.error && <p role="alert" className="text-sm text-destructive">{result.error}</p>}
      {result.message && <p role="status" className="text-sm text-primary">{result.message}</p>}
      <Button type="submit" size="lg" disabled={pending} className="min-h-12 w-full">
        {pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  return (
    <>
      <div className="mt-7 flex gap-2" role="group" aria-label="Acesso à conta">
        <Button type="button" variant={mode === "login" ? "default" : "secondary"}
          onClick={() => setMode("login")}>Entrar</Button>
        <Button type="button" variant={mode === "register" ? "default" : "secondary"}
          onClick={() => setMode("register")}>Criar conta</Button>
      </div>
      <CredentialsForm key={mode} mode={mode} />
    </>
  );
}
