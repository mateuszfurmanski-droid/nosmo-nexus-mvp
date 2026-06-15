import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderKanban, FileText, CheckSquare, MessageSquare, Plug2, LogOut } from "lucide-react";
import { useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center dark bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
  if (!isAuthenticated) {
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    window.location.href = `${BASE}/login`;
    return null;
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/projects", label: "Projects", icon: FolderKanban },
    { path: "/tasks", label: "Tasks", icon: CheckSquare },
    { path: "/plans", label: "Plans", icon: FileText },
    { path: "/ai", label: "AI Assistant", icon: MessageSquare },
    { path: "/integrations", label: "Integrations", icon: Plug2 },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground dark">
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold">N</span>
          </div>
          <span className="font-bold tracking-tight">NOSMO Nexus™</span>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  active 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold">{user?.firstName?.[0] || 'U'}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || 'User'}</p>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-foreground" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
