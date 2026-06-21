import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { Link } from "wouter";
import { Sparkles, Search, Bell, Orbit } from "lucide-react";
import { AskNexus } from "@/components/ask-nexus";
import { SearchPalette } from "@/components/search-palette";
import { RadialHub } from "@/components/radial-hub";
import { FocusableEntity } from "@/focus/focusable-entity";

interface ShellContextValue {
  openHub: () => void;
  openAskNexus: () => void;
  openSearch: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within AppLayout");
  return ctx;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [askNexusOpen, setAskNexusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shell = useMemo<ShellContextValue>(
    () => ({
      openHub: () => setHubOpen(true),
      openAskNexus: () => setAskNexusOpen(true),
      openSearch: () => setSearchOpen(true),
    }),
    [],
  );

  return (
    <ShellContext.Provider value={shell}>
      <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark selection:bg-primary/30">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-8 gap-2 md:gap-4 shrink-0">
          {/* Brand → home */}
          <Link
            href="/"
            data-testid="link-home"
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="hidden sm:inline font-bold tracking-tight text-foreground text-sm leading-none">NOSMO Nexus™</span>
          </Link>

          {/* Radial hub launcher — the persistent way to move around the workspace */}
          <button
            onClick={() => setHubOpen(true)}
            data-testid="button-header-hub"
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
          >
            <Orbit className="w-4 h-4" />
            <span className="hidden sm:inline">Hub</span>
          </button>

          {/* Search */}
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

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => setAskNexusOpen(true)}
              data-testid="button-ask-nexus"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-full text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline">Ask Nexus</span>
            </button>
            <button className="hidden sm:block p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
            </button>
            <FocusableEntity
              target={{ type: "person", id: "p1" }}
              ariaLabel="Open your profile"
              testId="link-profile"
              className="rounded-full"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold">
                  MF
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
              </div>
            </FocusableEntity>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <RadialHub open={hubOpen} onOpenChange={setHubOpen} onOpenAskNexus={() => setAskNexusOpen(true)} />
        <AskNexus open={askNexusOpen} onOpenChange={setAskNexusOpen} />
        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ShellContext.Provider>
  );
}
