import type { InstallationPilot } from "./installation-pilots";
import type { IfcGuidMapping } from "./ifc-mapping";

export const SPATIAL_CONNECTOR_SCHEMA = "nexus-spatial-connector/v1" as const;
export const SPATIAL_HAND_OFF_SCHEMA = "nexus-spatial-hand-off/v1" as const;

export type SpatialConnectorMaturity =
  | "LIVE_API"
  | "WEBHOOK"
  | "FILE_EXCHANGE"
  | "DEEP_LINK"
  | "MANUAL_MAPPING"
  | "SYNTHETIC_DEMO";

export type SpatialConnectorClaimStatus =
  | "CONFIRMED"
  | "UNVERIFIED"
  | "BLOCKED_PENDING_PARTNER_EVIDENCE"
  | "SYNTHETIC_DEMO_ONLY";

export type SpatialConnectorCapability = {
  id: string;
  label: string;
  maturity: SpatialConnectorMaturity;
  status: SpatialConnectorClaimStatus;
  boundary: string;
  evidenceRequiredBeforeClaim: string[];
};

export type SpatialConnectorDefinition = {
  schema: typeof SPATIAL_CONNECTOR_SCHEMA;
  connectorId: string;
  displayName: string;
  vendorNeutral: boolean;
  currentMaturity: SpatialConnectorMaturity;
  currentStatus: SpatialConnectorClaimStatus;
  partnerPhrase: string;
  capabilities: SpatialConnectorCapability[];
  prohibitedClaims: string[];
  productionGates: string[];
};

export type SpatialHandOffPayload = {
  schema: typeof SPATIAL_HAND_OFF_SCHEMA;
  connectorId: string;
  connectorDisplayName: string;
  maturity: SpatialConnectorMaturity;
  claimStatus: SpatialConnectorClaimStatus;
  createdAt: string;
  source: "bim-object-card" | "change-control" | "relationship-tree";
  object: {
    nexusObjectId: string;
    ifcGlobalId?: string;
    ifcStepIdDiagnostic?: number;
    ifcEntityType?: string;
    sourceFileName?: string;
    sourceFileSha256?: string;
    syntheticExternalId?: string;
    modelRevision: string;
    objectCode: string;
    objectName: string;
    location: string;
  };
  operationalContext: {
    tradeId: InstallationPilot["tradeId"];
    tradeName: string;
    workPackageId: string;
    taskId: string;
    supervisor: string;
    assignedTeam: string;
  };
  boundaries: {
    containsIfcFile: false;
    containsIfcPsets: false;
    containsGeometryPayload: false;
    containsMeshPayload: false;
    writesPartnerState: false;
    writesNexusState: false;
    isLiveSync: false;
    requiresHumanMappingOrReview: true;
  };
  allowedUse: string[];
};

export const spatialConnectorMaturityLabels: Record<SpatialConnectorMaturity, string> = {
  LIVE_API: "LIVE API",
  WEBHOOK: "WEBHOOK",
  FILE_EXCHANGE: "FILE EXCHANGE",
  DEEP_LINK: "DEEP LINK",
  MANUAL_MAPPING: "MANUAL MAPPING",
  SYNTHETIC_DEMO: "SYNTHETIC DEMO",
};

