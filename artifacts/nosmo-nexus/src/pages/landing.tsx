import { Link, Redirect } from "wouter";
import { ArrowRight, Activity, Layers, ShieldCheck, Zap } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Authenticated users skip the marketing page and go straight to the app.
  if (!isLoading && isAuthenticated) return <Redirect to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-16 flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">NOSMO Nexus™</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View Demo
          </Link>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="py-20 md:py-32 px-6 md:px-12 max-w-6xl mx-auto w-full flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Investor Demo — V0 Live
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-tight max-w-4xl text-foreground">
            Stop Searching.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
              Start Asking.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            The precision-engineered intelligence layer for modern construction teams.
            Connect your data, ask questions, and build faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Zap className="w-5 h-5" />
              Explore Demo <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="border border-border text-foreground px-8 py-4 rounded-lg font-medium text-lg hover:bg-secondary transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            No login required to explore. Full functionality in demo mode.
          </p>
        </section>

        {/* Features */}
        <section className="py-20 bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Activity,
                title: "Live Activity",
                desc: "Monitor every action on site in real-time. Unprecedented visibility into your projects.",
              },
              {
                icon: Layers,
                title: "Plan Analysis",
                desc: "Upload PDFs and let our AI extract the critical details instantly. No manual review.",
              },
              {
                icon: ShieldCheck,
                title: "Secure Integrations",
                desc: "Connecting securely with the tools your team already uses — Procore, Aconex, and more.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 border border-border rounded-xl bg-background flex flex-col gap-4 hover:border-primary/30 transition-colors"
              >
                <f.icon className="w-8 h-8 text-primary" />
                <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 max-w-3xl mx-auto w-full text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to explore?</h2>
          <p className="text-muted-foreground mb-8">
            No account needed. Click below to open the live demo with real data, a task board, AI assistant, and plan uploads.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            <Zap className="w-5 h-5" />
            Launch Demo <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      <footer className="py-8 border-t border-border text-center text-muted-foreground bg-card">
        <p className="text-sm">© {new Date().getFullYear()} NOSMO Nexus™. All rights reserved.</p>
      </footer>
    </div>
  );
}
