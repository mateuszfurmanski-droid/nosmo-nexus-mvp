import { LocalDevNexusStorageProvider } from "./local-dev-storage-provider";
import { NexusApiStorageProvider, type NexusApiStorageProviderConfig } from "./nexus-api-storage-provider";
import type { NexusStorageProvider, NexusStorageProviderKind } from "./storage-provider";

export type NexusStorageRuntimeMode = "local-dev" | "nexus-api";

export interface NexusStorageRuntimeConfig {
  mode: NexusStorageRuntimeMode;
  providerId: string;
  providerKind: NexusStorageProviderKind;
  displayName: string;
  apiBasePath?: string;
}

function readEnvValue(key: string) {
  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[key];
}

export function readNexusStorageRuntimeConfig(): NexusStorageRuntimeConfig {
  const mode = readEnvValue("VITE_NEXUS_STORAGE_MODE");
  const providerKind = readEnvValue("VITE_NEXUS_STORAGE_PROVIDER_KIND");
  const apiBasePath = readEnvValue("VITE_NEXUS_STORAGE_API_BASE_PATH");

  if (mode === "nexus-api") {
    return {
      mode,
      providerId: readEnvValue("VITE_NEXUS_STORAGE_PROVIDER_ID") ?? "nexus-api-object-storage",
      providerKind: providerKind === "azure-blob" || providerKind === "microsoft-365" || providerKind === "custom" ? providerKind : "s3-compatible",
      displayName: readEnvValue("VITE_NEXUS_STORAGE_DISPLAY_NAME") ?? "Nexus API Object Storage",
      apiBasePath: apiBasePath ?? "/api/nexus/cloud-storage",
    };
  }

  return {
    mode: "local-dev",
    providerId: "nexus-local-dev-indexeddb",
    providerKind: "local-dev",
    displayName: "Nexus Local Dev IndexedDB Storage",
  };
}

export function createNexusStorageProvider(config: NexusStorageRuntimeConfig = readNexusStorageRuntimeConfig()): NexusStorageProvider {
  if (config.mode === "nexus-api") {
    const apiConfig: NexusApiStorageProviderConfig = {
      providerId: config.providerId,
      providerKind: config.providerKind === "local-dev" ? "s3-compatible" : config.providerKind,
      displayName: config.displayName,
      apiBasePath: config.apiBasePath ?? "/api/nexus/cloud-storage",
    };
    return new NexusApiStorageProvider(apiConfig);
  }

  return new LocalDevNexusStorageProvider();
}
