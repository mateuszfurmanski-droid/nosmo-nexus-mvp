import {
  assertPendingNexusAssetRecord,
  createPendingNexusAssetRecord,
  type NexusCloudAssetType,
  type NexusCloudSourceModule,
  type PendingNexusAssetInput,
  type PendingNexusAssetRecord,
} from "./nexus-cloud-pending-asset";
import type {
  NexusCloudClassificationStatus,
  NexusCloudProjectId,
  NexusCloudWorldId,
} from "./nexus-cloud-drive-manifest";

export const NEXUS_CLOUD_FILE_LOADER_BRIDGE_SCHEMA = "nexus-cloud-file-loader-bridge/v1" as const;

export type NexusCloudFileLoaderBridgeMode = "metadata_only_prepare";

export type NexusCloudFileLoaderIncomingFile = {
  name: string;
  type?: string;
  size?: number;
  lastModified?: number;
};

export type NexusCloudFileLoaderSelection = {
  projectId: NexusCloudProjectId;
  worldId: NexusCloudWorldId;
  sourceModule?: Extract<NexusCloudSourceModule, "file-loader" | "android-work-mode" | "doorflow" | "electrical-commissioning" | "bim-ifc" | "snagging" | "qa-qc" | "person-card" | "connector-export">;
  requestedClassification?: Exclude<NexusCloudClassificationStatus, "linked_to_graph">;
  assetType?: NexusCloudAssetType;
  tradeId?: string;
  graphCandidateNodeIds?: string[];
  uploaderPersonId?: string;
  deviceSessionId?: string;
  notes?: string;
};

export type NexusCloudFileLoaderPreparedAsset = {
  schema: typeof NEXUS_CLOUD_FILE_LOADER_BRIDGE_SCHEMA;
  bridgeMode: NexusCloudFileLoaderBridgeMode;
  pendingAsset: PendingNexusAssetRecord;
  binaryHandled: false;
  driveWriteRequested: false;
  assetIndexAppendRequested: false;
  projectGraphMutationRequested: false;
  nextRequiredStep:
    | "review_project_boundary"
    | "request_binary_upload_session"
    | "review_graph_link_candidates";
  prohibitedActions: string[];
};

function normaliseGraphCandidates(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function capturedAtFromLastModified(lastModified: number | undefined) {
  if (!lastModified || Number.isNaN(lastModified)) return undefined;
  return new Date(lastModified).toISOString();
}

export function createFileLoaderPendingAsset(
  file: NexusCloudFileLoaderIncomingFile,
  selection: NexusCloudFileLoaderSelection,
  createdAt = new Date().toISOString(),
): NexusCloudFileLoaderPreparedAsset {
  if (!file.name.trim()) {
    throw new Error("File Loader bridge requires a file name before pending asset preparation");
  }

  const graphCandidateNodeIds = normaliseGraphCandidates(selection.graphCandidateNodeIds);
  const input: PendingNexusAssetInput = {
    originalFileName: file.name,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
    projectId: selection.projectId,
    worldId: selection.worldId,
    sourceModule: selection.sourceModule ?? "file-loader",
    assetType: selection.assetType,
    tradeId: selection.tradeId,
    requestedClassification: selection.requestedClassification,
    graphCandidateNodeIds,
    uploaderPersonId: selection.uploaderPersonId,
    deviceSessionId: selection.deviceSessionId,
    capturedAt: capturedAtFromLastModified(file.lastModified),
    notes: selection.notes,
  };

  const pendingAsset = assertPendingNexusAssetRecord(createPendingNexusAssetRecord(input, createdAt));
  const nextRequiredStep = pendingAsset.graphCandidateNodeIds.length
    ? "review_graph_link_candidates"
    : pendingAsset.classificationStatus === "inbox"
      ? "review_project_boundary"
      : "request_binary_upload_session";

  return {
    schema: NEXUS_CLOUD_FILE_LOADER_BRIDGE_SCHEMA,
    bridgeMode: "metadata_only_prepare",
    pendingAsset,
    binaryHandled: false,
    driveWriteRequested: false,
    assetIndexAppendRequested: false,
    projectGraphMutationRequested: false,
    nextRequiredStep,
    prohibitedActions: [
      "do not upload binary from this bridge",
      "do not write to Google Drive from this bridge",
      "do not append NEXUS_CLOUD_ASSET_INDEX from this bridge",
      "do not mutate Project Graph from graphCandidateNodeIds",
      "do not treat Relationship Tree preview as file source of truth",
    ],
  };
}

export function createFileLoaderPendingAssets(
  files: NexusCloudFileLoaderIncomingFile[],
  selection: NexusCloudFileLoaderSelection,
  createdAt = new Date().toISOString(),
) {
  if (!files.length) {
    throw new Error("File Loader bridge requires at least one selected file");
  }
  return files.map((file, index) => createFileLoaderPendingAsset(file, selection, `${createdAt}#${index + 1}`));
}

export function assertFileLoaderPreparedAsset(record: NexusCloudFileLoaderPreparedAsset) {
  if (record.schema !== NEXUS_CLOUD_FILE_LOADER_BRIDGE_SCHEMA) {
    throw new Error(`Invalid File Loader bridge schema: ${record.schema}`);
  }
  if (record.bridgeMode !== "metadata_only_prepare") {
    throw new Error(`Unsupported File Loader bridge mode: ${record.bridgeMode}`);
  }
  if (record.binaryHandled || record.driveWriteRequested || record.assetIndexAppendRequested || record.projectGraphMutationRequested) {
    throw new Error("File Loader bridge attempted a mutation outside metadata preparation scope");
  }
  assertPendingNexusAssetRecord(record.pendingAsset);
  return record;
}
