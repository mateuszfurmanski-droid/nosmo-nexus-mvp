import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AppWindow,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Contact,
  FileBadge,
  FileText,
  FolderKanban,
  FolderSearch,
  HardHat,
  LockKeyhole,
  MessageCircle,
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Stage = "awakening" | "scanning" | "shell";
type ShellTab = "chats" | "work" | "discover" | "me";
type DiscoveryCategory = "All" | "People" | "Companies" | "Documents" | "Qualifications" | "Tools";

type SourceLayer = {
  name: string;
  status: string;
  icon: LucideIcon;
};

type DiscoveryItem = {
  id: string;
  category: Exclude<DiscoveryCategory, "All">;
  title: string;
  subtitle: string;
  confidence: number;
  source: string;
  reason: string;
};

type WorkThread = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  attention?: number;
  icon: LucideIcon;
  accent: string;
};

const sourceLayers: SourceLayer[] = [
  { name: "Contact network", status: "Ready to discover", icon: Contact },
  { name: "Visual memory", status: "Photos and evidence", icon: Camera },
  { name: "Document memory", status: "CV and qualifications", icon: FolderSearch },
  { name: "Work applications", status: "Supported tools", icon: AppWindow },
];

const discoveries: DiscoveryItem[] = [
  {
    id: "person-john",
    category: "People",
    title: "John Smith",
    subtitle: "Likely Site Manager · Halifax Project",
    confidence: 94,
    source: "Contacts · project invitation",
    reason: "The contact label includes Halifax Site and the email domain matches the invited project organisation.",
  },
  {
    id: "person-anna",
    category: "People",
    title: "Anna Kowalska",
    subtitle: "Likely Recruitment Agency contact",
    confidence: 91,
    source: "Contacts · email domain",
    reason: "The organisation field and email domain match a construction recruitment company.",
  },
  {
    id: "person-daniel",
    category: "People",
    title: "Daniel Price",
    subtitle: "Likely Electrician · previous project contact",
    confidence: 86,
    source: "Contacts · shared project links",
    reason: "The contact is linked to two electrical project records and three existing trade contacts.",
  },
  {
    id: "company-360",
    category: "Companies",
    title: "360 Interiors",
    subtitle: "Current project contractor",
    confidence: 96,
    source: "Invitation · contact domains",
    reason: "The organisation is present in the active invitation and multiple selected professional contacts.",
  },
  {
    id: "company-agency",
    category: "Companies",
    title: "North Workforce Agency",
    subtitle: "Potential employment and labour agency",
    confidence: 82,
    source: "Contacts · document references",
    reason: "The company appears in contact records and one employment document.",
  },
  {
    id: "document-cv",
    category: "Documents",
    title: "Mateusz_Furmanski_CV.pdf",
    subtitle: "Possible CV · five employers detected",
    confidence: 98,
    source: "Document memory",
    reason: "The document contains a structured work history, skills section and contact details matching the user.",
  },
  {
    id: "document-reference",
    category: "Documents",
    title: "Joinery_reference_2025.pdf",
    subtitle: "Possible employment reference",
    confidence: 84,
    source: "Document memory",
    reason: "The file contains employer details, dates and a work-performance statement.",
  },
  {
    id: "qualification-cscs",
    category: "Qualifications",
    title: "CSCS Skilled Worker Card",
    subtitle: "Card detected · expiry date available",
    confidence: 97,
    source: "Visual memory · OCR",
    reason: "The image layout, card title and identity fields match a recognised competence-card format.",
  },
  {
    id: "qualification-firstaid",
    category: "Qualifications",
    title: "Emergency First Aid Certificate",
    subtitle: "Training certificate · verify expiry",
    confidence: 79,
    source: "Visual memory · OCR",
    reason: "Certificate keywords and provider details were recognised, but the expiry date requires confirmation.",
  },
  {
    id: "tool-whatsapp",
    category: "Tools",
    title: "WhatsApp",
    subtitle: "Available as a contextual communication route",
    confidence: 100,
    source: "Supported application detection",
    reason: "Android reports a compatible application for the supported communication action.",
  },
  {
    id: "tool-drive",
    category: "Tools",
    title: "Google Drive",
    subtitle: "Available document provider",
    confidence: 100,
    source: "Supported document provider",
    reason: "A compatible document provider is available on this device.",
  },
  {
    id: "tool-workwallet",
    category: "Tools",
    title: "Work Wallet",
    subtitle: "Potential safety and competence source",
    confidence: 88,
    source: "Supported work application",
    reason: "A supported safety application was detected. Deeper access requires a separate authorised connector.",
  },
];

