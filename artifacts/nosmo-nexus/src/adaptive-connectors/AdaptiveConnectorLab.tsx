import { useMemo, useState } from "react";
import "./nexus-visual-baseline.css";

type ConnectorId = "nexus" | "work-wallet" | "snipe-it" | "odk";

type ConnectorProfile = {
  id: ConnectorId;
  label: string;
  shortLabel: string;
  subtitle: string;
  experience: string;
  legalMode: string;
  capability: string;
  sourceBoundary: string;
  state: string;
  notice: string;
  actionLabel: string;
  actionEnabled: boolean;
  sourceExample: string;
};

const connectors: ConnectorProfile[] = [
  {
    id: "nexus",
    label: "Nexus Core",
    shortLabel: "N",
    subtitle: "Project Graph context",
    experience: "Nexus native",
    legalMode: "NEXUS_NATIVE",
    capability: "Canonical Project Memory / graph context",
    sourceBoundary: "Nexus owns the operating context, not external source records.",
    state: "ACTIVE BASELINE",
    notice: "This is the neutral Nexus visual state. Connector skins inherit the same spacing, typography, motion and shape grammar while adapting accent and source context.",
    actionLabel: "Nexus context active",
    actionEnabled: false,
    sourceExample: "Project World · Building 01",
  },
  {
    id: "work-wallet",
    label: "Work Wallet",
    shortLabel: "WW",
    subtitle: "Safety / compliance context",
    experience: "Context only",
    legalMode: "CLOSED_VENDOR_NO_APPROVAL",
    capability: "Existing demo/reference connector only",
    sourceBoundary: "Nexus shell may adapt; source application UI is not modified.",
    state: "DEMO · NO VENDOR APPROVAL",
    notice: "Restricted-vendor control case. This preview deliberately does not reproduce or alter Work Wallet source screens. It demonstrates only Nexus-side context, colour adaptation and provenance treatment.",
    actionLabel: "Open source handoff",
    actionEnabled: false,
    sourceExample: "Worker eligibility · source reference",
  },
  {
    id: "snipe-it",
    label: "Nexus Tools & Assets",
    shortLabel: "A",
    subtitle: "Snipe-IT engine candidate",
    experience: "Licensed-source UI / API candidate",
    legalMode: "OPEN_SOURCE_MODIFIABLE",
    capability: "Read adapter prepared · tenant not configured",
    sourceBoundary: "External asset record remains source-owned; Nexus stores mapping/context.",
    state: "ADAPTER READY · NOT CONNECTED",
    notice: "The server-side read adapter exists on the parent connector branch. No instance URL or bearer token is stored in GitHub and no automatic graph mutation is enabled.",
    actionLabel: "Connect test tenant later",
    actionEnabled: false,
    sourceExample: "Asset HW-0042 · Cordless drill",
  },
  {
    id: "odk",
    label: "Nexus Site Forms",
    shortLabel: "F",
    subtitle: "ODK Central engine candidate",
    experience: "Licensed-source UI / API candidate",
    legalMode: "OPEN_SOURCE_MODIFIABLE",
    capability: "Projects / forms / submissions read adapter prepared",
    sourceBoundary: "ODK submission stays externally identified; Nexus links evidence/context.",
    state: "ADAPTER READY · NOT CONNECTED",
    notice: "The Central read adapter exists on the parent connector branch. No tenant or App User secret is configured. External identities are not promoted to Nexus Person identities.",
    actionLabel: "Connect test Central later",
    actionEnabled: false,
    sourceExample: "Fire door inspection · Submission demo-018",
  },
];

