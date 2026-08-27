import { useEffect, useMemo, useState } from "react";
import { api, type ApiJob, type ReplyItem } from "./api";

type Screen = "home" | "jobs" | "apply" | "replies" | "cvs" | "settings";
type BackendMode = "checking" | "demo" | "locked" | "live";
type ApplyMode = "new" | "review";

type JobStatus =
  | "ACTIVE"
  | "APPLIED"
  | "INTERVIEW"
  | "REJECTED"
  | "EXPIRED"
  | "CONTACTED"
  | "FORM REQUIRED"
  | "PHONE/WHATSAPP REQUIRED"
  | "WATCH"
  | "BACKUP";

type Category =
  | "CLEANING"
  | "WAREHOUSE"
  | "FACTORY / PRODUCTION"
  | "BAR STAFF"
  | "CAFE / BREAKFAST"
  | "KITCHEN / CATERING"
  | "HOTEL / HOUSEKEEPING";

type Job = {
  id: string;
  row?: number;
  company: string;
  role: string;
  category: Category;
  priority: "A" | "B" | "C";
  shift: string;
  pay: string;
  transport: string;
  status: JobStatus;
  match: number;
  note: string;
  email?: string;
  applicationLink?: string;
  cvCode?: string;
  sourceUrl?: string;
};

type Metrics = {
  active: number;
  applied: number;
  contacted: number;
  interviews: number;
  forms: number;
  replies: number;
  morning?: number;
  night?: number;
  priorityA?: number;
};

type IntegrationState = {
  google: {
    configured: boolean;
    tokenExchange: boolean;
    sheetsRead: boolean;
    driveRead: boolean;
    sheetsWriteEnabled: boolean;
    gmailSendEnabled: boolean;
  };
  checkedAt: string;
};

const cvMap: Record<Category, { code: string; label: string; reason: string }> = {
  CLEANING: {
    code: "CV 01",
    label: "Cleaning",
    reason: "Emphasises final-clean and workshop-cleaning experience.",
  },
  WAREHOUSE: {
    code: "CV 02",
    label: "Warehouse",
    reason: "Emphasises packing, handling, labelling and dispatch-style work.",
  },
  "FACTORY / PRODUCTION": {
    code: "CV 03",
    label: "Factory / Production",
    reason: "Emphasises production-line, packing, weighing and quality checks.",
  },
  "BAR STAFF": {
    code: "CV 04",
    label: "Bar Staff",
    reason: "Positions transferable customer-facing and fast-paced work skills.",
  },
  "CAFE / BREAKFAST": {
    code: "CV 05",
    label: "Cafe / Breakfast",
    reason: "Positions reliability, hygiene, early shifts and willingness to learn.",
  },
  "KITCHEN / CATERING": {
    code: "CV 06",
    label: "Kitchen / Catering",
    reason: "Emphasises hygiene, practical work, preparation support and routines.",
  },
  "HOTEL / HOUSEKEEPING": {
    code: "CV 07",
    label: "Hotel / Housekeeping",
    reason: "Emphasises detailed cleaning and presentation standards.",
  },
};

const statusValues: JobStatus[] = [
  "ACTIVE",
  "APPLIED",
  "INTERVIEW",
  "REJECTED",
  "EXPIRED",
  "CONTACTED",
  "FORM REQUIRED",
  "PHONE/WHATSAPP REQUIRED",
  "WATCH",
  "BACKUP",
];

const categoryValues = Object.keys(cvMap) as Category[];

