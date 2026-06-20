import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Sparkles,
  ShieldCheck,
  Save,
  RotateCcw,
  Phone,
  Mail,
  Building2,
  Briefcase,
  FolderKanban,
  Link2,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Camera,
  Users,
  ArrowLeft,
  Check,
  Wand2,
  Loader2,
  Radar,
  X,
  Lock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VisibilityMode = "public" | "project_team" | "internal" | "private_admin";
type Availability = "available_now" | "available_soon" | "currently_booked" | "unknown";
type Confidence = "High" | "Medium" | "Low";
type Decision = "confirmed" | "rejected" | "private";
type View = "list" | "create";

interface Participation {
  id: string;
  projectName: string;
  companyContext: string;
  role: string;
  responsibilities: string;
  linkedPeople: string;
  linkedDocuments: string;
  linkedTasks: string;
  linkedSnags: string;
  linkedPhotos: string;
  approvals: string;
  nextActions: string;
}

interface PersonCard {
  id: string;
  fullName: string;
  mainRole: string;
  company: string;
  phone: string;
  email: string;
  profileLink: string;
  photoName: string;
  availability: Availability;
  visibility: VisibilityMode;
  notes: string;
  participations: Participation[];
  savedAt?: string;
}

// Authorised sources the simulated scan "checks". Display order = scan order.
// SAFE SIMULATION ONLY — nothing is actually fetched or scraped.
const SCAN_SOURCES = [
  "Checking existing Nexus database…",
  "Checking project files…",
  "Checking uploaded documents…",
  "Checking saved contacts…",
  "Checking email (if connected)…",
  "Checking WhatsApp (if authorised)…",
  "Checking public web…",
  "Checking Companies House…",
  "Checking LinkedIn / public profiles…",
];

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "available_now", label: "Available now" },
  { value: "available_soon", label: "Available soon" },
  { value: "currently_booked", label: "Currently booked" },
  { value: "unknown", label: "Unknown" },
];

const visibilityOptions: { value: VisibilityMode; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Visible to anyone. Phone, links and notes are hidden." },
  { value: "project_team", label: "Project team", hint: "Visible to people on shared projects." },
  { value: "internal", label: "Internal", hint: "Visible to the internal Nexus workspace." },
  { value: "private_admin", label: "Private / admin", hint: "Visible to admins only." },
];

const availabilityStyle: Record<Availability, string> = {
  available_now: "bg-green-500/10 text-green-400 border-green-500/20",
  available_soon: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  currently_booked: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  unknown: "bg-secondary text-muted-foreground border-border",
};

const confidenceStyle: Record<Confidence, string> = {
  High: "bg-green-500/10 text-green-400 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Low: "bg-red-500/10 text-red-400 border-red-500/20",
};

const uid = () => Math.random().toString(36).slice(2, 10);

const getInitials = (name: string) =>
  name.trim() ? name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

const emptyParticipation = (): Participation => ({
  id: uid(),
  projectName: "",
  companyContext: "",
  role: "",
  responsibilities: "",
  linkedPeople: "",
  linkedDocuments: "",
  linkedTasks: "",
  linkedSnags: "",
  linkedPhotos: "",
  approvals: "",
  nextActions: "",
});

const emptyCard = (): PersonCard => ({
  id: uid(),
  fullName: "",
  mainRole: "",
  company: "",
  phone: "",
  email: "",
  profileLink: "",
  photoName: "",
  availability: "unknown",
  visibility: "internal",
  notes: "",
  participations: [emptyParticipation()],
});

