import { useEffect, useMemo, useState } from "react";
import {
  demoAssets,
  demoProject,
  demoZones,
  type CircularStatus,
  type DemoAsset,
  type Provenance,
} from "./data";
import "./spark-demo.css";

const circularStatuses: CircularStatus[] = ["IN USE", "REUSABLE", "RECOVER", "RECYCLE", "WASTE", "UNKNOWN"];
const objectProfiles = ["MATERIAL", "PRODUCT", "ASSET", "COMPONENT", "EQUIPMENT"] as const;
type ObjectProfile = (typeof objectProfiles)[number];

const decisionStorageKey = "nosmo.spark.demo.circular-decisions.v1";
const recordEditStorageKey = "nosmo.spark.demo.record-edits.v1";
const createdObjectStorageKey = "nosmo.spark.demo.created-objects.v1";

type DecisionAuditEntry = {
  id: string;
  assetId: string;
  at: string;
  actor: string;
  previousStatus: CircularStatus;
  status: CircularStatus;
  rationale: string;
};

type RecordEditChanges = Partial<Pick<DemoAsset, "location" | "lifecycleStatus" | "lastInspection" | "sourceDocument">>;

type RecordEditAuditEntry = {
  id: string;
  assetId: string;
  at: string;
  actor: string;
  note: string;
  changes: RecordEditChanges;
};

type CreatedObjectEntry = {
  id: string;
  at: string;
  actor: string;
  profile: ObjectProfile;
  asset: DemoAsset;
};

const statusClass: Record<CircularStatus, string> = {
  "IN USE": "spark-status-in-use",
  REUSABLE: "spark-status-reusable",
  RECOVER: "spark-status-recover",
  RECYCLE: "spark-status-recycle",
  WASTE: "spark-status-waste",
  UNKNOWN: "spark-status-unknown",
};

function loadArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function StatusBadge({ value }: { value: CircularStatus }) {
  return <span className={`spark-badge ${statusClass[value]}`}>{value}</span>;
}

