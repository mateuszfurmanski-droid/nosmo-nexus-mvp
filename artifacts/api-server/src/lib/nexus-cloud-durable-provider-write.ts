import { createHash, randomUUID } from "node:crypto";
import {
  acquireNexusCloudWriteLease,
  confirmNexusCloudProviderWrite,
  releaseNexusCloudProviderLease,
  type AcquireNexusCloudWriteLeaseResult,
  NexusCloudWriteOperationError,
} from "@workspace/db/nexus-cloud-write-operation";
import type { NexusCloudPendingAssetEnvelope } from "../../../../src/core/storage/cloudAssetContract";
import type { NexusCloudProviderWritePlan } from "../../../../src/core/storage/cloudProviderAdapterContract";
import type { NexusCloudProviderWriteReceipt } from "../../../../src/core/storage/cloudPersistenceContract";
import { writeNexusCloudGoogleDriveRuntime } from "./nexus-cloud-google-drive-runtime";
import type { NexusCloudOperationIdentity } from "./nexus-cloud-operation-identity";

const DEFAULT_LEASE_DURATION_MS = 120_000;

export type NexusDurableProviderWriteResult =
  | {
      status: "READY_FOR_PERSISTENCE";
      operationId: string;
      driveFileId: string;
      receipt: NexusCloudProviderWriteReceipt;
      providerStatus: "WRITTEN" | "ALREADY_WRITTEN" | "RECOVERED_FROM_LEDGER";
      idempotentReplay: boolean;
    }
  | {
      status: "ALREADY_COMMITTED";
      operationId: string;
      driveFileId: string;
      canonicalFileId: string;
    }
  | {
      status: "BUSY";
      operationId: string;
      retryAfterMs: number;
    };

export class NexusCloudDurableProviderWriteError extends Error {
  providerWriteConfirmed: boolean;
  driveFileId?: string;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      providerWriteConfirmed?: boolean;
      driveFileId?: string;
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "NexusCloudDurableProviderWriteError";
    this.providerWriteConfirmed = options.providerWriteConfirmed ?? false;
    this.driveFileId = options.driveFileId;
  }
}

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const parseStoredReceipt = (
  value: Record<string, unknown>,
  input: {
    projectId: string;
    worldId: string;
    providerConnectorId: string;
    providerObjectId: string;
  },
): NexusCloudProviderWriteReceipt => {
  const projectId = asOptionalString(value.projectId);
  const worldId = asOptionalString(value.worldId);
  const providerConnectorId = asOptionalString(value.providerConnectorId);
  const providerSourceSystem = asOptionalString(value.providerSourceSystem);
  const providerObjectId = asOptionalString(value.providerObjectId);
  const storageObjectKey = asOptionalString(value.storageObjectKey);
  const persistedAt = asOptionalString(value.persistedAt);

  if (
    projectId !== input.projectId ||
    worldId !== input.worldId ||
    providerConnectorId !== input.providerConnectorId ||
    providerSourceSystem !== "google-drive" ||
    providerObjectId !== input.providerObjectId ||
    !storageObjectKey ||
    !persistedAt ||
    Number.isNaN(Date.parse(persistedAt))
  ) {
    throw new NexusCloudDurableProviderWriteError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORED_RECEIPT_INVALID",
      { providerWriteConfirmed: true, driveFileId: input.providerObjectId },
    );
  }

  const sizeBytes =
    typeof value.sizeBytes === "number" && Number.isFinite(value.sizeBytes)
      ? value.sizeBytes
      : undefined;

  return {
    projectId,
    worldId,
    providerConnectorId,
    providerSourceSystem: "google-drive",
    providerObjectId,
    storageObjectKey,
    externalUrl: asOptionalString(value.externalUrl),
    sourceRevision: asOptionalString(value.sourceRevision),
    mimeType: asOptionalString(value.mimeType),
    sizeBytes,
    checksumSha256: asOptionalString(value.checksumSha256),
    persistedAt,
  };
};

const providerRequestFingerprint = (input: {
  pendingAsset: NexusCloudPendingAssetEnvelope;
  plan: NexusCloudProviderWritePlan;
  checksumSha256: string;
  tradeId?: string;
}): string =>
  createHash("sha256")
    .update(
      [
        input.pendingAsset.projectId,
        input.pendingAsset.worldId,
        input.pendingAsset.route.classification,
        input.pendingAsset.route.targetRole,
        input.tradeId ?? "",
        input.plan.connectorDefinitionId,
        input.plan.connectorAccountId,
        input.plan.providerTargetId,
        input.plan.originalFileName,
        input.plan.mimeType ?? "application/octet-stream",
        String(input.plan.sizeBytes ?? ""),
        input.checksumSha256,
      ].join("\n"),
      "utf8",
    )
    .digest("hex");

