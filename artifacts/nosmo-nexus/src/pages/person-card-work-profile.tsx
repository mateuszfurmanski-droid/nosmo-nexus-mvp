import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Car,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

type View = "home" | "jobs" | "documents" | "references" | "ai";
type Availability = "AVAILABLE NOW" | "FROM MONDAY" | "NOT LOOKING";

type Match = {
  id: string;
  title: string;
  company: string;
  location: string;
  rate: string;
  start: string;
  score: number;
  reasons: string[];
  gap?: string;
};

const matches: Match[] = [
  {
    id: "job-001",
    title: "2nd Fix Joiner",
    company: "NorthBuild Recruitment",
    location: "Leeds · 11 mi",
    rate: "£25.50/h CIS",
    start: "Tomorrow",
    score: 96,
    reasons: ["Joinery match", "Inside travel radius", "Rate accepted", "CSCS ready"],
  },
  {
    id: "job-002",
    title: "Fire Door Installer",
    company: "SiteWorks Agency",
    location: "Wakefield · 18 mi",
    rate: "£26/h CIS",
    start: "Mon 31 Aug",
    score: 92,
    reasons: ["Fire door experience", "References ready", "Own transport"],
  },
  {
    id: "job-003",
    title: "Joiner — Nights",
    company: "BuildForce UK",
    location: "York · 33 mi",
    rate: "£27/h",
    start: "Tonight",
    score: 84,
    reasons: ["Night shift accepted", "Rate accepted", "Inside 40 mi"],
    gap: "IPAF requested — not on profile",
  },
];

const documents = [
  { name: "CSCS Skilled Worker", detail: "Expires 14 Mar 2028", state: "VERIFIED" },
  { name: "CV", detail: "Updated 21 Aug 2026", state: "CURRENT" },
  { name: "Right to Work", detail: "Employer check required", state: "ACTION" },
  { name: "Driving Licence", detail: "Owner-only document", state: "PRIVATE" },
];

const references = [
  { company: "Northbridge Construction", role: "Joiner", state: "CONFIRMED", date: "2025–2026" },
  { company: "Demo Joinery Services", role: "Fire Door Installer", state: "CONFIRMED", date: "2024–2025" },
];

function scoreTone(score: number) {
  if (score >= 90) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
}

function compactButton(active = false) {
  return [
    "flex min-h-14 flex-col items-start justify-between rounded-2xl border px-3 py-2.5 text-left transition",
    active
      ? "border-primary/45 bg-primary/15 text-primary"
      : "border-white/10 bg-white/[0.035] text-slate-100 hover:border-primary/30 hover:bg-primary/[0.08]",
  ].join(" ");
}

