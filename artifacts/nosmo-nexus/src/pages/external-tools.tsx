import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Filter, Layers3, Link2, PlugZap, Search, Workflow } from "lucide-react";
import { externalTools, type ExternalToolCategory } from "@/config/external-tools";

const categories: Array<"All" | ExternalToolCategory> = [
  "All",
  "Construction",
  "Field",
  "Assets",
  "Documents",
  "Productivity",
  "Communication",
];

const categoryStyle: Record<ExternalToolCategory, string> = {
  Construction: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  Field: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  Assets: "border-red-400/25 bg-red-400/10 text-red-300",
  Documents: "border-blue-400/25 bg-blue-400/10 text-blue-300",
  Productivity: "border-green-400/25 bg-green-400/10 text-green-300",
  Communication: "border-purple-400/25 bg-purple-400/10 text-purple-300",
};

const maturity = [
  {
    name: "1. Launcher",
    description: "Open the existing system from Nexus using a verified web entry point.",
    icon: ExternalLink,
    current: true,
  },
  {
    name: "2. Contextual deep link",
    description: "Open the correct project, folder, asset, person, drawing or task where the external platform supports it.",
    icon: Link2,
    current: false,
  },
  {
    name: "3. Read connector",
    description: "Read authorised status and metadata into Nexus without replacing the source system.",
    icon: PlugZap,
    current: false,
  },
  {
    name: "4. Two-way workflow",
    description: "Create or update authorised records through APIs, events or approved automation.",
    icon: Workflow,
    current: false,
  },
];

export default function ExternalTools() {
  const tradeId = new URLSearchParams(window.location.search).get("trade");
  const [category, setCategory] = useState<"All" | ExternalToolCategory>("All");
  const [query, setQuery] = useState("");

  const visibleTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return externalTools.filter((tool) => {
      const tradeMatch = !tradeId || tool.relevantTrades.includes("all") || tool.relevantTrades.includes(tradeId);
      const categoryMatch = category === "All" || tool.category === category;
      const queryMatch =
        !normalized ||
        tool.name.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized) ||
        tool.futureIntegration.some((item) => item.toLowerCase().includes(normalized));
      return tradeMatch && categoryMatch && queryMatch;
    });
  }, [category, query, tradeId]);

  return (
    <div className="space-y-8 pb-8">
      <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">External Tools</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Existing construction and productivity systems stay available as simple launch icons. Nexus can later replace each basic link with project-aware deep links, read connectors and authorised two-way workflows.
            </p>
            {tradeId && (
              <p className="mt-3 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                Filtered for trade: {tradeId.replaceAll("-", " ")}
              </p>
            )}
          </div>
          <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">LAUNCHER LAYER</span>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card/55 p-5 md:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {maturity.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.name}
                className={`rounded-xl border p-4 ${
                  stage.current ? "border-primary/40 bg-primary/10" : "border-border bg-background/35"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stage.current ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {stage.current && <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Current</span>}
                </div>
                <h2 className="mt-4 text-sm font-semibold">{stage.name}</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{stage.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Application launcher</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">Open an existing system</h2>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-3 md:flex-none">
            <label className="flex min-w-56 flex-1 items-center gap-2 rounded-full border border-border bg-secondary/45 px-4 py-2 text-sm text-muted-foreground md:flex-none">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === item
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-background/35 text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <a
                key={tool.id}
                href={tool.href}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-64 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-background/45 px-2 text-xs font-bold text-muted-foreground">
                      {tool.shortLabel}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>

                <h3 className="mt-5 text-lg font-semibold">{tool.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${categoryStyle[tool.category]}`}>{tool.category}</span>
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">{tool.stage}</span>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Future Nexus connection</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tool.futureIntegration.join(" · ")}</p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-primary">
                  Open external system <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            );
          })}
        </div>

        {visibleTools.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No external tool matches this filter.
          </div>
        )}
      </section>
    </div>
  );
}
