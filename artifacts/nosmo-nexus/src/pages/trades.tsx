import { Link } from "wouter";
import { ArrowRight, BriefcaseBusiness, Layers3 } from "lucide-react";
import { tradeDefinitions, type TradeStatus } from "@/config/trades";

const statusStyle: Record<TradeStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  DEMO: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  "IN DEVELOPMENT": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  "PARTNER VALIDATION": "border-purple-400/35 bg-purple-400/10 text-purple-300",
};

export default function Trades() {
  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-xl backdrop-blur md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">NOSMO Nexus</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">Trades</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Choose the profession first. The next screen shows only applications and shared layers relevant to that trade. DoorFlow and Electrical Commissioning therefore stay inside their profession menus instead of appearing across the whole system.
            </p>
          </div>
          <Link href="/projects" className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
            Select project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-primary">{tradeDefinitions.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Trade menus</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-emerald-300">{tradeDefinitions.filter((trade) => trade.status === "ACTIVE").length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active trade surfaces</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-cyan-300">{tradeDefinitions.filter((trade) => trade.status === "DEMO").length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Trade demonstrators</p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <p className="text-2xl font-bold text-purple-300">Shared</p>
            <p className="mt-1 text-xs text-muted-foreground">InfoCard, Work Wallet and BIM injected where needed</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-start gap-3">
          <Layers3 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Profession-first navigation</p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">Select a construction trade</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tradeDefinitions.map((trade) => {
            const Icon = trade.icon;
            return (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="group flex min-h-60 flex-col rounded-2xl border border-border bg-card/75 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[trade.status]}`}>
                    {trade.status}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{trade.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{trade.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trade.capabilities.map((capability) => (
                    <span key={capability} className="rounded-full border border-border bg-background/45 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {capability}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>{trade.tools.length} relevant tools</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-400/20 bg-card/55 p-5 md:p-6">
        <p className="font-semibold">Shared layers are not duplicated as trade applications</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Personal InfoCard, Work Wallet and FabStation / BIM Overlay remain top-level Nexus layers. Each trade menu references only the shared layers it actually needs.
        </p>
      </section>
    </div>
  );
}
