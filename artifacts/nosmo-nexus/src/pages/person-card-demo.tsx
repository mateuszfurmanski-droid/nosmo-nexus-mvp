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
  GraduationCap,
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
import {
  ACCESS_CONTEXT_PROJECTS,
  DEFAULT_ACCESS_PERSON_ID,
  DEFAULT_ACCESS_PROJECT_ID,
  PROJECT_PARTICIPATIONS,
  getPersonCard,
} from "../access/person-project-access-context";

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
  { title: "Project coordination", subtitle: "Project participation defines responsibility here", state: "READY", icon: Network },
];

const stateClass: Record<string, string> = {
  VERIFIED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "REVIEW DUE": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  READY: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  "2 ISSUES": "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function humanise(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function projectLabel(projectId: string) {
  return ACCESS_CONTEXT_PROJECTS.find((project) => project.projectId === projectId)?.label ?? humanise(projectId);
}

export default function PersonCardDemo() {
  const personCard = getPersonCard(DEFAULT_ACCESS_PERSON_ID);
  const participations = PROJECT_PARTICIPATIONS.filter(
    (participation) => participation.personId === DEFAULT_ACCESS_PERSON_ID,
  );
  const queryProject = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("project")
    : null;
  const activeProjectId = queryProject && participations.some((item) => item.projectId === queryProject)
    ? queryProject
    : DEFAULT_ACCESS_PROJECT_ID;

  if (!personCard) return null;

  const professionLabels = personCard.professions.map(humanise);
  const permanentIdentityTags = [
    ...professionLabels,
    ...(personCard.competences ?? []),
  ];

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Permanent professional identity</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">{personCard.displayName}</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              <span className="font-semibold text-foreground">{professionLabels.join(" / ")}</span>
              <span className="mx-2">·</span>
              <span>derived from education, qualifications and competence</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {permanentIdentityTags.map((tag) => (
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

      <section className="rounded-2xl border border-primary/20 bg-card/70 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Project participation</p>
            <h2 className="mt-1 text-xl font-semibold">Same person · different project functions</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Profession stays on the Person Card. Function, assignment, company and responsibility belong to the Person ↔ Project relationship.
            </p>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary">{participations.length} ACTIVE LINKS</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {participations.map((participation) => {
            const active = participation.projectId === activeProjectId;
            return (
              <article
                key={participation.participationId}
                className={`rounded-2xl border p-4 ${active ? "border-cyan-300/45 bg-cyan-400/[0.07] ring-1 ring-cyan-300/15" : "border-border bg-background/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold">{projectLabel(participation.projectId)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{participation.company ?? "Company not set"}</p>
                    </div>
                  </div>
                  {active && <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-bold text-cyan-300">CURRENT CONTEXT</span>}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/35 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">Function on project</p>
                    <p className="mt-1.5 text-sm font-semibold">{participation.functions.map(humanise).join(" / ")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/35 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">Assignment</p>
                    <p className="mt-1.5 text-sm font-semibold">{participation.assignments.map(humanise).join(" / ")}</p>
                  </div>
                </div>

                {!!participation.responsibilities?.length && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">Responsibilities</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participation.responsibilities.map((responsibility) => (
                        <span key={responsibility} className="rounded-full border border-border bg-background/35 px-2.5 py-1 text-[10px] text-muted-foreground">{responsibility}</span>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/relationship-tree?project=${participation.projectId}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                >
                  Open this project context <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Current work context</p>
              <h2 className="mt-1 text-xl font-semibold">{projectLabel(activeProjectId)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">The active project selects the relevant participation; it never changes the person’s profession.</p>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">ACTIVE</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <FolderKanban className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">{workItems.length}</p>
              <p className="text-xs text-muted-foreground">active work items</p>
            </div>
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <FileBadge className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">{personCard.qualifications?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">education / qualifications</p>
            </div>
            <div className="rounded-xl border border-border bg-background/35 p-4">
              <Network className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">{participations.length}</p>
              <p className="text-xs text-muted-foreground">project participations</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {workItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
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
              <div><p className="text-xs text-muted-foreground">Current project</p><p className="text-sm font-semibold">{projectLabel(activeProjectId)}</p></div>
            </div>
            <Link href="/communication-hub" className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3 transition-colors hover:border-primary/50">
              <div className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Communication Hub</p><p className="text-sm font-semibold">Phone · SMS · WhatsApp · Email · Teams · LinkedIn</p></div></div>
              <ChevronRight className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Professional source</p><h2 className="text-xl font-semibold">Education, qualifications and competence</h2></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">Qualifications</p>
              <div className="mt-3 flex flex-wrap gap-2">{personCard.qualifications?.map((value) => <span key={value} className="rounded-full border border-border px-2.5 py-1 text-xs">{value}</span>)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">Certifications</p>
              <div className="mt-3 flex flex-wrap gap-2">{personCard.certifications?.map((value) => <span key={value} className="rounded-full border border-border px-2.5 py-1 text-xs">{value}</span>)}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {qualifications.map((qualification) => (
              <div key={qualification.name} className="rounded-xl border border-border bg-background/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{qualification.name}</p><p className="mt-1 text-xs text-muted-foreground">{qualification.issuer}</p></div>
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
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Project network</p><h2 className="text-xl font-semibold">People connected in the active context</h2></div>
          </div>
          <div className="mt-5 space-y-3">
            {relations.map((relation) => (
              <div key={relation.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">{relation.name.split(" ").map((part) => part[0]).join("")}</div>
                <div className="min-w-0 flex-1"><p className="font-semibold">{relation.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{relation.role} · {relation.company}</p></div>
                <span className="text-xs font-semibold text-cyan-300">{relation.confidence}%</span>
              </div>
            ))}
          </div>
          <Link href={`/relationship-tree?project=${activeProjectId}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open relationship tree <ChevronRight className="h-4 w-4" /></Link>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Privacy and ownership</p>
              <h2 className="text-xl font-semibold">This card belongs to the person, not the current employer.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Professional identity stays with the person. Each company/project receives only the relevant participation, assignment and approved shared fields.</p>
            </div>
          </div>
          <LockKeyhole className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><UserRound className="h-5 w-5 text-emerald-300" /><p className="mt-3 font-semibold">Person Card</p><p className="mt-1 text-xs text-muted-foreground">Permanent profession, education, qualifications and competence.</p></div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4"><BriefcaseBusiness className="h-5 w-5 text-cyan-300" /><p className="mt-3 font-semibold">Project Participation</p><p className="mt-1 text-xs text-muted-foreground">Function, assignment, responsibility and company for one project.</p></div>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4"><BadgeCheck className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Access Resolver</p><p className="mt-1 text-xs text-muted-foreground">Combines professional identity with the active participation.</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-primary"><ChevronRight className="h-4 w-4 rotate-180" /> Back to Nexus Menu</Link>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4" /> Synthetic data · no private information</span>
      </div>
    </div>
  );
}