const exampleCard = (): PersonCard => ({
  id: uid(),
  fullName: "Mateusz Furmański",
  mainRole: "Product Architect / Founder",
  company: "NOSMO Technology Limited",
  phone: "+44 7925 123415",
  email: "mateusz@nosmo.tech",
  profileLink: "https://www.linkedin.com/in/mateusz-furmanski",
  photoName: "",
  availability: "available_soon",
  visibility: "internal",
  notes: "Founder-level context. Works across product architecture and on-site joinery delivery.",
  participations: [
    {
      id: uid(),
      projectName: "NOSMO Technology Limited",
      companyContext: "NOSMO Technology Limited",
      role: "Founder & CEO",
      responsibilities: "Company direction, product strategy, partnerships.",
      linkedPeople: "Kamil Karaszewski",
      linkedDocuments: "Company deck, cap table",
      linkedTasks: "Investor outreach, hiring plan",
      linkedSnags: "",
      linkedPhotos: "",
      approvals: "Board sign-off",
      nextActions: "Finalise advisor agreements",
    },
    {
      id: uid(),
      projectName: "NOSMO Nexus",
      companyContext: "NOSMO Technology Limited",
      role: "Product Architect / Founder",
      responsibilities: "System architecture, data model, AI pre-fill design.",
      linkedPeople: "Future developers, advisors, investors",
      linkedDocuments: "Architecture spec, OpenAPI draft",
      linkedTasks: "Card Maker module, privacy gates",
      linkedSnags: "",
      linkedPhotos: "",
      approvals: "Founder approval",
      nextActions: "Ship Person Card v0.1",
    },
    {
      id: uid(),
      projectName: "Halifax / Lloyds Bank",
      companyContext: "360 Interiors",
      role: "Joiner / Freelancer",
      responsibilities: "Door installation, snag resolution, site finishing.",
      linkedPeople: "Lee, Tom, Akeem, Mateusz Zuchowski, John, Boo, Jamie",
      linkedDocuments: "PDF plans, Excel door schedule, site instructions",
      linkedTasks: "Door schedule sign-off, snag list",
      linkedSnags: "Frame alignment, ironmongery shortfall",
      linkedPhotos: "Snag photos, completion photos",
      approvals: "Site manager sign-off",
      nextActions: "Close remaining snags",
    },
  ],
});

function maskPhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const visible = trimmed.slice(-3);
  const masked = trimmed.slice(0, Math.max(0, trimmed.length - 3)).replace(/\d/g, "•");
  return `${masked}${visible}`;
}

const isParticipationEmpty = (p: Participation) =>
  !p.projectName &&
  !p.companyContext &&
  !p.role &&
  !p.responsibilities &&
  !p.linkedPeople &&
  !p.linkedDocuments &&
  !p.linkedTasks &&
  !p.linkedSnags &&
  !p.linkedPhotos &&
  !p.approvals &&
  !p.nextActions;

const str = (v: unknown) => (typeof v === "string" ? v : "");

function normalizeParticipation(p: Record<string, unknown> | null | undefined): Participation {
  const o = p ?? {};
  return {
    id: str(o.id) || uid(),
    projectName: str(o.projectName),
    companyContext: str(o.companyContext),
    role: str(o.role),
    responsibilities: str(o.responsibilities),
    linkedPeople: str(o.linkedPeople),
    linkedDocuments: str(o.linkedDocuments),
    linkedTasks: str(o.linkedTasks),
    linkedSnags: str(o.linkedSnags),
    linkedPhotos: str(o.linkedPhotos),
    approvals: str(o.approvals),
    nextActions: str(o.nextActions),
  };
}

// Migrate any previously stored draft (including older schemas) into the current PersonCard shape.
function normalizeDraft(d: Record<string, unknown> | null | undefined): PersonCard {
  const o = d ?? {};
  const availability = availabilityOptions.some((a) => a.value === o.availability)
    ? (o.availability as Availability)
    : "unknown";
  const visibility = visibilityOptions.some((v) => v.value === o.visibility)
    ? (o.visibility as VisibilityMode)
    : "internal";
  const rawParts = Array.isArray(o.participations) ? o.participations : [];
  const participations =
    rawParts.length > 0 ? rawParts.map((p) => normalizeParticipation(p)) : [emptyParticipation()];
  return {
    id: str(o.id) || uid(),
    fullName: str(o.fullName),
    mainRole: str(o.mainRole),
    company: str(o.company),
    phone: str(o.phone),
    email: str(o.email),
    profileLink: str(o.profileLink),
    photoName: str(o.photoName),
    availability,
    visibility,
    notes: str(o.notes),
    participations,
    savedAt: str(o.savedAt) || undefined,
  };
}