const seedJobs: Job[] = [
  {
    id: "workplace",
    company: "WORKPLACE",
    role: "Cleaning Operative",
    category: "CLEANING",
    priority: "A",
    shift: "07:00–09:00 · Mon–Fri",
    pay: "Up to £13.45/h",
    transport: "15–25 min by bus · strong fit",
    status: "FORM REQUIRED",
    match: 96,
    note: "Best short-morning match. Online form still required.",
    applicationLink: "https://uk.indeed.com/viewjob?jk=04dfa590c990c0d4",
  },
  {
    id: "asda",
    company: "ASDA Ring Road Express",
    role: "Service Colleague — Nights",
    category: "WAREHOUSE",
    priority: "A",
    shift: "Night shift · 16h/week",
    pay: "Current listing",
    transport: "Bradford · check late-night bus",
    status: "FORM REQUIRED",
    match: 91,
    note: "Strong night fit. ASDA Careers application required.",
  },
  {
    id: "symingtons",
    company: "Symington’s via Major Recruitment",
    role: "Production Operative / Packer",
    category: "FACTORY / PRODUCTION",
    priority: "A",
    shift: "18:00–07:00 · Mon–Thu",
    pay: "Confirm current 2026 rate",
    transport: "Bradford · exact site to confirm",
    status: "APPLIED",
    match: 94,
    note: "CV 03 sent to onsite recruiter.",
  },
  {
    id: "wash",
    company: "The Wash Laundry Service",
    role: "Laundry Operative",
    category: "HOTEL / HOUSEKEEPING",
    priority: "B",
    shift: "Hours to confirm",
    pay: "Current listing",
    transport: "Bradford",
    status: "FORM REQUIRED",
    match: 78,
    note: "Application-platform only.",
  },
  {
    id: "starbucks",
    company: "Starbucks Broadway",
    role: "Barista",
    category: "CAFE / BREAKFAST",
    priority: "B",
    shift: "Morning shifts possible",
    pay: "Current listing",
    transport: "Central Bradford · strong",
    status: "FORM REQUIRED",
    match: 74,
    note: "Careers portal required.",
  },
];

const seedMetrics: Metrics = {
  active: 47,
  applied: 18,
  contacted: 61,
  interviews: 0,
  forms: 6,
  replies: 0,
  morning: 12,
  night: 16,
  priorityA: 16,
};

const asCategory = (value: string): Category =>
  categoryValues.includes(value as Category) ? (value as Category) : "WAREHOUSE";

const asStatus = (value: string): JobStatus =>
  statusValues.includes(value as JobStatus) ? (value as JobStatus) : "ACTIVE";

const asPriority = (value: string): "A" | "B" | "C" =>
  value === "A" || value === "B" ? value : "C";

const mapApiJob = (job: ApiJob): Job => ({
  id: `sheet-${job.row}`,
  row: job.row,
  company: job.company,
  role: job.role,
  category: asCategory(job.category),
  priority: asPriority(job.priority),
  shift: [job.shift, job.days].filter(Boolean).join(" · ") || "Hours to confirm",
  pay: job.pay || "Pay to confirm",
  transport: [job.transport, job.travelTime].filter(Boolean).join(" · ") || "Transport to check",
  status: asStatus(job.status),
  match: job.match,
  note: job.notes || job.applicationMethod || "",
  email: job.email && !/^not stated/i.test(job.email) ? job.email : undefined,
  applicationLink: job.applicationLink || undefined,
  cvCode: job.cvCode || undefined,
  sourceUrl: job.sourceUrl || undefined,
});

const statusClass = (status: JobStatus) =>
  status.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");

const statusLabel = (status: JobStatus) => {
  const labels: Record<JobStatus, string> = {
    ACTIVE: "Ready",
    APPLIED: "Applied",
    INTERVIEW: "Interview",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
    CONTACTED: "Contacted",
    "FORM REQUIRED": "Apply online",
    "PHONE/WHATSAPP REQUIRED": "Call / WhatsApp",
    WATCH: "Watch later",
    BACKUP: "Backup",
  };
  return labels[status];
};

const inferCategory = (text: string): Category => {
  const t = text.toLowerCase();
  if (/hotel|housekeeping|room attendant|laundry|room\s+clean/.test(t)) return "HOTEL / HOUSEKEEPING";
  if (/clean|janitor/.test(t)) return "CLEANING";
  if (/warehouse|despatch|dispatch|picker|packer|stock|replenish/.test(t)) return "WAREHOUSE";
  if (/factory|production|manufactur|line operative|machine/.test(t)) return "FACTORY / PRODUCTION";
  if (/bar staff|bartender|pub|barmaid/.test(t)) return "BAR STAFF";
  if (/barista|cafe|coffee|breakfast|sandwich/.test(t)) return "CAFE / BREAKFAST";
  if (/kitchen|catering|food service|kitchen porter/.test(t)) return "KITCHEN / CATERING";
  return "WAREHOUSE";
};

const safePrompt = (job: Job) =>
  [
    "Help Joanna Bach assess and prepare an application for this job.",
    "",
    `Company: ${job.company}`,
    `Role: ${job.role}`,
    `Category: ${job.category}`,
    `Shift: ${job.shift}`,
    `Transport note: ${job.transport}`,
    "",
    "Verified profile facts only:",
    "- Based in Bradford BD2.",
    "- Main transport: bus/public transport.",
    "- Available from 1 September 2026.",
    "- Prefers short morning shifts or night shifts.",
    "- Daytime availability is around 3 days/week.",
    "",
    `Use ${cvMap[job.category].code} — ${cvMap[job.category].label} as the starting CV profile.`,
    "Do not invent experience, qualifications, licences or certificates. Only re-order, shorten, emphasise or rephrase verified facts.",
    "",
    "Tell me: fit score, risks, which verified CV points to emphasise, and a short tailored cover message.",
  ].join("\n");

