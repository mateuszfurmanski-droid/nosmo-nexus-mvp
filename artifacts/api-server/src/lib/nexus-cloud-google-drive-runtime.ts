import { pathToFileURL } from "node:url";
import type { NexusCloudProviderWritePlan } from "../../../../src/core/storage/cloudProviderAdapterContract";
import type { NexusCloudProviderWriteReceipt } from "../../../../src/core/storage/cloudPersistenceContract";
import { resolveNexusGoogleDriveWriterModulePath } from "./nexus-runtime-paths";

const GOOGLE_PROVIDER_OPERATION_TIMEOUT_MS = 90_000;

export interface NexusCloudGoogleDriveWriteResult {
  status: "WRITTEN" | "ALREADY_WRITTEN";
  idempotentReplay: boolean;
  driveFileId: string;
  receipt: NexusCloudProviderWriteReceipt;
  projectMemoryMutationPerformed: false;
  projectGraphMutationPerformed: false;
}

type GoogleDriveWriterModule = {
  writeNexusCloudFileToGoogleDrive: (input: {
    plan: NexusCloudProviderWritePlan;
    binary: Buffer;
    idempotencyKey: string;
    fetchImpl?: typeof fetch;
  }) => Promise<NexusCloudGoogleDriveWriteResult>;
};

let writerModulePromise: Promise<GoogleDriveWriterModule> | null = null;

async function getGoogleDriveWriterModule(): Promise<GoogleDriveWriterModule> {
  if (!writerModulePromise) {
    const moduleUrl = pathToFileURL(resolveNexusGoogleDriveWriterModulePath()).href;
    writerModulePromise = import(moduleUrl).then((module) => {
      if (typeof module.writeNexusCloudFileToGoogleDrive !== "function") {
        throw new Error("NEXUS_CLOUD_GOOGLE_DRIVE_WRITER_CONTRACT_INVALID");
      }
      return module as GoogleDriveWriterModule;
    });
  }
  return writerModulePromise;
}

/**
 * Delegate to the single PR #93 Google Drive writer implementation.
 *
 * No provider write logic is copied into the API server. The whole provider
 * operation shares one 90-second AbortSignal, so OAuth + target verification +
 * replay lookup + upload cannot intentionally outlive the 120-second durable
 * lease. The remaining lease window is reserved for provider receipt persistence.
 */
export async function writeNexusCloudGoogleDriveRuntime(input: {
  plan: NexusCloudProviderWritePlan;
  binary: Buffer;
  idempotencyKey: string;
}): Promise<NexusCloudGoogleDriveWriteResult> {
  const writer = await getGoogleDriveWriterModule();
  const providerOperationSignal = AbortSignal.timeout(
    GOOGLE_PROVIDER_OPERATION_TIMEOUT_MS,
  );
  const boundedFetch: typeof fetch = (request, init = {}) =>
    fetch(request, {
      ...init,
      signal: init.signal ?? providerOperationSignal,
    });

  return writer.writeNexusCloudFileToGoogleDrive({
    ...input,
    fetchImpl: boundedFetch,
  });
}
