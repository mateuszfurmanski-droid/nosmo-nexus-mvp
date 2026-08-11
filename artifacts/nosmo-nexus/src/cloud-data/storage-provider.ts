import type {
  NexusAssetId,
  NexusChecksum,
  NexusFileId,
  NexusProjectId,
  NexusStorageObjectRef,
  NexusTenantId,
} from "./nexus-asset-contracts";

export type NexusStorageProviderKind = "local-dev" | "s3-compatible" | "azure-blob" | "microsoft-365" | "custom";

export interface NexusStorageObjectScope {
  tenantId?: NexusTenantId;
  projectId: NexusProjectId;
  assetId: NexusAssetId;
  fileId: NexusFileId;
}

export interface NexusStoragePutRequest {
  scope: NexusStorageObjectScope;
  objectKey: string;
  content: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: NexusChecksum;
}

export interface NexusStorageReadRequest {
  scope: NexusStorageObjectScope;
  objectKey: string;
}

export interface NexusStoredObject {
  storage: NexusStorageObjectRef;
  sizeBytes: number;
  checksum: NexusChecksum;
  writtenAt: string;
}

export interface NexusStorageProvider {
  readonly providerId: string;
  readonly kind: NexusStorageProviderKind;
  readonly displayName: string;
  putObject(request: NexusStoragePutRequest): Promise<NexusStoredObject>;
  getObject(request: NexusStorageReadRequest): Promise<Blob>;
  deleteObject?(request: NexusStorageReadRequest): Promise<void>;
}

export interface NexusCloudProviderAdapterFactory {
  readonly providerId: string;
  readonly kind: Exclude<NexusStorageProviderKind, "local-dev">;
  createProvider(): Promise<NexusStorageProvider>;
}

export interface NexusUploadQueueItem {
  queueItemId: string;
  projectId: NexusProjectId;
  assetId?: NexusAssetId;
  fileId?: NexusFileId;
  objectKey?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  retryAfter?: string;
  attempts: number;
  status: "QUEUED" | "UPLOADING" | "FAILED" | "SYNCED";
  lastError?: string;
}
