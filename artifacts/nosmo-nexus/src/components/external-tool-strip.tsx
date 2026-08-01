import { Link } from "wouter";
import { ArrowRight, ExternalLink, Layers3 } from "lucide-react";
import { externalTools, toolsForTrade } from "@/config/external-tools";

type ExternalToolStripProps = {
  tradeId?: string;
  limit?: number;
  showNames?: boolean;
  className?: string;
};

export function ExternalToolStrip({
  tradeId,
  limit = 8,
  showNames = false,
  className = "",
}: ExternalToolStripProps) {
  const tools = (tradeId ? toolsForTrade(tradeId) : externalTools).slice(0, limit);
  const allToolsHref = tradeId ? `/external-tools?trade=${tradeId}` : "/external-tools";

  return (
    <div
      className={`flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-border bg-background/45 p-2 backdrop-blur ${className}`}
      aria-label="External application launchers"
      data-testid="external-tool-strip"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary" title="External Tools">
        <Layers3 className="h-4 w-4" />
      </div>

      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <a
            key={tool.id}
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            title={`Open ${tool.name}`}
            aria-label={`Open ${tool.name}`}
            data-testid={`external-tool-${tool.id}`}
            className={`group flex shrink-0 items-center rounded-xl border border-border bg-card/70 transition-colors hover:border-primary/40 hover:bg-primary/10 ${
              showNames ? "min-w-36 gap-2.5 px-3 py-2" : "h-10 w-10 justify-center"
            }`}
          >
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:text-primary">
              <Icon className="h-3.5 w-3.5" />
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-md border border-border bg-background px-1 text-[8px] font-bold text-muted-foreground">
                {tool.shortLabel}
              </span>
            </div>
            {showNames && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{tool.name}</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Launcher</p>
              </div>
            )}
            {showNames && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />}
          </a>
        );
      })}

      <Link
        href={allToolsHref}
        title="Open all external tools"
        aria-label="Open all external tools"
        className="group flex h-10 shrink-0 items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
      >
        All
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
