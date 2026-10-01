"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState } from "react";

export function ConfirmSession({ url, publishableKey }: { url: string; publishableKey: string }) {
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function confirm() {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = query.get("code");
      if (code) {
        window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
        return;
      }

      const client = createBrowserClient(url, publishableKey, {
        auth: { detectSessionInUrl: false },
      });
      const tokenHash = query.get("token_hash");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const result = tokenHash
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
        : accessToken && refreshToken
          ? await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : null;

      if (result && !result.error) {
        window.history.replaceState(null, "", "/auth/confirm");
        window.location.replace("/");
      } else {
        window.history.replaceState(null, "", "/auth/confirm");
        setError(true);
      }
    }

    void confirm().catch(() => {
      window.history.replaceState(null, "", "/auth/confirm");
      setError(true);
    });
  }, [url, publishableKey]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Confirmação de e-mail</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error ? "Não foi possível confirmar a conta. Tente entrar ou solicite um novo link." : "Confirmando sua conta..."}
        </p>
        {error && <a className="mt-5 inline-block underline" href="/login">Voltar para o login</a>}
      </div>
    </main>
  );
}
