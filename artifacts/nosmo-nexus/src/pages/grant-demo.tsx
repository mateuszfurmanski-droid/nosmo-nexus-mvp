import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  ExternalLink,
  FileBadge2,
  Globe2,
  Network,
  Presentation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Language = "pl" | "en";
type LocalisedText = Record<Language, string>;
type StepKind = "overview" | "spa" | "static";

type DemoStep = {
  id: string;
  kind: StepKind;
  path?: string;
  title: LocalisedText;
  eyebrow: LocalisedText;
  summary: LocalisedText;
  proof: LocalisedText;
  speakerNote: LocalisedText;
  icon: LucideIcon;
};

const base = import.meta.env.BASE_URL;
const cleanPath = (path: string) => path.replace(/^\/+|\/+$/g, "");

function moduleUrl(step: DemoStep) {
  if (!step.path) return undefined;
  const path = cleanPath(step.path);
  return step.kind === "spa"
    ? `${base}?route=${encodeURIComponent(path)}`
    : `${base}${path}/`;
}

const copy = {
  title: {
    pl: "NOSMO Nexus — demonstrator do oceny dotacyjnej",
    en: "NOSMO Nexus — grant assessment demonstrator",
  },
  subtitle: {
    pl: "Jedna prowadzona sciezka przez dzialajace elementy zintegrowanego MVP dla budownictwa.",
    en: "One guided route through the working elements of an integrated construction MVP.",
  },
  boundary: {
    pl: "Funkcjonalny demonstrator. Dane pokazowe sa syntetyczne lub zanonimizowane. Wybrane moduly zapisuja stan lokalnie w przegladarce.",
    en: "Functional demonstrator. Demonstration data is synthetic or anonymised. Selected modules persist state locally in the browser.",
  },
  previous: { pl: "Poprzedni", en: "Previous" },
  next: { pl: "Nastepny krok", en: "Next step" },
  open: { pl: "Otworz modul", en: "Open module" },
  back: { pl: "Pelny Nexus", en: "Full Nexus" },
  proves: { pl: "Co ten krok udowadnia", en: "What this step proves" },
  say: { pl: "Komentarz prezentujacego", en: "Presenter note" },
  step: { pl: "Krok", en: "Step" },
  of: { pl: "z", en: "of" },
  browserBack: {
    pl: "Po obejrzeniu modulu uzyj strzalki Wstecz w przegladarce, aby wrocic do prezentacji.",
    en: "After reviewing the module, use the browser Back button to return to the presentation.",
  },
} satisfies Record<string, LocalisedText>;

