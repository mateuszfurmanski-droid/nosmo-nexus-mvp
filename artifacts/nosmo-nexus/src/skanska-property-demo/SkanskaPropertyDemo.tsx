import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Factory,
  FileText,
  History,
  Layers,
  Leaf,
  Link2,
  MapPin,
  Play,
  Recycle,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  User,
  Wrench,
} from "lucide-react";
import compactNexusLogo from "../spark-demo/NEXUS_Logo_UI_Mark_N.png";
import {
  assets,
  building,
  companies,
  floors,
  materials,
  people,
  propertyPortfolio,
  sourceSystems,
  spaces,
  type Asset,
  type HistoryEvent,
} from "./data";
import "./skanska-property-demo.css";

type DemoTheme = "green" | "gold" | "blue" | "white" | "black";
type DetailTab = "object" | "work" | "circular" | "esg" | "sources";
type WorkStage = "issue" | "task" | "work" | "evidence" | "approved" | "updated" | "reuse" | "esg";

const themeStorageKey = "nosmo.spark.demo.theme.v1";
const themes: Array<{ id: DemoTheme; label: string }> = [
  { id: "green", label: "Eco" },
  { id: "gold", label: "Gold" },
  { id: "blue", label: "Nexus" },
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
];

function loadTheme(): DemoTheme {
  if (typeof window === "undefined") return "green";
  const stored = window.localStorage.getItem(themeStorageKey);
  return themes.some((theme) => theme.id === stored) ? (stored as DemoTheme) : "green";
}

function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}

