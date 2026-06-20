import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FolderKanban, BookOpen, CheckSquare,
  Clock, Settings as SettingsIcon, Menu, X, Sparkles, Search, Bell
} from "lucide-react";
import { AskNexus } from "@/components/ask-nexus";
import { SearchPalette } from "@/components/search-palette";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/people", label: "People", icon: Users },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/knowledge", label: "Knowledge", icon: BookOpen },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/timeline", label: "Timeline", icon: Clock },
];

function SidebarContent({
  location,
  onNav,
  openAskNexus
}: {
  location: string;
  onNav?: () => void;
  openAskNexus: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-16 flex items-center px-6 border-b border-border gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold tracking-tight text-foreground text-sm leading-none block">
            NOSMO Nexus™
          </span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path || (item.path !== "/" && location.startsWith(item.path + "/"));
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => {
              openAskNexus();
              if (onNav) onNav();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-primary" />
            Ask Nexus
          </button>
          <Link
            href="/settings"
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
              location.startsWith("/settings")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <SettingsIcon className="w-4 h-4 shrink-0" />
            Settings
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center border border-border">
            <span className="text-xs font-bold text-foreground">AK</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">Alex Knight</p>
            <p className="text-xs text-muted-foreground truncate">alex@nexus.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [askNexusOpen, setAskNexusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-8 gap-4 shrink-0">
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex-1 max-w-xl flex items-center">
            <button
              onClick={() => setSearchOpen(true)}
              data-testid="button-open-search"
              className="w-full flex items-center gap-3 px-4 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-full text-sm text-muted-foreground transition-all focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <Search className="w-4 h-4" />
              <span>Search Nexus...</span>
              <div className="ml-auto hidden md:flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘</kbd>
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">K</kbd>
              </div>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
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

      <AskNexus open={askNexusOpen} onOpenChange={setAskNexusOpen} />
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
