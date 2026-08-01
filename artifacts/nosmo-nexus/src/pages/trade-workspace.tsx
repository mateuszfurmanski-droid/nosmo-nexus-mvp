import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BriefcaseBusiness } from "lucide-react";
import { CommunicationStrip } from "@/components/communication-strip";
import { getTradeDefinition, type TradeStatus, type TradeTool } from "@/config/trades";

const statusStyle: Record<TradeStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "PARTNER VALIDATION": "border-purple-400/35 bg-purple-400/10 text-purple-300",
};

function ToolCard({ tool }: { tool: TradeTool }) {
  const Icon = tool.icon;
  const className = "group flex min-h-56 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card";
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[tool.status]}`}>
          {tool.status}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold">{tool.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">{tool.note}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </>
  );

  if (tool.linkType === "internal") {
    return <Link href={tool.href} className={className}>{content}</Link>;
  }

  return (
    <a
      href={tool.href}
      className={className}
      target={tool.linkType === "external" ? "_blank" : undefined}
      rel={tool.linkType === "external" ? "noreferrer" : undefined}
    >
      {content}
    </a>
  );
}

export default function TradeWorkspace() {
  const [, params] = useRoute<{ tradeId: string }>("/trades/:tradeId");
  const trade = getTradeDefinition(params?.tradeId ?? "");

  if (!trade) {
    return (
      <div className="rounded-2xl border border-border bg-card/70 p-6">
        <p className="text-sm text-muted-foreground">This trade menu does not exist.</p>
        <Link href="/trades" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Trades
        </Link>
      </div>
    );
  }

  const TradeIcon = trade.icon;

  return (
    <div className="space-y-7 pb-8">
      <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <Link href="/trades" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Trades
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <TradeIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Trade workspace</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">{trade.name}</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">{trade.description}</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[trade.status]}`}>{trade.status}</span>
            <CommunicationStrip />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {trade.capabilities.map((capability) => (
            <span key={capability} className="rounded-full border border-border bg-background/45 px-3 py-1.5 text-xs text-muted-foreground">
              {capability}
            </span>
          ))}
        </div>
      </header>

      <section>
        <div className="flex items-start gap-3">
          <BriefcaseBusiness className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Applications for this trade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only tools relevant to {trade.name} are shown here. Trade-specific applications do not clutter the main Nexus menu.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trade.tools.map((tool) => <ToolCard key={tool.name} tool={tool} />)}
        </div>
      </section>
    </div>
  );
}