function loadDrafts(): PersonCard[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("nexus_card_maker_drafts") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => normalizeDraft(d));
  } catch {
    return [];
  }
}

type SuggestionTarget =
  | { kind: "identity"; mainRole: string; company: string }
  | { kind: "participation"; participation: Participation }
  | { kind: "linkedPeople"; people: string; projectName?: string }
  | { kind: "linkedData"; documents: string; tasks: string; photos: string; projectName?: string };

interface AiSuggestion {
  id: string;
  category: string;
  source: string;
  confidence: Confidence;
  summary: string;
  target: SuggestionTarget;
}

function buildAiSuggestions(card: PersonCard): AiSuggestion[] {
  const haystack = `${card.fullName} ${card.company} ${card.notes} ${card.participations
    .map((p) => `${p.projectName} ${p.companyContext}`)
    .join(" ")}`.toLowerCase();

  const suggestions: AiSuggestion[] = [];

  suggestions.push({
    id: uid(),
    category: "Suggested identity",
    source: "Nexus database",
    confidence: card.fullName.trim() ? "High" : "Low",
    summary: card.fullName.trim()
      ? `Likely "${card.fullName.trim()}" — ${card.mainRole.trim() || "Joiner / Freelancer"} at ${
          card.company.trim() || "360 Interiors"
        }.`
      : "Enter a name to raise identity confidence. Inferred role: Joiner / Freelancer.",
    target: {
      kind: "identity",
      mainRole: card.mainRole.trim() || "Joiner / Freelancer",
      company: card.company.trim() || "360 Interiors",
    },
  });

  if (/(limited|ltd|360|nosmo)/.test(haystack)) {
    suggestions.push({
      id: uid(),
      category: "Company registration",
      source: "Companies House",
      confidence: "Medium",
      summary: `Possible registered company match for "${card.company.trim() || "360 Interiors"}". Verify before attaching.`,
      target: {
        kind: "identity",
        mainRole: card.mainRole.trim() || "Joiner / Freelancer",
        company: card.company.trim() || "360 Interiors",
      },
    });
  }

  if (haystack.includes("halifax") || haystack.includes("lloyds")) {
    suggestions.push({
      id: uid(),
      category: "Possible project participation",
      source: "Project files",
      confidence: "Medium",
      summary: "Halifax / Lloyds Bank fit-out via 360 Interiors — Joiner role with door & snag work.",
      target: {
        kind: "participation",
        participation: {
          ...emptyParticipation(),
          projectName: "Halifax / Lloyds Bank",
          companyContext: "360 Interiors",
          role: "Joiner / Freelancer",
          responsibilities: "Door installation, snag resolution, site finishing.",
        },
      },
    });
    suggestions.push({
      id: uid(),
      category: "Related people",
      source: "Saved contacts",
      confidence: "Medium",
      summary: "Possible site team: Lee, Tom, Akeem, Mateusz Zuchowski, John, Boo, Jamie.",
      target: {
        kind: "linkedPeople",
        people: "Lee, Tom, Akeem, Mateusz Zuchowski, John, Boo, Jamie",
        projectName: "Halifax / Lloyds Bank",
      },
    });
    suggestions.push({
      id: uid(),
      category: "Linked documents / tasks / photos",
      source: "Uploaded documents",
      confidence: "Low",
      summary: "Possible linked data: PDF plans, Excel door schedule, snag photos, completion photos.",
      target: {
        kind: "linkedData",
        documents: "PDF plans, Excel door schedule, site instructions",
        tasks: "Door schedule sign-off, snag list",
        photos: "Snag photos, completion photos",
        projectName: "Halifax / Lloyds Bank",
      },
    });
  } else if (haystack.includes("nosmo")) {
    suggestions.push({
      id: uid(),
      category: "Possible project participation",
      source: "Project files",
      confidence: "Medium",
      summary: "NOSMO Nexus product work — Product Architect / Founder context.",
      target: {
        kind: "participation",
        participation: {
          ...emptyParticipation(),
          projectName: "NOSMO Nexus",
          companyContext: "NOSMO Technology Limited",
          role: "Product Architect / Founder",
          responsibilities: "System architecture, data model, AI pre-fill design.",
        },
      },
    });
    suggestions.push({
      id: uid(),
      category: "Related people",
      source: "Saved contacts",
      confidence: "Medium",
      summary: "Possible related participants: Mateusz Furmański, Kamil Karaszewski, advisors, investors.",
      target: {
        kind: "linkedPeople",
        people: "Mateusz Furmański, Kamil Karaszewski, advisors, investors",
        projectName: "NOSMO Nexus",
      },
    });
  } else {
    suggestions.push({
      id: uid(),
      category: "Possible project participation",
      source: "Public web",
      confidence: "Low",
      summary: "No strong project match yet. Add a project name to improve participation suggestions.",
      target: {
        kind: "participation",
        participation: { ...emptyParticipation(), role: card.mainRole.trim() || "Contributor" },
      },
    });
  }

  if (card.profileLink.trim() || card.fullName.trim()) {
    suggestions.push({
      id: uid(),
      category: "Public profile",
      source: "LinkedIn / public profiles",
      confidence: "Low",
      summary: "A public profile may exist. Keep private unless you have permission to attach it.",
      target: {
        kind: "identity",
        mainRole: card.mainRole.trim() || "Joiner / Freelancer",
        company: card.company.trim() || "360 Interiors",
      },
    });
  }

  return suggestions;
}

