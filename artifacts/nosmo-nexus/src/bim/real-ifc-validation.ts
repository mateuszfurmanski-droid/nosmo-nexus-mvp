import type { InstallationPilot } from "./installation-pilots";
import type { IfcGuidMapping, IfcLocalModelSession } from "./ifc-mapping";
import type { IfcSourcePropertiesSnapshot } from "./ifc-source-properties";

export const REAL_IFC_VALIDATION_SCHEMA = "nexus-real-ifc-validation/v1" as const;

export type RealIfcValidationStepState =
  | "BLOCKED"
  | "READY_FOR_MANUAL_CHECK"
  | "MANUAL_REQUIRED"
  | "NOT_VALIDATED";

export type RealIfcValidationStep = {
  id: string;
  label: string;
  state: RealIfcValidationStepState;
  automatedEvidence: string;
  manualEvidenceRequired: string[];
  boundary: string;
};

export type RealIfcValidationProtocol = {
  schema: typeof REAL_IFC_VALIDATION_SCHEMA;
  nexusObjectId: string;
  objectCode: string;
  tradeName: string;
  workPackageId: string;
  taskId: string;
  source: {
    currentIfcLoaded: boolean;
    mappedIfcGlobalId?: string;
    diagnosticStepId?: number;
    sourceFileName?: string;
    sourceFileSha256?: string;
    sourcePropertiesLoaded: boolean;
  };
  steps: RealIfcValidationStep[];
  summary: {
    blocked: number;
    readyForManualCheck: number;
    manualRequired: number;
    notValidated: number;
  };
  productionBoundary: string[];
};

function stateCounts(steps: RealIfcValidationStep[]): RealIfcValidationProtocol["summary"] {
  return steps.reduce(
    (summary, step) => {
      if (step.state === "BLOCKED") summary.blocked += 1;
      if (step.state === "READY_FOR_MANUAL_CHECK") summary.readyForManualCheck += 1;
      if (step.state === "MANUAL_REQUIRED") summary.manualRequired += 1;
      if (step.state === "NOT_VALIDATED") summary.notValidated += 1;
      return summary;
    },
    { blocked: 0, readyForManualCheck: 0, manualRequired: 0, notValidated: 0 },
  );
}

