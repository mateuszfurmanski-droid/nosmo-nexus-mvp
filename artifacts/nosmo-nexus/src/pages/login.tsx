import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center dark bg-background text-foreground">
      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (isAuthenticated) return <Redirect to="/dashboard" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark">
      <div className="w-full max-w-sm p-8 border border-border rounded-xl bg-card flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <span className="text-primary font-bold text-2xl">N</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">NOSMO Nexus™</h1>
            <p className="text-muted-foreground text-sm mt-1">Construction site intelligence platform</p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-3">
          <button
            data-testid="button-login"
            onClick={login}
            className="w-full bg-primary text-primary-foreground h-10 rounded-md font-medium hover:opacity-90 transition-opacity text-sm"
          >
            Sign in with Replit
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Access requires a Replit account. Your session is encrypted.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} NOSMO Nexus™</p>
    </div>
  );
}
