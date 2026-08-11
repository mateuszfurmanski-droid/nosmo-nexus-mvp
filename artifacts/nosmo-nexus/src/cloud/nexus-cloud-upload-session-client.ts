import type { NexusCloudFileLoaderPreparedAsset } from "./nexus-cloud-file-loader-bridge";
import type { NexusCloudProjectId, NexusCloudWorldId } from "./nexus-cloud-drive-manifest";

export const NEXUS_CLOUD_UPLOAD_SESSION_REQUEST_SCHEMA = "nexus-cloud-upload-session-request/v1" as const;
export const NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA = "nexus-cloud-upload-session-plan/v1" as const;

export type NexusCloudUploadSessionPlan = {
  schema: typeof NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA;
  uploadSessionId: string;
  state: "planned_metadata_only" | "blocked_invalid_pending_asset";
  provider: "google-drive";
  pendingAssetId: string;
  assetId: string;
  fileName: string;
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  workspaceId: number;
  userId: string;
  targetFolderRole: "inbox" | "pendingGraphLink" | "byTrade" | "byType" | "auditProvenance";
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

export type NexusCloudUploadSessionRequest = {
  schema: typeof NEXUS_CLOUD_UPLOAD_SESSION_REQUEST_SCHEMA;
  pendingAsset: NexusCloudFileLoaderPreparedAsset["pendingAsset"];
};

export class NexusCloudUploadSessionClientError extends Error {
  readonly status: number;
  readonly bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "NexusCloudUploadSessionClientError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

function assertUploadSessionPlan(value: unknown): NexusCloudUploadSessionPlan {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Upload-session API returned a non-object response");
  }
  const record = value as Record<string, unknown>;
  if (record["schema"] !== NEXUS_CLOUD_UPLOAD_SESSION_PLAN_SCHEMA) {
    throw new Error(`Upload-session API returned unsupported schema: ${String(record["schema"])}`);
  }
  if (record["binaryHandled"] !== false || record["driveWritePerformed"] !== false || record["assetIndexAppendPerformed"] !== false || record["projectGraphMutationPerformed"] !== false) {
    throw new Error("Upload-session API response indicates a prohibited side effect");
  }
  return value as NexusCloudUploadSessionPlan;
}

export async function requestNexusCloudUploadSessionPlan(
  preparedAsset: NexusCloudFileLoaderPreparedAsset,
  fetchImpl: typeof fetch = fetch,
): Promise<NexusCloudUploadSessionPlan> {
  const request: NexusCloudUploadSessionRequest = {
    schema: NEXUS_CLOUD_UPLOAD_SESSION_REQUEST_SCHEMA,
    pendingAsset: preparedAsset.pendingAsset,
  };

  const response = await fetchImpl("/api/nexus-cloud/upload-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    let message = `Upload-session planning failed with HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(bodyText) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error.trim()) message = parsed.error;
    } catch {
      if (bodyText.trim()) message = bodyText.trim();
    }
    throw new NexusCloudUploadSessionClientError(message, response.status, bodyText);
  }

  const parsed = bodyText ? JSON.parse(bodyText) : null;
  return assertUploadSessionPlan(parsed);
}
