import { Link } from "wouter";
import { ArrowRight, Activity, Layers, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      <header className="border-b border-border h-16 flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold">N</span>
          </div>
          <span className="font-bold text-lg tracking-tight">NOSMO Nexus™</span>
        </div>
        <Link href="/login" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:opacity-90">
          Login
        </Link>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto w-full flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            V0 Live Release
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight max-w-4xl">
            Stop Searching.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Start Asking.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            The precision-engineered intelligence layer for modern construction teams. Connect your data, ask questions, and build faster.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="bg-primary text-primary-foreground px-8 py-4 rounded-md font-medium text-lg hover:opacity-90 flex items-center gap-2">
              Access Nexus <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <section className="py-24 bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-xl bg-background flex flex-col gap-4">
              <Activity className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold">Live Activity</h3>
              <p className="text-muted-foreground">Monitor every action on site in real-time. Unprecedented visibility.</p>
            </div>
            <div className="p-6 border rounded-xl bg-background flex flex-col gap-4">
              <Layers className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold">Plan Analysis</h3>
              <p className="text-muted-foreground">Upload plans and let our AI extract the critical details instantly.</p>
            </div>
            <div className="p-6 border rounded-xl bg-background flex flex-col gap-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold">Secure Integrations</h3>
              <p className="text-muted-foreground">Connecting securely with the tools your team already uses.</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 border-t border-border text-center text-muted-foreground bg-card">
        <p>© {new Date().getFullYear()} NOSMO Nexus™. All rights reserved.</p>
      </footer>
    </div>
  );
}
