import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { AuthForm } from "@/components/auth-form";
import { getAuthenticatedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmacao?: string }>;
}) {
  if (await getAuthenticatedUserId()) redirect("/");
  const { confirmacao } = await searchParams;
  return (
    <AppFrame>
      <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">Sua jornada</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Acesse seu progresso.</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Seus registros ficam vinculados à sua conta. Ao voltar, o tempo decorrido será calculado automaticamente.
      </p>
      {confirmacao === "erro" && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Não foi possível confirmar o e-mail. Confira a validade do link e tente entrar novamente.
        </p>
      )}
      <AuthForm />
    </AppFrame>
  );
}