export function createRealIfcValidationProtocol(params: {
  pilot: InstallationPilot;
  mapping?: IfcGuidMapping | null;
  modelSession?: IfcLocalModelSession | null;
  sourceProperties?: IfcSourcePropertiesSnapshot | null;
}): RealIfcValidationProtocol {
  const { pilot, mapping = null, modelSession = null, sourceProperties = null } = params;
  const hasCurrentIfc = Boolean(modelSession);
  const hasMapping = Boolean(mapping?.ifcGlobalId);
  const hasSourceProperties = Boolean(sourceProperties && mapping?.ifcGlobalId === sourceProperties.globalId);

  const steps: RealIfcValidationStep[] = [
    {
      id: "representative-current-ifc",
      label: "Representative current IFC opened locally",
      state: hasCurrentIfc ? "READY_FOR_MANUAL_CHECK" : "BLOCKED",
      automatedEvidence: hasCurrentIfc
        ? `${modelSession?.fileName ?? "local IFC"} is open in the browser session; raw IFC remains session-local.`
        : "No local IFC session is open on this Object Card.",
      manualEvidenceRequired: [
        "confirm the IFC is a representative project/model export, not a trivial fixture",
        "record the source system/export date outside the Project Graph envelope",
        "verify the file is authorised for this validation use",
      ],
      boundary: "Opening a file locally is not design approval, source-of-truth acceptance, or production storage.",
    },
    {
      id: "explicit-globalid-mapping",
      label: "Explicit IFC GlobalId -> Nexus Object ID mapping",
      state: hasMapping ? "READY_FOR_MANUAL_CHECK" : "BLOCKED",
      automatedEvidence: hasMapping
        ? `${mapping?.ifcGlobalId} is explicitly mapped to ${pilot.object.id}; STEP #${mapping?.ifcStepId} remains diagnostic only.`
        : "No explicit IFC GlobalId mapping exists for this Nexus Object ID.",
      manualEvidenceRequired: [
        "confirm the selected object is the intended installed asset in a trusted IFC viewer",
        "verify STEP/express ID is not used as persistent identity",
        "record any ambiguity as manual review rather than accepting a heuristic match",
      ],
      boundary: "Nexus may suggest candidates, but mapping must not be auto-approved by heuristic similarity.",
    },
    {
      id: "source-provenance-fingerprint",
      label: "Source provenance and fingerprint captured where available",
      state: mapping?.sourceFileSha256 ? "READY_FOR_MANUAL_CHECK" : hasMapping ? "MANUAL_REQUIRED" : "BLOCKED",
      automatedEvidence: mapping?.sourceFileSha256
        ? `SHA-256 ${mapping.sourceFileSha256.slice(0, 16)}… captured for ${mapping.sourceFileName}.`
        : hasMapping
          ? "Mapping exists, but SHA-256 is unavailable in this browser/session path."
          : "No mapped IFC source exists yet.",
      manualEvidenceRequired: [
        "compare file name, schema and fingerprint with the validation record",
        "confirm no raw IFC, Psets or geometry payloads are persisted to the Project Graph",
      ],
      boundary: "Fingerprint proves source identity only; it does not validate geometry, coordinates or revision authority.",
    },
    {
      id: "trusted-viewer-geometry-check",
      label: "Geometry selection compared with trusted IFC viewer",
      state: hasMapping && hasCurrentIfc ? "MANUAL_REQUIRED" : "BLOCKED",
      automatedEvidence: hasMapping && hasCurrentIfc
        ? "Nexus has enough local context to run a human geometry comparison against a trusted IFC viewer."
        : "A mapped GlobalId and open IFC session are required before geometry comparison can be attempted.",
      manualEvidenceRequired: [
        "open the same IFC in a trusted BIM/IFC viewer",
        "select the same IFC GlobalId and compare object type/name/location visually",
        "record discrepancies as NOT VALIDATED, not as movement/clash/tolerance evidence",
      ],
      boundary: "Nexus geometry preview is operational navigation, not clash detection, survey validation or tolerance certification.",
    },
    {
      id: "source-properties-check",
      label: "IFC source properties / Psets checked as model context",
      state: hasSourceProperties ? "READY_FOR_MANUAL_CHECK" : hasMapping && hasCurrentIfc ? "MANUAL_REQUIRED" : "BLOCKED",
      automatedEvidence: hasSourceProperties
        ? `${sourceProperties?.propertySets.length ?? 0} Pset groups, ${sourceProperties?.typeProperties.length ?? 0} type records and ${sourceProperties?.materials.length ?? 0} material records loaded session-only.`
        : hasMapping && hasCurrentIfc
          ? "Full WASM/source property read still needs real-browser manual execution."
          : "Source properties require an open IFC session and mapped object.",
      manualEvidenceRequired: [
        "compare selected item fields/Psets/type/material values with a trusted IFC viewer",
        "verify properties do not automatically change readiness, procurement, evidence, inspection or as-built state",
      ],
      boundary: "IFC Psets are model-source data. They are not Nexus operational state or site truth by themselves.",
    },
    {
      id: "revision-pair-check",
      label: "Two-revision IFC comparison protocol",
      state: hasMapping ? "MANUAL_REQUIRED" : "BLOCKED",
      automatedEvidence: hasMapping
        ? "Mapped GlobalId is available as the cross-revision identity anchor for a baseline/current IFC pair."
        : "Revision comparison requires a mapped IFC GlobalId first.",
      manualEvidenceRequired: [
        "use two real revisions from the same project lineage",
        "verify IFCPROJECT GlobalId / units / coordination matrix gates",
        "test same GlobalId with changed STEP ID and removed-object cases",
        "do not remap to the most similar object automatically",
      ],
      boundary: "Revision intelligence may create HUMAN REVIEW REQUIRED or COMPARISON_BLOCKED; it must not mutate work state silently.",
    },
    {
      id: "spatial-connector-check",
      label: "SpatialConnector payload checked for bounded partner hand-off",
      state: hasMapping ? "READY_FOR_MANUAL_CHECK" : "MANUAL_REQUIRED",
      automatedEvidence: hasMapping
        ? `Hand-off can carry Nexus Object ID ${pilot.object.id} plus mapped IFC GlobalId ${mapping?.ifcGlobalId}; no raw IFC/Psets/mesh payload is included.`
        : `Hand-off remains synthetic/manual for ${pilot.object.id}; no IFC GlobalId is available yet.`,
      manualEvidenceRequired: [
        "confirm the payload does not imply live API, webhook, deep link or two-way sync",
        "validate any FabStation/spatial-partner capability against partner evidence before changing maturity label",
      ],
      boundary: "Manual mapping is not integration; a launcher is not live sync.",
    },
  ];

  return {
    schema: REAL_IFC_VALIDATION_SCHEMA,
    nexusObjectId: pilot.object.id,
    objectCode: pilot.object.code,
    tradeName: pilot.tradeName,
    workPackageId: pilot.work.packageId,
    taskId: pilot.work.taskId,
    source: {
      currentIfcLoaded: hasCurrentIfc,
      mappedIfcGlobalId: mapping?.ifcGlobalId,
      diagnosticStepId: mapping?.ifcStepId,
      sourceFileName: mapping?.sourceFileName ?? modelSession?.fileName,
      sourceFileSha256: mapping?.sourceFileSha256 ?? modelSession?.sha256,
      sourcePropertiesLoaded: hasSourceProperties,
    },
    steps,
    summary: stateCounts(steps),
    productionBoundary: [
      "manual validation records must identify the person/tool/date used for the trusted-viewer comparison",
      "no raw IFC, full Psets, geometry arrays, meshes or credentials may be written to Project Graph URLs or Change Event envelopes",
      "real-browser Full WASM execution must be validated before claiming runtime PASS",
      "Android/Samsung Fold interaction remains separate manual validation",
      "partner capability evidence is required before increasing SpatialConnector maturity beyond SYNTHETIC_DEMO/MANUAL_MAPPING",
    ],
  };
}