const coverMessage = (job: Job) =>
  [
    "Dear Hiring Team,",
    "",
    `I am interested in the ${job.role} role at ${job.company}.`,
    "",
    "I am based in Bradford BD2 and I am available to start from 1 September 2026. Short morning shifts or night shifts are particularly suitable for me, and I travel mainly by public transport.",
    "",
    `Please find my relevant ${cvMap[job.category].label.toLowerCase()} CV attached. I would be pleased to discuss the role and my availability further.`,
    "",
    "Kind regards,",
    "Joanna Bach",
    "Personal email: Joanna94bach@gmail.com",
  ].join("\n");

const sendKeyFor = (job: Job) => {
  if (!job.row) return "";
  const storageKey = `job-control-send-key-${job.row}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `job-${job.row}-${uuid}`;
  localStorage.setItem(storageKey, key);
  return key;
};

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [metrics, setMetrics] = useState<Metrics>(seedMetrics);
  const [filter, setFilter] = useState("To do");
  const [selectedJob, setSelectedJob] = useState<Job>(seedJobs[0]);
  const [applyMode, setApplyMode] = useState<ApplyMode>("review");
  const [importText, setImportText] = useState("");
  const [toast, setToast] = useState("");
  const [backendMode, setBackendMode] = useState<BackendMode>("checking");
  const [accessCode, setAccessCode] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationState | null>(null);
  const [liveCvNames, setLiveCvNames] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({
    location: "Bradford BD2",
    start: "01/09/2026",
    transport: "Bus / public transport",
    availability: "Short mornings or nights; daytime around 3 days/week",
  });

  useEffect(() => {
    const raw = localStorage.getItem("job-control-demo");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { jobs?: Job[]; profile?: typeof profile };
        if (parsed.jobs) setJobs(parsed.jobs);
        if (parsed.profile) setProfile(parsed.profile);
      } catch {
        // Ignore malformed local demo state.
      }
    }

    const params = new URLSearchParams(window.location.search);
    const shared = [params.get("title"), params.get("text"), params.get("url")]
      .filter(Boolean)
      .join("\n")
      .trim();
    if (shared) {
      setImportText(shared);
      setApplyMode("new");
      setScreen("apply");
      window.history.replaceState({}, "", window.location.pathname);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (backendMode !== "live") {
      localStorage.setItem("job-control-demo", JSON.stringify({ jobs, profile }));
    }
  }, [jobs, profile, backendMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const bootstrap = async () => {
    try {
      const auth = await api.authStatus();
      if (!auth.configured) {
        setBackendMode("demo");
        return;
      }
      if (!auth.authenticated) {
        setBackendMode("locked");
        return;
      }
      await refreshLive();
    } catch {
      setBackendMode("demo");
    }
  };

  const refreshLive = async () => {
    setSyncBusy(true);
    try {
      const [dashboard, liveJobs] = await Promise.all([api.dashboard(), api.jobs()]);
      const mapped = liveJobs.jobs.map(mapApiJob);
      setJobs(mapped);
      setSelectedJob((current) => mapped.find((job) => job.id === current.id) ?? mapped[0] ?? current);
      setMetrics({
        ...dashboard.metrics,
        forms: mapped.filter((job) => job.status === "FORM REQUIRED").length,
        replies: 0,
      });

      try {
        const status = await api.integrations();
        setIntegrations(status.integrations);
      } catch {
        setIntegrations(null);
      }

      try {
        const inbox = await api.replies();
        setReplies(inbox.replies);
        setMetrics((current) => ({
          ...current,
          replies: inbox.replies.filter((reply) => reply.unread).length,
        }));
      } catch {
        setReplies([]);
      }

      try {
        const cvPayload = await api.cvs();
        setLiveCvNames(
          Object.fromEntries(cvPayload.cvs.map((cv) => [cv.code, cv.name])),
        );
      } catch {
        setLiveCvNames({});
      }

      setBackendMode("live");
      setToast("Live Google data synced.");
    } catch {
      setBackendMode("demo");
      setToast("Live Google unavailable — showing safe demo data.");
    } finally {
      setSyncBusy(false);
    }
  };

  const login = async () => {
    if (!accessCode.trim()) return;
    setLoginBusy(true);
    try {
      await api.login(accessCode.trim());
      setAccessCode("");
      await refreshLive();
    } catch {
      setToast("Wrong access code or backend not ready.");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setBackendMode("locked");
      setIntegrations(null);
      setReplies([]);
    }
  };

  const actionableJobs = useMemo(
    () =>
      jobs
        .filter((job) =>
          ["ACTIVE", "FORM REQUIRED", "PHONE/WHATSAPP REQUIRED"].includes(job.status),
        )
        .sort((a, b) => b.match - a.match),
    [jobs],
  );

  const nextActionJob = actionableJobs[0] ?? jobs[0] ?? selectedJob;

  const filteredJobs = useMemo(() => {
    if (filter === "All") return jobs;
    if (filter === "To do") {
      return jobs.filter((job) =>
        ["ACTIVE", "FORM REQUIRED", "PHONE/WHATSAPP REQUIRED"].includes(job.status),
      );
    }
    if (filter === "Morning") return jobs.filter((j) => /07:|08:|09:|morning/i.test(j.shift));
    if (filter === "Night") return jobs.filter((j) => /night|18:00|22:00/i.test(j.shift));
    if (filter === "Applied") return jobs.filter((j) => j.status === "APPLIED");
    if (filter === "Watch") return jobs.filter((j) => j.status === "WATCH" || j.status === "BACKUP");
    return jobs;
  }, [filter, jobs]);

  const updateLocalJob = (id: string, status: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    setSelectedJob((prev) => (prev.id === id ? { ...prev, status } : prev));
  };

  const markStatus = async (job: Job, status: JobStatus) => {
    const confirmation =
      status !== "APPLIED" ||
      window.confirm("Confirm that this application was actually submitted/sent?");
    if (!confirmation) return;

    if (backendMode === "live" && job.row) {
      try {
        await api.updateStatus({
          row: job.row,
          status,
          note: `Changed in Job Control on ${new Date().toISOString()}.`,
          confirmed: status !== "APPLIED" || confirmation,
        });
        updateLocalJob(job.id, status);
        setToast(`Status changed to ${status}`);
        return;
      } catch {
        setToast("Status was not changed in Google Sheets.");
        return;
      }
    }

    updateLocalJob(job.id, status);
    setToast(`Demo status changed to ${status}`);
  };

  const openJob = (job: Job) => {
    setSelectedJob(job);
    setApplyMode("review");
    setScreen("apply");
  };

  const askChatGPT = async (job: Job) => {
    const prompt = safePrompt(job);
    try {
      await navigator.clipboard.writeText(prompt);
      setToast("Prompt copied. Opening ChatGPT…");
    } catch {
      setToast("Open ChatGPT and paste the prepared prompt.");
    }
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  };

  const importJob = () => {
    if (importText.trim().length < 8) {
      setToast("Paste a job URL or description first.");
      return;
    }
    const category = inferCategory(importText);
    const job: Job = {
      id: `import-${Date.now()}`,
      company: "Imported job",
      role: importText.split("\n")[0].slice(0, 68) || "New vacancy",
      category,
      priority: "B",
      shift: "Needs review",
      pay: "Needs review",
      transport: "Check from Bradford BD2",
      status: "ACTIVE",
      match: category === "CLEANING" || category === "WAREHOUSE" ? 82 : 72,
      note: "Imported locally. Review facts before any application.",
      cvCode: cvMap[category].code,
    };
    setJobs((prev) => [job, ...prev]);
    setSelectedJob(job);
    setImportText("");
    setApplyMode("review");
    setToast(`${cvMap[category].code} selected automatically.`);
  };

  const applyPrimaryAction = async (job: Job) => {
    const hasEmail = Boolean(job.email);
    const isForm = job.status === "FORM REQUIRED" || !hasEmail;

    if (isForm) {
      const target = job.applicationLink || job.sourceUrl;
      if (target) {
        window.open(target, "_blank", "noopener,noreferrer");
        setToast("Form opened. Mark APPLIED only after submission.");
      } else {
        setToast("No direct email or application link is available.");
      }
      return;
    }

    if (backendMode !== "live" || !job.row) {
      setToast("Live Google/Gmail connection is required before sending.");
      return;
    }

    if (!integrations?.google.gmailSendEnabled || !integrations.google.sheetsWriteEnabled) {
      setToast("Live send is still locked in server settings.");
      return;
    }

    const confirmed = window.confirm(
      `Send now from hello@nosmo.tech to ${job.email} using ${job.cvCode || cvMap[job.category].code}?\n\nThis will mark the job APPLIED only after Gmail confirms the send.`,
    );
    if (!confirmed) return;

    const idempotencyKey = sendKeyFor(job);
    const subject = `Application – ${job.role} – Joanna Bach`;
    const body = coverMessage(job);

    try {
      const result = await api.sendApplication({
        row: job.row,
        to: job.email!,
        subject,
        body,
        cvCode: job.cvCode || cvMap[job.category].code,
        idempotencyKey,
        confirmed: true,
      });
      localStorage.removeItem(`job-control-send-key-${job.row}`);
      updateLocalJob(job.id, "APPLIED");
      setMetrics((current) => ({
        ...current,
        applied: current.applied + (job.status === "APPLIED" ? 0 : 1),
      }));
      setToast(
        result.statusUpdated
          ? "Sent and marked APPLIED."
          : "Email sent. Sheet status needs sync.",
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "SEND_FAILED";
      setToast(
        code === "SEND_STATE_REQUIRES_REVIEW"
          ? "Check Sent before retrying — duplicate protection is active."
          : "Not sent. Check connection/settings.",
      );
    }
  };

  const primaryActionLabel =
    selectedJob.status === "FORM REQUIRED" || !selectedJob.email
      ? "Open application form"
      : backendMode === "live"
        ? "Confirm & send"
        : "Preview only";

  if (backendMode === "checking") {
    return (
      <div className="app">
        <main className="content">
          <section className="hero">
            <div>
              <span className="hero-kicker">JOB CONTROL</span>
              <h2>Loading secure workspace…</h2>
              <p>Checking private app session and Google connection.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (backendMode === "locked") {
    return (
      <div className="app">
        <main className="content">
          <section className="hero">
            <div>
              <span className="hero-kicker">PRIVATE JOB CONTROL</span>
              <h2>Joanna’s workspace</h2>
              <p>Enter the private access code for this phone. Google credentials are never stored in the browser.</p>
            </div>
          </section>
          <section className="settings-card section">
            <label className="field">
              <span>Access code</span>
              <input
                type="password"
                autoComplete="current-password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void login();
                }}
                placeholder="Private code"
              />
            </label>
            <button className="primary" disabled={loginBusy} onClick={() => void login()}>
              {loginBusy ? "Checking…" : "Open Job Control"}
            </button>
          </section>
          {toast && <div className="toast">{toast}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">JOANNA BACH · JOB SEARCH</div>
          <h1>Job Control</h1>
        </div>
        <button
          className="mode-chip"
          onClick={() => {
            if (backendMode === "live") void refreshLive();
          }}
          disabled={syncBusy}
        >
          <span className="dot" />
          {backendMode === "live" ? (syncBusy ? "Syncing…" : "Up to date") : "Preview"}
        </button>
      </header>

      <main className="content">
        {screen === "home" && (
          <>
            <section className="hero home-hero">
              <div>
                <span className="hero-kicker">
                  {backendMode === "live" ? "JOB CONTROL" : "PREVIEW"}
                </span>
                <h2>What should I do now?</h2>
                <p>
                  One next action at a time. Job Control keeps the CV, status and history in the background.
                </p>
              </div>
              <button
                className="primary hero-action"
                onClick={() => {
                  setApplyMode("new");
                  setScreen("apply");
                }}
              >
                + Add a job
              </button>
            </section>

            <section className="next-action-card">
              <div className="next-action-copy">
                <span className="eyebrow">NEXT BEST ACTION</span>
                <div className="next-action-title">
                  <div>
                    <h3>{nextActionJob.role}</h3>
                    <p>{nextActionJob.company}</p>
                  </div>
                  <div className="score compact">{nextActionJob.match}%<small>match</small></div>
                </div>
                <div className="next-action-meta">
                  <span>{statusLabel(nextActionJob.status)}</span>
                  <span>{nextActionJob.shift}</span>
                </div>
              </div>
              <button className="primary" onClick={() => openJob(nextActionJob)}>
                Review this job
              </button>
            </section>

            <section className="stat-grid compact-stats">
              {[
                ["To do", actionableJobs.length],
                ["Applied", metrics.applied],
                ["Replies", metrics.replies],
                ["Interviews", metrics.interviews],
              ].map(([label, value]) => (
                <button
                  key={String(label)}
                  className="stat-card"
                  onClick={() => {
                    if (label === "Replies") {
                      setScreen("replies");
                    } else {
                      if (label === "To do") setFilter("To do");
                      if (label === "Applied") setFilter("Applied");
                      setScreen("jobs");
                    }
                  }}
                >
                  <strong>{value}</strong>
                  <span>{label}</span>
                </button>
              ))}
            </section>

            <div className="quiet-summary">
              <span>{metrics.active} active</span>
              <span>{metrics.contacted} employers contacted</span>
              <span>{metrics.morning ?? 0} mornings</span>
              <span>{metrics.night ?? 0} nights</span>
            </div>

            <section className="section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">SHORTLIST</span>
                  <h3>Other strong matches</h3>
                </div>
                <button className="text-button" onClick={() => setScreen("jobs")}>All jobs</button>
              </div>
              <div className="job-list">
                {actionableJobs
                  .filter((job) => job.id !== nextActionJob.id)
                  .slice(0, 2)
                  .map((job) => <JobCard key={job.id} job={job} onOpen={openJob} />)}
              </div>
            </section>

            <section className="quick-grid simplified">
              <button className="quick" onClick={() => {
                setApplyMode("new");
                setScreen("apply");
              }}>
                <span>＋</span><div><b>Add job</b><small>Paste or share an advert</small></div>
              </button>
              <button className="quick" onClick={() => setScreen("replies")}>
                <span>↩</span><div><b>Replies</b><small>Messages that need attention</small></div>
              </button>
              <button className="quick" onClick={() => setScreen("cvs")}>
                <span>CV</span><div><b>CVs</b><small>See the 7 job profiles</small></div>
              </button>
            </section>
          </>
        )}

        {screen === "jobs" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">PIPELINE</span><h2>Jobs</h2></div>
              <button
                className="primary small"
                onClick={() => {
                  setApplyMode("new");
                  setScreen("apply");
                }}
              >
                + Add job
              </button>
            </div>
            <div className="filters">
              {["To do", "Applied", "Morning", "Night", "Watch", "All"].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "filter active" : "filter"}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="job-list">
              {filteredJobs.map((job) => <JobCard key={job.id} job={job} onOpen={openJob} />)}
            </div>
          </section>
        )}

        {screen === "apply" && (
          <section className="section page">
            <div className="section-head">
              <div>
                <span className="eyebrow">SMART APPLY</span>
                <h2>{applyMode === "new" ? "Add a job" : "Review job"}</h2>
              </div>
              {applyMode === "review" && (
                <button className="text-button" onClick={() => setApplyMode("new")}>
                  Add different job
                </button>
              )}
            </div>

            <div className="stepper" aria-label="Application steps">
              <div className={applyMode === "new" ? "step active" : "step done"}>
                <span>1</span>
                <b>Add</b>
              </div>
              <div className={applyMode === "review" ? "step active" : "step"}>
                <span>2</span>
                <b>Review</b>
              </div>
              <div className="step">
                <span>3</span>
                <b>Apply</b>
              </div>
            </div>

            {applyMode === "new" ? (
              <>
                <div className="import-card focused-card">
                  <div className="simple-icon">＋</div>
                  <h3>Add a job advert</h3>
                  <p className="helper-text">
                    Paste a job link or the advert text. Job Control will choose the best CV automatically.
                  </p>
                  <label htmlFor="jobImport">Job link or description</label>
                  <textarea
                    id="jobImport"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste an Indeed link or job advert here…"
                  />
                  <button className="primary full-width" onClick={importJob}>
                    Analyse job
                  </button>
                </div>

                <div className="mini-help">
                  <b>What happens next?</b>
                  <span>Job Control checks shift, transport and role type.</span>
                  <span>It selects one of the 7 verified CV profiles.</span>
                  <span>Nothing is sent until Joanna reviews it.</span>
                </div>
              </>
            ) : (
              <div className="apply-card">
                <div className="apply-top">
                  <div>
                    <span className="priority">Priority {selectedJob.priority}</span>
                    <h3>{selectedJob.role}</h3>
                    <p>{selectedJob.company}</p>
                  </div>
                  <div className="score">{selectedJob.match}%<small>match</small></div>
                </div>

                <div className="fit-summary">
                  <div>
                    <span>Shift</span>
                    <b>{selectedJob.shift}</b>
                  </div>
                  <div>
                    <span>Transport</span>
                    <b>{selectedJob.transport}</b>
                  </div>
                </div>

                <div className="decision-row">
                  <span>Current status</span>
                  <b className={`status ${statusClass(selectedJob.status)}`}>
                    {statusLabel(selectedJob.status)}
                  </b>
                </div>

                <div className="cv-choice">
                  <div className="cv-badge">{selectedJob.cvCode || cvMap[selectedJob.category].code}</div>
                  <div>
                    <span className="eyebrow">CV CHOSEN FOR THIS JOB</span>
                    <b>{cvMap[selectedJob.category].label}</b>
                    <p>{cvMap[selectedJob.category].reason}</p>
                  </div>
                </div>

                <div className="truth-box compact-truth">
                  <b>Using Joanna's verified profile</b>
                  <p>{profile.location} · starts {profile.start} · {profile.transport}</p>
                  <p>{profile.availability}</p>
                </div>

                <details className="preview-details">
                  <summary>Preview application message</summary>
                  <div className="cover-preview">
                    <p>{coverMessage(selectedJob)}</p>
                  </div>
                </details>

                <div className="final-action">
                  <span className="eyebrow">STEP 3 · APPLY</span>
                  <h3>
                    {selectedJob.status === "FORM REQUIRED" || !selectedJob.email
                      ? "Continue to employer"
                      : "Ready to send"}
                  </h3>
                  <p>
                    {selectedJob.status === "FORM REQUIRED" || !selectedJob.email
                      ? "The employer uses an online application. Job Control will open the correct page."
                      : `Email will use ${selectedJob.cvCode || cvMap[selectedJob.category].code} and the reviewed message.`}
                  </p>
                  <button className="primary full-width" onClick={() => void applyPrimaryAction(selectedJob)}>
                    {primaryActionLabel}
                  </button>
                </div>

                <div className="secondary-actions">
                  <button className="secondary" onClick={() => askChatGPT(selectedJob)}>
                    Ask ChatGPT
                  </button>
                  {selectedJob.status !== "APPLIED" && (
                    <button className="ghost" onClick={() => void markStatus(selectedJob, "APPLIED")}>
                      I already applied
                    </button>
                  )}
                </div>

                <details className="safety-details">
                  <summary>Safety rules</summary>
                  <p>
                    Job Control never invents experience or qualifications and never marks a job applied
                    after an unconfirmed send.
                  </p>
                </details>
              </div>
            )}
          </section>
        )}

        {screen === "replies" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>Replies</h2></div>
              <span className="safe-chip">{replies.filter((reply) => reply.unread).length} new</span>
            </div>
            {replies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">↩</div>
                <h3>Nothing to do right now</h3>
                <p>
                  New replies from employers will appear here when they need your attention.
                </p>
                <button className="secondary" onClick={() => setScreen("jobs")}>Back to jobs</button>
              </div>
            ) : (
              <div className="job-list">
                {replies.map((reply) => (
                  <article className="job-card" key={reply.id}>
                    <div className="job-card-top">
                      <span className="priority">{reply.unread ? "NEW" : "REPLY"}</span>
                      <span className="status contacted">Employer reply</span>
                    </div>
                    <h3>{reply.subject || "Recruitment reply"}</h3>
                    <p className="company">{reply.from}</p>
                    <p className="transport">{reply.snippet}</p>
                    <div className="action-stack">
                      <button
                        className="secondary"
                        onClick={async () => {
                          const prompt = [
                            "Help Joanna Bach respond to this job-related email.",
                            `From: ${reply.from}`,
                            `Subject: ${reply.subject}`,
                            `Message preview: ${reply.snippet}`,
                            "",
                            "Use only verified facts. Do not invent availability, qualifications or experience.",
                          ].join("\n");
                          try { await navigator.clipboard.writeText(prompt); } catch { /* no-op */ }
                          window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
                        }}
                      >
                        Help me reply
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {screen === "cvs" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">CHOSEN AUTOMATICALLY</span><h2>My CVs</h2></div>
              <span className="safe-chip">7 ready</span>
            </div>
            <div className="cv-intro">
              Job Control chooses the right CV for each job. You do not need to pick one manually.
            </div>
            <div className="cv-grid">
              {(Object.entries(cvMap) as [Category, (typeof cvMap)[Category]][]).map(([category, cv]) => (
                <div className="cv-card" key={category}>
                  <div className="cv-badge large">{cv.code.replace("CV ", "")}</div>
                  <div className="cv-card-text">
                    <h3>{cv.label}</h3>
                    <p>{cv.reason}</p>
                    <small>
                      {backendMode === "live"
                        ? liveCvNames[cv.code] || "Ready"
                        : "Ready for matching"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === "settings" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">YOUR JOB CONTROL</span><h2>More</h2></div>
            </div>

            <div className="more-grid">
              <button className="more-card" onClick={() => setScreen("cvs")}>
                <span className="more-icon">CV</span>
                <div>
                  <b>My CVs</b>
                  <small>7 profiles · chosen automatically</small>
                </div>
              </button>
              <button
                className="more-card"
                onClick={() => {
                  const target = document.getElementById("profile-settings");
                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="more-icon">ME</span>
                <div>
                  <b>My details</b>
                  <small>Availability, transport and start date</small>
                </div>
              </button>
            </div>

            <div className="settings-card" id="profile-settings">
              <div className="settings-title">
                <div>
                  <span className="eyebrow">USED FOR EVERY APPLICATION</span>
                  <h3>My details</h3>
                </div>
                <span className="safe-chip">Verified</span>
              </div>
              {[
                ["Location", "location"],
                ["Available from", "start"],
                ["Transport", "transport"],
                ["Availability", "availability"],
              ].map(([label, key]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    value={profile[key as keyof typeof profile]}
                    onChange={(e) => setProfile((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <p className="disclaimer">
                Job Control uses these facts when choosing jobs and preparing applications.
              </p>
            </div>

            <details className="advanced-card">
              <summary>
                <span>
                  <b>Advanced</b>
                  <small>Connections, sync and safety</small>
                </span>
                <span>›</span>
              </summary>

              <div className="advanced-content">
                <ConnectionRow
                  name="Job database"
                  detail="Google Sheets"
                  connected={Boolean(integrations?.google.sheetsRead)}
                />
                <ConnectionRow
                  name="CV storage"
                  detail="Google Drive"
                  connected={Boolean(integrations?.google.driveRead)}
                />
                <ConnectionRow
                  name="Application email"
                  detail="hello@nosmo.tech"
                  connected={Boolean(integrations?.google.gmailSendEnabled)}
                />
                <ConnectionRow
                  name="ChatGPT"
                  detail="Free ChatGPT handoff"
                  connected
                />

                {backendMode === "live" && (
                  <div className="action-stack">
                    <button className="secondary" disabled={syncBusy} onClick={() => void refreshLive()}>
                      {syncBusy ? "Syncing…" : "Sync now"}
                    </button>
                    <button className="ghost" onClick={() => void logout()}>Lock app</button>
                  </div>
                )}

                <div className="integration-note">
                  Google credentials stay on the server. Job Control never invents experience or qualifications,
                  and it only marks APPLIED after confirmation.
                </div>
              </div>
            </details>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <NavButton active={screen === "home"} label="Home" icon="⌂" onClick={() => setScreen("home")} />
        <NavButton active={screen === "jobs"} label="Jobs" icon="▤" onClick={() => setScreen("jobs")} />
        <NavButton
          active={screen === "apply"}
          label="Add"
          icon="＋"
          onClick={() => {
            setApplyMode("new");
            setScreen("apply");
          }}
        />
        <NavButton active={screen === "replies"} label="Replies" icon="↩" onClick={() => setScreen("replies")} />
        <NavButton active={screen === "settings"} label="More" icon="•••" onClick={() => setScreen("settings")} />
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function JobCard({ job, onOpen }: { job: Job; onOpen: (job: Job) => void }) {
  return (
    <button className="job-card" onClick={() => onOpen(job)}>
      <div className="job-card-top">
        <span className="priority">P{job.priority}</span>
        <span className={`status ${statusClass(job.status)}`}>{statusLabel(job.status)}</span>
      </div>
      <h3>{job.role}</h3>
      <p className="company">{job.company}</p>
      <div className="job-meta">
        <span>{job.shift}</span>
        <span>{job.pay}</span>
      </div>
      <div className="job-bottom">
        <span className="transport">{job.transport}</span>
        <strong>{job.match}%</strong>
      </div>
    </button>
  );
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>
      <span>{icon}</span><small>{label}</small>
    </button>
  );
}

function ConnectionRow({
  name,
  detail,
  connected,
}: {
  name: string;
  detail: string;
  connected: boolean;
}) {
  return (
    <div className="connection-row">
      <div><b>{name}</b><small>{detail}</small></div>
      <span className={connected ? "safe-chip" : "disconnected"}>
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}

export default App;
