import { pathToFileURL } from "node:url";
import type { NexusCloudProviderWritePlan } from "../../../../src/core/storage/cloudProviderAdapterContract";
import type { NexusCloudProviderWriteReceipt } from "../../../../src/core/storage/cloudPersistenceContract";
import { resolveNexusGoogleDriveWriterModulePath } from "./nexus-runtime-paths";

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
 * No provider write logic is copied into the API server. This keeps OAuth,
 * Drive target verification, provider idempotency and multipart Drive creation
 * in one implementation.
 */
export async function writeNexusCloudGoogleDriveRuntime(input: {
  plan: NexusCloudProviderWritePlan;
  binary: Buffer;
  idempotencyKey: string;
}): Promise<NexusCloudGoogleDriveWriteResult> {
  const writer = await getGoogleDriveWriterModule();
  return writer.writeNexusCloudFileToGoogleDrive(input);
}
