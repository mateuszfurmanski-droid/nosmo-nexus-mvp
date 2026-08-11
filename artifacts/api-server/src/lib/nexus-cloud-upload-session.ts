export const NEXUS_CLOUD_UPLOAD_SESSION_REQUEST_SCHEMA = "nexus-cloud-upload-session-request/v1" as const;
export const NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA = "nexus-cloud-upload-session-plan/v1" as const;
export const NEXUS_CLOUD_PENDING_ASSET_SCHEMA = "nexus-cloud-pending-asset/v1" as const;

export type NexusCloudProjectId = "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA" | "RIVERSIDE_DEMO_PROJECT";
export type NexusCloudWorldId = "esafe-demo" | "dev";
export type NexusCloudClassificationStatus =
  | "inbox"
  | "pending_graph_link"
  | "classified_by_trade"
  | "classified_by_type"
  | "audit_only";
export type NexusCloudUploadTargetRole = "inbox" | "pendingGraphLink" | "byTrade" | "byType" | "auditProvenance";
export type NexusCloudUploadSessionState = "planned_metadata_only" | "blocked_invalid_pending_asset";

export type NexusCloudUploadSessionContext = {
  workspaceId: number;
  userId: string;
  createdAt?: string;
};

export type NexusCloudUploadSessionPlan = {
  schema: typeof NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA;
  uploadSessionId: string;
  state: NexusCloudUploadSessionState;
  provider: "google-drive";
  pendingAssetId: string;
  assetId: string;
  fileName: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  workspaceId: number;
  userId: string;
  targetFolderRole: NexusCloudUploadTargetRole;
  targetFolderId: string;
  targetFolderUrl: string;
  targetDrivePathHint: string;
  createdAt: string;
  expiresAt: string;
  nextRequiredStep: "implement_drive_upload_adapter";
  binaryHandled: false;
  driveWriteRequested: false;
  driveWritePerformed: false;
  assetIndexAppendRequested: false;
  assetIndexAppendPerformed: false;
  projectGraphMutationRequested: false;
  projectGraphMutationPerformed: false;
  uploadUrl: null;
  driveFileId: null;
  boundaries: string[];
};

type PendingAssetLike = {
  schema: typeof NEXUS_CLOUD_PENDING_ASSET_SCHEMA;
  pendingAssetId: string;
  assetId: string;
  fileName: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  classificationStatus: NexusCloudClassificationStatus;
  targetFolderRole: NexusCloudUploadTargetRole;
  targetFolderId: string;
  targetFolderUrl: string;
  uploadState: "metadata_prepared" | "awaiting_binary_upload";
};

type ProjectWorldTarget = {
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  displayName: string;
  folders: Record<NexusCloudUploadTargetRole, { id: string; name: string; url: string }>;
};

export class NexusCloudUploadSessionError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NexusCloudUploadSessionError";
    this.statusCode = statusCode;
  }
}

const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;

const NEXUS_CLOUD_UPLOAD_TARGETS: ProjectWorldTarget[] = [
  {
    projectId: "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA",
    worldId: "esafe-demo",
    displayName: "e-SAFE Catania Project World",
    folders: {
      inbox: { id: "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", name: "00_INBOX", url: folderUrl("1xsIITjBwTEE1z7whhub3RnsSXfrxwur9") },
      pendingGraphLink: { id: "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", name: "01_PENDING_GRAPH_LINK", url: folderUrl("1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ") },
      byTrade: { id: "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P", name: "02_BY_TRADE", url: folderUrl("1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P") },
      byType: { id: "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9", name: "03_BY_TYPE", url: folderUrl("1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9") },
      auditProvenance: { id: "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz", name: "90_AUDIT_PROVENANCE", url: folderUrl("1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz") },
    },
  },
  {
    projectId: "RIVERSIDE_DEMO_PROJECT",
    worldId: "dev",
    displayName: "Riverside Demo Project World",
    folders: {
      inbox: { id: "1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46", name: "00_INBOX", url: folderUrl("1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46") },
      pendingGraphLink: { id: "1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", name: "01_PENDING_GRAPH_LINK", url: folderUrl("1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw") },
      byTrade: { id: "1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68", name: "02_BY_TRADE", url: folderUrl("1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68") },
      byType: { id: "14aYunionA4U7DqPdjqelcU7kAGgDse5w", name: "03_BY_TYPE", url: folderUrl("14aYunionA4U7DqPdjqelcU7kAGgDse5w") },
      auditProvenance: { id: "1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a", name: "90_AUDIT_PROVENANCE", url: folderUrl("1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a") },
    },
  },
];

