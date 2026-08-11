import type { NexusStorageProvider, NexusStoragePutRequest, NexusStorageReadRequest, NexusStoredObject } from "./storage-provider";
import type { NexusStorageObjectRef } from "./nexus-asset-contracts";

export interface NexusApiStorageProviderConfig {
  providerId: string;
  displayName: string;
  providerKind: "s3-compatible" | "azure-blob" | "microsoft-365" | "custom";
  apiBasePath: string;
}

interface NexusApiStoredObjectResponse {
  storage: NexusStorageObjectRef;
  sizeBytes: number;
  checksum: NexusStoredObject["checksum"];
  writtenAt: string;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function assertStoredObjectResponse(value: unknown): NexusApiStoredObjectResponse {
  const candidate = value as Partial<NexusApiStoredObjectResponse> | null;
  if (!candidate || typeof candidate !== "object") throw new Error("Invalid Nexus storage API response.");
  if (!candidate.storage || typeof candidate.storage.objectKey !== "string") throw new Error("Nexus storage API response is missing storage reference.");
  if (!candidate.checksum || candidate.checksum.algorithm !== "sha256" || typeof candidate.checksum.value !== "string") throw new Error("Nexus storage API response is missing SHA-256 checksum.");
  if (typeof candidate.sizeBytes !== "number") throw new Error("Nexus storage API response is missing size.");
  if (typeof candidate.writtenAt !== "string") throw new Error("Nexus storage API response is missing written timestamp.");
  return candidate as NexusApiStoredObjectResponse;
}

function toQuery(request: NexusStorageReadRequest) {
  const params = new URLSearchParams();
  params.set("projectId", request.scope.projectId);
  params.set("assetId", request.scope.assetId);
  params.set("fileId", request.scope.fileId);
  params.set("objectKey", request.objectKey);
  if (request.scope.tenantId) params.set("tenantId", request.scope.tenantId);
  return params.toString();
}

/**
 * Browser-side boundary to Nexus server storage APIs.
 *
 * This class intentionally does not import S3, Azure or Microsoft SDKs and does
 * not hold provider credentials in the UI. The Nexus server/API owns the concrete
 * provider adapter, permission enforcement, audit write and signed cloud request.
 */
export class NexusApiStorageProvider implements NexusStorageProvider {
  readonly providerId: string;
  readonly kind: NexusApiStorageProviderConfig["providerKind"];
  readonly displayName: string;
  private readonly apiBasePath: string;

  constructor(config: NexusApiStorageProviderConfig) {
    this.providerId = config.providerId;
    this.kind = config.providerKind;
    this.displayName = config.displayName;
    this.apiBasePath = trimTrailingSlash(config.apiBasePath);
  }

  async putObject(request: NexusStoragePutRequest): Promise<NexusStoredObject> {
    const form = new FormData();
    form.set("metadata", JSON.stringify({
      scope: request.scope,
      objectKey: request.objectKey,
      filename: request.filename,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
      checksum: request.checksum,
    }));
    form.set("file", request.content, request.filename);

    const response = await fetch(`${this.apiBasePath}/objects`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!response.ok) throw new Error(`Nexus storage API upload failed (${response.status}).`);
    const stored = assertStoredObjectResponse(await response.json());
    return stored;
  }

  async getObject(request: NexusStorageReadRequest): Promise<Blob> {
    const response = await fetch(`${this.apiBasePath}/objects?${toQuery(request)}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error(`Nexus storage API read failed (${response.status}).`);
    return response.blob();
  }

  async deleteObject(request: NexusStorageReadRequest): Promise<void> {
    const response = await fetch(`${this.apiBasePath}/objects?${toQuery(request)}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) throw new Error(`Nexus storage API delete failed (${response.status}).`);
  }
}
