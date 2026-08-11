import { Link } from "wouter";
import { BriefcaseBusiness, Cuboid, ShieldCheck } from "lucide-react";
import type { InstallationPilot } from "@/bim/installation-pilots";

const base = import.meta.env.BASE_URL;

type BimObjectCardProps = {
  pilot: InstallationPilot;
  readiness: number;
  blocked: boolean;
};

export function BimObjectCard({ pilot, readiness, blocked }: BimObjectCardProps) {
  return (
    <section className="rounded-3xl border border-primary/20 bg-card/65 p-4 md:p-6" aria-label={`${pilot.object.code} Nexus Object Card`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Canonical Nexus Object Card</p>
          <h2 className="mt-1 text-xl font-semibold md:text-2xl">{pilot.object.code} · {pilot.object.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">One shared object component for Electrical, HVAC and Plumbing. Trade data changes; the Nexus object contract does not.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-[10px] font-bold text-purple-200">SYNTHETIC MODEL</span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${blocked ? "border-red-400/35 bg-red-400/10 text-red-300" : "border-cyan-400/35 bg-cyan-400/10 text-cyan-300"}`}>
            {blocked ? "BLOCKED" : `${readiness}% READINESS`}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
        <div className="rounded-2xl border border-purple-400/20 bg-background/45 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300"><Cuboid className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">BIM source context</p>
              <h3 className="font-semibold">{pilot.object.name}</h3>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-muted-foreground">Nexus Object ID</dt><dd className="mt-1 font-semibold">{pilot.object.id}</dd></div>
            <div><dt className="text-muted-foreground">External model ID</dt><dd className="mt-1 font-semibold">{pilot.object.externalId}</dd></div>
            <div><dt className="text-muted-foreground">Revision</dt><dd className="mt-1 font-semibold">{pilot.object.revision}</dd></div>
            <div><dt className="text-muted-foreground">System</dt><dd className="mt-1 font-semibold">{pilot.object.system}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-semibold">{pilot.object.location}</dd></div>
          </dl>
          <p className="mt-5 rounded-xl border border-purple-400/20 bg-purple-400/5 p-3 text-xs leading-relaxed text-muted-foreground">
            Geometry, GUID, coordinates, revision and design intent remain model-source responsibilities. Nexus never silently overwrites them.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-background/45 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Nexus operational context</p>
              <h3 className="font-semibold">{pilot.work.taskTitle}</h3>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Trade</dt><dd className="font-semibold">{pilot.tradeName}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Work package</dt><dd className="font-semibold">{pilot.work.packageId}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Task</dt><dd className="font-semibold">{pilot.work.taskId}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Supervisor</dt><dd className="font-semibold">{pilot.work.supervisor}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Assigned team</dt><dd className="font-semibold">{pilot.work.assignedTeam}</dd></div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/tasks" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Tasks</Link>
            <Link href="/people" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Person Card</Link>
            <Link href="/safety-connector" className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Work Wallet</Link>
            {pilot.specialistHref ? (
              <a href={`${base}${pilot.specialistHref}`} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">{pilot.specialistLabel ?? "Specialist app"}</a>
            ) : (
              <Link href={`/trades/${pilot.tradeId}`} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-center text-xs font-semibold hover:bg-secondary">Trade workspace</Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-background/45 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Readiness</p>
              <h3 className="mt-1 text-2xl font-bold">{readiness}%</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">{blocked ? "Blocked by unresolved field difference" : pilot.readiness.summary}</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div className="mt-4 space-y-2">
            {pilot.readiness.checks.map((check) => (
              <div key={check.title} className="rounded-xl border border-border bg-card/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{check.title}</span>
                  <span className={`text-[9px] font-bold ${check.state === "PASS" ? "text-emerald-300" : check.state === "BLOCK" ? "text-red-300" : "text-amber-300"}`}>{check.state}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{check.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">UNKNOWN remains UNKNOWN. Work Wallet references in these pilots are synthetic readiness context, not live vendor records.</p>
        </div>
      </div>
    </section>
  );
}
