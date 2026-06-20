import { useMemo, useState } from "react";
import {
  UserPlus,
  Sparkles,
  ShieldCheck,
  Save,
  RotateCcw,
  Phone,
  Building2,
  Briefcase,
  FolderKanban,
  Link2,
  AlertTriangle,
} from "lucide-react";

type VisibilityMode = "public" | "project_team" | "internal" | "private_admin";

type DraftPersonCard = {
  fullName: string;
  mainRole: string;
  company: string;
  phoneMasked: string;
  facebookOrLinkedin: string;
  projectName: string;
  projectRole: string;
  availability: string;
  visibility: VisibilityMode;
  notes: string;
};

const emptyCard: DraftPersonCard = {
  fullName: "",
  mainRole: "",
  company: "",
  phoneMasked: "",
  facebookOrLinkedin: "",
  projectName: "Halifax / Lloyds Bank",
  projectRole: "",
  availability: "available_unknown",
  visibility: "internal",
  notes: "",
};

function maskPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 7) return input;
  return `${digits.slice(0, 5)} ***${digits.slice(-3)}`;
}

function buildAiSuggestions(card: DraftPersonCard) {
  const suggestions = [];

  if (card.fullName.trim()) {
    suggestions.push({
      label: "Identity signal",
      value: `Possible person identity: ${card.fullName}`,
      confidence: "High",
    });
  }

  if (card.phoneMasked.trim()) {
    suggestions.push({
      label: "Contact signal",
      value: `Phone/contact signal detected: ${maskPhone(card.phoneMasked)}`,
      confidence: "High",
    });
  }

  if (card.facebookOrLinkedin.trim()) {
    suggestions.push({
      label: "External profile signal",
      value: "Facebook/LinkedIn/public profile link supplied by user. Needs confirmation before attach.",
      confidence: "Medium",
    });
  }

  if (card.projectName.trim()) {
    suggestions.push({
      label: "Project participation",
      value: `Suggested project context: ${card.projectName}`,
      confidence: "High",
    });
  }

  if (card.projectRole.trim()) {
    suggestions.push({
      label: "Role in project",
      value: `Suggested project role: ${card.projectRole}`,
      confidence: "Medium",
    });
  }

  if (
    card.projectName.toLowerCase().includes("halifax") ||
    card.projectName.toLowerCase().includes("lloyds")
  ) {
    suggestions.push({
      label: "Related people",
      value: "Possible related participants: Lee, Tom, Akeem, Mateusz Furmański, Mateusz Zuchowski, John, Boo, Jamie.",
      confidence: "Medium",
    });

    suggestions.push({
      label: "Related project data",
      value: "Possible linked data: PDF plans, Excel door schedule, snag photos, completion photos, site instructions.",
      confidence: "Medium",
    });
  }

  if (
    card.projectName.toLowerCase().includes("nosmo") ||
    card.company.toLowerCase().includes("nosmo")
  ) {
    suggestions.push({
      label: "NOSMO participation",
      value: "Possible related participants: Mateusz Furmański, Kamil Karaszewski, future developers, advisors, investors.",
      confidence: "Medium",
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      label: "Waiting for data",
      value: "Enter at least a name, phone, project, company or profile link to generate suggestions.",
      confidence: "Low",
    });
  }

  return suggestions;
}

