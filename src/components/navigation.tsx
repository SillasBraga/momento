import Link from "next/link";
import { History, LayoutDashboard } from "lucide-react";

export type ActivePage = "dashboard" | "history";

const pages = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { href: "/historico", label: "Histórico", icon: History, id: "history" },
] as const;

function NavigationLinks({ active }: { active: ActivePage }) {
  return pages.map(({ href, label, icon: Icon, id }) => (
    <Link
      key={id}
      href={href}
      prefetch={false}
      aria-current={active === id ? "page" : undefined}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors sm:justify-start ${
        active === id
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  ));
}

export function Navigation({ active }: { active: ActivePage }) {
  return (
    <>
      <nav aria-label="Navegação principal" className="hidden w-40 shrink-0 self-start space-y-1 pt-3 sm:block">
        <NavigationLinks active={active} />
      </nav>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden"
      >
        <NavigationLinks active={active} />
      </nav>
    </>
  );
}
