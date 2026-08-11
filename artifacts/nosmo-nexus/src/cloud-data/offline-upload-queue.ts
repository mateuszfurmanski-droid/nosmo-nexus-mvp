import type {
  NexusAssetId,
  NexusAssetSourceModule,
  NexusAssetTargetType,
  NexusPersonId,
  NexusProjectId,
} from "./nexus-asset-contracts";

const DB_NAME = "nexus-cloud-offline-upload-queue-v1";
const DB_VERSION = 1;
const UPLOAD_STORE = "queued_uploads";

export type NexusFileUploadExplicitTarget = {
  targetType: NexusAssetTargetType;
  targetId: string;
};

export interface NexusFileUploadRequestDetailBase {
  projectId?: NexusProjectId;
  worldId?: string;
  tradeId?: string | null;
  taskId?: string;
  objectId?: string;
  inspectionId?: string;
  personId?: string;
  workPackageId?: string;
  target?: NexusFileUploadExplicitTarget;
  sourceModule?: NexusAssetSourceModule;
  uploadedByPersonId?: NexusPersonId;
  deviceId?: string;
  clientSessionId?: string;
}

export interface NexusQueuedUploadRecord {
  queueItemId: string;
  projectId: NexusProjectId;
  detail: NexusFileUploadRequestDetailBase & { projectId: NexusProjectId };
  selectedNodeId?: string;
  file: {
    name: string;
    type: string;
    size: number;
    lastModified?: number;
  };
  content: Blob;
  attempts: number;
  status: "QUEUED" | "UPLOADING" | "FAILED" | "SYNCED";
  createdAt: string;
  updatedAt: string;
  retryAfter?: string;
  syncedAt?: string;
  syncedAssetId?: NexusAssetId;
  lastError?: string;
}

export const NEXUS_OFFLINE_UPLOAD_QUEUE_CHANGED_EVENT = "nexus:offline-upload-queue-changed";

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function createQueueItemId(projectId: NexusProjectId) {
  const random = Math.random().toString(36).slice(2, 9);
  return `nxs_upload_${projectId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}_${Date.now().toString(36)}_${random}`;
}

function openQueueDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable for the Nexus offline upload queue."));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(UPLOAD_STORE)) {
        database.createObjectStore(UPLOAD_STORE, { keyPath: "queueItemId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open Nexus offline upload queue."));
  });
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openQueueDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(UPLOAD_STORE, mode);
    const store = tx.objectStore(UPLOAD_STORE);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Nexus offline upload queue operation failed."));
    tx.oncomplete = () => database.close();
    tx.onabort = () => {
      database.close();
      reject(tx.error ?? new Error("Nexus offline upload queue transaction aborted."));
    };
  }));
}

function emitQueueChanged(record: NexusQueuedUploadRecord) {
  window.dispatchEvent(new CustomEvent(NEXUS_OFFLINE_UPLOAD_QUEUE_CHANGED_EVENT, {
    detail: {
      queueItemId: record.queueItemId,
      projectId: record.projectId,
      status: record.status,
      assetId: record.syncedAssetId,
    },
  }));
}

async function getQueueRecord(queueItemId: string) {
  return transaction<NexusQueuedUploadRecord | undefined>("readonly", (store) => store.get(queueItemId));
}

async function putQueueRecord(record: NexusQueuedUploadRecord) {
  await transaction("readwrite", (store) => store.put(record));
  emitQueueChanged(record);
}

export async function enqueueNexusOfflineUpload(
  file: File,
  detail: NexusFileUploadRequestDetailBase & { projectId: NexusProjectId },
  selectedNodeId?: string,
): Promise<NexusQueuedUploadRecord> {
  const now = new Date().toISOString();
  const record: NexusQueuedUploadRecord = {
    queueItemId: createQueueItemId(detail.projectId),
    projectId: detail.projectId,
    detail: { ...detail },
    selectedNodeId,
    file: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      lastModified: file.lastModified,
    },
    content: file,
    attempts: 0,
    status: "QUEUED",
    createdAt: now,
    updatedAt: now,
  };

  await putQueueRecord(record);
  return record;
}

export async function readPendingNexusOfflineUploads() {
  const records = await transaction<NexusQueuedUploadRecord[]>("readonly", (store) => store.getAll());
  const now = Date.now();
  return records
    .filter((record) => record.status === "QUEUED" || record.status === "FAILED")
    .filter((record) => !record.retryAfter || Date.parse(record.retryAfter) <= now)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markNexusOfflineUploadUploading(queueItemId: string) {
  const current = await getQueueRecord(queueItemId);
  if (!current) return null;
  const next: NexusQueuedUploadRecord = {
    ...current,
    status: "UPLOADING",
    attempts: current.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: undefined,
  };
  await putQueueRecord(next);
  return next;
}

export async function markNexusOfflineUploadSynced(queueItemId: string, assetId: NexusAssetId) {
  const current = await getQueueRecord(queueItemId);
  if (!current) return null;
  const now = new Date().toISOString();
  const next: NexusQueuedUploadRecord = {
    ...current,
    status: "SYNCED",
    syncedAt: now,
    syncedAssetId: assetId,
    updatedAt: now,
    lastError: undefined,
  };
  await putQueueRecord(next);
  return next;
}

export async function markNexusOfflineUploadFailed(queueItemId: string, message: string) {
  const current = await getQueueRecord(queueItemId);
  if (!current) return null;
  const retryDelayMs = Math.min(5 * 60_000, Math.max(15_000, (current.attempts + 1) * 30_000));
  const now = Date.now();
  const next: NexusQueuedUploadRecord = {
    ...current,
    status: "FAILED",
    lastError: message,
    retryAfter: new Date(now + retryDelayMs).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await putQueueRecord(next);
  return next;
}