const bestEffortRelease = async (input: {
  operationId: string;
  leaseOwner: string;
  errorCode: string;
}): Promise<void> => {
  try {
    await releaseNexusCloudProviderLease({
      operationId: input.operationId,
      leaseOwner: input.leaseOwner,
      errorCode: input.errorCode,
      releasedAt: new Date(),
    });
  } catch {
    // Lease expiry remains the crash-safe recovery path if release persistence fails.
  }
};

/**
 * Execute or recover one provider write under a PostgreSQL cross-instance lease.
 *
 * No canonical Project Memory File records are committed here. This seam only
 * owns provider-operation exclusion and durable provider receipt recovery.
 */
export async function executeNexusCloudDurableProviderWrite(input: {
  workspaceId: number;
  operation: NexusCloudOperationIdentity;
  pendingAsset: NexusCloudPendingAssetEnvelope;
  plan: NexusCloudProviderWritePlan;
  binary: Buffer;
  checksumSha256: string;
  tradeId?: string;
  leaseDurationMs?: number;
}): Promise<NexusDurableProviderWriteResult> {
  const operationId = `CLOUD-WRITE-${input.operation.operationFingerprint}`;
  const leaseOwner = randomUUID();
  const requestFingerprint = providerRequestFingerprint({
    pendingAsset: input.pendingAsset,
    plan: input.plan,
    checksumSha256: input.checksumSha256,
    tradeId: input.tradeId,
  });

  let claim: AcquireNexusCloudWriteLeaseResult;
  try {
    claim = await acquireNexusCloudWriteLease({
      operationId,
      workspaceId: input.workspaceId,
      projectId: input.pendingAsset.projectId,
      worldId: input.pendingAsset.worldId,
      providerConnectorId: input.plan.connectorDefinitionId,
      providerWriteIdentity: input.operation.providerIdempotencyKey,
      requestFingerprint,
      leaseOwner,
      now: new Date(),
      leaseDurationMs: input.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS,
    });
  } catch (error) {
    if (error instanceof NexusCloudWriteOperationError) {
      throw new NexusCloudDurableProviderWriteError(error.message, {
        cause: error,
      });
    }
    throw error;
  }

  if (claim.status === "BUSY") {
    return {
      status: "BUSY",
      operationId,
      retryAfterMs: claim.retryAfterMs,
    };
  }

  if (claim.status === "ALREADY_COMMITTED") {
    return {
      status: "ALREADY_COMMITTED",
      operationId,
      driveFileId: claim.providerObjectId,
      canonicalFileId: claim.canonicalFileId,
    };
  }

  if (claim.status === "PROVIDER_CONFIRMED") {
    const receipt = parseStoredReceipt(claim.providerReceiptJson, {
      projectId: input.pendingAsset.projectId,
      worldId: input.pendingAsset.worldId,
      providerConnectorId: input.plan.connectorDefinitionId,
      providerObjectId: claim.providerObjectId,
    });
    return {
      status: "READY_FOR_PERSISTENCE",
      operationId,
      driveFileId: claim.providerObjectId,
      receipt,
      providerStatus: "RECOVERED_FROM_LEDGER",
      idempotentReplay: true,
    };
  }

  let providerResult: Awaited<ReturnType<typeof writeNexusCloudGoogleDriveRuntime>>;
  try {
    providerResult = await writeNexusCloudGoogleDriveRuntime({
      plan: input.plan,
      binary: input.binary,
      idempotencyKey: input.operation.providerIdempotencyKey,
    });
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "NEXUS_CLOUD_PROVIDER_WRITE_FAILED";
    await bestEffortRelease({ operationId, leaseOwner, errorCode });
    throw error;
  }

  try {
    await confirmNexusCloudProviderWrite({
      operationId,
      leaseOwner,
      providerObjectId: providerResult.driveFileId,
      providerReceiptJson: providerResult.receipt as unknown as Record<string, unknown>,
      confirmedAt: new Date(),
    });
  } catch (error) {
    throw new NexusCloudDurableProviderWriteError(
      "NEXUS_CLOUD_PROVIDER_WRITTEN_LEDGER_CONFIRMATION_FAILED",
      {
        cause: error,
        providerWriteConfirmed: true,
        driveFileId: providerResult.driveFileId,
      },
    );
  }

  return {
    status: "READY_FOR_PERSISTENCE",
    operationId,
    driveFileId: providerResult.driveFileId,
    receipt: providerResult.receipt,
    providerStatus: providerResult.status,
    idempotentReplay: providerResult.idempotentReplay,
  };
}
