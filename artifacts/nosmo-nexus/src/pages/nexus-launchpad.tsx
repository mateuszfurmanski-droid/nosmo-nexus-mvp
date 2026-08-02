import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Clock3,
  DoorOpen,
  FileText,
  FolderKanban,
  HardHat,
  MapPin,
  MessageSquare,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useShell } from "@/components/layout";

const base = import.meta.env.BASE_URL;

const tools = [
  {
    name: "Fire Door Register",
    description: "Register, inspect and track every fire door in the project.",
    href: `${base}fire-door-register-demo/`,
    icon: ShieldCheck,
    meta: "18 doors · 3 due",
  },
  {
    name: "DoorFlow",
    description: "Plan-led installation, evidence and authorised sign-off.",
    href: `${base}doorflow-demo/`,
    icon: DoorOpen,
    meta: "15 doors · 72%",
  },
  {
    name: "Electrical",
    description: "Testing, certificates, schematics and commissioning progress.",
    href: `${base}electrical-commissioning/`,
    icon: CircuitBoard,
    meta: "Block A · 64%",
  },
];

const activity = [
  { title: "Door D-014 evidence added", detail: "Alex Morgan · 18 minutes ago", icon: DoorOpen },
  { title: "Level 02 inspection needs review", detail: "Fire Door Register · 1 hour ago", icon: AlertTriangle },
  { title: "Electrical certificate updated", detail: "Jordan Lee · 2 hours ago", icon: CircuitBoard },
  { title: "RCP revision linked to project", detail: "Documents · Yesterday", icon: FileText },
];

export default function NexusLaunchpad() {
  const { openAskNexus } = useShell();

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/[.10] via-card/90 to-card/60 shadow-2xl">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">Active project</span>
              <span className="text-muted-foreground">Riverside Heights</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-[-.04em] sm:text-4xl md:text-5xl">Everything happening on site, in one place.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Continue work, review what changed and open the specialist tool you need without leaving the project context.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/projects/prj1" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_26px_rgba(0,255,255,.18)]">
                Open project <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={openAskNexus} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/20">
                <Sparkles className="h-4 w-4" /> Ask about this project
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/45 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Project health</p>
                <p className="mt-2 text-3xl font-bold">72%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-6 w-6" /></div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[72%] rounded-full bg-primary" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">12</p><p className="text-[10px] text-muted-foreground">Open tasks</p></div>
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold text-amber-300">3</p><p className="text-[10px] text-muted-foreground">Need review</p></div>
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">8</p><p className="text-[10px] text-muted-foreground">People on site</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/projects" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><FolderKanban className="h-5 w-5 text-primary" /><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Projects</p><p className="mt-1 text-xs text-muted-foreground">4 active workspaces</p>
        </Link>
        <Link href="/people" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><Users className="h-5 w-5 text-primary" /><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">People</p><p className="mt-1 text-xs text-muted-foreground">Roles, competence and availability</p>
        </Link>
        <Link href="/tasks" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><Wrench className="h-5 w-5 text-primary" /><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Tasks</p><p className="mt-1 text-xs text-muted-foreground">Work, snags and approvals</p>
        </Link>
        <Link href="/plans" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><FileText className="h-5 w-5 text-primary" /><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Documents</p><p className="mt-1 text-xs text-muted-foreground">Plans, schedules and evidence</p>
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,.6fr)]">
        <div className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Project tools</p>
              <h2 className="mt-1 text-xl font-semibold">Continue the work</h2>
            </div>
            <Link href="/projects/prj1" className="text-xs font-semibold text-primary">Project overview</Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <a key={tool.name} href={tool.href} className="group flex min-h-56 flex-col rounded-2xl border border-border bg-background/45 p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/[.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="mt-5 font-semibold">{tool.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                  <p className="mt-4 border-t border-border pt-3 text-xs font-semibold text-primary">{tool.meta}</p>
                </a>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Live context</p><h2 className="mt-1 text-xl font-semibold">What changed</h2></div>
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-1">
            {activity.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 rounded-xl p-3 hover:bg-secondary/45">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>
                </div>
              );
            })}
          </div>
          <Link href="/timeline" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-semibold text-muted-foreground hover:border-primary/30 hover:text-primary">View project history <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center rounded-3xl border border-primary/20 bg-primary/[.06] p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Network className="h-5 w-5" /></div>
          <div><p className="font-semibold">Project memory is connected</p><p className="mt-1 text-sm text-muted-foreground">People, tasks, documents, specialist workflows and decisions stay attached to Riverside Heights.</p></div>
        </div>
        <Link href="/workspace" className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-background/40 px-4 py-2.5 text-sm font-semibold text-primary">Open relationship view <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
