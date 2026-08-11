import type { NexusAssetRegistryEntry } from "./nexus-asset-contracts";

const REGISTRY_KEY = "nexus:cloud-asset-registry:v1";
export const NEXUS_ASSET_REGISTRY_CHANGED_EVENT = "nexus:asset-registry-changed";

export interface NexusAssetRegistryChangedDetail {
  projectId?: string;
  assetId?: string;
  reason: "asset-upserted" | "asset-deleted" | "registry-refresh";
}

function createChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel("nexus-cloud-asset-registry");
}

function safeParseRegistry(value: string | null): NexusAssetRegistryEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as NexusAssetRegistryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emitRegistryChanged(detail: NexusAssetRegistryChangedDetail) {
  window.dispatchEvent(new CustomEvent<NexusAssetRegistryChangedDetail>(NEXUS_ASSET_REGISTRY_CHANGED_EVENT, { detail }));

  const channel = createChannel();
  if (channel) {
    channel.postMessage(detail);
    channel.close();
  }
}

export async function computeSha256(content: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this browser context.");
  const hash = await crypto.subtle.digest("SHA-256", await content.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readNexusAssetRegistry(): NexusAssetRegistryEntry[] {
  if (typeof localStorage === "undefined") return [];
  return safeParseRegistry(localStorage.getItem(REGISTRY_KEY));
}

export function writeNexusAssetRegistry(entries: NexusAssetRegistryEntry[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
}

export function upsertNexusAssetRegistryEntry(entry: NexusAssetRegistryEntry) {
  const entries = readNexusAssetRegistry();
  const withoutCurrent = entries.filter((candidate) => candidate.asset.assetId !== entry.asset.assetId);
  const merged = [entry, ...withoutCurrent].slice(0, 500);
  writeNexusAssetRegistry(merged);
  emitRegistryChanged({ projectId: entry.asset.projectId, assetId: entry.asset.assetId, reason: "asset-upserted" });
}

export function readProjectAssets(projectId: string) {
  return readNexusAssetRegistry().filter((entry) => entry.asset.projectId === projectId);
}

export function subscribeToNexusAssetRegistry(listener: (detail: NexusAssetRegistryChangedDetail) => void) {
  const onWindowEvent = (event: Event) => listener((event as CustomEvent<NexusAssetRegistryChangedDetail>).detail);
  const onStorage = (event: StorageEvent) => {
    if (event.key === REGISTRY_KEY) listener({ reason: "registry-refresh" });
  };

  const channel = createChannel();
  const onChannel = (event: MessageEvent<NexusAssetRegistryChangedDetail>) => listener(event.data);

  window.addEventListener(NEXUS_ASSET_REGISTRY_CHANGED_EVENT, onWindowEvent);
  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener(NEXUS_ASSET_REGISTRY_CHANGED_EVENT, onWindowEvent);
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onChannel);
    channel?.close();
  };
}