function ProvenanceBadge({ value }: { value: Provenance }) {
  return <span className="spark-badge spark-provenance-badge">{value}</span>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="spark-summary-item"><strong>{value}</strong><span>{label}</span></div>;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function buildReportCsv(
  assets: DemoAsset[],
  decisions: DecisionAuditEntry[],
  edits: RecordEditAuditEntry[],
  created: CreatedObjectEntry[],
) {
  const rows: string[][] = [
    ["NEXUS Spark Demo Core — Circular / Environmental Report"],
    ["Generated", new Date().toISOString()],
    ["Project", demoProject.name],
    ["Data boundary", "SYNTHETIC DEMO — no real SKANSKA project data"],
    ["CO2 boundary", "UNKNOWN unless verified quantity and source data exist"],
    [],
    ["SUMMARY"],
    ["Tracked records", String(assets.length)],
    ["Browser-local created objects", String(created.length)],
    ["Reusable", String(assets.filter((asset) => asset.circularStatus === "REUSABLE").length)],
    ["Recover", String(assets.filter((asset) => asset.circularStatus === "RECOVER").length)],
    ["Recycle", String(assets.filter((asset) => asset.circularStatus === "RECYCLE").length)],
    ["Waste", String(assets.filter((asset) => asset.circularStatus === "WASTE").length)],
    ["Unknown circular status", String(assets.filter((asset) => asset.circularStatus === "UNKNOWN").length)],
    ["Known provenance", String(assets.filter((asset) => asset.provenance !== "UNKNOWN").length)],
    ["Unknown provenance", String(assets.filter((asset) => asset.provenance === "UNKNOWN").length)],
    ["High maintenance attention", String(assets.filter((asset) => asset.maintenanceAttention === "HIGH").length)],
    ["Human decision audit events", String(decisions.length)],
    ["Record edit audit events", String(edits.length)],
    [],
    ["OBJECT REGISTER"],
    ["ID", "Object", "Area", "Location", "Type", "Circular", "Provenance", "Attention", "Last inspection", "Source document", "CO2"],
    ...assets.map((asset) => [
      asset.id,
      asset.name,
      demoZones.find((zone) => zone.id === asset.zoneId)?.name ?? "Unknown area",
      asset.location,
      asset.type,
      asset.circularStatus,
      asset.provenance,
      asset.maintenanceAttention,
      asset.lastInspection,
      asset.sourceDocument,
      asset.co2Data,
    ]),
    [],
    ["OBJECT CREATION AUDIT"],
    ["Timestamp", "Object ID", "Profile", "Actor"],
    ...created.map((entry) => [entry.at, entry.asset.id, entry.profile, entry.actor]),
    [],
    ["HUMAN DECISION AUDIT"],
    ["Timestamp", "Object ID", "Actor", "Previous", "New", "Rationale"],
    ...decisions.map((entry) => [entry.at, entry.assetId, entry.actor, entry.previousStatus, entry.status, entry.rationale]),
    [],
    ["RECORD EDIT AUDIT"],
    ["Timestamp", "Object ID", "Actor", "Changed fields", "Note"],
    ...edits.map((entry) => [entry.at, entry.assetId, entry.actor, Object.keys(entry.changes).join("; "), entry.note]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function downloadReport(
  assets: DemoAsset[],
  decisions: DecisionAuditEntry[],
  edits: RecordEditAuditEntry[],
  created: CreatedObjectEntry[],
) {
  const blob = new Blob([buildReportCsv(assets, decisions, edits, created)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexus-spark-circular-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SparkSkanskaDemo() {
  const [view, setView] = useState<"project" | "environment">("project");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [provenanceFilter, setProvenanceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [decisionAudit, setDecisionAudit] = useState<DecisionAuditEntry[]>(() => loadArray(decisionStorageKey));
  const [recordEditAudit, setRecordEditAudit] = useState<RecordEditAuditEntry[]>(() => loadArray(recordEditStorageKey));
  const [createdObjects, setCreatedObjects] = useState<CreatedObjectEntry[]>(() => loadArray(createdObjectStorageKey));

  useEffect(() => {
    try { window.localStorage.setItem(decisionStorageKey, JSON.stringify(decisionAudit)); } catch { /* best effort */ }
  }, [decisionAudit]);
  useEffect(() => {
    try { window.localStorage.setItem(recordEditStorageKey, JSON.stringify(recordEditAudit)); } catch { /* best effort */ }
  }, [recordEditAudit]);
  useEffect(() => {
    try { window.localStorage.setItem(createdObjectStorageKey, JSON.stringify(createdObjects)); } catch { /* best effort */ }
  }, [createdObjects]);

  const decisionOverrides = useMemo(() => {
    const result: Record<string, CircularStatus> = {};
    for (const entry of decisionAudit) result[entry.assetId] = entry.status;
    return result;
  }, [decisionAudit]);

  const editOverrides = useMemo(() => {
    const result: Record<string, RecordEditChanges> = {};
    for (const entry of recordEditAudit) result[entry.assetId] = { ...(result[entry.assetId] ?? {}), ...entry.changes };
    return result;
  }, [recordEditAudit]);

  const assets = useMemo(() => {
    const base = [...demoAssets, ...createdObjects.map((entry) => entry.asset)];
    return base.map((asset) => ({
      ...asset,
      ...(editOverrides[asset.id] ?? {}),
      circularStatus: decisionOverrides[asset.id] ?? asset.circularStatus,
    }));
  }, [createdObjects, decisionOverrides, editOverrides]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const searchable = [asset.id, asset.name, asset.shortName, asset.location, asset.type, asset.sourceDocument].join(" ").toLowerCase();
      return (
        (!zoneFilter || asset.zoneId === zoneFilter) &&
        (!statusFilter || asset.circularStatus === statusFilter) &&
        (!provenanceFilter || asset.provenance === provenanceFilter) &&
        (!normalized || searchable.includes(normalized))
      );
    });
  }, [assets, provenanceFilter, query, statusFilter, zoneFilter]);

  const reuseCandidates = assets.filter((asset) => asset.circularStatus === "REUSABLE").length;
  const recoveryRecords = assets.filter((asset) => ["RECOVER", "RECYCLE"].includes(asset.circularStatus)).length;
  const completeProvenance = assets.filter((asset) => asset.provenance !== "UNKNOWN").length;
  const highAttention = assets.filter((asset) => asset.maintenanceAttention === "HIGH").length;
  const zoneName = (asset: DemoAsset) => demoZones.find((zone) => zone.id === asset.zoneId)?.name ?? "Unknown area";

  const recordHumanDecision = (assetId: string, status: CircularStatus, rationale: string, actor: string) => {
    const currentAsset = assets.find((asset) => asset.id === assetId);
    if (!currentAsset || currentAsset.circularStatus === status || !rationale.trim() || !actor.trim()) return;
    setDecisionAudit((current) => [...current, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      assetId,
      at: new Date().toISOString(),
      actor: actor.trim(),
      previousStatus: currentAsset.circularStatus,
      status,
      rationale: rationale.trim(),
    }]);
  };

  const recordEdit = (assetId: string, changes: RecordEditChanges, actor: string, note: string) => {
    if (!Object.keys(changes).length || actor.trim().length < 2) return;
    setRecordEditAudit((current) => [...current, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      assetId,
      at: new Date().toISOString(),
      actor: actor.trim(),
      note: note.trim() || "Record fields updated in demo session.",
      changes,
    }]);
  };

  const createObject = (entry: CreatedObjectEntry) => {
    setCreatedObjects((current) => [...current, entry]);
    setCreateOpen(false);
    setZoneFilter("");
    setSelectedAssetId(entry.asset.id);
  };

  const openCreate = () => {
    setSelectedAssetId(null);
    setCreateOpen(true);
  };

  return (
    <div className="spark-workbench">
      <header className="spark-topbar">
        <div className="spark-brand"><span>N</span><strong>NEXUS</strong></div>
        <nav className="spark-tabs" aria-label="Demo view">
          <button className={view === "project" ? "active" : ""} onClick={() => setView("project")}>Project</button>
          <button className={view === "environment" ? "active" : ""} onClick={() => setView("environment")}>Environmental</button>
        </nav>
        <div className="spark-truth-inline">SYNTHETIC DEMO · no real SKANSKA project data · no fabricated CO₂ values</div>
      </header>

      <section className="spark-contextbar">
        <div>Spark 4.0 / SKANSKA Residential Development use-case / <strong>{demoProject.name}</strong> / Object Register</div>
        <span>{assets.length} tracked records · {demoZones.length} areas</span>
      </section>

      <section className="spark-summary" aria-label="Project summary">
        <Metric value={assets.length} label="tracked" />
        <Metric value={createdObjects.length} label="created locally" />
        <Metric value={reuseCandidates} label="reuse" />
        <Metric value={recoveryRecords} label="recover / recycle" />
        <Metric value={completeProvenance} label="known provenance" />
        <Metric value={highAttention} label="high attention" />
        <Metric value={decisionAudit.length} label="human decisions" />
        <Metric value={recordEditAudit.length} label="record edits" />
      </section>

      {view === "project" ? (
        <section className="spark-workspace">
          <aside className="spark-tree-panel">
            <div className="spark-section-title"><span>Project structure</span><span>{demoZones.length} areas</span></div>
            <div className="spark-tree-list">
              <button className={zoneFilter === "" ? "selected" : ""} onClick={() => setZoneFilter("")}><span>{demoProject.name}</span><small>{assets.length}</small></button>
              {demoZones.map((zone) => (
                <button key={zone.id} className={zoneFilter === zone.id ? "selected child" : "child"} onClick={() => setZoneFilter(zone.id)}>
                  <span>{zone.name}</span><small>{assets.filter((asset) => asset.zoneId === zone.id).length}</small>
                </button>
              ))}
            </div>
            <dl className="spark-boundaries">
              <div><dt>Source truth</dt><dd>DERIVED / UNKNOWN</dd></div>
              <div><dt>CO₂ data</dt><dd>UNKNOWN</dd></div>
              <div><dt>Maintenance</dt><dd>rule-based</dd></div>
              <div><dt>Demo writes</dt><dd>browser-local</dd></div>
            </dl>
          </aside>

          <main className="spark-register">
            <div className="spark-toolbar">
              <button className="spark-save-decision" onClick={openCreate}>+ Add Object</button>
              <input aria-label="Search objects" type="search" placeholder="Search ID, object, location, type or source document" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All circular statuses</option>{circularStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={provenanceFilter} onChange={(event) => setProvenanceFilter(event.target.value)}>
                <option value="">All provenance</option><option>DERIVED</option><option>UNKNOWN</option>
              </select>
              <span>{filteredAssets.length} / {assets.length}</span>
            </div>

            <div className="spark-table-wrap">
              <table className="spark-register-table">
                <thead><tr><th>ID</th><th>Object</th><th>Area</th><th>Type</th><th>Circular</th><th>Provenance</th><th>Attention</th><th>Last inspection</th><th>Source</th></tr></thead>
                <tbody>{filteredAssets.map((asset) => (
                  <tr key={asset.id} className={selectedAssetId === asset.id ? "selected" : ""} onClick={() => { setCreateOpen(false); setSelectedAssetId(asset.id); }}>
                    <td className="spark-mono">{asset.id}</td>
                    <td className="spark-name-cell"><strong>{asset.name}</strong><small>{asset.lifecycleStatus}</small></td>
                    <td>{zoneName(asset)}<small>{asset.location}</small></td>
                    <td>{asset.type}</td>
                    <td><StatusBadge value={asset.circularStatus} /></td>
                    <td><ProvenanceBadge value={asset.provenance} /></td>
                    <td className={`spark-attention-text ${asset.maintenanceAttention.toLowerCase()}`}>{asset.maintenanceAttention}</td>
                    <td>{asset.lastInspection || "—"}</td>
                    <td>{asset.sourceDocument}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </main>

          <aside className={`spark-detail-panel ${selectedAsset || createOpen ? "open" : ""}`}>
            {createOpen ? (
              <CreateObjectCard onClose={() => setCreateOpen(false)} onCreate={createObject} />
            ) : selectedAsset ? (
              <AssetDetail
                asset={selectedAsset}
                zoneName={zoneName(selectedAsset)}
                decisionAudit={decisionAudit.filter((entry) => entry.assetId === selectedAsset.id)}
                editAudit={recordEditAudit.filter((entry) => entry.assetId === selectedAsset.id)}
                onClose={() => setSelectedAssetId(null)}
                onDecision={(status, rationale, actor) => recordHumanDecision(selectedAsset.id, status, rationale, actor)}
                onEdit={(changes, actor, note) => recordEdit(selectedAsset.id, changes, actor, note)}
              />
            ) : (
              <div className="spark-detail-empty">Select a row or create a typed Object Card.</div>
            )}
          </aside>
        </section>
      ) : (
        <EnvironmentalPanel assets={assets} decisionAudit={decisionAudit} editAudit={recordEditAudit} createdObjects={createdObjects} />
      )}
    </div>
  );
}

function CreateObjectCard({ onClose, onCreate }: { onClose: () => void; onCreate: (entry: CreatedObjectEntry) => void }) {
  const [profile, setProfile] = useState<ObjectProfile>("MATERIAL");
  const [name, setName] = useState("");
  const [detailType, setDetailType] = useState("");
  const [zoneId, setZoneId] = useState(demoZones[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("New / unverified demo record");
  const [circularStatus, setCircularStatus] = useState<CircularStatus>("UNKNOWN");
  const [provenance, setProvenance] = useState<Provenance>("UNKNOWN");
  const [actor, setActor] = useState("Demo operator");
  const [note, setNote] = useState("");

  const canCreate = name.trim().length >= 2 && location.trim().length >= 2 && actor.trim().length >= 2 && Boolean(zoneId);

  const create = () => {
    if (!canCreate) return;
    const at = new Date().toISOString();
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const id = `demo-${profile.toLowerCase()}-${suffix}`;
    const typeLabel = detailType.trim() ? `${profile} · ${detailType.trim()}` : profile;
    const evidence = sourceDocument.trim() ? [{
      id: `ev-${suffix}`,
      label: "Source reference supplied at creation",
      kind: "document" as const,
      provenance,
      note: "Browser-local demo source reference; verification is not implied.",
    }] : [];
    const asset: DemoAsset = {
      id,
      name: name.trim(),
      shortName: name.trim(),
      location: location.trim(),
      zoneId,
      type: typeLabel,
      sourceDocument: sourceDocument.trim() || "No source document supplied",
      evidence,
      lifecycleStatus: lifecycleStatus.trim() || "New / unverified demo record",
      circularStatus,
      provenance,
      maintenanceAttention: "LOW",
      maintenanceReasons: ["New browser-local demo object; no maintenance rule triggered"],
      lastInspection: "",
      issueHistory: [],
      maintenanceHistory: [],
      lifecycle: [{
        date: at.slice(0, 10),
        title: "Object Card created",
        detail: note.trim() || `New ${profile.toLowerCase()} Object Card created in the browser-local Spark demonstrator.`,
        provenance,
      }],
      circularDecision: "No human circular decision recorded at creation.",
      circularDecisionBasis: "Initial demo status supplied during Object Card creation.",
      co2Data: "UNKNOWN",
    };
    onCreate({ id: `create-${suffix}`, at, actor: actor.trim(), profile, asset });
  };

  return <>
    <button className="spark-detail-close" onClick={onClose} aria-label="Close create object form">×</button>
    <header className="spark-detail-head">
      <div className="spark-mono">NEW OBJECT CARD</div>
      <h2>Add project object</h2>
      <div className="spark-badge-row"><span className="spark-badge">BROWSER-LOCAL DEMO</span><ProvenanceBadge value={provenance} /></div>
    </header>
    <div className="spark-detail-body">
      <DetailSection title="Object profile">
        <div className="spark-decision-controls">{objectProfiles.map((item) => <button key={item} className={profile === item ? "active" : ""} onClick={() => setProfile(item)}>{item}</button>)}</div>
      </DetailSection>
      <div className="spark-record-form">
        <label>Name / label<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Timber acoustic panel batch" /></label>
        <label>Specific type<input value={detailType} onChange={(event) => setDetailType(event.target.value)} placeholder="e.g. CLT panel, pump, door set" /></label>
      </div>
      <DetailSection title="Project location">
        <div className="spark-decision-controls">{demoZones.map((zone) => <button key={zone.id} className={zoneId === zone.id ? "active" : ""} onClick={() => setZoneId(zone.id)}>{zone.name}</button>)}</div>
        <div className="spark-record-form"><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Level / room / storage or installation position" /></label></div>
      </DetailSection>
      <DetailSection title="Source and lifecycle">
        <div className="spark-record-form">
          <label>Source document / reference<input value={sourceDocument} onChange={(event) => setSourceDocument(event.target.value)} placeholder="Optional — does not imply verification" /></label>
          <label>Lifecycle state<input value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} /></label>
        </div>
        <div className="spark-line-item"><strong>Provenance</strong><span>A manually created demo object cannot be marked REAL here.</span></div>
        <div className="spark-decision-controls">
          {(["UNKNOWN", "DERIVED"] as Provenance[]).map((item) => <button key={item} className={provenance === item ? "active" : ""} onClick={() => setProvenance(item)}>{item}</button>)}
        </div>
      </DetailSection>
      <DetailSection title="Initial circular status">
        <div className="spark-decision-controls">{circularStatuses.map((status) => <button key={status} className={circularStatus === status ? "active" : ""} onClick={() => setCircularStatus(status)}>{status}</button>)}</div>
      </DetailSection>
      <DetailSection title="Creation audit">
        <div className="spark-record-form">
          <label>Created by<input value={actor} onChange={(event) => setActor(event.target.value)} /></label>
          <label>Creation note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What is this record and why is it being added?" /></label>
          <button className="spark-save-decision" disabled={!canCreate} onClick={create}>Create Object Card</button>
          <small>Creates a stable demo ID, lifecycle creation event and browser-local record. It does not create a production Project Memory object.</small>
        </div>
      </DetailSection>
    </div>
  </>;
}

function AssetDetail({
  asset,
  zoneName,
  decisionAudit,
  editAudit,
  onClose,
  onDecision,
  onEdit,
}: {
  asset: DemoAsset;
  zoneName: string;
  decisionAudit: DecisionAuditEntry[];
  editAudit: RecordEditAuditEntry[];
  onClose: () => void;
  onDecision: (status: CircularStatus, rationale: string, actor: string) => void;
  onEdit: (changes: RecordEditChanges, actor: string, note: string) => void;
}) {
  const [targetStatus, setTargetStatus] = useState<CircularStatus>(asset.circularStatus);
  const [rationale, setRationale] = useState("");
  const [decisionActor, setDecisionActor] = useState("Demo operator");
  const [editActor, setEditActor] = useState("Demo operator");
  const [editNote, setEditNote] = useState("");
  const [location, setLocation] = useState(asset.location);
  const [lifecycleStatus, setLifecycleStatus] = useState(asset.lifecycleStatus);
  const [lastInspection, setLastInspection] = useState(asset.lastInspection);
  const [sourceDocument, setSourceDocument] = useState(asset.sourceDocument);

  useEffect(() => {
    setTargetStatus(asset.circularStatus);
    setRationale("");
    setLocation(asset.location);
    setLifecycleStatus(asset.lifecycleStatus);
    setLastInspection(asset.lastInspection);
    setSourceDocument(asset.sourceDocument);
    setEditNote("");
  }, [asset.id, asset.circularStatus, asset.location, asset.lifecycleStatus, asset.lastInspection, asset.sourceDocument]);

  const canSaveDecision = targetStatus !== asset.circularStatus && rationale.trim().length >= 3 && decisionActor.trim().length >= 2;
  const editChanges: RecordEditChanges = {};
  if (location.trim() && location.trim() !== asset.location) editChanges.location = location.trim();
  if (lifecycleStatus.trim() && lifecycleStatus.trim() !== asset.lifecycleStatus) editChanges.lifecycleStatus = lifecycleStatus.trim();
  if (lastInspection.trim() && lastInspection.trim() !== asset.lastInspection) editChanges.lastInspection = lastInspection.trim();
  if (sourceDocument.trim() && sourceDocument.trim() !== asset.sourceDocument) editChanges.sourceDocument = sourceDocument.trim();
  const canSaveEdit = Object.keys(editChanges).length > 0 && editActor.trim().length >= 2;

  return <>
    <button className="spark-detail-close" onClick={onClose} aria-label="Close object detail">×</button>
    <header className="spark-detail-head">
      <div className="spark-mono">{asset.id}</div>
      <h2>{asset.name}</h2>
      <div className="spark-badge-row"><StatusBadge value={asset.circularStatus} /><ProvenanceBadge value={asset.provenance} /><span className={`spark-badge spark-attention-text ${asset.maintenanceAttention.toLowerCase()}`}>{asset.maintenanceAttention} attention</span></div>
    </header>
    <div className="spark-detail-body">
      <dl className="spark-kv">
        <div><dt>Area</dt><dd>{zoneName}</dd></div>
        <div><dt>Location</dt><dd>{asset.location}</dd></div>
        <div><dt>Type</dt><dd>{asset.type}</dd></div>
        <div><dt>Lifecycle state</dt><dd>{asset.lifecycleStatus}</dd></div>
        <div><dt>Last inspection</dt><dd>{asset.lastInspection || "Not recorded"}</dd></div>
        <div><dt>Source document</dt><dd>{asset.sourceDocument}</dd></div>
        <div><dt>CO₂ data</dt><dd>{asset.co2Data} — verified quantity / EPD source not connected</dd></div>
      </dl>

      <DetailSection title="Edit record">
        <div className="spark-record-form">
          <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label>Lifecycle state<input value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} /></label>
          <label>Last inspection<input type="date" value={lastInspection} onChange={(event) => setLastInspection(event.target.value)} /></label>
          <label>Source document<input value={sourceDocument} onChange={(event) => setSourceDocument(event.target.value)} /></label>
          <label>Edited by<input value={editActor} onChange={(event) => setEditActor(event.target.value)} /></label>
          <label>Change note<textarea rows={2} placeholder="Optional reason for the record update" value={editNote} onChange={(event) => setEditNote(event.target.value)} /></label>
          <button className="spark-save-decision" disabled={!canSaveEdit} onClick={() => { if (canSaveEdit) { onEdit(editChanges, editActor, editNote); setEditNote(""); } }}>Save record update</button>
          <small>These edits are stored only in this browser. Editing a source reference does not upgrade provenance or verify the source.</small>
        </div>
      </DetailSection>

      <DetailSection title={`Record edit audit (${editAudit.length})`}>
        {editAudit.length === 0 ? <div className="spark-line-item"><span>No demo record edit has been saved yet.</span></div> : [...editAudit].reverse().map((entry) => (
          <div className="spark-audit-entry" key={entry.id}><strong>{Object.keys(entry.changes).join(", ")}</strong><span>{entry.note}</span><small>{entry.actor} · {formatAuditTime(entry.at)} · browser-local demo edit</small></div>
        ))}
      </DetailSection>

      <DetailSection title="Evidence">
        {asset.evidence.length === 0 ? <div className="spark-line-item"><span>No evidence attached to this demo object.</span></div> : asset.evidence.map((record) => (
          <div className="spark-line-item" key={record.id}><strong>{record.label}</strong><span>{record.note}</span><ProvenanceBadge value={record.provenance} /></div>
        ))}
      </DetailSection>

      <DetailSection title="Lifecycle timeline">
        {asset.lifecycle.map((event) => <div className="spark-line-item" key={`${event.date}-${event.title}`}><strong>{event.date} · {event.title}</strong><span>{event.detail}</span><ProvenanceBadge value={event.provenance} /></div>)}
      </DetailSection>

      <DetailSection title="Maintenance / inspection">
        {asset.maintenanceReasons.map((reason) => <div className="spark-line-item" key={reason}><strong>Attention reason</strong><span>{reason}</span></div>)}
        {asset.issueHistory.length > 0 ? asset.issueHistory.map((item) => <div className="spark-line-item" key={item}><strong>Issue</strong><span>{item}</span></div>) : <div className="spark-line-item"><span>No issue recorded in demo history.</span></div>}
        {asset.maintenanceHistory.length > 0 ? asset.maintenanceHistory.map((item) => <div className="spark-line-item" key={item}><strong>Maintenance</strong><span>{item}</span></div>) : <div className="spark-line-item"><span>No maintenance event recorded.</span></div>}
      </DetailSection>

      <DetailSection title="Human circular decision">
        <div className="spark-line-item"><strong>Current status: {asset.circularStatus}</strong><span>{decisionAudit.length > 0 ? "Current value is derived from the latest locally recorded human demo decision." : asset.circularDecision}</span></div>
        <div className="spark-decision-form">
          <label>Target circular status</label>
          <div className="spark-decision-controls">{circularStatuses.map((status) => <button key={status} className={targetStatus === status ? "active" : ""} onClick={() => setTargetStatus(status)}>{status}</button>)}</div>
          <label>Decision by<input value={decisionActor} onChange={(event) => setDecisionActor(event.target.value)} /></label>
          <label>Decision rationale<textarea rows={3} placeholder="Why is this circular route defensible?" value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
          <button className="spark-save-decision" disabled={!canSaveDecision} onClick={() => { if (canSaveDecision) { onDecision(targetStatus, rationale, decisionActor); setRationale(""); } }}>Save human decision</button>
          <small>Demo-only persistence: creates a browser-local audit event. It is not a backend Project Memory write.</small>
        </div>
      </DetailSection>

      <DetailSection title={`Decision audit trail (${decisionAudit.length})`}>
        {decisionAudit.length === 0 ? <div className="spark-line-item"><span>No human demo decision has been recorded for this object yet.</span></div> : [...decisionAudit].reverse().map((entry) => (
          <div className="spark-audit-entry" key={entry.id}><strong>{entry.previousStatus} → {entry.status}</strong><span>{entry.rationale}</span><small>{entry.actor} · {formatAuditTime(entry.at)} · browser-local demo audit</small></div>
        ))}
      </DetailSection>

      <div className="spark-warning">No real SKANSKA project data is loaded. No kgCO₂e saving is shown without verified quantity, EPD/carbon factor and source provenance.</div>
    </div>
  </>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="spark-detail-section"><h3>{title}</h3>{children}</section>;
}

function EnvironmentalPanel({
  assets,
  decisionAudit,
  editAudit,
  createdObjects,
}: {
  assets: DemoAsset[];
  decisionAudit: DecisionAuditEntry[];
  editAudit: RecordEditAuditEntry[];
  createdObjects: CreatedObjectEntry[];
}) {
  const rowsStatus = circularStatuses.map((status) => ({ status, count: assets.filter((asset) => asset.circularStatus === status).length }));
  const derived = assets.filter((asset) => asset.provenance === "DERIVED").length;
  const unknown = assets.filter((asset) => asset.provenance === "UNKNOWN").length;
  const changedAssets = new Set(decisionAudit.map((entry) => entry.assetId)).size;
  const editedAssets = new Set(editAudit.map((entry) => entry.assetId)).size;
  const latestAudit = [...decisionAudit].reverse().slice(0, 5);
  const latestEdits = [...editAudit].reverse().slice(0, 5);
  const latestCreated = [...createdObjects].reverse().slice(0, 5);

  return <main className="spark-environment">
    <section className="spark-report-actions">
      <div><h2>Circular / Environmental report</h2><p>Current Object Register state plus browser-local creation, human-decision and edit audit. CO₂ remains UNKNOWN where verified inputs are absent.</p></div>
      <div className="spark-report-buttons"><button onClick={() => downloadReport(assets, decisionAudit, editAudit, createdObjects)}>Download CSV</button><button onClick={() => window.print()}>Print / Save PDF</button></div>
    </section>
    <section><h2>Circular status</h2>{rowsStatus.map(({ status, count }) => <ReportRow key={status} label={status} value={count} note="Current Object Register records; human demo decisions included" />)}</section>
    <section><h2>Provenance</h2><ReportRow label="DERIVED" value={derived} note="Synthetic / browser-derived demonstrator records" /><ReportRow label="UNKNOWN" value={unknown} note="Missing or unverified source data" /><ReportRow label="REAL" value={0} note="No real SKANSKA project records loaded" /></section>
    <section><h2>CO₂ reporting readiness</h2><ReportRow label="Verified quantity" value="NO" note="Not connected in demonstrator" /><ReportRow label="EPD / carbon factor" value="NO" note="Not connected in demonstrator" /><ReportRow label="kgCO₂e result" value="UNKNOWN" note="Intentionally not fabricated" /></section>
    <section><h2>Maintenance attention</h2>{(["HIGH", "MEDIUM", "LOW"] as const).map((level) => <ReportRow key={level} label={level} value={assets.filter((asset) => asset.maintenanceAttention === level).length} note={level === "HIGH" ? "Recurring or unresolved issue evidence" : level === "MEDIUM" ? "Review trigger or source gap" : "No current rule-based trigger"} />)}</section>
    <section className="spark-environment-audit">
      <h2>Object creation audit</h2><ReportRow label="Created objects" value={createdObjects.length} note="Browser-local typed Object Cards" />
      {latestCreated.length === 0 ? <div className="spark-audit-empty">No browser-local Object Card created yet.</div> : <div className="spark-environment-audit-list">{latestCreated.map((entry) => <div className="spark-audit-entry" key={entry.id}><strong>{entry.asset.id}: {entry.profile}</strong><span>{entry.asset.name}</span><small>{entry.actor} · {formatAuditTime(entry.at)}</small></div>)}</div>}
    </section>
    <section className="spark-environment-audit">
      <h2>Human decision audit</h2><ReportRow label="Audit events" value={decisionAudit.length} note="Browser-local demo decisions" /><ReportRow label="Objects changed" value={changedAssets} note="Unique records with a human demo decision" />
      {latestAudit.length === 0 ? <div className="spark-audit-empty">No human demo decisions recorded yet.</div> : <div className="spark-environment-audit-list">{latestAudit.map((entry) => { const asset = assets.find((item) => item.id === entry.assetId); return <div className="spark-audit-entry" key={entry.id}><strong>{asset?.shortName ?? entry.assetId}: {entry.previousStatus} → {entry.status}</strong><span>{entry.rationale}</span><small>{entry.actor} · {formatAuditTime(entry.at)}</small></div>; })}</div>}
    </section>
    <section className="spark-environment-audit">
      <h2>Record edit audit</h2><ReportRow label="Edit events" value={editAudit.length} note="Browser-local demo field updates" /><ReportRow label="Objects edited" value={editedAssets} note="Unique records with edited fields" />
      {latestEdits.length === 0 ? <div className="spark-audit-empty">No demo record edits saved yet.</div> : <div className="spark-environment-audit-list">{latestEdits.map((entry) => { const asset = assets.find((item) => item.id === entry.assetId); return <div className="spark-audit-entry" key={entry.id}><strong>{asset?.shortName ?? entry.assetId}: {Object.keys(entry.changes).join(", ")}</strong><span>{entry.note}</span><small>{entry.actor} · {formatAuditTime(entry.at)}</small></div>; })}</div>}
      <div className="spark-storage-note">Creation, decision and record-edit persistence are local to this browser only. This demonstrates the Object Card workflow without claiming a live Project Memory backend write.</div>
    </section>
  </main>;
}

function ReportRow({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <div className="spark-report-row"><span>{label}</span><strong>{value}</strong><span>{note}</span></div>;
}