export default function CardMaker() {
  const [card, setCard] = useState<DraftPersonCard>(emptyCard);
  const [savedCards, setSavedCards] = useState<DraftPersonCard[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("nexus_card_maker_drafts") || "[]");
    } catch {
      return [];
    }
  });

  const aiSuggestions = useMemo(() => buildAiSuggestions(card), [card]);

  const updateField = (key: keyof DraftPersonCard, value: string) => {
    setCard((previous) => ({
      ...previous,
      [key]: key === "phoneMasked" ? maskPhone(value) : value,
    }));
  };

  const saveDraft = () => {
    const next = [card, ...savedCards];
    setSavedCards(next);
    localStorage.setItem("nexus_card_maker_drafts", JSON.stringify(next));
  };

  const resetDraft = () => {
    setCard(emptyCard);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-cyan-400" />
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Card Maker</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Create Nexus Person Cards from partial data. AI pre-fills possible identity, project participation,
            related people and linked work data. Human confirmation is required before saving.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 p-3 text-sm flex gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          Privacy rule: do not publish full phone numbers or private profile links. Public demo data should stay masked.
        </span>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_520px] gap-6">
        <div className="rounded-2xl border bg-card p-5 md:p-6 space-y-6">
          <h2 className="text-2xl font-semibold">New Person Card Draft</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Full name
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="Mateusz Zuchowski"
                value={card.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Main role
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="Joiner / Freelancer"
                value={card.mainRole}
                onChange={(event) => updateField("mainRole", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="360 Interiors / Freelancer / NOSMO Technology Limited"
                value={card.company}
                onChange={(event) => updateField("company", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone masked
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="07925 ***415"
                value={card.phoneMasked}
                onChange={(event) => updateField("phoneMasked", event.target.value)}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Facebook / LinkedIn / public profile link
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="Paste user-provided profile link"
                value={card.facebookOrLinkedin}
                onChange={(event) => updateField("facebookOrLinkedin", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Project name
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="Halifax / Lloyds Bank"
                value={card.projectName}
                onChange={(event) => updateField("projectName", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Role in this project
              </span>
              <input
                className="w-full rounded-xl border bg-background px-4 py-3"
                placeholder="Joiner / Site Manager / Labourer / CEO"
                value={card.projectRole}
                onChange={(event) => updateField("projectRole", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Availability</span>
              <select
                className="w-full rounded-xl border bg-background px-4 py-3"
                value={card.availability}
                onChange={(event) => updateField("availability", event.target.value)}
              >
                <option value="available_unknown">Unknown</option>
                <option value="available_now">Available now</option>
                <option value="available_soon">Available soon</option>
                <option value="currently_booked">Currently booked</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <select
                className="w-full rounded-xl border bg-background px-4 py-3"
                value={card.visibility}
                onChange={(event) => updateField("visibility", event.target.value as VisibilityMode)}
              >
                <option value="public">Public</option>
                <option value="project_team">Project team</option>
                <option value="internal">Internal</option>
                <option value="private_admin">Private / admin</option>
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-muted-foreground">Notes / context</span>
              <textarea
                className="w-full rounded-xl border bg-background px-4 py-3 min-h-32"
                placeholder="Example: worked on doors/snags in Halifax Lloyds Bank with 360 Interiors."
                value={card.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400"
            >
              <Save className="w-5 h-5" />
              Confirm & Save Draft
            </button>

            <button
              onClick={resetDraft}
              className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-accent"
            >
              <RotateCcw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-2xl font-semibold">AI Pre-fill Preview</h2>
            </div>

            <p className="text-muted-foreground text-sm">
              This is the safe v0.1 simulation. Later this will use authorised internal files,
              connected sources and public data where legally allowed.
            </p>

            <div className="space-y-3">
              {aiSuggestions.map((suggestion) => (
                <div key={`${suggestion.label}-${suggestion.value}`} className="rounded-xl border bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{suggestion.label}</div>
                    <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">
                      {suggestion.confidence}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2">{suggestion.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-2xl font-semibold">Privacy Gates</h2>
            </div>

            <ul className="space-y-2 text-muted-foreground">
              <li>AI can suggest data but cannot silently attach it.</li>
              <li>Low-confidence matches must not be merged automatically.</li>
              <li>Phone numbers stay masked by default.</li>
              <li>Public view must hide private links and internal notes.</li>
              <li>Every future source should have audit/source history.</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-5 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold">Saved Drafts</h2>

            {savedCards.length === 0 ? (
              <p className="text-muted-foreground">No local drafts saved yet.</p>
            ) : (
              <div className="space-y-3">
                {savedCards.map((saved, index) => (
                  <div key={`${saved.fullName}-${index}`} className="rounded-xl border bg-background/50 p-4">
                    <div className="font-semibold">{saved.fullName || "Unnamed person"}</div>
                    <div className="text-sm text-muted-foreground">{saved.mainRole || "Role not set"}</div>
                    <div className="text-sm text-muted-foreground">{saved.projectName || "Project not set"}</div>
                    <div className="text-xs text-muted-foreground mt-2">Visibility: {saved.visibility}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
