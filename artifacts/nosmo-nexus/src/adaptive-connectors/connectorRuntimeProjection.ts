import { workWalletConnector } from "../../../../src/connectors/work-wallet/workWalletConnector";
import { workWalletPresentation } from "../../../../src/connectors/work-wallet/workWalletPresentation";
import { snipeItConnector, snipeItPresentation } from "../../../../src/connectors/snipe-it/snipeItConnector";
import { odkFieldFormsConnector, odkFieldFormsPresentation } from "../../../../src/connectors/odk/odkConnector";

export type AdaptiveConnectorId = "work-wallet" | "snipe-it" | "odk";

export type ConnectorRuntimeProbe = {
  configured: boolean;
  reachable?: boolean;
  lastError?: string | null;
};

export type ConnectorRuntimeState =
  | "CONTRACT_ONLY"
  | "CONFIG_REQUIRED"
  | "DISCONNECTED"
  | "READ_READY"
  | "ERROR";

export type ConnectorRuntimeProjection = {
  id: AdaptiveConnectorId;
  connectorDefinitionId: string;
  state: ConnectorRuntimeState;
  stateLabel: string;
  definitionStatus: string;
  migrationPhase: string;
  mode: string;
  authMode: string;
  presentationStatus: string;
  maximumExperienceLevel: string;
  legalMode: string;
  capabilitySummary: string;
  readCapabilityCount: number;
  canCreateNexusEvidence: boolean;
  canUpdateProjectGraph: boolean;
  sourceOfTruth: string;
  truthNote: string;
};

const sourceContracts = {
  "work-wallet": {
    runtime: workWalletConnector,
    presentation: workWalletPresentation,
  },
  "snipe-it": {
    runtime: snipeItConnector,
    presentation: snipeItPresentation,
  },
  odk: {
    runtime: odkFieldFormsConnector,
    presentation: odkFieldFormsPresentation,
  },
} as const;

function resolveState(
  id: AdaptiveConnectorId,
  probe: ConnectorRuntimeProbe | undefined,
): ConnectorRuntimeState {
  const { runtime, presentation } = sourceContracts[id];

  if (probe?.lastError) return "ERROR";

  // Closed-vendor/context-only connectors must never look live merely because a
  // presentation skin exists. Work Wallet remains contract/reference-only until
  // a stronger runtime/approval path is explicitly released.
  if (
    presentation.maximumExperienceLevel === "context" ||
    runtime.authMode === "pending" ||
    runtime.migrationPhase === "phase-2-contract"
  ) {
    return "CONTRACT_ONLY";
  }

  if (!probe?.configured) return "CONFIG_REQUIRED";
  if (probe.reachable === false) return "DISCONNECTED";
  if (probe.reachable === true) return "READ_READY";

  return "DISCONNECTED";
}

const stateLabels: Record<ConnectorRuntimeState, string> = {
  CONTRACT_ONLY: "CONTRACT / REFERENCE ONLY",
  CONFIG_REQUIRED: "ADAPTER READY · CONFIG REQUIRED",
  DISCONNECTED: "CONFIGURED · NOT REACHABLE",
  READ_READY: "LIVE READ READY",
  ERROR: "RUNTIME ERROR",
};

export function projectConnectorRuntime(
  id: AdaptiveConnectorId,
  probe?: ConnectorRuntimeProbe,
): ConnectorRuntimeProjection {
  const { runtime, presentation } = sourceContracts[id];
  const state = resolveState(id, probe);
  const readCapabilities = runtime.capabilities.filter(
    (capability) => capability.direction === "read" || capability.direction === "read-write",
  );

  return {
    id,
    connectorDefinitionId: runtime.definition.id,
    state,
    stateLabel: stateLabels[state],
    definitionStatus: runtime.definition.status,
    migrationPhase: runtime.migrationPhase,
    mode: runtime.mode,
    authMode: runtime.authMode,
    presentationStatus: presentation.presentationStatus,
    maximumExperienceLevel: presentation.maximumExperienceLevel,
    legalMode: presentation.legal.legalMode,
    capabilitySummary: readCapabilities.map((capability) => capability.label).join(" · "),
    readCapabilityCount: readCapabilities.length,
    canCreateNexusEvidence: runtime.canCreateNexusEvidence,
    canUpdateProjectGraph: runtime.canUpdateProjectGraph,
    sourceOfTruth: runtime.definition.sourceOfTruth,
    truthNote:
      state === "CONTRACT_ONLY"
        ? "The connector contract exists, but this presentation must not imply a released live vendor integration."
        : state === "CONFIG_REQUIRED"
          ? "The read adapter exists in code, but no tenant/credential probe has been supplied to this client-safe projection."
          : state === "READ_READY"
            ? "A server-side probe has confirmed configuration and reachability; secrets remain outside the browser."
            : state === "DISCONNECTED"
              ? "Configuration exists, but the last safe reachability probe did not confirm a live read path."
              : "The last safe runtime probe reported an error. No secret or raw credential is exposed to the browser.",
  };
}

export const connectorRuntimeProjections: Record<AdaptiveConnectorId, ConnectorRuntimeProjection> = {
  "work-wallet": projectConnectorRuntime("work-wallet"),
  "snipe-it": projectConnectorRuntime("snipe-it"),
  odk: projectConnectorRuntime("odk"),
};
