import type { CSSProperties, ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Navigation, type ActivePage } from "@/components/navigation";
import { ThemeRootSync } from "@/components/theme-root-sync";
import { getLevelTheme } from "@/lib/level-theme";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function AppFrame({
  active,
  children,
  level = 1,
  authenticated = false,
}: {
  active?: ActivePage;
  children: ReactNode;
  level?: number;
  authenticated?: boolean;
}) {
  const theme = getLevelTheme(level);

  return (
    <main
      data-level-theme={theme.key}
      data-texture={theme.texture}
      style={theme.properties as CSSProperties | undefined}
      className="level-theme min-h-screen px-4 py-10 pb-28 sm:px-6 sm:py-16"
    >
      <ThemeRootSync level={level} />
      <div className="mx-auto flex w-full max-w-4xl justify-center gap-6">
        {active && <Navigation active={active} />}
        <section className="theme-card w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-12">
          <div className="mb-10 flex items-center gap-3 text-primary">
            <span className="theme-emblem rounded-xl border border-primary/25 bg-primary/10 p-2.5">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <span className="text-sm font-semibold tracking-[0.2em] uppercase">Momento</span>
              {active && <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground">Nível {level} · {theme.name}</p>}
            </div>
            {authenticated && (
              <form action={signOut} className="ml-auto">
                <Button type="submit" variant="ghost" size="sm">Sair</Button>
              </form>
            )}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
