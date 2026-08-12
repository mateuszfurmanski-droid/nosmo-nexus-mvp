import {
  NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
  type NexusCloudProjectId,
  type NexusCloudWorldId,
} from "./nexus-cloud-upload-session";

export const NEXUS_CLOUD_ASSET_INDEX_ROW_PLAN_SCHEMA = "nexus-cloud-asset-index-row-plan/v1" as const;
export const NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID = "1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI" as const;
export const NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_URL =
  `https://docs.google.com/spreadsheets/d/${NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID}/edit` as const;

export const NEXUS_CLOUD_ASSET_INDEX_COLUMNS = [
  "assetId",
  "fileName",
  "projectId",
  "worldId",
  "tradeId",
  "assetType",
  "classificationStatus",
  "visibilityScope",
  "driveFileId",
  "drivePathOrUrl",
  "linkedGraphNodeIds",
  "source",
  "createdAt",
  "notes",
] as const;

export type NexusCloudAssetIndexColumn = typeof NEXUS_CLOUD_ASSET_INDEX_COLUMNS[number];
export type NexusCloudAssetIndexRow = Record<NexusCloudAssetIndexColumn, string>;
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
  | "unknown";

export type NexusCloudAssetIndexRowPlan = {
  schema: typeof NEXUS_CLOUD_ASSET_INDEX_ROW_PLAN_SCHEMA;
  rowPlanId: string;
  state: "planned_not_appended";
  assetIndexSpreadsheetId: typeof NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID;
  assetIndexSpreadsheetUrl: typeof NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_URL;
  sourceUploadSessionSchema: typeof NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA;
  uploadSessionId: string;
  pendingAssetId: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  row: NexusCloudAssetIndexRow;
  orderedColumns: readonly NexusCloudAssetIndexColumn[];
  orderedValues: string[];
  nextRequiredStep: "append_asset_index_row_after_drive_file_id_exists";
  googleSheetsAppendRequested: false;
  googleSheetsAppendPerformed: false;
  driveWritePerformed: false;
  projectGraphMutationPerformed: false;
  boundaries: string[];
};

type UploadSessionPlanLike = {
  schema: typeof NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA;
  uploadSessionId: string;
  state: "planned_metadata_only";
  provider: "google-drive";
  pendingAssetId: string;
  assetId: string;
  fileName: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  userId: string;
  targetFolderRole: string;
  targetFolderId: string;
  targetDrivePathHint: string;
  createdAt: string;
  driveWritePerformed: false;
  assetIndexAppendRequested: false;
  assetIndexAppendPerformed: false;
  projectGraphMutationRequested: false;
  projectGraphMutationPerformed: false;
  driveFileId: null;
};

class NexusCloudAssetIndexRowPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NexusCloudAssetIndexRowPlanError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new NexusCloudAssetIndexRowPlanError(`Missing or invalid upload-session field: ${key}`);
  }
  return value;
}

function readFalse(record: Record<string, unknown>, key: string): false {
  const value = record[key];
  if (value !== false) {
    throw new NexusCloudAssetIndexRowPlanError(`${key} must remain false before Asset Index row planning`);
  }
  return false;
}

function asProjectId(value: string): NexusCloudProjectId {
  if (value === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA" || value === "RIVERSIDE_DEMO_PROJECT") return value;
  throw new NexusCloudAssetIndexRowPlanError(`Unsupported projectId for Asset Index row plan: ${value}`);
}

function asWorldId(value: string): NexusCloudWorldId {
  if (value === "esafe-demo" || value === "dev") return value;
  throw new NexusCloudAssetIndexRowPlanError(`Unsupported worldId for Asset Index row plan: ${value}`);
}

function assertUploadSessionPlan(value: unknown): UploadSessionPlanLike {
  if (!isRecord(value)) {
    throw new NexusCloudAssetIndexRowPlanError("Asset Index row planning requires an upload-session plan object");
  }
  const schema = readString(value, "schema");
  if (schema !== NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA) {
    throw new NexusCloudAssetIndexRowPlanError(`Expected ${NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA} before Asset Index row planning`);
  }
  const state = readString(value, "state");
  if (state !== "planned_metadata_only") {
    throw new NexusCloudAssetIndexRowPlanError("Only planned_metadata_only upload sessions can produce Asset Index row plans");
  }
  const provider = readString(value, "provider");
  if (provider !== "google-drive") {
    throw new NexusCloudAssetIndexRowPlanError("Asset Index row planner currently supports google-drive plans only");
  }
  if (value["driveFileId"] !== null) {
    throw new NexusCloudAssetIndexRowPlanError("driveFileId must remain null until the Drive adapter creates a file");
  }

  return {
    schema: NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
    uploadSessionId: readString(value, "uploadSessionId"),
    state: "planned_metadata_only",
    provider: "google-drive",
    pendingAssetId: readString(value, "pendingAssetId"),
    assetId: readString(value, "assetId"),
    fileName: readString(value, "fileName"),
    projectId: asProjectId(readString(value, "projectId")),
    worldId: asWorldId(readString(value, "worldId")),
    userId: readString(value, "userId"),
    targetFolderRole: readString(value, "targetFolderRole"),
    targetFolderId: readString(value, "targetFolderId"),
    targetDrivePathHint: readString(value, "targetDrivePathHint"),
    createdAt: readString(value, "createdAt"),
    driveWritePerformed: readFalse(value, "driveWritePerformed"),
    assetIndexAppendRequested: readFalse(value, "assetIndexAppendRequested"),
    assetIndexAppendPerformed: readFalse(value, "assetIndexAppendPerformed"),
    projectGraphMutationRequested: readFalse(value, "projectGraphMutationRequested"),
    projectGraphMutationPerformed: readFalse(value, "projectGraphMutationPerformed"),
    driveFileId: null,
  };
}

function inferAssetType(fileName: string): NexusCloudAssetType {
  const lower = fileName.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|heic|heif)$/.test(lower)) return "photo";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(dwg|dxf)$/.test(lower)) return "drawing";
  if (lower.endsWith(".ifc")) return "ifc";
  if (/\.(rvt|nwd|nwc|bim)$/.test(lower)) return "bim";
  if (/\.(doc|docx|odt|txt|md)$/.test(lower)) return "document";
  if (/\.(xls|xlsx|csv|ods)$/.test(lower)) return "spreadsheet";
  if (/\.(ppt|pptx|odp)$/.test(lower)) return "presentation";
  return "unknown";
}

