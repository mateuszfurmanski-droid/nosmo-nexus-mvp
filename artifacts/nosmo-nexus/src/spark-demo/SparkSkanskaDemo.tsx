import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Database,
  FileText,
  History,
  Info,
  Leaf,
  Recycle,
  ShieldCheck,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  demoAssets,
  demoProject,
  demoZones,
  type CircularStatus,
  type DemoAsset,
  type Provenance,
} from "./data";
import "./spark-demo.css";

const circularStatuses: CircularStatus[] = [
  "IN USE",
  "REUSABLE",
  "RECOVER",
  "RECYCLE",
  "WASTE",
  "UNKNOWN",
];

const statusTone: Record<CircularStatus, string> = {
  "IN USE": "blue",
  REUSABLE: "green",
  RECOVER: "amber",
  RECYCLE: "teal",
  WASTE: "red",
  UNKNOWN: "muted",
};

const provenanceTone: Record<Provenance, string> = {
  REAL: "green",
  DERIVED: "amber",
  UNKNOWN: "muted",
};

function Metric({ value, label, note }: { value: number | string; label: string; note: string }) {
  return (
    <article className="spark-metric">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </article>
  );
}

function ProvenanceBadge({ value }: { value: Provenance }) {
  return <span className={`spark-badge ${provenanceTone[value]}`}>{value}</span>;
}

function StatusBadge({ value }: { value: CircularStatus }) {
  return <span className={`spark-badge ${statusTone[value]}`}>{value}</span>;
}

function EvidenceIcon({ kind }: { kind: DemoAsset["evidence"][number]["kind"] }) {
  if (kind === "photo") return <Camera size={16} />;
  if (kind === "inspection") return <ClipboardCheck size={16} />;
  if (kind === "decision") return <UserCheck size={16} />;
  return <FileText size={16} />;
}

