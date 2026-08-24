import { useMemo, useState } from "react";
import {
  connectorRuntimeProjections,
  type AdaptiveConnectorId,
} from "./connectorRuntimeProjection";
import { odkEphemeralSnapshot } from "./odkEphemeralSnapshot";
import { openProjectEphemeralSnapshot } from "./openProjectEphemeralSnapshot";
import {
  snipePublicDemoAssetLabel,
  snipePublicDemoSnapshot,
} from "./snipePublicDemoSnapshot";
import "./nexus-visual-baseline.css";

type ConnectorId = "nexus" | AdaptiveConnectorId;

type ConnectorProfile = {
  id: ConnectorId;
  label: string;
  shortLabel: string;
  subtitle: string;
  experience: string;
  runtimeId?: AdaptiveConnectorId;
  sourceBoundary: string;
  notice: string;
  actionLabel: string;
  sourceExample: string;
};

const connectors: ConnectorProfile[] = [
  {
    id: "nexus",
    label: "Nexus Core",
    shortLabel: "N",
    subtitle: "Project Graph context",
    experience: "Nexus native",
    sourceBoundary: "Nexus owns the operating context, not external source records.",
    notice: "This is the neutral Nexus visual state. Connector skins inherit the same spacing, typography, motion and shape grammar while adapting accent and source context.",
    actionLabel: "Nexus context active",
    sourceExample: "Project World · Building 01",
  },
  {
    id: "work-wallet",
    runtimeId: "work-wallet",
    label: "Work Wallet",
    shortLabel: "WW",
    subtitle: "Safety / compliance context",
    experience: "Context only",
    sourceBoundary: "Nexus shell may adapt; source application UI is not modified.",
    notice: "Restricted-vendor control case. This preview deliberately does not reproduce or alter Work Wallet source screens. It demonstrates only Nexus-side context, colour adaptation and provenance treatment.",
    actionLabel: "Open source handoff",
    sourceExample: "Worker eligibility · source reference",
  },
  {
    id: "snipe-it",
    runtimeId: "snipe-it",
    label: "Nexus Tools & Assets",
    shortLabel: "A",
    subtitle: "Snipe-IT engine candidate",
    experience: "Licensed-source UI / API candidate",
    sourceBoundary: "External asset record remains source-owned; Nexus stores mapping/context.",
    notice: "The server-side read adapter exists on the parent connector branch. The asset shown here is a sanitised, ephemeral snapshot obtained by CI from the official public Snipe-IT develop demo. It does not mean a persistent Nexus tenant is configured and no credential is exposed to this browser surface.",
    actionLabel: "Read configured assets",
    sourceExample: `${snipePublicDemoSnapshot.asset.assetTag} · ${snipePublicDemoAssetLabel}`,
  },
  {
    id: "odk",
    runtimeId: "odk",
    label: "Nexus Site Forms",
    shortLabel: "F",
    subtitle: "ODK Central engine candidate",
    experience: "Licensed-source UI / API candidate",
    sourceBoundary: "ODK submission stays externally identified; Nexus links evidence/context.",
    notice: "The Central read adapter exists on the parent connector branch. The form and submission shown here are a sanitised snapshot from a disposable ODK Central Backend v2026.2.0 CI instance. This is not a persistent customer tenant, no bearer token is exposed to the browser, and external identities are not promoted to Nexus Person identities.",
    actionLabel: "Read configured forms",
    sourceExample: `${odkEphemeralSnapshot.form.name} · ${odkEphemeralSnapshot.submission.instanceId}`,
  },
  {
    id: "openproject",
    runtimeId: "openproject",
    label: "Nexus Work",
    shortLabel: "W",
    subtitle: "OpenProject work-package engine candidate",
    experience: "Licensed-source UI / API candidate",
    sourceBoundary: "OpenProject project and work-package records remain source-owned; Nexus stores verified mappings and operating context only.",
    notice: "The work-package read adapter is validated against a disposable OpenProject Community Edition v17.6.0 instance. The project and task below are a sanitised CI snapshot, not a persistent customer tenant. External assignees, statuses and approvals are not automatically promoted into Nexus Person, Evidence or Approval truth.",
    actionLabel: "Read configured work packages",
    sourceExample: `#${openProjectEphemeralSnapshot.workPackage.id} · ${openProjectEphemeralSnapshot.workPackage.subject}`,
  },
];