const chatThreads: WorkThread[] = [
  {
    id: "halifax",
    title: "Halifax Project",
    subtitle: "12 updates · two tasks changed priority",
    time: "08:42",
    attention: 12,
    icon: FolderKanban,
    accent: "bg-cyan-400/15 text-cyan-200",
  },
  {
    id: "manager",
    title: "John Smith",
    subtitle: "Site Manager · two approvals open",
    time: "08:17",
    attention: 2,
    icon: UserRound,
    accent: "bg-emerald-400/15 text-emerald-200",
  },
  {
    id: "doorflow",
    title: "DoorFlow",
    subtitle: "Three doors require evidence",
    time: "Yesterday",
    attention: 3,
    icon: HardHat,
    accent: "bg-amber-400/15 text-amber-200",
  },
  {
    id: "electrical",
    title: "Electrical Commissioning",
    subtitle: "Inspection ready to continue",
    time: "Yesterday",
    icon: Zap,
    accent: "bg-violet-400/15 text-violet-200",
  },
  {
    id: "company",
    title: "360 Interiors",
    subtitle: "Company workspace · project contacts",
    time: "Fri",
    icon: Building2,
    accent: "bg-blue-400/15 text-blue-200",
  },
  {
    id: "qualifications",
    title: "My Qualifications",
    subtitle: "One certificate requires verification",
    time: "Fri",
    attention: 1,
    icon: FileBadge,
    accent: "bg-pink-400/15 text-pink-200",
  },
];

const scanMessages = [
  "Invitation context confirmed",
  "Mapping professional contacts",
  "Detecting supported work tools",
  "Classifying documents and qualifications",
  "Building company and project relationships",
  "Preparing Discovery Cloud",
];

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const label = confidence >= 90 ? "Confirmed" : confidence >= 75 ? "Highly likely" : "Possible";
  const classes = confidence >= 90
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : confidence >= 75
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
      : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${classes}`}>
      {confidence}% · {label}
    </span>
  );
}

function NexusCore({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <div className={`absolute h-56 w-56 rounded-full border ${active ? "animate-pulse border-cyan-300/30" : "border-cyan-300/15"}`} />
      <div className="absolute h-44 w-44 rounded-full border border-cyan-300/20" />
      <div className="absolute h-32 w-32 rounded-full border border-primary/30 bg-primary/5 shadow-[0_0_70px_rgba(34,211,238,0.25)]" />
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-200/40 bg-slate-950 shadow-[0_0_45px_rgba(34,211,238,0.4)] ${active ? "scale-110" : ""} transition-transform`}>
        <Network className="h-9 w-9 text-cyan-200" />
      </div>
      {sourceLayers.map((source, index) => {
        const Icon = source.icon;
        const positions = ["-top-3 left-1/2", "right-0 top-1/2", "-bottom-3 left-1/2", "left-0 top-1/2"];
        return (
          <div
            key={source.name}
            className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600/70 bg-slate-950/95 text-slate-300 ${positions[index]}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        );
      })}
    </div>
  );
}

