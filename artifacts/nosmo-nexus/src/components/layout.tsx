import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  CheckSquare,
  FolderKanban,
  Home,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AskNexus } from "@/components/ask-nexus";
import { SearchPalette } from "@/components/search-palette";

interface ShellContextValue {
  openHub: () => void;
  openAskNexus: () => void;
  openSearch: () => void;
}

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "People", href: "/people", icon: Users },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppLayout");
  return ctx;
}

function isActiveRoute(current: string, href: string) {
  if (href === "/") return current === "/" || current === "/modules";
  return current === href || current.startsWith(`${href}/`);
}

function NavLink({ item, current, compact = false }: { item: NavigationItem; current: string; compact?: boolean }) {
  const Icon = item.icon;
  const active = isActiveRoute(current, item.href);

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      data-testid={`nav-${item.label.toLowerCase()}`}
      className={compact
        ? `flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`
        : `group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${active ? "border-primary/35 bg-primary/15 text-primary shadow-[0_0_24px_rgba(0,255,255,.12)]" : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"}`
      }
    >
      <Icon className={compact ? "h-5 w-5" : "h-5 w-5"} />
      {compact && <span>{item.label}</span>}
      {!compact && <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl group-hover:block">{item.label}</span>}
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [askNexusOpen, setAskNexusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, navigate] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell = useMemo<ShellContextValue>(() => ({
    openHub: () => navigate("/"),
    openAskNexus: () => setAskNexusOpen(true),
    openSearch: () => setSearchOpen(true),
  }), [navigate]);

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground selection:bg-primary/30 dark">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/88 px-4 backdrop-blur-xl md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="NOSMO Nexus home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-sm font-black text-primary shadow-[0_0_20px_rgba(0,255,255,.18)]">N</div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">NOSMO Nexus</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Work operating system</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-1 flex min-w-0 max-w-xl flex-1 items-center gap-3 rounded-full border border-border bg-secondary/45 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search project, person, task or document</span>
          </button>

          <button
            type="button"
            onClick={() => setAskNexusOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask Nexus</span>
          </button>

          <button type="button" className="relative hidden rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground sm:block" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-background" />
          </button>

          <Link href="/person-card-demo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary" aria-label="Your Person Card">MF</Link>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border bg-background/60 py-4 md:flex">
            {navigation.map(item => <NavLink key={item.label} item={item} current={location} />)}
            <div className="mt-auto pb-2 text-center text-[8px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Nexus v1</div>
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 md:p-7 md:pb-8">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/94 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden">
          {navigation.slice(0, 2).map(item => <NavLink key={item.label} item={item} current={location} compact />)}
          <button type="button" onClick={() => setAskNexusOpen(true)} className="mx-auto -mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_8px_30px_rgba(0,255,255,.25)]" aria-label="Ask Nexus">
            <Sparkles className="h-6 w-6" />
          </button>
          {navigation.slice(2).map(item => <NavLink key={item.label} item={item} current={location} compact />)}
        </nav>

        <AskNexus open={askNexusOpen} onOpenChange={setAskNexusOpen} />
        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ShellContext.Provider>
  );
}