const steps: DemoStep[] = [
  {
    id: "overview",
    kind: "overview",
    title: {
      pl: "Od problemu do zintegrowanego produktu",
      en: "From fragmented work to one integrated product",
    },
    eyebrow: { pl: "01 · Wprowadzenie", en: "01 · Introduction" },
    summary: {
      pl: "NOSMO Nexus laczy projekty, ludzi, dokumenty, zadania i specjalistyczne procesy wykonawcze bez wymuszania wymiany narzedzi, ktorych firmy juz uzywaja.",
      en: "NOSMO Nexus connects projects, people, documents, tasks and specialist delivery workflows without forcing companies to replace the tools they already use.",
    },
    proof: {
      pl: "Kolejne kroki otwieraja dzialajace, polaczone demonstratory z jednego wdrozenia internetowego.",
      en: "The following steps open working, connected demonstrators from one web deployment.",
    },
    speakerNote: {
      pl: "Najpierw pokazujemy wspolna warstwe systemu, potem dwa rozne trades, a na koncu relacje projektowe i profil pracownika.",
      en: "We first show the shared system layer, then two different trades, and finally the project relationship and worker identity layers.",
    },
    icon: Presentation,
  },
  {
    id: "work-mode",
    kind: "spa",
    path: "first-run",
    title: { pl: "Mobilne wejscie i Work Mode", en: "Mobile entry and Work Mode" },
    eyebrow: { pl: "02 · Wejscie pracownika", en: "02 · Worker entry" },
    summary: {
      pl: "Pierwsze uruchomienie prowadzi pracownika przez aktywacje Nexusa, kontrolowane odkrywanie danych zawodowych i przejscie do powierzchni Work Mode.",
      en: "First Run guides a worker through Nexus activation, controlled discovery of professional context and entry into the Work Mode surface.",
    },
    proof: {
      pl: "System ma mobilny punkt wejscia, prywatnosciowe granice i sposob budowania kontekstu bez deklarowania dostepu do prywatnych wiadomosci.",
      en: "The system has a mobile entry point, explicit privacy boundaries and a way to build context without claiming access to private messages.",
    },
    speakerNote: {
      pl: "Obecnie jest to PWA i demonstrator UX. Prawdziwy Android Work Profile jest etapem finansowanego rozwoju.",
      en: "This is currently a PWA and UX demonstrator. A real Android Work Profile is a funded development stage.",
    },
    icon: Smartphone,
  },
  {
    id: "fire-register",
    kind: "static",
    path: "fire-door-register-demo",
    title: { pl: "Fire Door Register & Inspection", en: "Fire Door Register & Inspection" },
    eyebrow: { pl: "03 · Rejestr bez planu", en: "03 · Register without drawings" },
    summary: {
      pl: "Samodzielny rejestr pozwala tworzyc karty drzwi recznie, prowadzic inspekcje sektorami, zapisywac postep i blokowac zakonczenie niekompletnego procesu.",
      en: "The standalone register creates door records manually, runs sector-based inspections, saves progress and blocks incomplete process completion.",
    },
    proof: {
      pl: "Nexus obsluguje prace nawet wtedy, gdy wykonawca nie otrzymal jeszcze PDF lub harmonogramu Excel.",
      en: "Nexus supports delivery even when the contractor has not yet received a PDF drawing or Excel schedule.",
    },
    speakerNote: {
      pl: "Pokaz utworzenie drzwi, wybor procesu, sektory inspekcji i walidacje Finish.",
      en: "Show door creation, process selection, inspection sectors and the Finish validation gate.",
    },
    icon: ClipboardCheck,
  },
  {
    id: "doorflow",
    kind: "static",
    path: "doorflow-demo",
    title: { pl: "DoorFlow — proces prowadzony z planu", en: "DoorFlow — plan-led delivery" },
    eyebrow: { pl: "04 · Plan, harmonogram i dowody", en: "04 · Plan, schedule and evidence" },
    summary: {
      pl: "DoorFlow laczy znaczniki na planie, harmonogram drzwi, stany realizacji, checklisty, notatki i dowody dla konkretnego elementu budynku.",
      en: "DoorFlow connects plan markers, a door schedule, delivery states, checklists, notes and evidence for a specific building asset.",
    },
    proof: {
      pl: "Specjalistyczny workflow dziala wewnatrz wspolnego Nexusa, zachowujac wlasny proces techniczny i kontrole jakosci.",
      en: "A specialist workflow operates inside the shared Nexus while retaining its own technical process and quality controls.",
    },
    speakerNote: {
      pl: "Kliknij marker drzwi, zmien status, pokaz checklisty i Building Stack.",
      en: "Select a door marker, change its state, and show the checklist and Building Stack.",
    },
    icon: DoorOpen,
  },
  {
    id: "electrical",
    kind: "static",
    path: "electrical-commissioning",
    title: { pl: "Electrical Commissioning", en: "Electrical Commissioning" },
    eyebrow: { pl: "05 · Platforma wielobranzowa", en: "05 · Multi-trade platform" },
    summary: {
      pl: "Modul elektryczny pokazuje command centre, bloki budynku, schematy, kable, certyfikaty lokali i proces commissioning w tej samej architekturze produktu.",
      en: "The electrical module shows a command centre, building blocks, schematics, cables, apartment certificates and commissioning within the same product architecture.",
    },
    proof: {
      pl: "Nexus nie jest pojedyncza aplikacja do drzwi. Ten sam model obsluguje rozne trades i ich odrebne dane techniczne.",
      en: "Nexus is not a single-purpose door application. The same model supports different trades and their distinct technical data.",
    },
    speakerNote: {
      pl: "Pokaz przejscie od command centre do bloku, obwodu lub certyfikatu.",
      en: "Move from the command centre to a block, circuit or certificate.",
    },
    icon: Zap,
  },
  {
    id: "relationship-tree",
    kind: "spa",
    path: "relationship-tree",
    title: { pl: "Relationship Tree — wspolna pamiec projektu", en: "Relationship Tree — shared project memory" },
    eyebrow: { pl: "06 · Polaczenia i gotowosc", en: "06 · Relationships and readiness" },
    summary: {
      pl: "Graf laczy projekt, ludzi, zadania, dokumenty, problemy, materialy i gotowosc wykonania, zamiast przechowywac te informacje w oddzielnych silosach.",
      en: "The graph connects the project, people, tasks, documents, issues, materials and delivery readiness instead of leaving them in separate silos.",
    },
    proof: {
      pl: "Nexus wnosi warstwe kontekstu i relacji ponad pojedynczymi modulami oraz istniejacym oprogramowaniem.",
      en: "Nexus provides a context and relationship layer above individual modules and existing software.",
    },
    speakerNote: {
      pl: "Klikniecie obiektu pokazuje jego relacje, zaleznosci i dane potrzebne do decyzji.",
      en: "Selecting an object reveals its relationships, dependencies and decision-relevant information.",
    },
    icon: Network,
  },
  {
    id: "person-card",
    kind: "spa",
    path: "person-card-demo",
    title: { pl: "Personal InfoCard i kontrola udostepniania", en: "Personal InfoCard and controlled sharing" },
    eyebrow: { pl: "07 · Czlowiek jako czesc systemu", en: "07 · The worker as part of the system" },
    summary: {
      pl: "Person Card laczy role, kwalifikacje, udzial w projektach, dostepnosc, prywatnosc i kanaly komunikacji w kontrolowany profil zawodowy.",
      en: "The Person Card connects roles, qualifications, project participation, availability, privacy and communication routes in a controlled professional identity.",
    },
    proof: {
      pl: "System laczy wykonanie z kompetencjami, odpowiedzialnoscia i zatwierdzonym zakresem danych pracownika.",
      en: "The system connects delivery with competence, responsibility and the worker's approved data scope.",
    },
    speakerNote: {
      pl: "Pokaz kwalifikacje, relacje projektowe i privacy controls.",
      en: "Show qualifications, project relationships and privacy controls.",
    },
    icon: FileBadge2,
  },
];