export default function AdaptiveConnectorLab() {
  const [activeConnector, setActiveConnector] = useState<ConnectorId>("nexus");
  const active = useMemo(
    () => connectors.find((connector) => connector.id === activeConnector) ?? connectors[0],
    [activeConnector],
  );
  const runtime = active.runtimeId ? connectorRuntimeProjections[active.runtimeId] : null;
  const stateLabel = runtime?.stateLabel ?? "ACTIVE BASELINE";
  const actionEnabled = runtime?.state === "READ_READY";

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
          Runtime status is projected from connector contracts. No skin can create API capability, vendor approval or write authority.
        </div>
      </header>

      <section className="nx-lab-contextbar">
        <strong>Residential Building Demo</strong>
        <span>Project World / Building 01</span>
        <div className="nx-lab-context-state">
          <span className="nx-lab-state-dot" />
          <span>{stateLabel}</span>
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
            <strong>
              {active.id === "snipe-it"
                ? `Tool Asset · ${snipePublicDemoSnapshot.asset.assetTag}`
                : active.id === "odk"
                  ? `Inspection Form · ${odkEphemeralSnapshot.form.xmlFormId}`
                  : active.id === "openproject"
                    ? `Project · ${openProjectEphemeralSnapshot.project.identifier}`
                    : "Object Card · Door 02.14"}
            </strong>
            <small>{active.sourceExample}</small>
            {active.id !== "nexus" && <div className="source">SOURCE · {active.shortLabel}</div>}
            {active.id === "snipe-it" && <div className="source">PUBLIC DEMO SNAPSHOT · EPHEMERAL</div>}
            {active.id === "odk" && <div className="source">UPSTREAM BACKEND SNAPSHOT · EPHEMERAL</div>}
            {active.id === "openproject" && <div className="source">UPSTREAM WORK SNAPSHOT · EPHEMERAL</div>}
          </article>

          <article className="nx-lab-node task">
            <strong>
              {active.id === "openproject"
                ? `Work Package · #${openProjectEphemeralSnapshot.workPackage.id}`
                : "Task · Install / inspect"}
            </strong>
            <small>
              {active.id === "openproject"
                ? `${openProjectEphemeralSnapshot.workPackage.subject} · ${openProjectEphemeralSnapshot.workPackage.status}`
                : "Operational action remains linked to project, person, object and evidence."}
            </small>
            {active.id === "openproject" && <div className="source">SOURCE · {active.shortLabel}</div>}
          </article>

          <article className="nx-lab-node evidence">
            <strong>Evidence</strong>
            <small>
              {active.id === "odk"
                ? `${odkEphemeralSnapshot.submission.instanceId} · ${odkEphemeralSnapshot.project.name}`
                : active.id === "openproject"
                  ? `${openProjectEphemeralSnapshot.workPackage.type} · ${openProjectEphemeralSnapshot.workPackage.project}`
                  : "Photo / document / source reference"}
            </small>
            {active.id !== "nexus" && <div className="source">PROVENANCE · {active.shortLabel}</div>}
          </article>

          <nav className="nx-lab-dock" aria-label="Connector dock">
            {connectors.map((connector) => {
              const connectorRuntime = connector.runtimeId ? connectorRuntimeProjections[connector.runtimeId] : null;
              return (
                <button
                  key={connector.id}
                  type="button"
                  className={connector.id === active.id ? "active" : ""}
                  onClick={() => setActiveConnector(connector.id)}
                  aria-pressed={connector.id === active.id}
                >
                  <strong>{connector.label}</strong>
                  <small>{connectorRuntime?.stateLabel ?? connector.experience}</small>
                </button>
              );
            })}
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
              <div className="nx-lab-cell"><span>Runtime</span><strong>{stateLabel}</strong></div>
              <div className="nx-lab-cell"><span>Contract stage</span><strong>{runtime?.migrationPhase ?? "Nexus native"}</strong></div>
              <div className="nx-lab-cell"><span>Auth</span><strong>{runtime?.authMode ?? "Nexus session"}</strong></div>
            </div>

            {runtime && (
              <section className="nx-lab-section">
                <h2>Runtime truth · contract-derived</h2>
                <div className="nx-lab-row"><span>Definition status</span><strong>{runtime.definitionStatus}</strong></div>
                <div className="nx-lab-row"><span>Mode</span><strong>{runtime.mode}</strong></div>
                <div className="nx-lab-row"><span>Presentation status</span><strong>{runtime.presentationStatus}</strong></div>
                <div className="nx-lab-row"><span>Max experience</span><strong>{runtime.maximumExperienceLevel}</strong></div>
                <div className="nx-lab-row"><span>Read capabilities</span><strong>{runtime.readCapabilityCount}</strong></div>
                <div className="nx-lab-row"><span>Graph mutation flag</span><strong>{runtime.canUpdateProjectGraph ? "contract allows · release still gated" : "disabled"}</strong></div>
                <div className="nx-lab-row"><span>Nexus evidence flag</span><strong>{runtime.canCreateNexusEvidence ? "contract allows · policy still gated" : "disabled"}</strong></div>
              </section>
            )}

            {active.id === "snipe-it" && (
              <section className="nx-lab-section">
                <h2>Upstream E2E proof · public demo snapshot</h2>
                <div className="nx-lab-row"><span>Source</span><strong>{snipePublicDemoSnapshot.sourceLabel}</strong></div>
                <div className="nx-lab-row"><span>Asset</span><strong>{snipePublicDemoSnapshot.asset.assetTag} · {snipePublicDemoAssetLabel}</strong></div>
                <div className="nx-lab-row"><span>Type</span><strong>{snipePublicDemoSnapshot.asset.category} · {snipePublicDemoSnapshot.asset.manufacturer}</strong></div>
                <div className="nx-lab-row"><span>Status</span><strong>{snipePublicDemoSnapshot.asset.status}</strong></div>
                <div className="nx-lab-row"><span>Location</span><strong>{snipePublicDemoSnapshot.asset.location}</strong></div>
                <div className="nx-lab-row"><span>Captured</span><strong>{snipePublicDemoSnapshot.capturedAt}</strong></div>
                <div className="nx-lab-row"><span>Persistence</span><strong>ephemeral CI snapshot · not a configured Nexus tenant</strong></div>
              </section>
            )}

            {active.id === "odk" && (
              <section className="nx-lab-section">
                <h2>Upstream E2E proof · ephemeral Central snapshot</h2>
                <div className="nx-lab-row"><span>Source</span><strong>{odkEphemeralSnapshot.sourceLabel}</strong></div>
                <div className="nx-lab-row"><span>Project</span><strong>#{odkEphemeralSnapshot.project.id} · {odkEphemeralSnapshot.project.name}</strong></div>
                <div className="nx-lab-row"><span>Form</span><strong>{odkEphemeralSnapshot.form.xmlFormId} · v{odkEphemeralSnapshot.form.version}</strong></div>
                <div className="nx-lab-row"><span>Form state</span><strong>{odkEphemeralSnapshot.form.state}</strong></div>
                <div className="nx-lab-row"><span>Submission</span><strong>{odkEphemeralSnapshot.submission.instanceId}</strong></div>
                <div className="nx-lab-row"><span>Captured</span><strong>{odkEphemeralSnapshot.capturedAt}</strong></div>
                <div className="nx-lab-row"><span>Persistence</span><strong>disposable CI database · not ODK Cloud or a configured customer tenant</strong></div>
              </section>
            )}

            {active.id === "openproject" && (
              <section className="nx-lab-section">
                <h2>Upstream E2E proof · ephemeral work snapshot</h2>
                <div className="nx-lab-row"><span>Source</span><strong>{openProjectEphemeralSnapshot.sourceLabel}</strong></div>
                <div className="nx-lab-row"><span>Project</span><strong>#{openProjectEphemeralSnapshot.project.id} · {openProjectEphemeralSnapshot.project.name}</strong></div>
                <div className="nx-lab-row"><span>Identifier</span><strong>{openProjectEphemeralSnapshot.project.identifier}</strong></div>
                <div className="nx-lab-row"><span>Work package</span><strong>#{openProjectEphemeralSnapshot.workPackage.id} · {openProjectEphemeralSnapshot.workPackage.subject}</strong></div>
                <div className="nx-lab-row"><span>Type / status</span><strong>{openProjectEphemeralSnapshot.workPackage.type} · {openProjectEphemeralSnapshot.workPackage.status}</strong></div>
                <div className="nx-lab-row"><span>Captured</span><strong>{openProjectEphemeralSnapshot.capturedAt}</strong></div>
                <div className="nx-lab-row"><span>Persistence</span><strong>disposable Community Edition CI instance · not a configured customer tenant</strong></div>
              </section>
            )}

            <section className="nx-lab-section">
              <h2>Source boundary</h2>
              <div className="nx-lab-row"><span>External source</span><strong>{runtime?.sourceOfTruth ?? active.sourceExample}</strong></div>
              <div className="nx-lab-row"><span>Nexus behaviour</span><strong>{active.sourceBoundary}</strong></div>
              <div className="nx-lab-row"><span>Graph provenance</span><strong>Source ID + connector ID + visual edge/badge</strong></div>
              {runtime && <div className="nx-lab-row"><span>Legal mode</span><strong>{runtime.legalMode}</strong></div>}
            </section>

            <section className="nx-lab-section">
              <h2>Capability truth</h2>
              <div className="nx-lab-row"><span>Declared reads</span><strong>{runtime?.capabilitySummary || "Nexus canonical context"}</strong></div>
              <div className="nx-lab-row"><span>Safe runtime interpretation</span><strong>{runtime?.truthNote ?? "Native Nexus context is active."}</strong></div>
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
              <button type="button" className="primary" disabled={!actionEnabled}>{active.actionLabel}</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