function joinLabels(ids: string[], lookup: Array<{ id: string; name: string }>) {
  return ids.map((id) => byId(lookup, id)?.name ?? id).join(", ");
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

const workStageOrder: WorkStage[] = ["issue", "task", "work", "evidence", "approved", "updated", "reuse", "esg"];
const workStageLabels: Record<WorkStage, string> = {
  issue: "ISSUE",
  task: "TASK",
  work: "WORK MODE",
  evidence: "EVIDENCE",
  approved: "APPROVAL",
  updated: "ASSET UPDATED",
  reuse: "REUSE",
  esg: "ESG EVIDENCE",
};

function ProvenanceBadge() {
  return <span className="property-demo-badge property-demo-badge-demo">SYNTHETIC DEMO DATA</span>;
}

function SourceBadge({ children }: { children: React.ReactNode }) {
  return <span className="property-demo-badge property-demo-badge-source">{children}</span>;
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="property-demo-kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RelationChip({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick?: () => void }) {
  return (
    <button type="button" className="property-demo-relation-chip" onClick={onClick} disabled={!onClick}>
      <span className="property-demo-relation-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </button>
  );
}

export default function SkanskaPropertyDemo() {
  const [theme, setTheme] = useState<DemoTheme>(loadTheme);
  const [selectedFloorId, setSelectedFloorId] = useState("floor-00");
  const [selectedSpaceId, setSelectedSpaceId] = useState("space-plant");
  const [selectedAssetId, setSelectedAssetId] = useState("asset-ahu-04");
  const [tab, setTab] = useState<DetailTab>("object");
  const [query, setQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [workStage, setWorkStage] = useState<WorkStage>("issue");
  const [checklistDone, setChecklistDone] = useState<boolean[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [completionHistory, setCompletionHistory] = useState<HistoryEvent[]>([]);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const selectedAsset = byId(assets, selectedAssetId) ?? assets[0];
  const selectedFloor = byId(floors, selectedAsset.floorId) ?? floors[0];
  const selectedSpace = byId(spaces, selectedAsset.spaceId) ?? spaces[0];
  const installer = byId(people, selectedAsset.installerPersonId);
  const fmOwner = byId(people, selectedAsset.fmOwnerPersonId);
  const installerCompany = byId(companies, selectedAsset.installerCompanyId);
  const serviceCompany = byId(companies, selectedAsset.serviceCompanyId);
  const selectedMaterials = materials.filter((material) => selectedAsset.materialIds.includes(material.id));
  const selectedPerson = selectedPersonId ? byId(people, selectedPersonId) : null;
  const selectedPersonCompany = selectedPerson ? byId(companies, selectedPerson.companyId) : null;

  const visibleSpaces = spaces.filter((space) => space.floorId === selectedFloorId);
  const visibleAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (asset.spaceId !== selectedSpaceId) return false;
      if (!normalized) return true;
      return [asset.tag, asset.name, asset.category, asset.manufacturer, asset.bimRef].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [query, selectedSpaceId]);

  const workflowAsset = assets[0];
  const workflowIssue = workflowAsset.issue!;
  const workflowComplete = checklistDone.length === workflowIssue.checklist.length && checklistDone.every(Boolean) && evidenceCount >= 2;

  const combinedHistory = useMemo(
    () => [...selectedAsset.history, ...(selectedAsset.id === workflowAsset.id ? completionHistory : [])].sort((a, b) => a.date.localeCompare(b.date)),
    [selectedAsset, completionHistory, workflowAsset.id],
  );

  const aiAnswer = useMemo(() => {
    const last = combinedHistory[combinedHistory.length - 1];
    const issue = selectedAsset.issue;
    const replacement = selectedAsset.replacement;
    return {
      what: `${selectedAsset.tag} · ${selectedAsset.name} · ${selectedAsset.manufacturer} ${selectedAsset.model}`,
      where: `${selectedFloor.level} / ${selectedSpace.code} · ${selectedSpace.name} · BIM ${selectedAsset.bimRef}`,
      who: `${fmOwner?.name ?? "Unknown"} owns FM context; ${installer?.name ?? "Unknown"} / ${installerCompany?.name ?? "Unknown"} installed it; ${serviceCompany?.name ?? "Unknown"} is the service company.`,
      when: `Installed ${formatDate(selectedAsset.installationDate)}. Latest graph event: ${last ? `${formatDate(last.date)} · ${last.title}` : "no event"}. Next service: ${selectedAsset.nextService}.`,
      proof: `${selectedAsset.photos.length} photo records, ${selectedAsset.manuals.length} manuals and ${selectedAsset.certificates.length} certificate / QA records are linked.`,
      next: issue ? issue.instruction : `No active issue in the synthetic demo. Next planned service: ${selectedAsset.nextService}.`,
      circular: replacement ? replacement.reuseOpportunity : `Materials: ${joinLabels(selectedAsset.materialIds, materials)}. No active replacement decision is open for this asset.`,
    };
  }, [combinedHistory, fmOwner?.name, installer?.name, installerCompany?.name, selectedAsset, selectedFloor.level, selectedSpace.code, selectedSpace.name, serviceCompany?.name]);

  function selectFloor(id: string) {
    setSelectedFloorId(id);
    const firstSpace = spaces.find((space) => space.floorId === id);
    if (firstSpace) selectSpace(firstSpace.id);
  }

  function selectSpace(id: string) {
    setSelectedSpaceId(id);
    const firstAsset = assets.find((asset) => asset.spaceId === id);
    if (firstAsset) setSelectedAssetId(firstAsset.id);
    setTab("object");
    setAiOpen(false);
    setSelectedPersonId(null);
  }

  function selectAsset(asset: Asset) {
    setSelectedFloorId(asset.floorId);
    setSelectedSpaceId(asset.spaceId);
    setSelectedAssetId(asset.id);
    setTab("object");
    setAiOpen(false);
    setSelectedPersonId(null);
  }

  function returnToDemoCase() {
    selectAsset(workflowAsset);
    setTab("work");
  }

  function openTask() {
    setWorkStage("task");
    setTab("work");
    setChecklistDone(new Array(workflowIssue.checklist.length).fill(false));
    setEvidenceCount(0);
  }

  function startWork() {
    setWorkStage("work");
  }

  function toggleChecklist(index: number) {
    setChecklistDone((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  function finishWork() {
    if (!workflowComplete) return;
    setWorkStage("evidence");
    setCompletionHistory((current) => [
      ...current.filter((event) => event.id !== "ahu-demo-work-complete"),
      {
        id: "ahu-demo-work-complete",
        date: "2026-08-24",
        type: "MAINTENANCE",
        title: "Field inspection completed",
        detail: "Demo Work Mode checklist completed with required photo evidence; technician recommends fan module replacement.",
        personId: "person-piotr-service",
        companyId: "company-xyz-mech",
      },
    ]);
  }

  function approveEvidence() {
    setWorkStage("approved");
    setCompletionHistory((current) => [
      ...current.filter((event) => event.id !== "ahu-demo-approved"),
      {
        id: "ahu-demo-approved",
        date: "2026-08-24",
        type: "APPROVAL",
        title: "Evidence approved",
        detail: "Facility Manager accepted the synthetic inspection evidence and replacement recommendation.",
        personId: "person-anna-fm",
        companyId: "company-skanska-property",
      },
    ]);
  }

  function updateAssetHistory() {
    setWorkStage("updated");
    setCompletionHistory((current) => [
      ...current.filter((event) => event.id !== "ahu-demo-history-updated"),
      {
        id: "ahu-demo-history-updated",
        date: "2026-08-24",
        type: "REPLACEMENT",
        title: "Replacement planning opened",
        detail: "Object Card and Building Graph updated with approved replacement planning event.",
        personId: "person-anna-fm",
        companyId: "company-skanska-property",
      },
    ]);
  }

  function openReuse() {
    setWorkStage("reuse");
    setTab("circular");
  }

  function createEsgEvidence() {
    setWorkStage("esg");
    setTab("esg");
    setCompletionHistory((current) => [
      ...current.filter((event) => event.id !== "ahu-demo-reuse-record"),
      {
        id: "ahu-demo-reuse-record",
        date: "2026-08-24",
        type: "REUSE",
        title: "Circular resource route recorded",
        detail: "Reusable / recoverable material routes and cross-project opportunity recorded as synthetic ESG evidence.",
        personId: "person-anna-fm",
        companyId: "company-skanska-property",
      },
    ]);
  }

  function resetWorkflow() {
    setWorkStage("issue");
    setChecklistDone([]);
    setEvidenceCount(0);
    setCompletionHistory([]);
    returnToDemoCase();
  }

  return (
    <main className="property-demo" data-theme={theme}>
      <header className="property-demo-header">
        <div className="property-demo-brand">
          <img src={compactNexusLogo} alt="Nexus" />
          <div>
            <strong>SKANSKA PROPERTY OPERATIONS DEMO</strong>
            <span>Construction + Building Operating Layer</span>
          </div>
        </div>
        <div className="property-demo-header-actions">
          <ProvenanceBadge />
          <div className="property-demo-theme-picker" aria-label="Nexus skin selector">
            {themes.map((item) => (
              <button key={item.id} type="button" className={theme === item.id ? "active" : ""} onClick={() => setTheme(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="property-demo-intro">
        <div>
          <p className="property-demo-eyebrow">ONE PROJECT / BUILDING GRAPH</p>
          <h1>Everything SKANSKA knows about this physical object.</h1>
          <p>
            One operational graph connects the building, BIM identity, asset, material, people, work, evidence, maintenance and circular outcome.
            Existing systems stay the source of record where appropriate; Nexus connects the context and action.
          </p>
        </div>
        <button type="button" className="property-demo-ai-cta" onClick={() => setAiOpen(true)}>
          <Bot />
          <span><small>Stop Searching. Start Asking.</small>What do we know about this asset?</span>
        </button>
      </section>

      <section className="property-demo-path" aria-label="Selected graph path">
        <span><Building2 /> {propertyPortfolio.name}</span><ArrowRight />
        <span>{building.name}</span><ArrowRight />
        <span>{selectedFloor.level}</span><ArrowRight />
        <span>{selectedSpace.code}</span><ArrowRight />
        <strong>{selectedAsset.tag}</strong>
      </section>

      {aiOpen && (
        <section className="property-demo-ai" data-testid="nexus-ai-answer">
          <div className="property-demo-panel-title">
            <span><Bot /> NEXUS AI · GRAPH ANSWER</span>
            <button type="button" onClick={() => setAiOpen(false)}>Close</button>
          </div>
          <div className="property-demo-ai-grid">
            <KeyValue label="WHAT" value={aiAnswer.what} />
            <KeyValue label="WHERE" value={aiAnswer.where} />
            <KeyValue label="WHO" value={aiAnswer.who} />
            <KeyValue label="WHEN" value={aiAnswer.when} />
            <KeyValue label="PROOF" value={aiAnswer.proof} />
            <KeyValue label="NEXT" value={aiAnswer.next} />
            <KeyValue label="REUSE / CIRCULAR" value={aiAnswer.circular} />
          </div>
          <p className="property-demo-note">Deterministic demo answer assembled from the visible synthetic Project Graph. No external LLM or live SKANSKA data is claimed.</p>
        </section>
      )}

      <section className="property-demo-layout">
        <div className="property-demo-graph-panel">
          <div className="property-demo-panel-title">
            <span><Link2 /> RELATIONSHIP TREE / BUILDING GRAPH</span>
            <SourceBadge>Graph-centred</SourceBadge>
          </div>

          <div className="property-demo-graph-root">
            <div className="property-demo-root-node"><Building2 /><strong>{building.name}</strong><small>{building.status}</small></div>
          </div>

          <div className="property-demo-graph-section">
            <label><Layers /> FLOORS</label>
            <div className="property-demo-node-row">
              {floors.map((floor) => (
                <button key={floor.id} type="button" className={selectedFloorId === floor.id ? "active" : ""} onClick={() => selectFloor(floor.id)}>
                  <strong>{floor.level}</strong><small>{floor.name}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="property-demo-graph-section">
            <label><MapPin /> SPACES</label>
            <div className="property-demo-node-row">
              {visibleSpaces.map((space) => (
                <button key={space.id} type="button" className={selectedSpaceId === space.id ? "active" : ""} onClick={() => selectSpace(space.id)}>
                  <strong>{space.code}</strong><small>{space.name}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="property-demo-search">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets in selected space" aria-label="Search assets in selected space" />
          </div>

          <div className="property-demo-graph-section">
            <label><Boxes /> ASSETS</label>
            <div className="property-demo-node-row property-demo-assets-row">
              {visibleAssets.length > 0 ? visibleAssets.map((asset) => (
                <button key={asset.id} type="button" className={selectedAssetId === asset.id ? "active" : ""} onClick={() => selectAsset(asset)}>
                  {asset.issue && <AlertTriangle className="property-demo-alert-icon" />}
                  <strong>{asset.tag}</strong><small>{asset.name}</small>
                </button>
              )) : <p className="property-demo-empty">No matching asset in this space.</p>}
            </div>
          </div>

          <div className="property-demo-relations">
            <RelationChip icon={<Recycle />} label="MATERIAL" value={`${selectedMaterials.length} linked`} onClick={() => setTab("circular")} />
            <RelationChip icon={<User />} label="PERSON" value={fmOwner?.name ?? "Unknown"} onClick={() => setSelectedPersonId(selectedAsset.fmOwnerPersonId)} />
            <RelationChip icon={<Factory />} label="COMPANY" value={serviceCompany?.name ?? "Unknown"} />
            <RelationChip icon={<Wrench />} label="TASK" value={selectedAsset.issue ? "1 active" : "No active task"} onClick={selectedAsset.issue ? () => setTab("work") : undefined} />
            <RelationChip icon={<ClipboardCheck />} label="INSPECTION" value={`${combinedHistory.filter((event) => event.type === "INSPECTION").length} events`} />
            <RelationChip icon={<FileText />} label="DOCUMENT" value={`${selectedAsset.manuals.length + selectedAsset.certificates.length} linked`} />
            <RelationChip icon={<Camera />} label="PHOTO" value={`${selectedAsset.photos.length} records`} />
            <RelationChip icon={<History />} label="MAINTENANCE" value={`${combinedHistory.filter((event) => event.type === "MAINTENANCE").length} events`} />
            <RelationChip icon={<Leaf />} label="REPLACEMENT / REUSE" value={selectedAsset.replacement ? "Open case" : "No open case"} onClick={selectedAsset.replacement ? () => setTab("circular") : undefined} />
          </div>

          <div className="property-demo-mini-stats">
            <span><strong>1</strong> building</span>
            <span><strong>{floors.length}</strong> floors</span>
            <span><strong>{spaces.length}</strong> spaces</span>
            <span><strong>{assets.length}</strong> assets</span>
            <span><strong>{companies.length}</strong> companies</span>
            <span><strong>{people.length}</strong> people</span>
          </div>
        </div>

        <div className="property-demo-detail-panel">
          <nav className="property-demo-tabs" aria-label="Commercial demo detail views">
            {(["object", "work", "circular", "esg", "sources"] as DetailTab[]).map((item) => (
              <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "object" ? "OBJECT CARD" : item.toUpperCase()}</button>
            ))}
          </nav>

          {tab === "object" && (
            <div className="property-demo-object-card" data-testid="commercial-object-card">
              <div className="property-demo-object-heading">
                <div>
                  <span>{selectedAsset.category}</span>
                  <h2>{selectedAsset.tag} · {selectedAsset.name}</h2>
                  <p>{selectedAsset.condition}</p>
                </div>
                <ProvenanceBadge />
              </div>

              <div className="property-demo-card-grid">
                <KeyValue label="Exact location" value={`${selectedFloor.level} · ${selectedSpace.code} · ${selectedSpace.name}`} />
                <KeyValue label="BIM / object reference" value={selectedAsset.bimRef} />
                <KeyValue label="Manufacturer / model" value={`${selectedAsset.manufacturer} · ${selectedAsset.model}`} />
                <KeyValue label="Serial number" value={selectedAsset.serialNumber} />
                <KeyValue label="Installed" value={formatDate(selectedAsset.installationDate)} />
                <KeyValue label="Installer" value={`${installer?.name ?? "Unknown"} · ${installerCompany?.name ?? "Unknown"}`} />
                <KeyValue label="Current FM owner" value={fmOwner?.name ?? "Unknown"} />
                <KeyValue label="Service company" value={serviceCompany?.name ?? "Unknown"} />
                <KeyValue label="Warranty" value={selectedAsset.warranty} />
                <KeyValue label="Upcoming service" value={selectedAsset.nextService} />
                <KeyValue label="Material / composition" value={selectedMaterials.map((material) => `${material.name}: ${material.composition}`).join(" · ")} />
                <KeyValue label="Reuse potential" value={selectedMaterials.map((material) => `${material.name} ${material.reusePotential}`).join(" · ")} />
              </div>

              <div className="property-demo-evidence-grid">
                <div><FileText /><strong>Manuals</strong>{selectedAsset.manuals.map((item) => <span key={item}>{item}</span>)}</div>
                <div><ShieldCheck /><strong>Certificates / QA</strong>{selectedAsset.certificates.map((item) => <span key={item}>{item}</span>)}</div>
                <div><Camera /><strong>Photos</strong>{selectedAsset.photos.map((item) => <span key={item}>{item}</span>)}</div>
              </div>

              <div className="property-demo-history">
                <h3>Asset history</h3>
                {combinedHistory.map((event) => (
                  <div key={event.id} className="property-demo-history-event">
                    <time>{formatDate(event.date)}</time>
                    <span className={`property-demo-event-type property-demo-event-${event.type.toLowerCase()}`}>{event.type}</span>
                    <div><strong>{event.title}</strong><p>{event.detail}</p></div>
                  </div>
                ))}
              </div>

              {selectedAsset.issue ? (
                <button type="button" className="property-demo-primary" onClick={() => setTab("work")}>
                  <AlertTriangle /> Active issue · open work flow <ArrowRight />
                </button>
              ) : (
                <div className="property-demo-good"><CheckCircle2 /> No active issue in this synthetic asset record.</div>
              )}
            </div>
          )}

          {tab === "work" && (
            <div className="property-demo-work" data-testid="asset-workflow">
              {selectedAsset.id !== workflowAsset.id ? (
                <div className="property-demo-empty-state">
                  <CheckCircle2 />
                  <h2>No active maintenance issue on {selectedAsset.tag}</h2>
                  <p>The full executable demo case is attached to AHU-04 so the story remains one coherent workflow rather than eight unrelated mock tasks.</p>
                  <button type="button" className="property-demo-primary" onClick={returnToDemoCase}>Open AHU-04 demo case <ArrowRight /></button>
                </div>
              ) : (
                <>
                  <div className="property-demo-work-progress">
                    {workStageOrder.map((stage) => {
                      const currentIndex = workStageOrder.indexOf(workStage);
                      const itemIndex = workStageOrder.indexOf(stage);
                      return <span key={stage} className={stage === workStage ? "active" : itemIndex < currentIndex ? "done" : ""}>{itemIndex < currentIndex ? <CheckCircle2 /> : null}{workStageLabels[stage]}</span>;
                    })}
                  </div>

                  <div className="property-demo-issue-card">
                    <AlertTriangle />
                    <div><small>ACTIVE ISSUE · HIGH</small><h2>{workflowIssue.title}</h2><p>{workflowIssue.instruction}</p></div>
                  </div>

                  {workStage === "issue" && (
                    <div className="property-demo-step-card">
                      <h3>Facility Manager · NEXT</h3>
                      <p>Create one task already bound to AHU-04, its exact room, responsible service company and required proof.</p>
                      <KeyValue label="Assignee" value="Piotr Nowak · Service Technician · XYZ Mechanical Demo Ltd" />
                      <KeyValue label="Location" value="L00-MEP-01 · Mechanical Plant Room" />
                      <button type="button" className="property-demo-primary" onClick={openTask}>Create task <ArrowRight /></button>
                    </div>
                  )}

                  {workStage === "task" && (
                    <div className="property-demo-step-card">
                      <h3>Task ready for Nexus Work Mode</h3>
                      <p>The worker receives only the bounded operational context required to perform this job.</p>
                      <div className="property-demo-worker-context">
                        <KeyValue label="PLACE" value="L00-MEP-01 · Mechanical Plant Room" />
                        <KeyValue label="ASSET" value="AHU-04 · Air Handling Unit 04" />
                        <KeyValue label="PROBLEM" value={workflowIssue.title} />
                        <KeyValue label="INSTRUCTION" value={workflowIssue.instruction} />
                      </div>
                      <button type="button" className="property-demo-primary" onClick={startWork}><Play /> Open Work Mode</button>
                    </div>
                  )}

                  {workStage === "work" && (
                    <div className="property-demo-work-mode">
                      <div className="property-demo-work-mode-header"><Wrench /><div><small>NEXUS WORK MODE</small><h2>AHU-04 inspection</h2><p>L00-MEP-01 · Mechanical Plant Room</p></div></div>
                      <div className="property-demo-checklist">
                        {workflowIssue.checklist.map((item, index) => (
                          <label key={item} className={checklistDone[index] ? "done" : ""}>
                            <input type="checkbox" checked={Boolean(checklistDone[index])} onChange={() => toggleChecklist(index)} />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                      <div className="property-demo-photo-actions">
                        <button type="button" onClick={() => setEvidenceCount((count) => Math.min(2, count + 1))}><Camera /> Capture demo photo</button>
                        <span>{evidenceCount}/2 required photos recorded</span>
                      </div>
                      <div className="property-demo-required-evidence">
                        {workflowIssue.requiredEvidence.map((item) => <span key={item}><CheckCircle2 /> {item}</span>)}
                      </div>
                      <button type="button" className="property-demo-primary" disabled={!workflowComplete} onClick={finishWork}><Upload /> Finish · send evidence to Object Card</button>
                      {!workflowComplete && <p className="property-demo-note">Finish unlocks after all checklist items and two required demo photos are recorded.</p>}
                    </div>
                  )}

                  {workStage === "evidence" && (
                    <div className="property-demo-step-card">
                      <h3>Evidence returned to Project Graph</h3>
                      <div className="property-demo-good"><CheckCircle2 /> 5/5 checklist items · 2/2 required photos · technician completion record</div>
                      <p>Recommendation: replace the affected fan module; retain the AHU casing, coils and reusable assemblies.</p>
                      <button type="button" className="property-demo-primary" onClick={approveEvidence}><ShieldCheck /> Approve evidence</button>
                    </div>
                  )}

                  {workStage === "approved" && (
                    <div className="property-demo-step-card">
                      <h3>Human approval recorded</h3>
                      <p>Approval is attached to the same asset identity; it does not overwrite BIM or the original maintenance source.</p>
                      <button type="button" className="property-demo-primary" onClick={updateAssetHistory}><Database /> Update Object Card + Building Graph</button>
                    </div>
                  )}

                  {workStage === "updated" && (
                    <div className="property-demo-step-card">
                      <h3>Asset history updated</h3>
                      <div className="property-demo-good"><CheckCircle2 /> Object Card now contains the completed work, evidence, approval and replacement planning event.</div>
                      <button type="button" className="property-demo-primary" onClick={openReuse}><Recycle /> Open replacement / reuse decision</button>
                    </div>
                  )}

                  {(workStage === "reuse" || workStage === "esg") && (
                    <div className="property-demo-step-card">
                      <h3>{workStage === "esg" ? "Circular route completed" : "Replacement / reuse decision is open"}</h3>
                      <button type="button" className="property-demo-primary" onClick={() => setTab(workStage === "esg" ? "esg" : "circular")}>Continue in {workStage === "esg" ? "ESG evidence" : "Circularity"} <ArrowRight /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "circular" && (
            <div className="property-demo-circular" data-testid="circular-resource-record">
              {!selectedAsset.replacement ? (
                <div className="property-demo-empty-state"><Recycle /><h2>No active replacement case</h2><p>{selectedAsset.tag} still exposes its material composition and recovery route, but the coherent executable replacement story is attached to AHU-04.</p><button type="button" className="property-demo-primary" onClick={returnToDemoCase}>Open AHU-04 replacement case <ArrowRight /></button></div>
              ) : (
                <>
                  <div className="property-demo-object-heading"><div><span>CIRCULAR RESOURCE RECORD</span><h2>{selectedAsset.tag} · Replacement / reuse</h2><p>{selectedAsset.replacement.reason}</p></div><ProvenanceBadge /></div>
                  <div className="property-demo-card-grid">
                    <KeyValue label="Replacement option" value={selectedAsset.replacement.replacementOption} />
                    <KeyValue label="Existing composition" value={selectedMaterials.map((item) => `${item.name} · ${item.composition}`).join(" | ")} />
                    <KeyValue label="Retained in building" value={selectedAsset.replacement.retainedMaterials.join(" · ")} />
                    <KeyValue label="Recycling route" value={selectedAsset.replacement.recyclingRoute} />
                    <KeyValue label="CO₂ / LCA boundary" value={selectedAsset.replacement.co2Statement} />
                  </div>
                  <div className="property-demo-reuse-opportunity"><Recycle /><div><small>REUSE ELSEWHERE · SYNTHETIC MATCH</small><h3>Cross-project opportunity</h3><p>{selectedAsset.replacement.reuseOpportunity}</p></div></div>
                  <div className="property-demo-material-list">
                    {selectedMaterials.map((material) => <div key={material.id}><strong>{material.name}</strong><span>{material.composition}</span><span>Reuse potential · {material.reusePotential}</span><span>{material.recoveryRoute}</span></div>)}
                  </div>
                  {workStage === "updated" ? <button type="button" className="property-demo-primary" onClick={openReuse}><Recycle /> Record circular decision</button> : workStage === "reuse" ? <button type="button" className="property-demo-primary" onClick={createEsgEvidence}><Leaf /> Confirm route + create ESG evidence</button> : <div className="property-demo-good"><CheckCircle2 /> Circular resource record attached to the asset history.</div>}
                </>
              )}
            </div>
          )}

          {tab === "esg" && (
            <div className="property-demo-esg" data-testid="esg-evidence">
              <div className="property-demo-object-heading"><div><span>ESG / CIRCULARITY EVIDENCE</span><h2>Asset-level evidence, not a disconnected report</h2><p>The ESG record is generated from the same physical-object history and retains source / provenance boundaries.</p></div><Leaf /></div>
              {workStage === "esg" ? (
                <>
                  <div className="property-demo-esg-grid">
                    <div><CheckCircle2 /><strong>Inspection evidence</strong><span>Checklist + 2 demo photos + technician completion</span></div>
                    <div><CheckCircle2 /><strong>Human approval</strong><span>Facility Manager approval linked to AHU-04</span></div>
                    <div><CheckCircle2 /><strong>Material record</strong><span>{joinLabels(workflowAsset.materialIds, materials)}</span></div>
                    <div><CheckCircle2 /><strong>Reuse opportunity</strong><span>Cross-project compatibility match recorded as synthetic demo data</span></div>
                    <div><ShieldCheck /><strong>Carbon integrity</strong><span>No fabricated kgCO₂e. Quantification remains blocked until verified EPD/LCA factors are connected.</span></div>
                    <div><Database /><strong>Graph outcome</strong><span>Asset history + circular resource route + ESG evidence share one Nexus object identity.</span></div>
                  </div>
                  <div className="property-demo-good property-demo-finale"><Leaf /> Building Graph updated: maintenance action, approval, replacement / reuse route and ESG evidence are now connected.</div>
                  <button type="button" className="property-demo-secondary" onClick={resetWorkflow}><RotateCcw /> Reset demo workflow</button>
                </>
              ) : (
                <div className="property-demo-empty-state"><Leaf /><h2>Complete the AHU-04 workflow first</h2><p>ESG evidence is the outcome of approved operational work and a circular decision, not a standalone decorative dashboard.</p><button type="button" className="property-demo-primary" onClick={returnToDemoCase}>Continue AHU-04 workflow <ArrowRight /></button></div>
              )}
            </div>
          )}

          {tab === "sources" && (
            <div className="property-demo-sources" data-testid="source-systems">
              <div className="property-demo-object-heading"><div><span>OPERATIONAL INTELLIGENCE LAYER</span><h2>Existing systems remain sources. Nexus connects them.</h2><p>This demo does not claim that Nexus replaces BIM, CAFM, document storage or specialist tools.</p></div><Database /></div>
              <div className="property-demo-source-stack">
                {sourceSystems.map((source) => <div key={source.id}><Database /><span><strong>{source.name}</strong><small>{source.role}</small></span><SourceBadge>{source.status}</SourceBadge></div>)}
              </div>
              <div className="property-demo-source-arrow"><ArrowRight /></div>
              <div className="property-demo-nexus-graph-box"><img src={compactNexusLogo} alt="Nexus" /><span><strong>NOSMO NEXUS PROJECT / BUILDING GRAPH</strong><small>Identity · relationships · context · action · evidence · history</small></span></div>
            </div>
          )}
        </div>
      </section>

      {selectedPerson && (
        <aside className="property-demo-person-card" data-testid="person-relation-card">
          <button type="button" onClick={() => setSelectedPersonId(null)}>Close</button>
          <User />
          <small>PERSON RELATION · EXISTING PERSON CARD BOUNDARY</small>
          <h3>{selectedPerson.name}</h3>
          <p>{selectedPerson.role}</p>
          <strong>{selectedPersonCompany?.name}</strong>
          <span>Related to {selectedAsset.tag} through the Building Graph. Full Person Card UI remains the protected Nexus component; this panel only proves the asset-to-person relation in this isolated demo.</span>
        </aside>
      )}

      <footer className="property-demo-footer">
        <span><ShieldCheck /> SYNTHETIC DEMO · no real SKANSKA Property asset, worker or project data</span>
        <span><Database /> BIM / CAFM / storage remain source systems · Nexus provides the relationship and operational intelligence layer</span>
      </footer>
    </main>
  );
}
