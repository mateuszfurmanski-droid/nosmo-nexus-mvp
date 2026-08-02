import { Link } from "wouter";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileBadge,
  FolderKanban,
  HardHat,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Network,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type Qualification = {
  name: string;
  issuer: string;
  state: string;
  expires: string;
  progress: number;
};

type Relation = {
  name: string;
  role: string;
  company: string;
  confidence: number;
};

type WorkItem = {
  title: string;
  subtitle: string;
  state: string;
  icon: LucideIcon;
};

const qualifications: Qualification[] = [
  {
    name: "CSCS Skilled Worker Card",
    issuer: "Construction Skills Certification Scheme",
    state: "VERIFIED",
    expires: "14 Mar 2028",
    progress: 100,
  },
  {
    name: "Fire Door Installation Awareness",
    issuer: "Demo Training Provider",
    state: "VERIFIED",
    expires: "22 Sep 2027",
    progress: 100,
  },
  {
    name: "Emergency First Aid at Work",
    issuer: "North Training Centre",
    state: "REVIEW DUE",
    expires: "18 Nov 2026",
    progress: 76,
  },
];

const relations: Relation[] = [
  { name: "Sarah Wilson", role: "Site Manager", company: "Northbridge Construction Ltd", confidence: 98 },
  { name: "Priya Shah", role: "Project Architect", company: "ArcLine Studio", confidence: 94 },
  { name: "Daniel Brooks", role: "Client Representative", company: "Riverside Estates", confidence: 91 },
];

const workItems: WorkItem[] = [
  { title: "Door D-G02", subtitle: "Ready for authorised fire inspection", state: "READY", icon: HardHat },
  { title: "Level 1 door kits", subtitle: "Materials confirmed · task can start", state: "READY", icon: Wrench },
  { title: "Electrical coordination", subtitle: "Two shared issues awaiting review", state: "2 ISSUES", icon: Network },
];

const stateClass: Record<string, string> = {
  VERIFIED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "REVIEW DUE": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  READY: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  "2 ISSUES": "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export default function PersonCardDemo() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-card/90 to-card/70 shadow-2xl">
        <div className="border-b border-primary/15 px-5 py-4 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-4 w-4" /> NOSMO Personal InfoCard
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">AVAILABLE</span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold text-cyan-300">SYNTHETIC DEMO</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/35 bg-background/55 text-3xl font-black text-primary shadow-[0_0_35px_rgba(0,255,255,0.14)]">
            AC
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-card bg-emerald-400 text-slate-950">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Professional identity</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">Alex Carter</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:text-base">
              <span className="font-semibold text-foreground">Joiner / Fire Door Installer</span>
              <span>·</span>
              <span>Demo Joinery Services</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Joinery', 'Fire Doors', 'Second Fix', 'Inspection Evidence'].map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1">
            <Link href="/communication-hub" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Contact
            </Link>
            <Link href="/card-maker" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/45 px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40">
              <Sparkles className="h-4 w-4" /> Card Maker
            </Link>
            <Link href="/people" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/45 px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40">
              <Users className="h-4 w-4" /> All people
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Current project</p>
              <h2 className="mt-1 text-xl font-semibold">Riverside Heights Demo</h2>
              <p className="mt-1 text-sm text-muted-foreground">Northbridge Construction Ltd · residential and commercial fit-out demonstration</p>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">ACTIVE</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <FolderKanban className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">active work items</p>
            </div>
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <FileBadge className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">qualifications</p>
            </div>
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <Network className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">18</p>
              <p className="text-xs text-muted-foreground">work graph links</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {workItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${stateClass[item.state]}`}>{item.state}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Contact and location</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3">
              <Phone className="h-4 w-4 text-primary" />
              <div><p className="text-xs text-muted-foreground">Work phone</p><p className="text-sm font-semibold">+44 7700 900 421</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3">
              <Mail className="h-4 w-4 text-primary" />
              <div><p className="text-xs text-muted-foreground">Work email</p><p className="text-sm font-semibold">alex.carter@example.demo</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3">
              <MapPin className="h-4 w-4 text-primary" />
              <div><p className="text-xs text-muted-foreground">Current site</p><p className="text-sm font-semibold">Riverside Heights Demo</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3">
              <Building2 className="h-4 w-4 text-primary" />
              <div><p className="text-xs text-muted-foreground">Employer</p><p className="text-sm font-semibold">Demo Joinery Services</p></div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BadgeCheck className="h-5 w-5" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Competence</p><h2 className="text-xl font-semibold">Qualifications and readiness</h2></div>
          </div>

          <div className="mt-5 space-y-3">
            {qualifications.map((qualification) => (
              <div key={qualification.name} className="rounded-xl border border-border bg-background/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{qualification.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{qualification.issuer}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${stateClass[qualification.state]}`}>{qualification.state}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>Valid until {qualification.expires}</span><span>{qualification.progress}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${qualification.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Network className="h-5 w-5" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Project network</p><h2 className="text-xl font-semibold">People connected to this role</h2></div>
          </div>

          <div className="mt-5 space-y-3">
            {relations.map((relation) => (
              <div key={relation.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">
                  {relation.name.split(' ').map((part) => part[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{relation.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{relation.role} · {relation.company}</p>
                </div>
                <span className="text-xs font-semibold text-cyan-300">{relation.confidence}%</span>
              </div>
            ))}
          </div>
          <Link href="/workspace" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open relationship tree <ChevronRight className="h-4 w-4" /></Link>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Privacy and ownership</p>
              <h2 className="text-xl font-semibold">This card belongs to the person, not the current employer.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Professional information is integrated privately first. Only selected fields and project participation are shared with Northbridge Construction Ltd for the Riverside Heights Demo.</p>
            </div>
          </div>
          <LockKeyhole className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><UserRound className="h-5 w-5 text-emerald-300" /><p className="mt-3 font-semibold">Private Nexus</p><p className="mt-1 text-xs text-muted-foreground">CV, discoveries and personal work history.</p></div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4"><BriefcaseBusiness className="h-5 w-5 text-cyan-300" /><p className="mt-3 font-semibold">Professional Card</p><p className="mt-1 text-xs text-muted-foreground">Approved identity, skills and contact routes.</p></div>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4"><FolderKanban className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Project Shared</p><p className="mt-1 text-xs text-muted-foreground">Role, assigned work, evidence and availability.</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-primary"><ChevronRight className="h-4 w-4 rotate-180" /> Back to Nexus Menu</Link>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4" /> Synthetic data · no private information</span>
      </div>
    </div>
  );
}