export default function AdaptiveConnectorLab() {
  const [activeConnector, setActiveConnector] = useState<ConnectorId>("nexus");
  const active = useMemo(
    () => connectors.find((connector) => connector.id === activeConnector) ?? connectors[0],
    [activeConnector],
  );

  return (
    <main className="nx-connector-lab" data-connector={active.id}>
      <header className="nx-lab-topbar">
        <div className="nx-lab-brand">
          <div className="nx-lab-mark">N</div>
          <div>
            <strong>NEXUS</strong>
            <small>Adaptive Connector Lab</small>
          </div>
        </div>
        <div className="nx-lab-tabs"><span>Project Graph</span></div>
        <div className="nx-lab-truth">
          Isolated visual integration lab. No vendor approval, live tenant or external write capability is implied by presentation state.
        </div>
      </header>

      <section className="nx-lab-contextbar">
        <strong>Residential Building Demo</strong>
        <span>Project World / Building 01</span>
        <div className="nx-lab-context-state">
          <span className="nx-lab-state-dot" />
          <span>{active.state}</span>
        </div>
      </section>

      <div className="nx-lab-workspace">
        <section className="nx-lab-graph" aria-label="Nexus Project Graph connector preview">
          <div className="nx-lab-graph-title">Project Graph · connector-aware shell</div>
          <span className="nx-lab-connector-line nx-lab-line-a" />
          <span className="nx-lab-connector-line nx-lab-line-b" />
          <span className="nx-lab-connector-line nx-lab-line-c" />
          <span className="nx-lab-connector-line nx-lab-line-d" />

          <article className="nx-lab-node center">
            <strong>Building 01</strong>
            <small>Persistent Nexus project context</small>
            <div className="source">ACTIVE · {active.label}</div>
          </article>

          <article className="nx-lab-node person">
            <strong>Person Card · Installer</strong>
            <small>Role, project participation and competence remain Nexus-controlled.</small>
          </article>

          <article className="nx-lab-node asset">
            <strong>{active.id === "snipe-it" ? "Tool Asset · HW-0042" : "Object Card · Door 02.14"}</strong>
            <small>{active.sourceExample}</small>
            {active.id !== "nexus" && <div className="source">SOURCE · {active.shortLabel}</div>}
          </article>

          <article className="nx-lab-node task">
            <strong>Task · Install / inspect</strong>
            <small>Operational action remains linked to project, person, object and evidence.</small>
          </article>

          <article className="nx-lab-node evidence">
            <strong>Evidence</strong>
            <small>{active.id === "odk" ? "Submission reference linked to task" : "Photo / document / source reference"}</small>
            {active.id !== "nexus" && <div className="source">PROVENANCE · {active.shortLabel}</div>}
          </article>

          <nav className="nx-lab-dock" aria-label="Connector dock">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                type="button"
                className={connector.id === active.id ? "active" : ""}
                onClick={() => setActiveConnector(connector.id)}
                aria-pressed={connector.id === active.id}
              >
                <strong>{connector.label}</strong>
                <small>{connector.experience}</small>
              </button>
            ))}
          </nav>
        </section>

        <aside className="nx-lab-sidecar">
          <div className="nx-lab-sidecar-head">
            <div className="nx-lab-eyebrow">Adaptive Integration Context</div>
            <h1>{active.label}</h1>
            <p>{active.subtitle}</p>
          </div>

          <div className="nx-lab-sidecar-body">
            <div className="nx-lab-status-grid">
              <div className="nx-lab-cell"><span>Experience</span><strong>{active.experience}</strong></div>
              <div className="nx-lab-cell"><span>State</span><strong>{active.state}</strong></div>
              <div className="nx-lab-cell"><span>Legal mode</span><strong>{active.legalMode}</strong></div>
              <div className="nx-lab-cell"><span>Capability truth</span><strong>{active.capability}</strong></div>
            </div>

            <section className="nx-lab-section">
              <h2>Source boundary</h2>
              <div className="nx-lab-row"><span>External source</span><strong>{active.sourceExample}</strong></div>
              <div className="nx-lab-row"><span>Nexus behaviour</span><strong>{active.sourceBoundary}</strong></div>
              <div className="nx-lab-row"><span>Graph provenance</span><strong>Source ID + connector ID + visual edge/badge</strong></div>
            </section>

            <section className="nx-lab-section">
              <h2>Visual grammar inherited from PR91</h2>
              <div className="nx-lab-row"><span>Typography</span><strong>Compact Inter / system stack</strong></div>
              <div className="nx-lab-row"><span>Surfaces</span><strong>Low-noise dark panels + thin borders</strong></div>
              <div className="nx-lab-row"><span>Shapes</span><strong>Nexus asymmetric compact controls</strong></div>
              <div className="nx-lab-row"><span>Context adaptation</span><strong>Accent, lines, active states and provenance only</strong></div>
            </section>

            <div className="nx-lab-notice"><strong>Boundary:</strong> {active.notice}</div>

            <div className="nx-lab-actions">
              <button type="button" onClick={() => setActiveConnector("nexus")}>Return to Nexus</button>
              <button type="button" className="primary" disabled={!active.actionEnabled}>{active.actionLabel}</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
