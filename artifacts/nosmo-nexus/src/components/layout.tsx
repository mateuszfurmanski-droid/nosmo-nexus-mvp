import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FolderKanban, BookOpen, CheckSquare,
  Clock, Settings as SettingsIcon, Menu, X, Sparkles, Search, Bell,
  UserPlus, Layers, Puzzle, Orbit,
} from "lucide-react";
import { AskNexus } from "@/components/ask-nexus";
import { SearchPalette } from "@/components/search-palette";
import { RadialHub } from "@/components/radial-hub";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/people", label: "People", icon: Users },
  { path: "/card-maker", label: "Card Maker", icon: UserPlus },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/plans", label: "Plans", icon: Layers },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/timeline", label: "Timeline", icon: Clock },
  { path: "/integrations", label: "Integrations", icon: Puzzle },
];

function SidebarContent({
  location,
  onNav,
  openAskNexus,
  openHub,
}: {
  location: string;
  onNav?: () => void;
  openAskNexus: () => void;
  openHub: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-16 flex items-center px-5 border-b border-border gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        <span className="font-bold tracking-tight text-foreground text-sm leading-none">NOSMO Nexus™</span>
      </div>

      <div className="px-3 pt-4">
        <button
          onClick={() => {
            openHub();
            onNav?.();
          }}
          data-testid="button-open-hub"
          className="group relative w-full overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card px-4 py-3 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_24px_rgba(0,255,255,0.18)]"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
              <Orbit className="h-5 w-5 text-primary" />
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Open Hub</p>
              <p className="text-[11px] text-muted-foreground">Your living workspace</p>
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Workspace</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path || (item.path !== "/" && location.startsWith(item.path + "/"));
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNav}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-primary shadow-[0_0_10px_rgba(0,255,255,0.6)]" />
              )}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-background/40 group-hover:border-primary/20"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1">
          <button
            onClick={() => {
              openAskNexus();
              onNav?.();
            }}
            className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            Ask Nexus
          </button>
          <Link
            href="/settings"
            onClick={onNav}
            className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
              location.startsWith("/settings")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 group-hover:border-primary/20">
              <SettingsIcon className="h-4 w-4" />
            </span>
            Settings
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-border shrink-0">
        <Link
          href="/people/p1"
          onClick={onNav}
          data-testid="link-profile"
          className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold">
              MF
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">Mateusz Furmański</p>
            <p className="text-xs text-muted-foreground truncate">Founder · NOSMO</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [askNexusOpen, setAskNexusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground dark selection:bg-primary/30">
      <aside className="hidden md:flex w-64 border-r border-border flex-col shrink-0 relative z-20">
        <SidebarContent
          location={location}
          openAskNexus={() => setAskNexusOpen(true)}
          openHub={() => setHubOpen(true)}
        />
      </aside>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          location={location}
          onNav={() => setMobileOpen(false)}
          openAskNexus={() => setAskNexusOpen(true)}
          openHub={() => setHubOpen(true)}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-8 gap-3 md:gap-4 shrink-0">
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setHubOpen(true)}
            data-testid="button-header-hub"
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
          >
            <Orbit className="w-4 h-4" />
            <span className="hidden sm:inline">Hub</span>
          </button>

          <div className="flex-1 max-w-xl flex items-center min-w-0">
            <button
              onClick={() => setSearchOpen(true)}
              data-testid="button-open-search"
              className="w-full flex items-center gap-3 px-4 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-full text-sm text-muted-foreground transition-all focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Search Nexus...</span>
              <div className="ml-auto hidden md:flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘</kbd>
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">K</kbd>
              </div>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={() => setAskNexusOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-full text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Ask Nexus
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      <RadialHub open={hubOpen} onOpenChange={setHubOpen} onOpenAskNexus={() => setAskNexusOpen(true)} />
      <AskNexus open={askNexusOpen} onOpenChange={setAskNexusOpen} />
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
