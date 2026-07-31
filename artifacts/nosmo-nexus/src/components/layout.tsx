import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  BriefcaseBusiness,
  CheckSquare,
  Files,
  FolderKanban,
  Home,
  LayoutGrid,
  MessageCircle,
  Network,
  PlugZap,
  Search,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AskNexus } from "@/components/ask-nexus";
import { SearchPalette } from "@/components/search-palette";
import { CommunicationStrip } from "@/components/communication-strip";
import { FocusableEntity } from "@/focus/focusable-entity";

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
  { label: "Trades", href: "/trades", icon: BriefcaseBusiness },
  { label: "People", href: "/people", icon: Users },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Documents", href: "/plans", icon: Files },
  { label: "Communication", href: "/communication-hub", icon: MessageCircle },
  { label: "System Map", href: "/system-map", icon: Network },
  { label: "Integrations", href: "/integrations", icon: PlugZap },
  { label: "Settings", href: "/settings", icon: Settings },
];

const mobileNavigation = navigation.slice(0, 5);

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppLayout");
  return ctx;
}

function isActiveRoute(current: string, href: string) {
  if (href === "/") return current === "/" || current === "/modules";
  return current === href || current.startsWith(`${href}/`) || current.startsWith(`${href}?`);
}

function NavigationLink({ item, current, compact = false }: { item: NavigationItem; current: string; compact?: boolean }) {
  const Icon = item.icon;
  const active = isActiveRoute(current, item.href);

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      data-testid={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
      className={
        compact
          ? `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors ${
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`
          : `group relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
              active
                ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_rgba(0,255,255,0.12)]"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
            }`
      }
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      {compact && <span className="max-w-full truncate">{item.label}</span>}
      {!compact && (
        <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg group-hover:block">
          {item.label}
        </span>
      )}
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
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell = useMemo<ShellContextValue>(
    () => ({
      openHub: () => navigate("/"),
      openAskNexus: () => setAskNexusOpen(true),
      openSearch: () => setSearchOpen(true),
    }),
    [navigate],
  );

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground selection:bg-primary/30 dark">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md md:gap-4 md:px-6">
          <Link href="/" data-testid="link-home" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-[0_0_15px_rgba(0,255,255,0.3)]">
              <span className="text-sm font-bold text-primary-foreground">N</span>
            </div>
            <span className="hidden text-sm font-bold leading-none tracking-tight text-foreground sm:inline">NOSMO Nexus™</span>
          </Link>

          <button
            onClick={() => navigate("/")}
            data-testid="button-header-menu"
            className="flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 md:px-4"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <div className="flex min-w-0 max-w-xl flex-1 items-center">
            <button
              onClick={() => setSearchOpen(true)}
              data-testid="button-open-search"
              className="flex w-full items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search Nexus...</span>
              <div className="ml-auto hidden items-center gap-1 md:flex">
                <kbd className="inline-flex h-5 items-center rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘</kbd>
                <kbd className="inline-flex h-5 items-center rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">K</kbd>
              </div>
            </button>
          </div>

          <div className="hidden xl:block">
            <CommunicationStrip />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <button
              onClick={() => setAskNexusOpen(true)}
              data-testid="button-ask-nexus"
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 md:px-4"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline">Ask Nexus</span>
            </button>
            <button className="relative hidden rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
            <FocusableEntity
              target={{ type: "person", id: "p1" }}
              ariaLabel="Open your profile"
              testId="link-profile"
              className="rounded-full"
            >
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">MF</div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-400" />
              </div>
            </FocusableEntity>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="relative hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-background/65 py-3 backdrop-blur md:flex">
            {navigation.map((item) => (
              <NavigationLink key={item.label} item={item} current={location} />
            ))}
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-36 md:p-8 md:pb-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>

        <div className="fixed bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2 md:hidden">
          <CommunicationStrip floating />
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/92 px-2 py-1.5 backdrop-blur-xl md:hidden">
          {mobileNavigation.map((item) => (
            <NavigationLink key={item.label} item={item} current={location} compact />
          ))}
        </nav>

        <AskNexus open={askNexusOpen} onOpenChange={setAskNexusOpen} />
        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ShellContext.Provider>
  );
}
