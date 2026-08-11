import {
  assertNoCrossProjectCloudRoute,
  resolveNexusCloudRoute,
  type NexusCloudAssetDraft,
  type NexusCloudClassificationStatus,
  type NexusCloudFolderRef,
  type NexusCloudProjectId,
  type NexusCloudWorldId,
} from "./nexus-cloud-drive-manifest";

export const NEXUS_CLOUD_PENDING_ASSET_SCHEMA = "nexus-cloud-pending-asset/v1" as const;

export type NexusCloudAssetType =
  | "photo"
  | "video"
  | "pdf"
  | "drawing"
  | "ifc"
  | "bim"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "evidence"
  | "inspection"
  | "unknown";

export type NexusCloudSourceModule =
  | "file-loader"
  | "android-work-mode"
  | "doorflow"
  | "electrical-commissioning"
  | "bim-ifc"
  | "snagging"
  | "qa-qc"
  | "person-card"
  | "connector-export"
  | "manual-review";

export type NexusCloudVisibilityScope = "project" | "trade" | "person_private" | "audit_only";

export type NexusCloudUploadState =
  | "metadata_prepared"
  | "awaiting_binary_upload"
  | "uploaded_pending_index"
  | "indexed_pending_graph_link"
  | "linked_to_graph";

export type PendingNexusAssetInput = {
  originalFileName: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  sourceModule: NexusCloudSourceModule;
  assetType?: NexusCloudAssetType;
  tradeId?: string;
  visibilityScope?: NexusCloudVisibilityScope;
  requestedClassification?: Exclude<NexusCloudClassificationStatus, "linked_to_graph">;
  graphCandidateNodeIds?: string[];
  uploaderPersonId?: string;
  deviceSessionId?: string;
  capturedAt?: string;
  notes?: string;
};

export type PendingNexusAssetRecord = NexusCloudAssetDraft & {
  schema: typeof NEXUS_CLOUD_PENDING_ASSET_SCHEMA;
  pendingAssetId: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  visibilityScope: NexusCloudVisibilityScope;
  uploadState: NexusCloudUploadState;
  targetFolderRole: NexusCloudFolderRef["role"];
  targetFolderId: string;
  targetFolderUrl: string;
  graphCandidateNodeIds: string[];
  uploaderPersonId?: string;
  deviceSessionId?: string;
  capturedAt?: string;
  createdAt: string;
  notes?: string;
  boundaries: string[];
};

function sanitizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "asset";
}

function smallDeterministicHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(6, "0").slice(-8).toUpperCase();
}

function inferAssetType(fileName: string, mimeType?: string): NexusCloudAssetType {
  const lower = fileName.toLowerCase();
  if (mimeType?.startsWith("image/")) return "photo";
  if (mimeType?.startsWith("video/")) return "video";
  if (lower.endsWith(".ifc")) return "ifc";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".dwg") || lower.endsWith(".dxf")) return "drawing";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) return "spreadsheet";
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) return "presentation";
  if (lower.endsWith(".docx") || lower.endsWith(".doc") || lower.endsWith(".txt")) return "document";
  return "unknown";
}

function chooseInitialClassification(input: PendingNexusAssetInput): Exclude<NexusCloudClassificationStatus, "linked_to_graph"> {
  if (input.requestedClassification === "audit_only") return "audit_only";
  if (input.requestedClassification === "classified_by_trade") return "classified_by_trade";
  if (input.requestedClassification === "classified_by_type") return "classified_by_type";
  if (input.requestedClassification === "pending_graph_link") return "pending_graph_link";
  if (input.graphCandidateNodeIds?.length) return "pending_graph_link";
  return "inbox";
}

export function createPendingNexusAssetRecord(
  input: PendingNexusAssetInput,
  createdAt = new Date().toISOString(),
): PendingNexusAssetRecord {
  const classificationStatus = chooseInitialClassification(input);
  const assetType = input.assetType ?? inferAssetType(input.originalFileName, input.mimeType);
  const idSeed = [input.projectId, input.worldId, input.originalFileName, input.checksumSha256 ?? "no-checksum", createdAt].join("|");
  const suffix = smallDeterministicHash(idSeed);
  const nameToken = sanitizeToken(input.originalFileName.replace(/\.[^.]+$/, ""));
  const assetId = `NCA-${input.projectId === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA" ? "ESAFE" : "RIVERSIDE"}-${suffix}`;
  const pendingAssetId = `PENDING-${assetId}-${nameToken}`;

  const draft: NexusCloudAssetDraft = {
    assetId,
    fileName: input.originalFileName,
    projectId: input.projectId,
    worldId: input.worldId,
    tradeId: input.tradeId,
    assetType,
    classificationStatus,
    linkedGraphNodeIds: [],
    source: input.sourceModule,
  };

  const route = resolveNexusCloudRoute(draft);
  assertNoCrossProjectCloudRoute(draft, route.targetFolder.id);

  return {
    ...draft,
    schema: NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
    pendingAssetId,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
    visibilityScope: input.visibilityScope ?? "project",
    uploadState: "metadata_prepared",
    targetFolderRole: route.targetFolder.role,
    targetFolderId: route.targetFolder.id,
    targetFolderUrl: route.targetFolder.url,
    graphCandidateNodeIds: input.graphCandidateNodeIds ?? [],
    uploaderPersonId: input.uploaderPersonId,
    deviceSessionId: input.deviceSessionId,
    capturedAt: input.capturedAt,
    createdAt,
    notes: input.notes,
    boundaries: [
      "projectId/worldId is resolved before upload, classification or graph linking",
      "pending assets are routed only to the project root folder family from the Drive manifest",
      "binary upload, Drive API write, index append and Project Graph mutation are outside this contract",
      "graphCandidateNodeIds are review hints only and do not make the asset linked_to_graph",
      "Relationship Tree previews are not file source of truth",
    ],
  };
}

export function assertPendingNexusAssetRecord(record: PendingNexusAssetRecord) {
  if (record.schema !== NEXUS_CLOUD_PENDING_ASSET_SCHEMA) {
    throw new Error(`Invalid pending Nexus asset schema: ${record.schema}`);
  }
  if (record.classificationStatus === "linked_to_graph") {
    throw new Error("Pending asset contract cannot create linked_to_graph assets directly");
  }
  const route = assertNoCrossProjectCloudRoute(record, record.targetFolderId);
  if (route.targetFolder.id !== record.targetFolderId) {
    throw new Error(`Pending asset target folder mismatch for ${record.pendingAssetId}`);
  }
  if (record.uploadState === "linked_to_graph" && !record.linkedGraphNodeIds.length) {
    throw new Error("linked_to_graph uploadState requires linkedGraphNodeIds");
  }
  if (record.graphCandidateNodeIds.length && record.classificationStatus !== "pending_graph_link") {
    throw new Error("graphCandidateNodeIds require pending_graph_link classification until review completes");
  }
  return record;
}