export default function CardMaker() {
  const [view, setView] = useState<View>("list");
  const [card, setCard] = useState<PersonCard>(emptyCard);
  const [revealPhone, setRevealPhone] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanned, setScanned] = useState(false);

  const [drafts, setDrafts] = useState<PersonCard[]>(() => loadDrafts());

  // Keep the latest card available to the scan timer without restarting it on every keystroke.
  const cardRef = useRef(card);
  cardRef.current = card;

  const visibilityHint = useMemo(
    () => visibilityOptions.find((v) => v.value === card.visibility)?.hint ?? "",
    [card.visibility],
  );

  // Simulated scan: step through SCAN_SOURCES, then surface suggestions. Safe simulation only.
  useEffect(() => {
    if (!scanning) return;
    let step = 0;
    setScanStep(0);
    const interval = setInterval(() => {
      step += 1;
      if (step >= SCAN_SOURCES.length) {
        clearInterval(interval);
        setScanning(false);
        setScanned(true);
        setSuggestions(buildAiSuggestions(cardRef.current));
        setDecisions({});
      } else {
        setScanStep(step);
      }
    }, 480);
    return () => clearInterval(interval);
  }, [scanning]);

  const resetScan = () => {
    setScanning(false);
    setScanStep(0);
    setScanned(false);
    setSuggestions([]);
    setDecisions({});
  };

  const updateField = <K extends keyof PersonCard>(key: K, value: PersonCard[K]) => {
    setCard((prev) => ({ ...prev, [key]: value }));
    setSavedFlash(false);
  };

  const updateParticipation = (id: string, key: keyof Participation, value: string) => {
    setCard((prev) => ({
      ...prev,
      participations: prev.participations.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    }));
  };

  const addParticipation = () => {
    setCard((prev) => ({ ...prev, participations: [...prev.participations, emptyParticipation()] }));
  };

  const removeParticipation = (id: string) => {
    setCard((prev) => ({
      ...prev,
      participations:
        prev.participations.length > 1
          ? prev.participations.filter((p) => p.id !== id)
          : prev.participations,
    }));
  };

  const runPrefill = () => {
    if (scanning) return;
    setScanned(false);
    setSuggestions([]);
    setDecisions({});
    setScanning(true);
  };

  const applyTarget = (s: AiSuggestion) => {
    setCard((prev) => {
      const target = s.target;
      if (target.kind === "identity") {
        return {
          ...prev,
          mainRole: prev.mainRole || target.mainRole,
          company: prev.company || target.company,
        };
      }
      if (target.kind === "participation") {
        const first = prev.participations[0];
        const firstIsEmpty = first && isParticipationEmpty(first);
        const newPart = { ...target.participation, id: uid() };
        return {
          ...prev,
          participations: firstIsEmpty
            ? [newPart, ...prev.participations.slice(1)]
            : [...prev.participations, newPart],
        };
      }

      const parts = [...prev.participations];
      if (parts.length === 0) parts.push(emptyParticipation());
      // Attach related data to the matching project if one exists, otherwise the first block.
      const matchIdx = target.projectName
        ? parts.findIndex(
            (p) => p.projectName.trim().toLowerCase() === target.projectName!.trim().toLowerCase(),
          )
        : -1;
      const idx = matchIdx >= 0 ? matchIdx : 0;

      if (target.kind === "linkedPeople") {
        parts[idx] = { ...parts[idx], linkedPeople: target.people };
        return { ...prev, participations: parts };
      }
      // linkedData
      parts[idx] = {
        ...parts[idx],
        linkedDocuments: target.documents,
        linkedTasks: target.tasks,
        linkedPhotos: target.photos,
      };
      return { ...prev, participations: parts };
    });
    setSavedFlash(false);
  };

  const confirmSuggestion = (s: AiSuggestion) => {
    applyTarget(s);
    setDecisions((prev) => ({ ...prev, [s.id]: "confirmed" }));
  };
  const rejectSuggestion = (s: AiSuggestion) => {
    setDecisions((prev) => ({ ...prev, [s.id]: "rejected" }));
  };
  const privateSuggestion = (s: AiSuggestion) => {
    setDecisions((prev) => ({ ...prev, [s.id]: "private" }));
  };

  const goCreate = (next: PersonCard) => {
    setCard(next);
    setConfirmed(false);
    setSavedFlash(false);
    setRevealPhone(false);
    resetScan();
    setView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const newCard = () => goCreate(emptyCard());
  const loadExample = () => goCreate(exampleCard());
  const loadDraft = (draft: PersonCard) => goCreate({ ...draft, id: uid() });

  const backToList = () => {
    setView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetDraft = () => {
    setCard(emptyCard());
    setConfirmed(false);
    setSavedFlash(false);
    setRevealPhone(false);
    resetScan();
  };

  const saveDraft = () => {
    if (!confirmed) return;
    const toSave: PersonCard = { ...card, savedAt: new Date().toISOString() };
    const next = [toSave, ...drafts];
    setDrafts(next);
    localStorage.setItem("nexus_card_maker_drafts", JSON.stringify(next));
    setSavedFlash(true);
    setConfirmed(false);
    setView("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    localStorage.setItem("nexus_card_maker_drafts", JSON.stringify(next));
  };

  const isPublic = card.visibility === "public";
  const initials = getInitials(card.fullName);
  const confirmedCount = Object.values(decisions).filter((d) => d === "confirmed").length;

  // ============================ LIST VIEW ============================
  if (view === "list") {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" /> Card Maker
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Build project-aware Person Cards from partial data. Nexus AI pre-fills suggested identity,
              participation and links — you confirm before anything is saved.
            </p>
          </div>
          <Button variant="secondary" asChild data-testid="link-people-directory">
            <Link href="/people">
              <Users className="w-4 h-4" /> People Directory
            </Link>
          </Button>
        </div>

        {savedFlash && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 p-3 text-sm flex gap-2">
            <Check className="w-5 h-5 shrink-0" /> Draft saved locally.
          </div>
        )}

        {/* Prominent "+ Card" CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <button
            onClick={newCard}
            data-testid="button-new-card"
            className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_30px_rgba(0,255,255,0.08)]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight">+ Card</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Create a new Person Card — then run AI pre-fill to scan connected sources.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={loadExample}
            data-testid="button-load-example"
            className="rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 sm:w-56 flex flex-col justify-center"
          >
            <Wand2 className="w-6 h-6 text-primary mb-2" />
            <p className="font-semibold">Load example</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mateusz Furmański — one person, three roles.</p>
          </button>
        </div>

        {/* Privacy reminder */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 p-3 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            <span className="font-medium">AI pre-fills. Human confirms.</span> Phone numbers stay masked,
            private links are never published without permission, and low-confidence matches are never
            attached automatically.
          </span>
        </div>

        {/* Saved drafts */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Saved cards</h2>
          {drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
              <UserPlus className="w-8 h-8 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm text-muted-foreground">No cards yet. Hit <span className="text-foreground font-medium">+ Card</span> to make your first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <button
                    onClick={() => loadDraft(d)}
                    className="flex items-start gap-3 text-left min-w-0 flex-1"
                    data-testid={`button-load-draft-${d.id}`}
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold shrink-0">
                      {getInitials(d.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.fullName || "Unnamed person"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.mainRole || "Role not set"} · {d.participations.filter((p) => p.projectName).length} project(s)
                      </p>
                      <Badge variant="outline" className="mt-1.5 text-[10px]">
                        {visibilityOptions.find((v) => v.value === d.visibility)?.label}
                      </Badge>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteDraft(d.id)}
                    aria-label="Delete draft"
                    className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                    data-testid={`button-delete-draft-${d.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ============================ CREATE VIEW ============================
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={backToList} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4" /> All cards
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadExample} data-testid="button-load-example">
            <Wand2 className="w-4 h-4" /> Load example
          </Button>
          <Button variant="outline" onClick={resetDraft} data-testid="button-reset">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </div>

      {/* ===== AI PREFILL hero — most prominent control ===== */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <Radar className="w-44 h-44 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-[10px]">Safe simulation</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">AI PREFILL</h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Scan connected sources to pre-fill this card with suggested identity, participation and links.{" "}
              <span className="text-foreground font-semibold">AI pre-fills. Human confirms.</span>
            </p>
          </div>
          <div className="w-full lg:w-auto">
            <Button
              size="lg"
              onClick={runPrefill}
              disabled={scanning}
              data-testid="button-ai-prefill"
              className="w-full lg:w-auto h-14 px-8 text-base font-semibold"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Scanning…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> {scanned ? "Re-run AI Pre-fill" : "Run AI Pre-fill"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live scanning status */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 overflow-hidden"
            >
              <div className="mt-6 rounded-xl border border-border bg-background/50 p-4 space-y-3" aria-live="polite">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <motion.span
                    key={scanStep}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    data-testid="text-scan-status"
                  >
                    {SCAN_SOURCES[scanStep]}
                  </motion.span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${((scanStep + 1) / SCAN_SOURCES.length) * 100}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SCAN_SOURCES.map((s, i) => (
                    <span
                      key={s}
                      className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        i < scanStep
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : i === scanStep
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {i < scanStep && <Check className="w-3 h-3" />}
                      {s.replace("Checking ", "").replace("…", "")}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ===== AI suggestions ===== */}
      {scanned && (
        <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI suggestions
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {suggestions.length} found · {confirmedCount > 0 ? `${confirmedCount} attached` : "nothing attached yet"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Each suggestion shows its source and confidence. Confirm to attach, reject to discard, or keep
            private so it is noted but never published.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => {
              const decision = decisions[s.id];
              return (
                <div key={s.id} className="rounded-lg border border-border bg-background/40 p-4 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${confidenceStyle[s.confidence]}`}>
                      {s.confidence}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Database className="w-3.5 h-3.5" /> Source: <span className="text-foreground/80 font-medium">{s.source}</span>
                  </div>

                  <p className="text-xs text-muted-foreground flex-1">{s.summary}</p>

                  {s.confidence === "Low" && !decision && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Low confidence — review carefully before attaching.
                    </p>
                  )}

                  {decision === "confirmed" && (
                    <span className="text-xs text-green-400 flex items-center gap-1.5" data-testid={`status-${s.id}`}>
                      <Check className="w-3.5 h-3.5" /> Confirmed &amp; applied
                    </span>
                  )}
                  {decision === "rejected" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid={`status-${s.id}`}>
                      <X className="w-3.5 h-3.5" /> Rejected
                    </span>
                  )}
                  {decision === "private" && (
                    <span className="text-xs text-blue-400 flex items-center gap-1.5" data-testid={`status-${s.id}`}>
                      <Lock className="w-3.5 h-3.5" /> Kept private — not attached
                    </span>
                  )}

                  {!decision && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => confirmSuggestion(s)} data-testid={`button-confirm-${s.id}`}>
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectSuggestion(s)} data-testid={`button-reject-${s.id}`}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => privateSuggestion(s)} data-testid={`button-private-${s.id}`}>
                        <Lock className="w-3.5 h-3.5" /> Keep private
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Privacy banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 p-3 text-sm flex gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          Privacy first: phone numbers stay masked by default, private profile links are never published
          without permission, and low-confidence AI matches are never attached automatically.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ============ LEFT: FORM ============ */}
        <div className="space-y-6">
          {/* Identity */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Person details
            </h2>

            {/* Photo placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl shrink-0">
                {initials}
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Profile photo</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary text-sm cursor-pointer hover:bg-secondary/70 transition-colors">
                    <Camera className="w-4 h-4" />
                    {card.photoName ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => updateField("photoName", e.target.files?.[0]?.name ?? "")}
                      data-testid="input-photo"
                    />
                  </label>
                  {card.photoName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {card.photoName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Placeholder only — files are not stored in this demo.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Mateusz Furmański"
                  value={card.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  data-testid="input-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainRole" className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Main professional role
                </Label>
                <Input
                  id="mainRole"
                  placeholder="Joiner / Freelancer"
                  value={card.mainRole}
                  onChange={(e) => updateField("mainRole", e.target.value)}
                  data-testid="input-role"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Company
                </Label>
                <Input
                  id="company"
                  placeholder="360 Interiors / NOSMO Technology Limited"
                  value={card.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  data-testid="input-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={card.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  data-testid="input-email"
                />
              </div>

              {/* Phone with mask toggle */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone number
                  <Badge variant="outline" className="ml-1 text-[10px] font-medium">masked by default</Badge>
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    placeholder="+44 7925 123415"
                    value={revealPhone ? card.phone : maskPhone(card.phone)}
                    onChange={(e) => updateField("phone", e.target.value)}
                    readOnly={!revealPhone}
                    className="pr-10"
                    data-testid="input-phone"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealPhone((v) => !v)}
                    aria-label={revealPhone ? "Hide phone number" : "Reveal phone number to edit"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-phone"
                  >
                    {revealPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Reveal to edit. The full number is never shown on a public card.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileLink" className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> Facebook / LinkedIn / public profile
                </Label>
                <Input
                  id="profileLink"
                  placeholder="https://linkedin.com/in/..."
                  value={card.profileLink}
                  onChange={(e) => updateField("profileLink", e.target.value)}
                  data-testid="input-profilelink"
                />
              </div>

              <div className="space-y-2">
                <Label>Availability status</Label>
                <Select
                  value={card.availability}
                  onValueChange={(v) => updateField("availability", v as Availability)}
                >
                  <SelectTrigger data-testid="select-availability">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={card.visibility}
                  onValueChange={(v) => updateField("visibility", v as VisibilityMode)}
                >
                  <SelectTrigger data-testid="select-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{visibilityHint}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes / context</Label>
                <Textarea
                  id="notes"
                  placeholder="Example: worked on doors and snags at Halifax / Lloyds Bank with 360 Interiors."
                  value={card.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="min-h-24"
                  data-testid="input-notes"
                />
              </div>
            </div>
          </section>

          {/* Project participation */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-primary" /> Project participation
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A person can take a different role on each project. Add one block per project.
                </p>
              </div>
              <Button variant="outline" onClick={addParticipation} data-testid="button-add-participation">
                <Plus className="w-4 h-4" /> Add project
              </Button>
            </div>

            <div className="space-y-4">
              {card.participations.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-border bg-background/40 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Project {idx + 1}
                    </span>
                    {card.participations.length > 1 && (
                      <button
                        onClick={() => removeParticipation(p.id)}
                        aria-label={`Remove project ${idx + 1}`}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                        data-testid={`button-remove-participation-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Project name</Label>
                      <Input
                        placeholder="Halifax / Lloyds Bank"
                        value={p.projectName}
                        onChange={(e) => updateParticipation(p.id, "projectName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Company context</Label>
                      <Input
                        placeholder="360 Interiors"
                        value={p.companyContext}
                        onChange={(e) => updateParticipation(p.id, "companyContext", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Role in this project</Label>
                      <Input
                        placeholder="Joiner / Site Manager / Founder"
                        value={p.role}
                        onChange={(e) => updateParticipation(p.id, "role", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Responsibilities</Label>
                      <Textarea
                        placeholder="Door installation, snag resolution, site finishing."
                        value={p.responsibilities}
                        onChange={(e) => updateParticipation(p.id, "responsibilities", e.target.value)}
                        className="min-h-16"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Linked people</Label>
                      <Input
                        placeholder="Lee, Tom, Akeem..."
                        value={p.linkedPeople}
                        onChange={(e) => updateParticipation(p.id, "linkedPeople", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Linked documents</Label>
                      <Input
                        placeholder="PDF plans, door schedule..."
                        value={p.linkedDocuments}
                        onChange={(e) => updateParticipation(p.id, "linkedDocuments", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Linked tasks</Label>
                      <Input
                        placeholder="Snag list, sign-off..."
                        value={p.linkedTasks}
                        onChange={(e) => updateParticipation(p.id, "linkedTasks", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Linked snags</Label>
                      <Input
                        placeholder="Frame alignment, ironmongery..."
                        value={p.linkedSnags}
                        onChange={(e) => updateParticipation(p.id, "linkedSnags", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Linked photos</Label>
                      <Input
                        placeholder="Snag photos, completion photos..."
                        value={p.linkedPhotos}
                        onChange={(e) => updateParticipation(p.id, "linkedPhotos", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Approvals</Label>
                      <Input
                        placeholder="Site manager sign-off"
                        value={p.approvals}
                        onChange={(e) => updateParticipation(p.id, "approvals", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Next actions</Label>
                      <Input
                        placeholder="Close remaining snags"
                        value={p.nextActions}
                        onChange={(e) => updateParticipation(p.id, "nextActions", e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Confirm & save */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
                data-testid="checkbox-confirm"
              />
              <span className="text-sm text-muted-foreground">
                I confirm this information is accurate and I have permission to store any linked profile
                data. AI suggestions have been reviewed by a human.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={saveDraft} disabled={!confirmed} data-testid="button-save">
                <Save className="w-4 h-4" /> Confirm &amp; save card
              </Button>
              <Button variant="outline" onClick={resetDraft} data-testid="button-reset-form">
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            </div>
          </section>
        </div>

        {/* ============ RIGHT: PRIVACY + PREVIEW ============ */}
        <div className="space-y-6">
          {/* Privacy gates */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Privacy gates
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Full phone numbers are masked and never public by default.",
                "Private profile links are not published without permission.",
                "Low-confidence AI matches are never attached automatically.",
                "You must confirm before a card can be saved.",
                "Visibility modes: public, project team, internal, private / admin.",
              ].map((rule) => (
                <li key={rule} className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Public preview */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-3">
            <h2 className="text-lg font-semibold">Card preview</h2>
            <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{card.fullName || "Unnamed person"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.mainRole || "Role not set"}{card.company ? ` · ${card.company}` : ""}
                  </p>
                </div>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium ${availabilityStyle[card.availability]}`}>
                  {availabilityOptions.find((o) => o.value === card.availability)?.label}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{card.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{card.phone ? maskPhone(card.phone) : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="truncate">
                    {card.profileLink ? (isPublic ? "Hidden on public card" : card.profileLink) : "—"}
                  </span>
                </div>
              </div>
              {card.participations.filter((p) => p.projectName).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {card.participations
                    .filter((p) => p.projectName)
                    .map((p) => (
                      <span key={p.id} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border">
                        {p.projectName}{p.role ? `: ${p.role}` : ""}
                      </span>
                    ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">
                Showing the <span className="text-foreground font-medium">{visibilityOptions.find((v) => v.value === card.visibility)?.label}</span> view.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