const overviewCards = [
  {
    icon: CheckCircle2,
    title: { pl: "Juz dziala", en: "Working now" },
    text: {
      pl: "Jedno wdrozenie laczy mobilne wejscie, dwa specjalistyczne trades, rejestr, graf relacji i Person Card.",
      en: "One deployment connects mobile entry, two specialist trades, a register, a relationship graph and a Person Card.",
    },
  },
  {
    icon: Network,
    title: { pl: "Jedna architektura", en: "One architecture" },
    text: {
      pl: "Moduly zachowuja wlasne procesy, ale korzystaja ze wspolnego kontekstu projektu, osoby, zadania i dokumentu.",
      en: "Modules retain their own workflows while sharing project, person, task and document context.",
    },
  },
  {
    icon: ShieldCheck,
    title: { pl: "Uczciwe granice", en: "Explicit boundaries" },
    text: {
      pl: "Demonstrator nie udaje produkcyjnej synchronizacji, certyfikacji ani dostepu do prywatnych aplikacji.",
      en: "The demonstrator does not pretend to provide production synchronisation, certification or private-app access.",
    },
  },
  {
    icon: Sparkles,
    title: { pl: "Cel finansowania", en: "Funding objective" },
    text: {
      pl: "Wspolny backend, uwierzytelnianie, obsluga dokumentow, konektory i natywna warstwa mobilna.",
      en: "Shared backend, authentication, document processing, connectors and a native mobile layer.",
    },
  },
] satisfies Array<{ icon: LucideIcon; title: LocalisedText; text: LocalisedText }>;

