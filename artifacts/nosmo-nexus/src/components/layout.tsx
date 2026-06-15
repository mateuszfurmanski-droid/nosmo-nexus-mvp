import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FolderKanban, FileText, CheckSquare,
  MessageSquare, Plug2, LogOut, LogIn, Menu, X, Zap,
} from "lucide-react";
import { useEffect } from "react";

const navItems = [
  { path: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { path: "/projects",     label: "Projects",     icon: FolderKanban    },
  { path: "/tasks",        label: "Tasks",        icon: CheckSquare     },
  { path: "/plans",        label: "Plans",        icon: FileText        },
  { path: "/ai",           label: "AI Assistant", icon: MessageSquare   },
  { path: "/integrations", label: "Integrations", icon: Plug2           },
];

function SidebarContent({
  location,
  isAuthenticated,
  user,
  logout,
  onNav,
}: {
  location: string;
  isAuthenticated: boolean;
  user: { firstName?: string | null; profileImageUrl?: string | null } | null;
  logout: () => void;
  onNav?: () => void;
}) {
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-border gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold tracking-tight text-foreground text-sm leading-none block">
            NOSMO Nexus™
          </span>
          {!isAuthenticated && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 leading-none">
              <Zap className="w-2.5 h-2.5" /> DEMO
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path || location.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                active
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-foreground">{user.firstName?.[0] ?? "U"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user.firstName ?? "User"}</p>
              <p className="text-xs text-muted-foreground">Authenticated</p>
            </div>
            <button onClick={logout} title="Sign out" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Demo Mode</p>
              <p className="text-xs text-muted-foreground">Public preview</p>
            </div>
            <a
              href={`${BASE}/login`}
              title="Sign in"
              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
            >
              <LogIn className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground dark">

      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card flex-col shrink-0">
        <SidebarContent
          location={location}
          isAuthenticated={isAuthenticated}
          user={user ?? null}
          logout={logout}
        />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          location={location}
          isAuthenticated={isAuthenticated}
          user={user ?? null}
          logout={logout}
          onNav={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-xs">N</span>
            </div>
            <span className="font-bold text-sm text-foreground">NOSMO Nexus™</span>
            {!isAuthenticated && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 leading-none shrink-0">
                <Zap className="w-2.5 h-2.5" /> DEMO
              </span>
            )}
          </div>
        </header>

        {/* Demo mode banner — visible across all screen sizes inside the app */}
        {!isAuthenticated && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 text-sm shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-primary font-medium">Demo Mode</span>
            <span className="text-muted-foreground hidden sm:inline">— explore the platform freely. No login required.</span>
            <a
              href={(import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "") + "/login"}
              className="ml-auto text-xs text-primary hover:underline shrink-0 font-medium"
            >
              Sign in →
            </a>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