const folderRoleByClassification: Record<NexusCloudClassificationStatus, NexusCloudUploadTargetRole> = {
  inbox: "inbox",
  pending_graph_link: "pendingGraphLink",
  classified_by_trade: "byTrade",
  classified_by_type: "byType",
  audit_only: "auditProvenance",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new NexusCloudUploadSessionError(`Missing or invalid pending asset field: ${key}`);
  }
  return value;
}

function asProjectId(value: string): NexusCloudProjectId {
  if (value === "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA" || value === "RIVERSIDE_DEMO_PROJECT") return value;
  throw new NexusCloudUploadSessionError(`Unsupported Nexus Cloud projectId: ${value}`);
}

function asWorldId(value: string): NexusCloudWorldId {
  if (value === "esafe-demo" || value === "dev") return value;
  throw new NexusCloudUploadSessionError(`Unsupported Nexus Cloud worldId: ${value}`);
}

function asClassification(value: string): NexusCloudClassificationStatus {
  if (
    value === "inbox" ||
    value === "pending_graph_link" ||
    value === "classified_by_trade" ||
    value === "classified_by_type" ||
    value === "audit_only"
  ) {
    return value;
  }
  if (value === "linked_to_graph") {
    throw new NexusCloudUploadSessionError("Upload-session stub cannot accept linked_to_graph pending assets");
  }
  throw new NexusCloudUploadSessionError(`Unsupported Nexus Cloud classificationStatus: ${value}`);
}

function asTargetFolderRole(value: string): NexusCloudUploadTargetRole {
  if (value === "inbox" || value === "pendingGraphLink" || value === "byTrade" || value === "byType" || value === "auditProvenance") return value;
  throw new NexusCloudUploadSessionError(`Unsupported targetFolderRole: ${value}`);
}

function extractPendingAssetRecord(body: unknown): PendingAssetLike {
  const source = isRecord(body) && isRecord(body["pendingAsset"]) ? body["pendingAsset"] : body;
  if (!isRecord(source)) {
    throw new NexusCloudUploadSessionError("Request body must contain a pendingAsset object");
  }

  const schema = readString(source, "schema");
  if (schema !== NEXUS_CLOUD_PENDING_ASSET_SCHEMA) {
    throw new NexusCloudUploadSessionError(`Expected ${NEXUS_CLOUD_PENDING_ASSET_SCHEMA} pending asset schema`);
  }

  const pendingAssetId = readString(source, "pendingAssetId");
  if (!pendingAssetId.startsWith("PENDING-NCA-")) {
    throw new NexusCloudUploadSessionError("pendingAssetId must use the PENDING-NCA-* namespace");
  }

  const uploadState = readString(source, "uploadState");
  if (uploadState !== "metadata_prepared" && uploadState !== "awaiting_binary_upload") {
    throw new NexusCloudUploadSessionError("Upload-session stub only accepts metadata_prepared or awaiting_binary_upload assets");
  }

  return {
    schema: NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
    pendingAssetId,
    assetId: readString(source, "assetId"),
    fileName: readString(source, "fileName"),
    projectId: asProjectId(readString(source, "projectId")),
    worldId: asWorldId(readString(source, "worldId")),
    classificationStatus: asClassification(readString(source, "classificationStatus")),
    targetFolderRole: asTargetFolderRole(readString(source, "targetFolderRole")),
    targetFolderId: readString(source, "targetFolderId"),
    targetFolderUrl: readString(source, "targetFolderUrl"),
    uploadState,
  };
}

function getProjectWorld(projectId: NexusCloudProjectId, worldId: NexusCloudWorldId): ProjectWorldTarget {
  const project = NEXUS_CLOUD_UPLOAD_TARGETS.find((entry) => entry.projectId === projectId);
  if (!project) throw new NexusCloudUploadSessionError(`Unsupported Nexus Cloud projectId: ${projectId}`);
  if (project.worldId !== worldId) {
    throw new NexusCloudUploadSessionError(`Project ${projectId} must use worldId ${project.worldId}, received ${worldId}`);
  }
  return project;
}

function createStableUploadSessionId(pendingAsset: PendingAssetLike, workspaceId: number, createdAt: string): string {
  const seed = [pendingAsset.pendingAssetId, pendingAsset.targetFolderId, workspaceId, createdAt].join("|");
  let hash = 5381;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(index)) >>> 0;
  }
  return `NCS-UPLOAD-${hash.toString(36).padStart(8, "0").toUpperCase()}`;
}