export default function GrantDemo() {
  const [language, setLanguage] = useState<Language>("pl");
  const [activeIndex, setActiveIndex] = useState(0);
  const active = steps[activeIndex];
  const activeUrl = moduleUrl(active);
  const Icon = active.icon;
  const progress = ((activeIndex + 1) / steps.length) * 100;

  const translatedSteps = useMemo(
    () => steps.map((step) => ({ ...step, displayTitle: step.title[language] })),
    [language],
  );

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(steps.length - 1, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-[100dvh] bg-[#050913] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050913]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-3 sm:px-5">
          <a href={base} className="flex shrink-0 items-center gap-2.5" aria-label={copy.back[language]}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-sm font-black text-cyan-200">N</div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">NOSMO Nexus</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.18em] text-slate-500">Grant Demo</p>
            </div>
          </a>

          <div className="mx-auto hidden max-w-xl flex-1 md:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === "pl" ? "en" : "pl")}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-200"
            >
              <Globe2 className="h-4 w-4" /> {language === "pl" ? "EN" : "PL"}
            </button>
            <a href={base} className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> {copy.back[language]}
            </a>
          </div>
        </div>
        <div className="h-1 bg-white/5 md:hidden">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 md:py-6">
        <section className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.08] via-slate-950/90 to-slate-950 p-4 shadow-2xl sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200">Integrated functional MVP</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">{copy.title[language]}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{copy.subtitle[language]}</p>
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-3.5 py-3 text-xs leading-relaxed text-amber-100/80">
            {copy.boundary[language]}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/75 p-3 shadow-xl">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
            {copy.step[language]} {activeIndex + 1} {copy.of[language]} {steps.length}
          </p>
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Grant demo steps">
            {translatedSteps.map((step, index) => {
              const StepIcon = step.icon;
              const selected = index === activeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`flex min-w-[210px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-cyan-300/35 bg-cyan-300/10 text-white" : "border-white/5 bg-white/[.025] text-slate-400"}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-cyan-300/15 text-cyan-200" : "bg-white/5 text-slate-500"}`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{String(index + 1).padStart(2, "0")}</p>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">{step.displayTitle}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75 shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200 sm:text-xs">{active.eyebrow[language]}</p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">{active.title[language]}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{active.summary[language]}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3.5 sm:p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-200 sm:text-xs">
                  <CheckCircle2 className="h-4 w-4" /> {copy.proves[language]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/70">{active.proof[language]}</p>
              </div>
              <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.06] p-3.5 sm:p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-violet-200 sm:text-xs">
                  <Sparkles className="h-4 w-4" /> {copy.say[language]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-violet-50/70">{active.speakerNote[language]}</p>
              </div>
            </div>

            {activeUrl && (
              <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[.055] p-3.5 sm:p-4">
                <a
                  href={activeUrl}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 active:scale-[.99]"
                >
                  {copy.open[language]} <ExternalLink className="h-4 w-4" />
                </a>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">{copy.browserBack[language]}</p>
              </div>
            )}
          </div>

          {active.kind === "overview" ? (
            <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 sm:p-6">
              {overviewCards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <article key={card.title.en} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.08] text-cyan-200">
                      <CardIcon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-base font-bold">{card.title[language]}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.text[language]}</p>
                  </article>
                );
              })}
            </div>
          ) : activeUrl ? (
            <div className="hidden border-t border-white/10 bg-[#03060c] p-3 lg:block">
              <iframe
                key={active.id}
                src={activeUrl}
                title={active.title[language]}
                className="h-[66vh] min-h-[560px] w-full rounded-xl border border-white/10 bg-[#050913]"
                allow="camera; microphone; clipboard-read; clipboard-write"
              />
            </div>
          ) : null}

          <footer className="grid grid-cols-2 gap-3 border-t border-white/10 p-3 sm:flex sm:items-center sm:justify-between sm:p-4">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-300 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" /> {copy.previous[language]}
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === steps.length - 1}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {copy.next[language]} <ArrowRight className="h-4 w-4" />
            </button>
          </footer>
        </section>
      </main>
    </div>
  );
}
