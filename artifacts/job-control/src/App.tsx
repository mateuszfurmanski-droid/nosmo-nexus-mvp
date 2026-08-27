import { useEffect, useMemo, useState } from "react";

type Screen = "home" | "jobs" | "apply" | "replies" | "cvs" | "settings";
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

const summary = {
  active: 47,
  applied: 18,
  contacted: 61,
  interviews: 0,
  forms: 6,
  replies: 0,
};

const statusClass = (status: JobStatus) =>
  status.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");

const inferCategory = (text: string): Category => {
  const t = text.toLowerCase();
  if (/clean|housekeep|room attendant|janitor/.test(t)) return "CLEANING";
  if (/warehouse|despatch|dispatch|picker|packer|stock|replenish/.test(t)) return "WAREHOUSE";
  if (/factory|production|manufactur|line operative|machine/.test(t)) return "FACTORY / PRODUCTION";
  if (/bar staff|bartender|pub|barmaid/.test(t)) return "BAR STAFF";
  if (/barista|cafe|coffee|breakfast|sandwich/.test(t)) return "CAFE / BREAKFAST";
  if (/kitchen|catering|food service|kitchen porter/.test(t)) return "KITCHEN / CATERING";
  if (/hotel|housekeeping|laundry|room/.test(t)) return "HOTEL / HOUSEKEEPING";
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
    "Tell me: fit score, risks, which CV points to emphasise, and a short tailored cover message.",
  ].join("\n");

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [filter, setFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<Job>(seedJobs[0]);
  const [importText, setImportText] = useState("");
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState({
    location: "Bradford BD2",
    start: "01/09/2026",
    transport: "Bus / public transport",
    availability: "Short mornings or nights; daytime around 3 days/week",
  });

  useEffect(() => {
    const raw = localStorage.getItem("job-control-demo");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { jobs?: Job[]; profile?: typeof profile };
      if (parsed.jobs) setJobs(parsed.jobs);
      if (parsed.profile) setProfile(parsed.profile);
    } catch {
      // Ignore malformed local demo state.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("job-control-demo", JSON.stringify({ jobs, profile }));
  }, [jobs, profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredJobs = useMemo(() => {
    if (filter === "All") return jobs;
    if (filter === "Morning") return jobs.filter((j) => /07:|08:|09:|morning/i.test(j.shift));
    if (filter === "Night") return jobs.filter((j) => /night|18:00|22:00/i.test(j.shift));
    if (filter === "Priority A") return jobs.filter((j) => j.priority === "A");
    return jobs.filter((j) => j.status === filter);
  }, [filter, jobs]);

  const markStatus = (id: string, status: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    setSelectedJob((prev) => (prev.id === id ? { ...prev, status } : prev));
    setToast(`Status changed to ${status}`);
  };

  const openJob = (job: Job) => {
    setSelectedJob(job);
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
    };
    setJobs((prev) => [job, ...prev]);
    setSelectedJob(job);
    setImportText("");
    setToast(`${cvMap[category].code} selected`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">JOANNA BACH · JOB SEARCH</div>
          <h1>Job Control</h1>
        </div>
        <div className="mode-chip"><span className="dot" /> Demo mode</div>
      </header>

      <main className="content">
        {screen === "home" && (
          <>
            <section className="hero">
              <div>
                <span className="hero-kicker">Ready to work</span>
                <h2>Everything in one place.</h2>
                <p>No Sheets. No searching for the right CV. Review, apply and track from the phone.</p>
              </div>
              <button className="primary hero-action" onClick={() => setScreen("apply")}>+ New job</button>
            </section>

            <section className="stat-grid">
              {[
                ["Active", summary.active],
                ["Applied", summary.applied],
                ["Employers", summary.contacted],
                ["Interviews", summary.interviews],
                ["Forms", summary.forms],
                ["Replies", summary.replies],
              ].map(([label, value]) => (
                <button key={String(label)} className="stat-card" onClick={() => setScreen(label === "Forms" ? "jobs" : "jobs")}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </button>
              ))}
            </section>

            <section className="section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">NEXT ACTION</span>
                  <h3>Best opportunities</h3>
                </div>
                <button className="text-button" onClick={() => setScreen("jobs")}>See all</button>
              </div>
              <div className="job-list">
                {jobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} onOpen={openJob} />)}
              </div>
            </section>

            <section className="quick-grid">
              <button className="quick" onClick={() => setScreen("apply")}>
                <span>＋</span><div><b>Import job</b><small>Paste or share an advert</small></div>
              </button>
              <button className="quick" onClick={() => askChatGPT(selectedJob)}>
                <span>AI</span><div><b>Ask ChatGPT</b><small>Prepared job context</small></div>
              </button>
              <button className="quick" onClick={() => setScreen("replies")}>
                <span>↩</span><div><b>Replies</b><small>Job messages only</small></div>
              </button>
              <button className="quick" onClick={() => setScreen("cvs")}>
                <span>CV</span><div><b>My CVs</b><small>7 automatic profiles</small></div>
              </button>
            </section>
          </>
        )}

        {screen === "jobs" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">PIPELINE</span><h2>Jobs</h2></div>
              <button className="primary small" onClick={() => setScreen("apply")}>+ Add</button>
            </div>
            <div className="filters">
              {["All", "Morning", "Night", "Priority A", "APPLIED", "FORM REQUIRED", "WATCH"].map((f) => (
                <button key={f} className={filter === f ? "filter active" : "filter"} onClick={() => setFilter(f)}>{f}</button>
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
              <div><span className="eyebrow">SMART APPLY</span><h2>Review application</h2></div>
              <span className="safe-chip">Review first</span>
            </div>

            <div className="import-card">
              <label htmlFor="jobImport">Paste job URL or description</label>
              <textarea
                id="jobImport"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste an Indeed link, job title or advert text…"
              />
              <button className="secondary" onClick={importJob}>Analyse & choose CV</button>
            </div>

            <div className="apply-card">
              <div className="apply-top">
                <div>
                  <span className="priority">Priority {selectedJob.priority}</span>
                  <h3>{selectedJob.role}</h3>
                  <p>{selectedJob.company}</p>
                </div>
                <div className="score">{selectedJob.match}%<small>match</small></div>
              </div>

              <div className="info-row"><span>Shift</span><b>{selectedJob.shift}</b></div>
              <div className="info-row"><span>Transport</span><b>{selectedJob.transport}</b></div>
              <div className="info-row"><span>Status</span><b className={`status ${statusClass(selectedJob.status)}`}>{selectedJob.status}</b></div>

              <div className="cv-choice">
                <div className="cv-badge">{cvMap[selectedJob.category].code}</div>
                <div>
                  <b>{cvMap[selectedJob.category].label}</b>
                  <p>{cvMap[selectedJob.category].reason}</p>
                </div>
              </div>

              <div className="truth-box">
                <b>Verified facts only</b>
                <p>{profile.location} · starts {profile.start} · {profile.transport}</p>
                <p>{profile.availability}</p>
              </div>

              <div className="cover-preview">
                <span className="eyebrow">COVER MESSAGE PREVIEW</span>
                <p>
                  Dear Hiring Team, I am interested in the {selectedJob.role} role at {selectedJob.company}. I am based in Bradford BD2,
                  available from 1 September 2026 and particularly interested in shifts that match my morning/night availability.
                  Please find my relevant CV attached.
                </p>
              </div>

              <div className="action-stack">
                <button className="primary" onClick={() => setToast("Google connection required before sending.")}>Review & send</button>
                <button className="secondary" onClick={() => askChatGPT(selectedJob)}>Ask ChatGPT about this job</button>
                {selectedJob.status !== "APPLIED" && (
                  <button className="ghost" onClick={() => markStatus(selectedJob.id, "APPLIED")}>
                    Mark applied manually
                  </button>
                )}
              </div>
              <p className="disclaimer">The app never marks a job applied after a failed or unconfirmed send. Manual status changes are logged locally in demo mode.</p>
            </div>
          </section>
        )}

        {screen === "replies" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">INBOX FILTER</span><h2>Replies</h2></div>
              <span className="mode-chip"><span className="dot muted" /> Gmail not connected</span>
            </div>
            <div className="empty-state">
              <div className="empty-icon">↩</div>
              <h3>No job replies loaded</h3>
              <p>When Gmail is connected, only recruitment-related replies will appear here — not Joanna’s full inbox.</p>
              <button className="secondary" onClick={() => setScreen("settings")}>Connection settings</button>
            </div>
          </section>
        )}

        {screen === "cvs" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">AUTO MATCH</span><h2>CV profiles</h2></div>
              <span className="safe-chip">7 ready</span>
            </div>
            <div className="cv-grid">
              {(Object.entries(cvMap) as [Category, (typeof cvMap)[Category]][]).map(([category, cv]) => (
                <div className="cv-card" key={category}>
                  <div className="cv-badge large">{cv.code}</div>
                  <div className="cv-card-text">
                    <h3>{cv.label}</h3>
                    <p>{cv.reason}</p>
                    <small>Stored in Google Drive · live link after connection</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === "settings" && (
          <section className="section page">
            <div className="section-head">
              <div><span className="eyebrow">PROFILE & CONNECTIONS</span><h2>Settings</h2></div>
            </div>

            <div className="settings-card">
              <h3>Verified profile facts</h3>
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
              <p className="disclaimer">AI is not allowed to silently modify these facts.</p>
            </div>

            <div className="settings-card">
              <h3>Integrations</h3>
              <ConnectionRow name="Google Sheets" detail="Job database" />
              <ConnectionRow name="Google Drive" detail="7 CV files" />
              <ConnectionRow name="Gmail" detail="hello@nosmo.tech sender" />
              <ConnectionRow name="AI" detail="Optional in-app assistant" />
              <div className="integration-note">
                Live mode will use a server-side adapter. No Google or AI secret is stored in the browser.
              </div>
            </div>

            <div className="settings-card">
              <h3>Data rules</h3>
              <ul className="rules">
                <li>Never invent experience, certificates or licences.</li>
                <li>Never send before Joanna reviews the application.</li>
                <li>Never mark APPLIED unless send/submit is confirmed.</li>
                <li>Keep the job database as the source of truth after live sync.</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <NavButton active={screen === "home"} label="Home" icon="⌂" onClick={() => setScreen("home")} />
        <NavButton active={screen === "jobs"} label="Jobs" icon="▤" onClick={() => setScreen("jobs")} />
        <NavButton active={screen === "apply"} label="Apply" icon="＋" onClick={() => setScreen("apply")} />
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
        <span className={`status ${statusClass(job.status)}`}>{job.status}</span>
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

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>
      <span>{icon}</span><small>{label}</small>
    </button>
  );
}

function ConnectionRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="connection-row">
      <div><b>{name}</b><small>{detail}</small></div>
      <span className="disconnected">Not connected</span>
    </div>
  );
}

export default App;
