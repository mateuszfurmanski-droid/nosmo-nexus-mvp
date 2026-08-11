export type NexusTenantId = string;
export type NexusProjectId = string;
export type NexusAssetId = string;
export type NexusFileId = string;
export type NexusPersonId = string;
export type NexusTradeId = string;

export type NexusAssetKind =
  | "photo"
  | "video"
  | "document"
  | "drawing"
  | "ifc"
  | "bim"
  | "doorflow_fire_door_evidence"
  | "electrical_commissioning"
  | "snag"
  | "qa_qc_inspection"
  | "project_person_card_attachment"
  | "worksuite_module_artifact";

export type NexusAssetStatus =
  | "PENDING_UPLOAD"
  | "AVAILABLE"
  | "RETAINED"
  | "DELETED";

export type NexusAssetTargetType =
  | "project"
  | "building"
  | "floor"
  | "room"
  | "door"
  | "asset"
  | "task"
  | "snag"
  | "inspection"
  | "person"
  | "trade"
  | "work_package";

export type NexusAssetSourceModule =
  | "file-loader"
  | "mobile-camera"
  | "doorflow"
  | "electrical-commissioning"
  | "snagging"
  | "qa-qc"
  | "person-card"
  | "bim-ifc"
  | "worksuite"
  | "unknown";

export type NexusAssetCaptureMode = "capture" | "import" | "sync" | "migration";

export interface NexusChecksum {
  algorithm: "sha256";
  value: string;
}

export interface NexusAssetProvenance {
  captureMode: NexusAssetCaptureMode;
  sourceModule: NexusAssetSourceModule;
  uploadedByPersonId: NexusPersonId;
  uploadedAt: string;
  originalFilename: string;
  originalMimeType: string;
  originalSizeBytes: number;
  deviceId?: string;
  clientSessionId?: string;
  clientGeneratedAt?: string;
  userAgent?: string;
  networkState?: "online" | "offline" | "unknown";
}

export interface NexusStorageObjectRef {
  providerId: string;
  providerKind: "local-dev" | "s3-compatible" | "azure-blob" | "microsoft-365" | "custom";
  objectKey: string;
  bucketOrContainer?: string;
  region?: string;
  etag?: string;
  versionId?: string;
}

export interface NexusFileMetadata {
  fileId: NexusFileId;
  assetId: NexusAssetId;
  projectId: NexusProjectId;
  filename: string;
  mimeType: string;
  extension?: string;
  sizeBytes: number;
  checksum: NexusChecksum;
  storage: NexusStorageObjectRef;
  uploadedAt: string;
  uploadedByPersonId: NexusPersonId;
}

export interface NexusAsset {
  assetId: NexusAssetId;
  tenantId?: NexusTenantId;
  projectId: NexusProjectId;
  kind: NexusAssetKind;
  status: NexusAssetStatus;
  title: string;
  checksum: NexusChecksum;
  primaryFile: NexusFileMetadata;
  provenance: NexusAssetProvenance;
  createdAt: string;
  updatedAt: string;
  retainedUntil?: string;
  deletedAt?: string;
}

export interface NexusAssetLink {
  linkId: string;
  assetId: NexusAssetId;
  projectId: NexusProjectId;
  targetType: NexusAssetTargetType;
  targetId: string;
  role:
    | "primary_project_media"
    | "evidence"
    | "reference"
    | "inspection_attachment"
    | "task_attachment"
    | "person_project_attachment";
  sourceModule: NexusAssetSourceModule;
  createdByPersonId: NexusPersonId;
  createdAt: string;
}

export interface NexusAssetRegistryEntry {
  asset: NexusAsset;
  links: NexusAssetLink[];
}

export function normaliseNexusIdPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function createStableNexusAssetId(projectId: NexusProjectId, checksum: NexusChecksum): NexusAssetId {
  return `nxs_asset_${normaliseNexusIdPart(projectId)}_${checksum.value.slice(0, 24)}`;
}

export function createStableNexusFileId(assetId: NexusAssetId, filename: string): NexusFileId {
  return `${assetId}_file_${normaliseNexusIdPart(filename).slice(0, 48) || "original"}`;
}

export function createNexusAssetLinkId(assetId: NexusAssetId, targetType: NexusAssetTargetType, targetId: string) {
  return `${assetId}_link_${targetType}_${normaliseNexusIdPart(targetId)}`;
}

export function classifyNexusAssetKind(file: Pick<File, "name" | "type">, sourceModule: NexusAssetSourceModule = "file-loader"): NexusAssetKind {
  if (sourceModule === "doorflow") return "doorflow_fire_door_evidence";
  if (sourceModule === "electrical-commissioning") return "electrical_commissioning";
  if (sourceModule === "snagging") return "snag";
  if (sourceModule === "qa-qc") return "qa_qc_inspection";
  if (sourceModule === "person-card") return "project_person_card_attachment";

  const lowerName = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (lowerName.endsWith(".ifc") || lowerName.endsWith(".ifczip")) return "ifc";
  if (lowerName.includes("drawing") || lowerName.includes("plan") || lowerName.endsWith(".dwg")) return "drawing";
  return "document";
}
