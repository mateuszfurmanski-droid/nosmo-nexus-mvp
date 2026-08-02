import { Link } from "wouter";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useShell } from "@/components/layout";

const activity = [
  { title: "Level 03 internal-walls plan linked", detail: "Drawing 11998-ATA-XX-03-CPD-AR-1105 · revision C13", icon: FileText },
  { title: "Master Door Schedule indexed", detail: "Drawing 11998-ATA-XX-ZZ-CPD-AR-1200 · revision C07", icon: FileSpreadsheet },
  { title: "62 Level 03 doors recognised", detail: "49 fire-rated · 40 acoustic-rated · 7 riser doors", icon: DoorOpen },
  { title: "Project source boundary applied", detail: "Original PDF and spreadsheet remain private", icon: ShieldCheck },
];

const projects = [
  {
    id: "prj1",
    name: "Halifax Head Office",
    client: "Lloyds Banking Group",
    location: "6 Trinity Road, Halifax",
    description: "Live project workspace built from the Level 03 internal-walls drawing and the master door schedule.",
    meta: ["Level 03", "62 doors", "C13 drawing"],
    primary: true,
  },
  {
    id: "riverside-demo",
    name: "Riverside Heights",
    client: "Fictional demonstration",
    location: "Leeds, UK",
    description: "Synthetic project used to demonstrate multi-trade workflows without exposing client information.",
    meta: ["DoorFlow", "Electrical", "Compliance"],
    primary: false,
  },
];

export default function NexusLaunchpad() {
  const { openAskNexus } = useShell();

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/[.10] via-card/90 to-card/60 shadow-2xl">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">Active project</span>
              <span className="text-muted-foreground">Halifax Head Office</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-[-.04em] sm:text-4xl md:text-5xl">Level 03 doors, plans and project context in one place.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              The Halifax workspace connects the Level 03 drawing, master door schedule, door identities, room context and specialist workflows without publishing the original source files.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/projects/prj1" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_26px_rgba(0,255,255,.18)]">
                Open Halifax project <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={openAskNexus} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/20">
                <Sparkles className="h-4 w-4" /> Ask about Halifax
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/45 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Level 03 package</p>
                <p className="mt-2 text-3xl font-bold">62 doors</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-6 w-6" /></div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-full rounded-full bg-primary" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">49</p><p className="text-[10px] text-muted-foreground">Fire-rated</p></div>
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">40</p><p className="text-[10px] text-muted-foreground">Acoustic</p></div>
              <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">7</p><p className="text-[10px] text-muted-foreground">Riser doors</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {projects.map(project => (
          <Link key={project.id} href={`/projects/${project.id}`} className={`group rounded-3xl border p-5 transition-all hover:-translate-y-0.5 ${project.primary ? "border-primary/30 bg-primary/[.06]" : "border-border bg-card/55 hover:border-primary/30"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-primary">{project.client}</p>
            <h2 className="mt-1 text-xl font-semibold">{project.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {project.location}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.meta.map(item => <span key={item} className="rounded-full border border-border bg-background/35 px-3 py-1.5 text-[11px] text-muted-foreground">{item}</span>)}
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/projects" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><FolderKanban className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Projects</p><p className="mt-1 text-xs text-muted-foreground">Open Halifax, Riverside and other workspaces</p>
        </Link>
        <Link href="/people" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><Users className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">People</p><p className="mt-1 text-xs text-muted-foreground">Roles, competence and availability</p>
        </Link>
        <Link href="/tasks" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><Wrench className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Tasks</p><p className="mt-1 text-xs text-muted-foreground">Work, snags and approvals</p>
        </Link>
        <Link href="/plans" className="group rounded-2xl border border-border bg-card/65 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
          <div className="flex items-center justify-between"><FileText className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div>
          <p className="mt-4 text-sm font-semibold">Documents</p><p className="mt-1 text-xs text-muted-foreground">Plans, schedules and evidence</p>
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,.6fr)]">
        <div className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Halifax project package</p>
            <h2 className="mt-1 text-xl font-semibold">What Nexus has connected</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link href="/projects/prj1" className="group flex min-h-52 flex-col rounded-2xl border border-border bg-background/45 p-5 transition-all hover:-translate-y-1 hover:border-primary/40">
              <FileSpreadsheet className="h-6 w-6 text-primary" /><h3 className="mt-5 font-semibold">Master Door Schedule</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">Door IDs, types, rooms, dimensions, ratings and components.</p><p className="mt-4 text-xs font-semibold text-primary">62 Level 03 records</p>
            </Link>
            <Link href="/projects/prj1" className="group flex min-h-52 flex-col rounded-2xl border border-border bg-background/45 p-5 transition-all hover:-translate-y-1 hover:border-primary/40">
              <FileText className="h-6 w-6 text-primary" /><h3 className="mt-5 font-semibold">Level 03 Plan</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">Room layout, door tags, stair cores, risers and revision context.</p><p className="mt-4 text-xs font-semibold text-primary">Revision C13</p>
            </Link>
            <Link href="/projects/prj1" className="group flex min-h-52 flex-col rounded-2xl border border-border bg-background/45 p-5 transition-all hover:-translate-y-1 hover:border-primary/40">
              <DoorOpen className="h-6 w-6 text-primary" /><h3 className="mt-5 font-semibold">Door Package</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">Fire, acoustic, combined-performance and riser doors grouped in one operational view.</p><p className="mt-4 text-xs font-semibold text-primary">8 door types</p>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Source activity</p><h2 className="mt-1 text-xl font-semibold">What changed</h2></div>
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
        </div>
      </section>
    </div>
  );
}
