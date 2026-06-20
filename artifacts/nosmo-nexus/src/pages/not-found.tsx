import { Link } from "wouter";
import { LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground flex-col gap-6 p-4">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
        <LayoutDashboard className="w-8 h-8" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-lg text-muted-foreground max-w-sm mx-auto">
          The page you're looking for doesn't exist in this workspace.
        </p>
      </div>
      <Link href="/">
        <button className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Return to Dashboard
        </button>
      </Link>
    </div>
  );
}