export default function SparkSkanskaDemo() {
  const [view, setView] = useState<"world" | "environment">("world");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [decisionOverrides, setDecisionOverrides] = useState<Record<string, CircularStatus>>({});

  const assets = useMemo(
    () =>
      demoAssets.map((asset) => {
        const humanDecision = decisionOverrides[asset.id];
        return {
          ...asset,
          circularStatus: humanDecision ?? asset.circularStatus,
          circularDecision: humanDecision
            ? `Human demo-session decision: route this record as ${humanDecision}.`
            : asset.circularDecision,
          circularDecisionBasis: humanDecision
            ? "Manual selection in the current demo session; local state only and not persisted as a project record."
            : asset.circularDecisionBasis,
        };
      }),
    [decisionOverrides],
  );

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const reuseCandidates = assets.filter((asset) => asset.circularStatus === "REUSABLE").length;
  const recoveryRecords = assets.filter((asset) => ["RECOVER", "RECYCLE"].includes(asset.circularStatus)).length;
  const completeProvenance = assets.filter((asset) => asset.provenance !== "UNKNOWN").length;
  const missingData = assets.filter((asset) => asset.provenance === "UNKNOWN").length;
  const highAttention = assets.filter((asset) => asset.maintenanceAttention === "HIGH").length;

  const recordHumanDecision = (assetId: string, status: CircularStatus) => {
    setDecisionOverrides((current) => ({ ...current, [assetId]: status }));
  };

  return (
    <div className="spark-demo-shell">
      <header className="spark-topbar">
        <div className="spark-brand">
          <div className="spark-logo-mark">N</div>
          <div>
            <strong>NEXUS</strong>
            <span>Spark Demo Core</span>
          </div>
        </div>
        <nav aria-label="Demo navigation" className="spark-nav">
          <button className={view === "world" ? "active" : ""} onClick={() => setView("world")}>Project World</button>
          <button className={view === "environment" ? "active" : ""} onClick={() => setView("environment")}>Environmental</button>
        </nav>
        <div className="spark-demo-chip"><CircleDot size={14} /> DEMO DATA</div>
      </header>

      <main className="spark-main">
        <section className="spark-project-heading">
          <div>
            <div className="spark-eyebrow">{demoProject.clientContext}</div>
            <h1>{demoProject.name}</h1>
            <p>{demoProject.subtitle}</p>
          </div>
          <div className="spark-truth-note"><Info size={16} /><span>{demoProject.dataNotice}</span></div>
        </section>

        {view === "world" ? (
          <>
            <section className="spark-summary-strip" aria-label="Project summary">
              <Metric value={assets.length} label="tracked assets / materials" note="One Project World" />
              <Metric value={reuseCandidates} label="reuse candidates" note="Current human-reviewed status" />
              <Metric value={recoveryRecords} label="recovery / recycling records" note="Traceable circular route" />
              <Metric value={completeProvenance} label="records with known provenance" note={`${missingData} record still UNKNOWN`} />
              <Metric value={highAttention} label="high maintenance attention" note="Rule-based, not predictive AI" />
            </section>

            <section className="spark-world-layout">
              <div className="spark-world-stage" aria-label="Project World relationship graph">
                <svg className="spark-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {demoZones.map((zone) => (
                    <line key={zone.id} x1="50" y1="50" x2={zone.x} y2={zone.y} />
                  ))}
                </svg>

                <div className="spark-project-node">
                  <Building2 size={22} />
                  <strong>Building 01</strong>
                  <span>Project Memory</span>
                </div>

                <div className="spark-zone-grid-mobile">
                  {demoZones.map((zone) => {
                    const zoneAssets = assets.filter((asset) => asset.zoneId === zone.id);
                    return (
                      <article
                        className="spark-zone-node"
                        key={zone.id}
                        style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                      >
                        <div className="spark-zone-title">
                          <div><strong>{zone.name}</strong><span>{zone.subtitle}</span></div>
                          <span>{zoneAssets.length}</span>
                        </div>
                        <div className="spark-zone-assets">
                          {zoneAssets.map((asset) => (
                            <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                              <span className={`spark-status-dot ${statusTone[asset.circularStatus]}`} />
                              <span><strong>{asset.shortName}</strong><small>{asset.type}</small></span>
                              <ChevronRight size={15} />
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="spark-world-guide">
                <div className="spark-panel-title"><Database size={18} /><div><strong>What this proves</strong><span>A small operating layer, not a dashboard mock-up.</span></div></div>
                <ol className="spark-flow-list">
                  <li><span>1</span><div><strong>Project World</strong><small>Building, areas and tracked objects share one context.</small></div></li>
                  <li><span>2</span><div><strong>Asset detail</strong><small>Document, evidence, events and provenance stay linked.</small></div></li>
                  <li><span>3</span><div><strong>Circular route</strong><small>Reuse, recovery, recycling, waste or unknown remains explicit.</small></div></li>
                  <li><span>4</span><div><strong>Human authority</strong><small>The demo can record a decision without pretending AI made it.</small></div></li>
                </ol>
                <div className="spark-legend">
                  <span>circular status</span>
                  <div>{circularStatuses.map((status) => <StatusBadge value={status} key={status} />)}</div>
                </div>
              </aside>
            </section>
          </>
        ) : (
          <EnvironmentalPanel assets={assets} />
        )}
      </main>

      {selectedAsset && (
        <AssetDetail
          asset={selectedAsset}
          changed={decisionOverrides[selectedAsset.id] !== undefined}
          onClose={() => setSelectedAssetId(null)}
          onDecision={(status) => recordHumanDecision(selectedAsset.id, status)}
        />
      )}
    </div>
  );
}

function EnvironmentalPanel({ assets }: { assets: DemoAsset[] }) {
  const statusCounts = circularStatuses.map((status) => ({
    status,
    count: assets.filter((asset) => asset.circularStatus === status).length,
  }));
  const unknown = assets.filter((asset) => asset.provenance === "UNKNOWN").length;
  const derived = assets.filter((asset) => asset.provenance === "DERIVED").length;
  const high = assets.filter((asset) => asset.maintenanceAttention === "HIGH").length;
  const medium = assets.filter((asset) => asset.maintenanceAttention === "MEDIUM").length;

  return (
    <section className="spark-environment-grid">
      <article className="spark-panel spark-environment-overview">
        <div className="spark-panel-title"><Leaf size={19} /><div><strong>Environmental reporting view</strong><span>Counts are generated from the current Project World records.</span></div></div>
        <div className="spark-environment-metrics">
          <Metric value={assets.length} label="tracked records" note="Assets + material batches" />
          <Metric value={assets.filter((a) => a.circularStatus === "REUSABLE").length} label="reuse candidates" note="Explicit REUSABLE status" />
          <Metric value={assets.filter((a) => ["RECOVER", "RECYCLE"].includes(a.circularStatus)).length} label="recover / recycle" note="Recorded circular routes" />
          <Metric value={unknown} label="missing provenance" note="Cannot be hidden by a percentage" />
        </div>
      </article>

      <article className="spark-panel">
        <div className="spark-panel-title"><Recycle size={19} /><div><strong>Circular status distribution</strong><span>Current state, including human demo-session decisions.</span></div></div>
        <div className="spark-status-bars">
          {statusCounts.map(({ status, count }) => (
            <div key={status}>
              <div><StatusBadge value={status} /><strong>{count}</strong></div>
              <span><i className={statusTone[status]} style={{ width: `${Math.max(5, (count / assets.length) * 100)}%` }} /></span>
            </div>
          ))}
        </div>
      </article>

      <article className="spark-panel">
        <div className="spark-panel-title"><ShieldCheck size={19} /><div><strong>Data confidence / provenance</strong><span>Truthfulness is visible next to environmental reporting.</span></div></div>
        <div className="spark-provenance-summary">
          <div><ProvenanceBadge value="REAL" /><strong>0</strong><span>No real SKANSKA project records loaded</span></div>
          <div><ProvenanceBadge value="DERIVED" /><strong>{derived}</strong><span>Derived inside the synthetic demonstrator</span></div>
          <div><ProvenanceBadge value="UNKNOWN" /><strong>{unknown}</strong><span>Missing or unverified source data</span></div>
        </div>
      </article>

      <article className="spark-panel spark-co2-guardrail">
        <div className="spark-panel-title"><AlertTriangle size={19} /><div><strong>CO₂ reporting guardrail</strong><span>No invented savings.</span></div></div>
        <div className="spark-co2-value">CO₂ data: <strong>UNKNOWN</strong></div>
        <p>No verified project quantity, EPD or carbon-factor dataset is connected. Nexus can carry and report those fields later, but this demonstrator intentionally does not fabricate kgCO₂e values.</p>
      </article>

      <article className="spark-panel">
        <div className="spark-panel-title"><Wrench size={19} /><div><strong>Maintenance attention</strong><span>Explainable rule-based indicator, not predictive AI.</span></div></div>
        <div className="spark-maintenance-summary">
          <div><span className="spark-attention high">HIGH</span><strong>{high}</strong><small>Recurring or unresolved issue evidence</small></div>
          <div><span className="spark-attention medium">MEDIUM</span><strong>{medium}</strong><small>History or missing source data needs review</small></div>
          <div><span className="spark-attention low">LOW</span><strong>{assets.length - high - medium}</strong><small>No current attention trigger in demo history</small></div>
        </div>
      </article>

      <article className="spark-panel spark-decision-feed">
        <div className="spark-panel-title"><UserCheck size={19} /><div><strong>Human decision layer</strong><span>Environmental outcome remains accountable to a person.</span></div></div>
        {assets.slice(0, 4).map((asset) => (
          <div key={asset.id} className="spark-decision-row">
            <div><strong>{asset.shortName}</strong><span>{asset.circularDecision}</span></div>
            <StatusBadge value={asset.circularStatus} />
          </div>
        ))}
      </article>
    </section>
  );
}

function AssetDetail({
  asset,
  changed,
  onClose,
  onDecision,
}: {
  asset: DemoAsset;
  changed: boolean;
  onClose: () => void;
  onDecision: (status: CircularStatus) => void;
}) {
  return (
    <div className="spark-overlay" role="dialog" aria-modal="true" aria-label={`${asset.name} detail`}>
      <button className="spark-overlay-backdrop" onClick={onClose} aria-label="Close asset detail" />
      <section className="spark-asset-panel">
        <header>
          <div>
            <span className="spark-eyebrow">{asset.shortName} · {asset.location}</span>
            <h2>{asset.name}</h2>
            <div className="spark-badge-row"><StatusBadge value={asset.circularStatus} /><ProvenanceBadge value={asset.provenance} /><span className={`spark-attention ${asset.maintenanceAttention.toLowerCase()}`}>{asset.maintenanceAttention} maintenance attention</span></div>
          </div>
          <button className="spark-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="spark-asset-body">
          <section className="spark-detail-grid">
            <div><span>Location</span><strong>{asset.location}</strong></div>
            <div><span>Type</span><strong>{asset.type}</strong></div>
            <div><span>Current lifecycle</span><strong>{asset.lifecycleStatus}</strong></div>
            <div><span>Last inspection</span><strong>{asset.lastInspection}</strong></div>
          </section>

          <section className="spark-detail-section">
            <div className="spark-section-heading"><FileText size={17} /><strong>Source document</strong></div>
            <div className="spark-source-record"><Database size={17} /><div><strong>{asset.sourceDocument}</strong><span>Reference only · no external connector is claimed live</span></div><ProvenanceBadge value={asset.provenance} /></div>
          </section>

          <section className="spark-detail-section">
            <div className="spark-section-heading"><Boxes size={17} /><strong>Evidence</strong><span>{asset.evidence.length} linked records</span></div>
            <div className="spark-evidence-list">
              {asset.evidence.map((record) => (
                <article key={record.id}>
                  <EvidenceIcon kind={record.kind} />
                  <div><strong>{record.label}</strong><span>{record.note}</span></div>
                  <ProvenanceBadge value={record.provenance} />
                </article>
              ))}
            </div>
          </section>

          <section className="spark-detail-section">
            <div className="spark-section-heading"><History size={17} /><strong>Lifecycle timeline</strong></div>
            <div className="spark-timeline">
              {asset.lifecycle.map((event) => (
                <article key={`${asset.id}-${event.date}-${event.title}`}>
                  <span className="spark-timeline-dot" />
                  <time>{event.date}</time>
                  <div><strong>{event.title}</strong><p>{event.detail}</p></div>
                  <ProvenanceBadge value={event.provenance} />
                </article>
              ))}
            </div>
          </section>

          <section className="spark-detail-section">
            <div className="spark-section-heading"><Wrench size={17} /><strong>Maintenance / inspection</strong><span>Rule-based attention: {asset.maintenanceAttention}</span></div>
            <div className="spark-maintenance-box">
              <div><strong>Why this indicator?</strong>{asset.maintenanceReasons.map((reason) => <span key={reason}><CheckCircle2 size={14} />{reason}</span>)}</div>
              <div><strong>Issue history</strong>{asset.issueHistory.length ? asset.issueHistory.map((item) => <span key={item}>{item}</span>) : <span>No issue recorded in demo history.</span>}</div>
              <div><strong>Maintenance events</strong>{asset.maintenanceHistory.length ? asset.maintenanceHistory.map((item) => <span key={item}>{item}</span>) : <span>No maintenance event recorded.</span>}</div>
            </div>
          </section>

          <section className="spark-detail-section spark-circular-decision">
            <div className="spark-section-heading"><Recycle size={17} /><strong>Circular decision</strong><span>Human decision remains authoritative</span></div>
            <div className="spark-current-decision">
              <div><span>Current route</span><StatusBadge value={asset.circularStatus} /></div>
              <p>{asset.circularDecision}</p>
              <small>Basis: {asset.circularDecisionBasis}</small>
            </div>
            <div className="spark-decision-controls" aria-label="Record circular decision">
              {circularStatuses.map((status) => (
                <button key={status} className={asset.circularStatus === status ? "active" : ""} onClick={() => onDecision(status)}>{status}</button>
              ))}
            </div>
            {changed && <div className="spark-session-decision"><UserCheck size={15} /> Human decision changed in this demo session. It is local demo state and is not presented as a persisted project record.</div>}
          </section>

          <section className="spark-detail-section spark-co2-inline">
            <div className="spark-section-heading"><Leaf size={17} /><strong>Environmental impact</strong></div>
            <div><span>CO₂-related data</span><strong>{asset.co2Data}</strong></div>
            <p>No kgCO₂e value is shown because no verified quantity + EPD/carbon-factor source is linked to this demonstration record.</p>
          </section>
        </div>
      </section>
    </div>
  );
}