export const fabStationSpatialConnector: SpatialConnectorDefinition = {
  schema: SPATIAL_CONNECTOR_SCHEMA,
  connectorId: "fabstation-candidate",
  displayName: "FabStation candidate",
  vendorNeutral: true,
  currentMaturity: "SYNTHETIC_DEMO",
  currentStatus: "BLOCKED_PENDING_PARTNER_EVIDENCE",
  partnerPhrase: "FabStation guides the work; Nexus remembers the work.",
  capabilities: [
    {
      id: "field-presentation",
      label: "Field model presentation / spatial guidance",
      maturity: "SYNTHETIC_DEMO",
      status: "UNVERIFIED",
      boundary: "Shown only as a candidate spatial partner capability until partner documentation or a real hand-off proves it.",
      evidenceRequiredBeforeClaim: [
        "partner-confirmed viewer or field presentation mode",
        "supported input/output format",
        "manual validation with one representative object",
      ],
    },
    {
      id: "object-location-hand-off",
      label: "Object-location hand-off",
      maturity: "MANUAL_MAPPING",
      status: "BLOCKED_PENDING_PARTNER_EVIDENCE",
      boundary: "Nexus may prepare stable identity/context for a human or adapter, but must not call this live sync without a confirmed API, deep link, or file contract.",
      evidenceRequiredBeforeClaim: [
        "accepted hand-off identifier format",
        "IFC GlobalId or object reference compatibility",
        "confirmed partner-side behaviour after launch/import",
      ],
    },
    {
      id: "partner-state-writeback",
      label: "Partner state write-back",
      maturity: "LIVE_API",
      status: "BLOCKED_PENDING_PARTNER_EVIDENCE",
      boundary: "Disabled. No Nexus code may write FabStation/spatial-partner operational state without an authenticated contract and audit semantics.",
      evidenceRequiredBeforeClaim: [
        "authenticated API contract",
        "write scopes and idempotency model",
        "failure/retry semantics",
        "tenant/project permission mapping",
      ],
    },
  ],
  prohibitedClaims: [
    "public API",
    "SDK",
    "deep-linking",
    "embeddable viewer",
    "event webhook",
    "object-level sync",
    "two-way state sync",
    "survey validation",
    "clash detection",
    "fabrication tolerance validation",
  ],
  productionGates: [
    "partner-confirmed capability evidence",
    "representative IFC object hand-off test",
    "identity mapping through IFC GlobalId and Nexus Object ID",
    "no raw IFC/Psets/meshes in launch payloads",
    "manual review before any operational action",
    "authenticated connector contract before external writes",
  ],
};

export function createSpatialHandOffPayload(params: {
  pilot: InstallationPilot;
  mapping?: IfcGuidMapping | null;
  connector?: SpatialConnectorDefinition;
  createdAt?: string;
  source?: SpatialHandOffPayload["source"];
}): SpatialHandOffPayload {
  const connector = params.connector ?? fabStationSpatialConnector;
  const mapping = params.mapping ?? null;

  return {
    schema: SPATIAL_HAND_OFF_SCHEMA,
    connectorId: connector.connectorId,
    connectorDisplayName: connector.displayName,
    maturity: connector.currentMaturity,
    claimStatus: connector.currentStatus,
    createdAt: params.createdAt ?? new Date().toISOString(),
    source: params.source ?? "bim-object-card",
    object: {
      nexusObjectId: params.pilot.object.id,
      ifcGlobalId: mapping?.ifcGlobalId,
      ifcStepIdDiagnostic: mapping?.ifcStepId,
      ifcEntityType: mapping?.ifcEntityType,
      sourceFileName: mapping?.sourceFileName,
      sourceFileSha256: mapping?.sourceFileSha256,
      syntheticExternalId: mapping ? undefined : params.pilot.object.externalId,
      modelRevision: params.pilot.object.revision,
      objectCode: params.pilot.object.code,
      objectName: params.pilot.object.name,
      location: params.pilot.object.location,
    },
    operationalContext: {
      tradeId: params.pilot.tradeId,
      tradeName: params.pilot.tradeName,
      workPackageId: params.pilot.work.packageId,
      taskId: params.pilot.work.taskId,
      supervisor: params.pilot.work.supervisor,
      assignedTeam: params.pilot.work.assignedTeam,
    },
    boundaries: {
      containsIfcFile: false,
      containsIfcPsets: false,
      containsGeometryPayload: false,
      containsMeshPayload: false,
      writesPartnerState: false,
      writesNexusState: false,
      isLiveSync: false,
      requiresHumanMappingOrReview: true,
    },
    allowedUse: [
      "identify the Nexus object for a spatial hand-off review",
      "carry bounded operational context for a human or future adapter",
      "support manual mapping or partner validation without duplicating BIM geometry",
    ],
  };
}

export function getSpatialConnectorBoundaryWarnings(payload: SpatialHandOffPayload): string[] {
  const warnings: string[] = [];

  if (!payload.object.ifcGlobalId) {
    warnings.push("No mapped IFC GlobalId is present; this hand-off remains synthetic/manual and cannot be treated as model-source linked.");
  }

  if (payload.claimStatus !== "CONFIRMED") {
    warnings.push("Connector capability is not confirmed; do not claim live integration, live sync, API, webhook or deep-link support.");
  }

  if (payload.boundaries.writesPartnerState || payload.boundaries.writesNexusState || payload.boundaries.isLiveSync) {
    warnings.push("SpatialConnector hand-off payloads must stay read-only and cannot imply two-way state sync.");
  }

  return warnings;
}