function expiresOneHourAfter(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    throw new NexusCloudUploadSessionError("createdAt must be a valid ISO timestamp", 500);
  }
  return new Date(created.getTime() + 60 * 60 * 1000).toISOString();
}

export function createNexusCloudUploadSessionPlan(body: unknown, context: NexusCloudUploadSessionContext): NexusCloudUploadSessionPlan {
  if (!Number.isInteger(context.workspaceId) || context.workspaceId <= 0) {
    throw new NexusCloudUploadSessionError("Authenticated workspaceId is required before upload-session planning", 500);
  }
  if (!context.userId) {
    throw new NexusCloudUploadSessionError("Authenticated userId is required before upload-session planning", 500);
  }

  const pendingAsset = extractPendingAssetRecord(body);
  const project = getProjectWorld(pendingAsset.projectId, pendingAsset.worldId);
  const expectedRole = folderRoleByClassification[pendingAsset.classificationStatus];
  const expectedFolder = project.folders[expectedRole];

  if (pendingAsset.targetFolderRole !== expectedRole) {
    throw new NexusCloudUploadSessionError(
      `Pending asset classification ${pendingAsset.classificationStatus} must target ${expectedRole}, received ${pendingAsset.targetFolderRole}`,
    );
  }
  if (pendingAsset.targetFolderId !== expectedFolder.id || pendingAsset.targetFolderUrl !== expectedFolder.url) {
    throw new NexusCloudUploadSessionError(
      `Pending asset target folder does not match ${project.displayName} ${expectedFolder.name}`,
    );
  }

  const createdAt = context.createdAt ?? new Date().toISOString();
  const uploadSessionId = createStableUploadSessionId(pendingAsset, context.workspaceId, createdAt);

  return {
    schema: NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
    uploadSessionId,
    state: "planned_metadata_only",
    provider: "google-drive",
    pendingAssetId: pendingAsset.pendingAssetId,
    assetId: pendingAsset.assetId,
    fileName: pendingAsset.fileName,
    projectId: pendingAsset.projectId,
    worldId: pendingAsset.worldId,
    workspaceId: context.workspaceId,
    userId: context.userId,
    targetFolderRole: expectedRole,
    targetFolderId: expectedFolder.id,
    targetFolderUrl: expectedFolder.url,
    targetDrivePathHint: `${project.displayName}/${expectedFolder.name}/${pendingAsset.fileName}`,
    createdAt,
    expiresAt: expiresOneHourAfter(createdAt),
    nextRequiredStep: "implement_drive_upload_adapter",
    binaryHandled: false,
    driveWriteRequested: false,
    driveWritePerformed: false,
    assetIndexAppendRequested: false,
    assetIndexAppendPerformed: false,
    projectGraphMutationRequested: false,
    projectGraphMutationPerformed: false,
    uploadUrl: null,
    driveFileId: null,
    boundaries: [
      "authenticated workspace is resolved before upload-session planning",
      "projectId/worldId and target folder are revalidated server-side",
      "this endpoint accepts metadata only and does not receive binary file content",
      "Google Drive API write is intentionally not implemented in this stub",
      "Asset Index append and Project Graph mutation remain separate future steps",
      "pending assets cannot be promoted directly to linked_to_graph through this endpoint",
    ],
  };
}

export function getNexusCloudUploadSessionCapabilities() {
  return {
    schema: "nexus-cloud-upload-session-capabilities/v1",
    provider: "google-drive",
    supportedRequestSchema: NEXUS_CLOUD_UPLOAD_SESSION_REQUEST_SCHEMA,
    supportedPendingAssetSchema: NEXUS_CLOUD_PENDING_ASSET_SCHEMA,
    supportedPlanSchema: NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA,
    supportedProjects: NEXUS_CLOUD_UPLOAD_TARGETS.map((project) => ({
      projectId: project.projectId,
      worldId: project.worldId,
      displayName: project.displayName,
      targetFolderRoles: Object.keys(project.folders),
    })),
    capabilities: {
      metadataValidation: true,
      authenticatedWorkspaceGuard: true,
      serverSideProjectWorldGuard: true,
      binaryUpload: false,
      googleDriveWrite: false,
      assetIndexAppend: false,
      projectGraphMutation: false,
    },
  };
}