function classificationStatusForTarget(targetFolderRole: string): string {
  if (targetFolderRole === "inbox") return "inbox";
  if (targetFolderRole === "pendingGraphLink") return "pending_graph_link";
  if (targetFolderRole === "byTrade") return "classified_by_trade";
  if (targetFolderRole === "byType") return "classified_by_type";
  if (targetFolderRole === "auditProvenance") return "audit_only";
  throw new NexusCloudAssetIndexRowPlanError(`Unsupported targetFolderRole for Asset Index row plan: ${targetFolderRole}`);
}

function createStableRowPlanId(uploadSessionId: string, assetId: string): string {
  const seed = `${uploadSessionId}|${assetId}|${NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `NCA-INDEX-ROW-${hash.toString(36).padStart(8, "0").toUpperCase()}`;
}

export function createNexusCloudAssetIndexRowPlan(uploadSessionPlanInput: unknown): NexusCloudAssetIndexRowPlan {
  const uploadSessionPlan = assertUploadSessionPlan(uploadSessionPlanInput);
  const classificationStatus = classificationStatusForTarget(uploadSessionPlan.targetFolderRole);
  const notes = [
    "PLANNED_ONLY_DO_NOT_APPEND_YET",
    `uploadSessionId=${uploadSessionPlan.uploadSessionId}`,
    `pendingAssetId=${uploadSessionPlan.pendingAssetId}`,
    "Drive file has not been created; driveFileId intentionally blank",
    "Project Graph links are not approved in this step",
  ].join("; ");

  const row: NexusCloudAssetIndexRow = {
    assetId: uploadSessionPlan.assetId,
    fileName: uploadSessionPlan.fileName,
    projectId: uploadSessionPlan.projectId,
    worldId: uploadSessionPlan.worldId,
    tradeId: "",
    assetType: inferAssetType(uploadSessionPlan.fileName),
    classificationStatus,
    visibilityScope: "project",
    driveFileId: "",
    drivePathOrUrl: uploadSessionPlan.targetDrivePathHint,
    linkedGraphNodeIds: "",
    source: `Nexus Cloud upload-session planner / ${uploadSessionPlan.userId}`,
    createdAt: uploadSessionPlan.createdAt,
    notes,
  };

  return {
    schema: NEXUS_CLOUD_ASSET_INDEX_ROW_PLAN_SCHEMA,
    rowPlanId: createStableRowPlanId(uploadSessionPlan.uploadSessionId, uploadSessionPlan.assetId),
    state: "planned_not_appended",
    assetIndexSpreadsheetId: NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_ID,
    assetIndexSpreadsheetUrl: NEXUS_CLOUD_ASSET_INDEX_SPREADSHEET_URL,
    sourceUploadSessionSchema: NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
    uploadSessionId: uploadSessionPlan.uploadSessionId,
    pendingAssetId: uploadSessionPlan.pendingAssetId,
    projectId: uploadSessionPlan.projectId,
    worldId: uploadSessionPlan.worldId,
    row,
    orderedColumns: NEXUS_CLOUD_ASSET_INDEX_COLUMNS,
    orderedValues: NEXUS_CLOUD_ASSET_INDEX_COLUMNS.map((column) => row[column]),
    nextRequiredStep: "append_asset_index_row_after_drive_file_id_exists",
    googleSheetsAppendRequested: false,
    googleSheetsAppendPerformed: false,
    driveWritePerformed: false,
    projectGraphMutationPerformed: false,
    boundaries: [
      "Asset Index row is planned only and is not appended to Google Sheets",
      "driveFileId stays blank until a Drive adapter has created the real file",
      "e-SAFE and Riverside project/world boundaries are inherited from the upload-session plan",
      "linkedGraphNodeIds stays blank until a separate Project Graph approval step",
      "the row column order matches NEXUS_CLOUD_ASSET_INDEX exactly",
    ],
  };
}