function AwakeningScreen({ onWake }: { onWake: () => void }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(34,211,238,0.18),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.12),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center px-5 py-10">
        <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          <Sparkles className="h-4 w-4" /> NOSMO Nexus Awakening
        </div>

        <NexusCore />

        <div className="mt-7 max-w-2xl text-center">
          <p className="text-sm font-medium text-cyan-200">Invitation recognised</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Your work intelligence is ready to start.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Halifax Project · Joinery role · invited by John Smith. Nexus can now build a private professional work layer from authorised sources on this device.
          </p>
        </div>

        <div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
          {sourceLayers.map((source) => {
            const Icon = source.icon;
            return (
              <div key={source.name} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/65 p-3.5 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{source.name}</p>
                  <p className="text-xs text-slate-500">{source.status}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onWake}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]"
          >
            Wake Nexus <Zap className="h-4 w-4" />
          </button>
          <Link href="/" className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-700 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:border-slate-500">
            Limited mode
          </Link>
        </div>

        <p className="mt-5 max-w-xl text-center text-[11px] leading-relaxed text-slate-600">
          Prototype uses synthetic discovery data. A production Android build would request each operating-system permission transparently and keep integration separate from company sharing.
        </p>
      </div>
    </div>
  );
}

function ScanningScreen({ progress }: { progress: number }) {
  const messageIndex = Math.min(scanMessages.length - 1, Math.floor((progress / 100) * scanMessages.length));

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_42%)]" />
      <div className="relative w-full max-w-xl text-center">
        <div className="mx-auto flex justify-center"><NexusCore active /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Building private work graph</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-4xl">{scanMessages[messageIndex]}</h1>
        <div className="mt-7 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
          <div className="h-2 rounded-full bg-cyan-300 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Discovery runs without interrupting your work</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2 text-left">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xl font-bold text-white">126</p>
            <p className="text-xs text-slate-500">people signals</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xl font-bold text-white">22</p>
            <p className="text-xs text-slate-500">documents</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xl font-bold text-white">7</p>
            <p className="text-xs text-slate-500">work tools</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoveryReview({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<DiscoveryCategory>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(discoveries.map((item) => item.id)));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [integrated, setIntegrated] = useState(false);

  const filtered = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    return discoveries.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const queryMatch = !normalised || `${item.title} ${item.subtitle} ${item.source}`.toLowerCase().includes(normalised);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  const attentionCount = discoveries.filter((item) => item.confidence < 85).length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white">
      <div className="mx-auto min-h-full max-w-4xl px-4 pb-28 pt-4 sm:px-6 sm:pt-7">
        <header className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 pb-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <Cloud className="h-4 w-4" /> Discovery Review
              </div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Professional elements found</h1>
              <p className="mt-1 text-sm text-slate-400">Likely-correct items are selected. Review the list and remove exceptions.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3">
              <p className="text-xl font-bold">247</p>
              <p className="text-[11px] text-slate-500">discovered</p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
              <p className="text-xl font-bold text-emerald-200">{selected.size}</p>
              <p className="text-[11px] text-emerald-300/70">selected</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
              <p className="text-xl font-bold text-amber-200">{attentionCount}</p>
              <p className="text-[11px] text-amber-300/70">attention</p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search discoveries"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {(["All", "People", "Companies", "Documents", "Qualifications", "Tools"] as DiscoveryCategory[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${category === item ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-slate-800 text-slate-400"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-4 space-y-3">
          {filtered.map((item) => {
            const isSelected = selected.has(item.id);
            const isExpanded = expanded === item.id;
            return (
              <article key={item.id} className={`rounded-2xl border p-4 transition-colors ${isSelected ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-slate-800 bg-slate-900/50 opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-label={isSelected ? `Exclude ${item.title}` : `Accept ${item.title}`}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-emerald-300 bg-emerald-300 text-slate-950" : "border-slate-600 text-slate-500"}`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.category}</p>
                        <h2 className="mt-1 font-semibold">{item.title}</h2>
                        <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
                      </div>
                      <ConfidenceBadge confidence={item.confidence} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                      <span className="text-xs text-slate-500">{item.source}</span>
                      <button type="button" onClick={() => setExpanded(isExpanded ? null : item.id)} className="text-xs font-semibold text-cyan-200">
                        {isExpanded ? "Hide reasoning" : "Why this match?"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-3 text-xs leading-relaxed text-slate-300">
                        {item.reason}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button type="button" onClick={() => setSelected(new Set(discoveries.map((item) => item.id)))} className="rounded-full border border-slate-700 p-3 text-slate-300" aria-label="Restore all selections">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIntegrated(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3.5 text-sm font-bold text-slate-950"
          >
            {integrated ? <><CheckCircle2 className="h-4 w-4" /> Integrated privately</> : <>Integrate {selected.size} items <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShellScreen() {
  const [tab, setTab] = useState<ShellTab>("chats");
  const [reviewOpen, setReviewOpen] = useState(false);

  const tabContent = tab === "chats"
    ? chatThreads
    : tab === "work"
      ? chatThreads.filter((thread) => ["halifax", "doorflow", "electrical", "qualifications"].includes(thread.id))
      : chatThreads.filter((thread) => ["manager", "company", "qualifications"].includes(thread.id));

  return (
    <div className="min-h-[100dvh] bg-slate-950 pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">NOSMO Nexus</p>
              <h1 className="font-semibold">Work Mode</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-slate-800 p-2.5 text-slate-400">
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
            >
              <Cloud className="h-4 w-4" /> 247
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5">
        <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.10] via-slate-900 to-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Bot className="h-4 w-4" /> Nexus is still learning</div>
              <h2 className="mt-2 text-2xl font-bold">Your private work graph is 34% complete.</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Discovery continues in batches while you work. Nothing from the private source world is shared with the project automatically.</p>
            </div>
            <button type="button" onClick={() => setReviewOpen(true)} className="rounded-full bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950">
              Review discoveries
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-[34%] rounded-full bg-cyan-300" />
          </div>
        </section>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input placeholder="Search people, projects, tasks and tools" className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-3.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/50" />
        </div>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55">
          {tabContent.map((thread, index) => {
            const Icon = thread.icon;
            return (
              <button key={thread.id} type="button" className={`flex w-full items-center gap-3 p-4 text-left hover:bg-slate-800/50 ${index < tabContent.length - 1 ? "border-b border-slate-800" : ""}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${thread.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-semibold">{thread.title}</h3>
                    <span className="shrink-0 text-[11px] text-slate-600">{thread.time}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-slate-400">{thread.subtitle}</p>
                    {thread.attention ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[10px] font-bold text-slate-950">{thread.attention}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-sm font-semibold">Private Nexus active</p>
              <p className="text-xs text-slate-500">Integration is private until a separate sharing decision.</p>
            </div>
          </div>
          <LockKeyhole className="h-4 w-4 text-slate-500" />
        </div>

        <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
          Open canonical Nexus Menu <ChevronRight className="h-4 w-4" />
        </Link>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {([
            { id: "chats", label: "Chats", icon: MessageCircle },
            { id: "work", label: "Work", icon: BriefcaseBusiness },
            { id: "discover", label: "Discover", icon: Cloud },
            { id: "me", label: "Me", icon: UserRound },
          ] as { id: ShellTab; label: string; icon: LucideIcon }[]).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => item.id === "discover" ? setReviewOpen(true) : setTab(item.id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${active ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500"}`}
              >
                <Icon className="h-5 w-5" /> {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {reviewOpen && <DiscoveryReview onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

export default function FirstRun() {
  const [stage, setStage] = useState<Stage>("awakening");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage !== "scanning") return;

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 4);
        if (next === 100) {
          window.setTimeout(() => setStage("shell"), 450);
        }
        return next;
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [stage]);

  if (stage === "awakening") {
    return <AwakeningScreen onWake={() => setStage("scanning")} />;
  }

  if (stage === "scanning") {
    return <ScanningScreen progress={progress} />;
  }

  return <ShellScreen />;
}