export default function PersonCardWorkProfile() {
  const [view, setView] = useState<View>("home");
  const [availability, setAvailability] = useState<Availability>("AVAILABLE NOW");
  const [notice, setNotice] = useState("");

  const readiness = useMemo(() => {
    const verifiedDocs = documents.filter((item) => item.state === "VERIFIED" || item.state === "CURRENT").length;
    return Math.round(((verifiedDocs + references.length + 2) / 8) * 100);
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function cycleAvailability() {
    setAvailability((current) => {
      if (current === "AVAILABLE NOW") return "FROM MONDAY";
      if (current === "FROM MONDAY") return "NOT LOOKING";
      return "AVAILABLE NOW";
    });
  }

  function shareProfile() {
    const text = "NOSMO Work Profile — Alex Carter — Joiner / Fire Door Installer — available now — Leeds +40 mi";
    const url = "https://nosmo.tech/work/demo-alex-carter";
    if (navigator.share) {
      void navigator.share({ title: "NOSMO Work Profile", text, url }).catch(() => undefined);
      showNotice("Share sheet opened — demo profile only.");
      return;
    }
    void navigator.clipboard?.writeText(url);
    showNotice("Demo Work Profile link copied.");
  }

  function openWhatsApp() {
    const message = encodeURIComponent(
      "Hi, I am Alex Carter, Joiner / Fire Door Installer, currently available for work around Leeds. NOSMO Work Profile: https://nosmo.tech/work/demo-alex-carter"
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
    showNotice("WhatsApp composer opened. Nexus does not claim this was sent.");
  }

  function openEmail() {
    const subject = encodeURIComponent("Available Joiner — Alex Carter");
    const body = encodeURIComponent(
      "Hi,\n\nI am Alex Carter, Joiner / Fire Door Installer, currently available for work around Leeds.\n\nNOSMO Work Profile: https://nosmo.tech/work/demo-alex-carter"
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showNotice("Email composer opened. Delivery is not verified.");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#04090c] p-2.5 text-slate-50 sm:p-6">
      <section
        data-testid="person-card-work-profile"
        className="relative flex h-[calc(100dvh-20px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[30px] border border-primary/25 bg-[radial-gradient(circle_at_15%_10%,rgba(47,126,115,0.24),transparent_33%),radial-gradient(circle_at_88%_16%,rgba(37,99,135,0.22),transparent_35%),linear-gradient(145deg,#071116,#0a171d_58%,#061014)] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:h-[min(720px,calc(100dvh-48px))]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:24px_24px]" />

        <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {view !== "home" ? (
              <button
                type="button"
                onClick={() => setView("home")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"
                aria-label="Back to Work Profile"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-[11px] font-black text-primary">
                N
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[9px] font-extrabold uppercase tracking-[0.18em] text-primary">
                NOSMO NEXUS · PERSON CARD
              </div>
              <div className="truncate text-xs font-semibold text-slate-300">Work Profile · ID 8F2-A7C</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-bold text-cyan-200 sm:inline-flex">
              SYNTHETIC DEMO
            </span>
            <button
              type="button"
              onClick={cycleAvailability}
              className={[
                "rounded-full border px-3 py-1.5 text-[9px] font-black tracking-[0.06em]",
                availability === "NOT LOOKING"
                  ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                  : availability === "FROM MONDAY"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
              ].join(" ")}
              data-testid="availability-toggle"
            >
              {availability}
            </button>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1">
          {view === "home" && (
            <div className="grid h-full min-h-0 gap-3 p-3 sm:grid-cols-[1.08fr_0.92fr] sm:gap-5 sm:p-6">
              <section className="flex min-h-0 flex-col rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative grid h-[74px] w-[74px] shrink-0 place-items-center rounded-[22px] border border-primary/35 bg-primary/10 text-2xl font-black text-primary shadow-[0_0_35px_rgba(118,224,190,0.10)] sm:h-24 sm:w-24 sm:text-3xl">
                    AC
                    <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-[3px] border-[#0a171d] bg-emerald-400 text-[#07110d]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Professional identity</p>
                    <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-4xl">Alex Carter</h1>
                    <p className="mt-1 text-xs font-semibold text-slate-200 sm:text-sm">Joiner / Fire Door Installer</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 sm:text-xs">
                      <MapPin className="h-3 w-3 text-primary" /> Leeds · up to 40 miles
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-5">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-500">Rate</span>
                    <strong className="mt-0.5 block text-[11px] sm:text-sm">£25+/h</strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-500">Shift</span>
                    <strong className="mt-0.5 block text-[11px] sm:text-sm">Day/Night</strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-500">Travel</span>
                    <strong className="mt-0.5 block text-[11px] sm:text-sm">Own car</strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-500">Digs</span>
                    <strong className="mt-0.5 block text-[11px] sm:text-sm">Yes</strong>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
                  {["Joinery", "Fire Doors", "Second Fix", "Snagging"].map((skill) => (
                    <span key={skill} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-auto grid grid-cols-4 gap-2 pt-3 sm:pt-5">
                  <div className="text-center">
                    <BadgeCheck className="mx-auto h-4 w-4 text-emerald-300" />
                    <strong className="mt-1 block text-[9px]">CSCS</strong>
                    <span className="text-[7px] text-slate-500">VERIFIED</span>
                  </div>
                  <div className="text-center">
                    <FileText className="mx-auto h-4 w-4 text-cyan-300" />
                    <strong className="mt-1 block text-[9px]">CV</strong>
                    <span className="text-[7px] text-slate-500">CURRENT</span>
                  </div>
                  <div className="text-center">
                    <Users className="mx-auto h-4 w-4 text-primary" />
                    <strong className="mt-1 block text-[9px]">2 REF</strong>
                    <span className="text-[7px] text-slate-500">CONFIRMED</span>
                  </div>
                  <div className="text-center">
                    <ShieldCheck className="mx-auto h-4 w-4 text-amber-300" />
                    <strong className="mt-1 block text-[9px]">RTW</strong>
                    <span className="text-[7px] text-slate-500">CHECK</span>
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-col gap-2.5">
                <button type="button" onClick={() => setView("jobs")} className="group flex min-h-[84px] items-center justify-between rounded-[22px] border border-primary/35 bg-primary/[0.12] px-4 text-left shadow-[0_0_28px_rgba(118,224,190,0.06)]">
                  <div>
                    <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-primary">
                      <Search className="h-4 w-4" /> AI Work Agent
                    </div>
                    <strong className="mt-1 block text-lg sm:text-xl">FIND WORK</strong>
                    <span className="text-[10px] text-slate-400">3 strong synthetic matches ready</span>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">96%</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setView("ai")} className={compactButton()}>
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>
                      <strong className="block text-[11px]">AI CHECK</strong>
                      <small className="text-[8px] text-slate-500">{readiness}% work-ready</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => setView("documents")} className={compactButton()}>
                    <FileText className="h-4 w-4 text-cyan-300" />
                    <span>
                      <strong className="block text-[11px]">DOCUMENTS</strong>
                      <small className="text-[8px] text-slate-500">2 ready · 1 action</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => setView("references")} className={compactButton()}>
                    <Users className="h-4 w-4 text-primary" />
                    <span>
                      <strong className="block text-[11px]">REFERENCES</strong>
                      <small className="text-[8px] text-slate-500">2 confirmed</small>
                    </span>
                  </button>
                  <button type="button" onClick={shareProfile} className={compactButton()}>
                    <Share2 className="h-4 w-4 text-emerald-300" />
                    <span>
                      <strong className="block text-[11px]">SHARE PROFILE</strong>
                      <small className="text-[8px] text-slate-500">Recruiter-safe view</small>
                    </span>
                  </button>
                </div>

                <div className="mt-auto rounded-[22px] border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-500">Contact agencies</span>
                    <span className="text-[8px] text-slate-500">compose/open only</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={openWhatsApp} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2.5 text-[10px] font-bold text-emerald-200">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </button>
                    <button type="button" onClick={openEmail} className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-2.5 text-[10px] font-bold text-cyan-200">
                      <Mail className="h-4 w-4" /> Email
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {view === "jobs" && (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-primary">AI Work Agent</p>
                  <h2 className="text-xl font-black sm:text-2xl">Best matches for this Person Card</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] text-slate-400">SYNTHETIC SOURCE DATA</span>
              </div>
              <div className="grid min-h-0 flex-1 gap-2.5 overflow-y-auto sm:grid-cols-3 sm:overflow-hidden">
                {matches.map((job) => (
                  <article key={job.id} className="flex min-h-0 flex-col rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{job.company}</p>
                        <h3 className="mt-1 text-base font-black">{job.title}</h3>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreTone(job.score)}`}>{job.score}%</span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[10px] text-slate-400">
                      <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" /> {job.location}</p>
                      <p className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-cyan-300" /> {job.rate}</p>
                      <p className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-emerald-300" /> {job.start}</p>
                    </div>
                    <div className="mt-3 space-y-1">
                      {job.reasons.map((reason) => (
                        <p key={reason} className="flex items-center gap-1.5 text-[9px] text-slate-300"><CheckCircle2 className="h-3 w-3 text-emerald-300" /> {reason}</p>
                      ))}
                      {job.gap && <p className="flex items-start gap-1.5 text-[9px] text-amber-300"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {job.gap}</p>}
                    </div>
                    <button type="button" onClick={() => showNotice("Application prepared as a draft. No external action was sent.")} className="mt-auto rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[10px] font-black text-primary">
                      PREPARE APPLICATION
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}

          {view === "documents" && (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
              <div className="mb-3">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-cyan-300">Work identity readiness</p>
                <h2 className="text-xl font-black sm:text-2xl">Documents</h2>
              </div>
              <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <article key={doc.name} className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"><FileText className="h-4 w-4 text-cyan-300" /></div>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">{doc.name}</strong>
                        <span className="text-[9px] text-slate-500">{doc.detail}</span>
                      </div>
                    </div>
                    <span className={[
                      "rounded-full border px-2.5 py-1 text-[8px] font-black",
                      doc.state === "ACTION"
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : doc.state === "PRIVATE"
                          ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                    ].join(" ")}>{doc.state}</span>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-[9px] text-slate-500">Public/recruiter view shows readiness states only. Payroll/private identity data is not exposed here.</p>
            </div>
          )}

          {view === "references" && (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
              <div className="mb-3">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-primary">Person Card evidence</p>
                <h2 className="text-xl font-black sm:text-2xl">References</h2>
              </div>
              <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
                {references.map((reference) => (
                  <article key={reference.company} className="flex flex-col rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary/25 bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[8px] font-black text-emerald-300">{reference.state}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-black">{reference.company}</h3>
                    <p className="text-xs text-slate-400">{reference.role} · {reference.date}</p>
                    <div className="mt-auto pt-4 text-[9px] text-slate-500">Confirmation state is separate from imported CV text.</div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {view === "ai" && (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-6">
              <div className="mb-3">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-primary">AI Profile Check</p>
                <h2 className="text-xl font-black sm:text-2xl">What improves this Person Card?</h2>
              </div>
              <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                <section className="flex flex-col justify-center rounded-[24px] border border-primary/25 bg-primary/[0.08] p-5 text-center">
                  <Sparkles className="mx-auto h-7 w-7 text-primary" />
                  <strong className="mt-3 text-4xl font-black">{readiness}%</strong>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">WORK PROFILE READY</span>
                  <p className="mt-3 text-[10px] leading-5 text-slate-400">AI score is a demo recommendation, not a verified credential.</p>
                </section>
                <section className="grid gap-2">
                  <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-300"><Star className="h-4 w-4" /> STRONG</div>
                    <p className="mt-2 text-xs text-slate-300">Trade, travel radius, rate, CSCS and two references make the profile immediately searchable.</p>
                  </div>
                  <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-300"><AlertCircle className="h-4 w-4" /> NEXT ACTION</div>
                    <p className="mt-2 text-xs text-slate-300">Add or confirm IPAF only if you actually hold it. One current match requests IPAF.</p>
                  </div>
                  <div className="rounded-[20px] border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-cyan-300"><ShieldCheck className="h-4 w-4" /> PRIVACY</div>
                    <p className="mt-2 text-xs text-slate-300">Keep Right-to-Work evidence and payroll fields restricted; expose only recruiter-safe readiness status by default.</p>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        <footer className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-[8px] text-slate-500 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Car className="h-3 w-3" /> Own transport</span>
            <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> Nights OK</span>
            <span className="hidden items-center gap-1 sm:flex"><Home className="h-3 w-3" /> Work away OK</span>
          </div>
          <span className="flex items-center gap-1"><BadgeCheck className="h-3 w-3 text-primary" /> canonical Person projection</span>
        </footer>

        {notice && (
          <div role="status" className="absolute bottom-12 left-1/2 z-30 w-[min(90%,520px)] -translate-x-1/2 rounded-xl border border-white/15 bg-[#102028]/95 px-4 py-3 text-center text-[10px] font-semibold text-slate-200 shadow-2xl backdrop-blur">
            {notice}
          </div>
        )}
      </section>
    </main>
  );
}
