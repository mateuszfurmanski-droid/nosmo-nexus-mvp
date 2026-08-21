import { useMemo, useState } from "react";
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

const statusClass: Record<CircularStatus, string> = {
  "IN USE": "spark-status-in-use",
  REUSABLE: "spark-status-reusable",
  RECOVER: "spark-status-recover",
  RECYCLE: "spark-status-recycle",
  WASTE: "spark-status-waste",
  UNKNOWN: "spark-status-unknown",
};

function StatusBadge({ value }: { value: CircularStatus }) {
  return <span className={`spark-badge ${statusClass[value]}`}>{value}</span>;
}

function ProvenanceBadge({ value }: { value: Provenance }) {
  return <span className="spark-badge spark-provenance-badge">{value}</span>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="spark-summary-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function SparkSkanskaDemo() {
  const [view, setView] = useState<"project" | "environment">("project");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [provenanceFilter, setProvenanceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [decisionOverrides, setDecisionOverrides] = useState<Record<string, CircularStatus>>({});

  const assets = useMemo(
    () =>
      demoAssets.map((asset) => ({
        ...asset,
        circularStatus: decisionOverrides[asset.id] ?? asset.circularStatus,
      })),
    [decisionOverrides],
  );

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const searchable = [
        asset.id,
        asset.name,
        asset.shortName,
        asset.location,
        asset.type,
        asset.sourceDocument,
      ]
        .join(" ")
        .toLowerCase();
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

  const recordHumanDecision = (assetId: string, status: CircularStatus) => {
    setDecisionOverrides((current) => ({ ...current, [assetId]: status }));
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
        <div>Spark 4.0 / SKANSKA Residential Development use-case / <strong>{demoProject.name}</strong> / Asset &amp; Material Register</div>
        <span>{assets.length} tracked records · {demoZones.length} areas</span>
      </section>

      <section className="spark-summary" aria-label="Project summary">
        <Metric value={assets.length} label="tracked" />
        <Metric value={reuseCandidates} label="reuse" />
        <Metric value={recoveryRecords} label="recover / recycle" />
        <Metric value={completeProvenance} label="known provenance" />
        <Metric value={highAttention} label="high attention" />
      </section>

      {view === "project" ? (
        <section className="spark-workspace">
          <aside className="spark-tree-panel">
            <div className="spark-section-title"><span>Project structure</span><span>{demoZones.length} areas</span></div>
            <div className="spark-tree-list">
              <button className={zoneFilter === "" ? "selected" : ""} onClick={() => setZoneFilter("")}>
                <span>{demoProject.name}</span><small>{assets.length}</small>
              </button>
              {demoZones.map((zone) => (
                <button
                  key={zone.id}
                  className={zoneFilter === zone.id ? "selected child" : "child"}
                  onClick={() => setZoneFilter(zone.id)}
                >
                  <span>{zone.name}</span><small>{assets.filter((asset) => asset.zoneId === zone.id).length}</small>
                </button>
              ))}
            </div>
            <dl className="spark-boundaries">
              <div><dt>Source truth</dt><dd>DERIVED / UNKNOWN</dd></div>
              <div><dt>CO₂ data</dt><dd>UNKNOWN</dd></div>
              <div><dt>Maintenance</dt><dd>rule-based</dd></div>
              <div><dt>Human decision</dt><dd>authoritative</dd></div>
            </dl>
          </aside>

          <main className="spark-register">
            <div className="spark-toolbar">
              <input
                aria-label="Search assets"
                type="search"
                placeholder="Search ID, asset, location, type or source document"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All circular statuses</option>
                {circularStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={provenanceFilter} onChange={(event) => setProvenanceFilter(event.target.value)}>
                <option value="">All provenance</option>
                <option>DERIVED</option>
                <option>UNKNOWN</option>
              </select>
              <span>{filteredAssets.length} / {assets.length}</span>
            </div>

            <div className="spark-table-wrap">
              <table className="spark-register-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Asset / material</th><th>Area</th><th>Type</th><th>Circular</th><th>Provenance</th><th>Attention</th><th>Last inspection</th><th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className={selectedAssetId === asset.id ? "selected" : ""}
                      onClick={() => setSelectedAssetId(asset.id)}
                    >
                      <td className="spark-mono">{asset.id}</td>
                      <td className="spark-name-cell"><strong>{asset.name}</strong><small>{asset.lifecycleStatus}</small></td>
                      <td>{zoneName(asset)}<small>{asset.location}</small></td>
                      <td>{asset.type}</td>
                      <td><StatusBadge value={asset.circularStatus} /></td>
                      <td><ProvenanceBadge value={asset.provenance} /></td>
                      <td className={`spark-attention-text ${asset.maintenanceAttention.toLowerCase()}`}>{asset.maintenanceAttention}</td>
                      <td>{asset.lastInspection}</td>
                      <td>{asset.sourceDocument}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>

          <aside className={`spark-detail-panel ${selectedAsset ? "open" : ""}`}>
            {selectedAsset ? (
              <AssetDetail
                asset={selectedAsset}
                changed={decisionOverrides[selectedAsset.id] !== undefined}
                zoneName={zoneName(selectedAsset)}
                onClose={() => setSelectedAssetId(null)}
                onDecision={(status) => recordHumanDecision(selectedAsset.id, status)}
              />
            ) : (
              <div className="spark-detail-empty">Select a row to inspect source document, evidence, lifecycle, maintenance history and circular decision.</div>
            )}
          </aside>
        </section>
      ) : (
        <EnvironmentalPanel assets={assets} />
      )}
    </div>
  );
}

function AssetDetail({
  asset,
  changed,
  zoneName,
  onClose,
  onDecision,
}: {
  asset: DemoAsset;
  changed: boolean;
  zoneName: string;
  onClose: () => void;
  onDecision: (status: CircularStatus) => void;
}) {
  return (
    <>
      <button className="spark-detail-close" onClick={onClose} aria-label="Close asset detail">×</button>
      <header className="spark-detail-head">
        <div className="spark-mono">{asset.id}</div>
        <h2>{asset.name}</h2>
        <div className="spark-badge-row">
          <StatusBadge value={asset.circularStatus} />
          <ProvenanceBadge value={asset.provenance} />
          <span className={`spark-badge spark-attention-text ${asset.maintenanceAttention.toLowerCase()}`}>{asset.maintenanceAttention} attention</span>
        </div>
      </header>
      <div className="spark-detail-body">
        <dl className="spark-kv">
          <div><dt>Area</dt><dd>{zoneName}</dd></div>
          <div><dt>Location</dt><dd>{asset.location}</dd></div>
          <div><dt>Type</dt><dd>{asset.type}</dd></div>
          <div><dt>Lifecycle state</dt><dd>{asset.lifecycleStatus}</dd></div>
          <div><dt>Last inspection</dt><dd>{asset.lastInspection}</dd></div>
          <div><dt>Source document</dt><dd>{asset.sourceDocument}</dd></div>
          <div><dt>CO₂ data</dt><dd>{asset.co2Data} — verified quantity / EPD source not connected</dd></div>
        </dl>

        <DetailSection title="Evidence">
          {asset.evidence.map((record) => (
            <div className="spark-line-item" key={record.id}>
              <strong>{record.label}</strong><span>{record.note}</span><ProvenanceBadge value={record.provenance} />
            </div>
          ))}
        </DetailSection>

        <DetailSection title="Lifecycle timeline">
          {asset.lifecycle.map((event) => (
            <div className="spark-line-item" key={`${event.date}-${event.title}`}>
              <strong>{event.date} · {event.title}</strong><span>{event.detail}</span><ProvenanceBadge value={event.provenance} />
            </div>
          ))}
        </DetailSection>

        <DetailSection title="Maintenance / inspection">
          {asset.maintenanceReasons.map((reason) => <div className="spark-line-item" key={reason}><strong>Attention reason</strong><span>{reason}</span></div>)}
          {asset.issueHistory.length > 0
            ? asset.issueHistory.map((item) => <div className="spark-line-item" key={item}><strong>Issue</strong><span>{item}</span></div>)
            : <div className="spark-line-item"><span>No issue recorded in demo history.</span></div>}
          {asset.maintenanceHistory.length > 0
            ? asset.maintenanceHistory.map((item) => <div className="spark-line-item" key={item}><strong>Maintenance</strong><span>{item}</span></div>)
            : <div className="spark-line-item"><span>No maintenance event recorded.</span></div>}
        </DetailSection>

        <DetailSection title="Circular decision">
          <div className="spark-line-item">
            <strong>{changed ? "Human session decision" : "Baseline demo record"}: {asset.circularStatus}</strong>
            <span>{changed ? "Status changed by a user in this demo session. The baseline narrative below remains historical context." : asset.circularDecision}</span>
          </div>
          <div className="spark-line-item"><strong>Decision basis</strong><span>{changed ? "Manual demo-session decision; not persisted as a real project record." : asset.circularDecisionBasis}</span></div>
          <div className="spark-decision-controls">
            {circularStatuses.map((status) => (
              <button key={status} className={asset.circularStatus === status ? "active" : ""} onClick={() => onDecision(status)}>{status}</button>
            ))}
          </div>
        </DetailSection>

        <div className="spark-warning">No real SKANSKA project data is loaded. No kgCO₂e saving is shown without verified quantity, EPD/carbon factor and source provenance.</div>
      </div>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="spark-detail-section"><h3>{title}</h3>{children}</section>;
}

function EnvironmentalPanel({ assets }: { assets: DemoAsset[] }) {
  const rowsStatus = circularStatuses.map((status) => ({ status, count: assets.filter((asset) => asset.circularStatus === status).length }));
  const derived = assets.filter((asset) => asset.provenance === "DERIVED").length;
  const unknown = assets.filter((asset) => asset.provenance === "UNKNOWN").length;

  return (
    <main className="spark-environment">
      <section>
        <h2>Circular status</h2>
        {rowsStatus.map(({ status, count }) => <ReportRow key={status} label={status} value={count} note="Current Project World records" />)}
      </section>
      <section>
        <h2>Provenance</h2>
        <ReportRow label="DERIVED" value={derived} note="Synthetic demonstrator records derived inside the demo dataset" />
        <ReportRow label="UNKNOWN" value={unknown} note="Missing or unverified source data" />
        <ReportRow label="REAL" value={0} note="No real SKANSKA project records loaded" />
      </section>
      <section>
        <h2>CO₂ reporting readiness</h2>
        <ReportRow label="Verified quantity" value="NO" note="Not connected in demonstrator" />
        <ReportRow label="EPD / carbon factor" value="NO" note="Not connected in demonstrator" />
        <ReportRow label="kgCO₂e result" value="UNKNOWN" note="Intentionally not fabricated" />
      </section>
      <section>
        <h2>Maintenance attention</h2>
        {(["HIGH", "MEDIUM", "LOW"] as const).map((level) => (
          <ReportRow
            key={level}
            label={level}
            value={assets.filter((asset) => asset.maintenanceAttention === level).length}
            note={level === "HIGH" ? "Recurring or unresolved issue evidence" : level === "MEDIUM" ? "Review trigger or source gap" : "No current rule-based trigger"}
          />
        ))}
      </section>
    </main>
  );
}

function ReportRow({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <div className="spark-report-row"><span>{label}</span><strong>{value}</strong><span>{note}</span></div>;
}
