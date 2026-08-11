import type { NexusStorageProvider, NexusStoragePutRequest, NexusStorageReadRequest, NexusStoredObject } from "./storage-provider";

const DB_NAME = "nexus-cloud-data-local-dev-v1";
const DB_VERSION = 1;
const OBJECT_STORE = "objects";

interface StoredDevObject {
  objectKey: string;
  content: Blob;
  mimeType: string;
  sizeBytes: number;
  checksumValue: string;
  writtenAt: string;
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openLocalDevDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable in this browser context."));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OBJECT_STORE)) {
        database.createObjectStore(OBJECT_STORE, { keyPath: "objectKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open Nexus local dev storage."));
  });
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openLocalDevDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(OBJECT_STORE, mode);
    const store = tx.objectStore(OBJECT_STORE);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Nexus local dev storage operation failed."));
    tx.oncomplete = () => database.close();
    tx.onabort = () => {
      database.close();
      reject(tx.error ?? new Error("Nexus local dev storage transaction aborted."));
    };
  }));
}

export class LocalDevNexusStorageProvider implements NexusStorageProvider {
  readonly providerId = "nexus-local-dev-indexeddb";
  readonly kind = "local-dev" as const;
  readonly displayName = "Nexus Local Dev IndexedDB Storage";

  async putObject(request: NexusStoragePutRequest): Promise<NexusStoredObject> {
    const writtenAt = new Date().toISOString();
    const stored: StoredDevObject = {
      objectKey: request.objectKey,
      content: request.content,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
      checksumValue: request.checksum.value,
      writtenAt,
    };

    await transaction("readwrite", (store) => store.put(stored));

    return {
      storage: {
        providerId: this.providerId,
        providerKind: this.kind,
        objectKey: request.objectKey,
        etag: request.checksum.value,
      },
      sizeBytes: request.sizeBytes,
      checksum: request.checksum,
      writtenAt,
    };
  }

  async getObject(request: NexusStorageReadRequest): Promise<Blob> {
    const record = await transaction<StoredDevObject | undefined>("readonly", (store) => store.get(request.objectKey));
    if (!record) throw new Error(`Nexus local dev object not found: ${request.objectKey}`);
    return record.content;
  }

  async deleteObject(request: NexusStorageReadRequest): Promise<void> {
    await transaction("readwrite", (store) => store.delete(request.objectKey));
  }
}
