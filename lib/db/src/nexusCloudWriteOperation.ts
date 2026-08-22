import { and, eq, lte } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmCloudWriteOperationsTable,
  type NexusPmCloudWriteOperationRow,
} from "./schema/nexusCloudWriteOperation";

export type NexusCloudWriteOperationState =
  | "PENDING_PROVIDER"
  | "PROVIDER_CONFIRMED"
  | "PERSISTENCE_FAILED"
  | "COMMITTED";

export interface NexusCloudWriteOperationIdentity {
  operationId: string;
  workspaceId: number;
  projectId: string;
  worldId: string;
  providerConnectorId: string;
  providerWriteIdentity: string;
  requestFingerprint: string;
}

export interface AcquireNexusCloudWriteLeaseInput
  extends NexusCloudWriteOperationIdentity {
  leaseOwner: string;
  now: Date;
  leaseDurationMs: number;
}

export type AcquireNexusCloudWriteLeaseResult =
  | {
      status: "ACQUIRED";
      operationId: string;
      leaseOwner: string;
      leaseExpiresAt: Date;
    }
  | {
      status: "BUSY";
      operationId: string;
      retryAfterMs: number;
    }
  | {
      status: "PROVIDER_CONFIRMED";
      operationId: string;
      providerObjectId: string;
      providerReceiptJson: Record<string, unknown>;
      previousState: "PROVIDER_CONFIRMED" | "PERSISTENCE_FAILED";
    }
  | {
      status: "ALREADY_COMMITTED";
      operationId: string;
      providerObjectId: string;
      canonicalFileId: string;
      providerReceiptJson: Record<string, unknown>;
    };

export class NexusCloudWriteOperationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NexusCloudWriteOperationError";
  }
}

const requireString = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new NexusCloudWriteOperationError(
      `NEXUS_CLOUD_WRITE_OPERATION_INVALID_${label.toUpperCase()}`,
    );
  }
  return normalized;
};

const validateIdentity = (
  row: NexusPmCloudWriteOperationRow,
  input: NexusCloudWriteOperationIdentity,
): void => {
  const exact =
    row.operationId === input.operationId &&
    row.workspaceId === input.workspaceId &&
    row.projectId === input.projectId &&
    row.worldId === input.worldId &&
    row.providerConnectorId === input.providerConnectorId &&
    row.providerWriteIdentity === input.providerWriteIdentity &&
    row.requestFingerprint === input.requestFingerprint;

  if (!exact) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_IDEMPOTENCY_CONFLICT",
    );
  }
};

const requireProviderRecovery = (
  row: NexusPmCloudWriteOperationRow,
): { providerObjectId: string; providerReceiptJson: Record<string, unknown> } => {
  if (!row.providerObjectId?.trim() || !row.providerReceiptJson) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_PROVIDER_RECOVERY_CORRUPT",
    );
  }
  return {
    providerObjectId: row.providerObjectId,
    providerReceiptJson: row.providerReceiptJson,
  };
};

const stateOf = (row: NexusPmCloudWriteOperationRow): NexusCloudWriteOperationState => {
  if (
    row.state !== "PENDING_PROVIDER" &&
    row.state !== "PROVIDER_CONFIRMED" &&
    row.state !== "PERSISTENCE_FAILED" &&
    row.state !== "COMMITTED"
  ) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_INVALID_STATE",
    );
  }
  return row.state;
};

const resultFromExisting = (
  row: NexusPmCloudWriteOperationRow,
  now: Date,
): AcquireNexusCloudWriteLeaseResult | null => {
  const state = stateOf(row);

  if (state === "COMMITTED") {
    const provider = requireProviderRecovery(row);
    if (!row.canonicalFileId?.trim()) {
      throw new NexusCloudWriteOperationError(
        "NEXUS_CLOUD_WRITE_OPERATION_COMMITTED_FILE_MISSING",
      );
    }
    return {
      status: "ALREADY_COMMITTED",
      operationId: row.operationId,
      providerObjectId: provider.providerObjectId,
      canonicalFileId: row.canonicalFileId,
      providerReceiptJson: provider.providerReceiptJson,
    };
  }

  if (state === "PROVIDER_CONFIRMED" || state === "PERSISTENCE_FAILED") {
    const provider = requireProviderRecovery(row);
    return {
      status: "PROVIDER_CONFIRMED",
      operationId: row.operationId,
      providerObjectId: provider.providerObjectId,
      providerReceiptJson: provider.providerReceiptJson,
      previousState: state,
    };
  }

  if (!row.leaseExpiresAt) {
    return null;
  }

  if (row.leaseExpiresAt.getTime() > now.getTime()) {
    return {
      status: "BUSY",
      operationId: row.operationId,
      retryAfterMs: Math.max(1, row.leaseExpiresAt.getTime() - now.getTime()),
    };
  }

  return null;
};

/**
 * Acquire durable authority to perform one external provider write.
 *
 * The unique providerWriteIdentity closes the cross-instance race. Exact retries
 * share the row; changed content/scope reusing that identity fails before Drive.
 * An expired lease may be atomically reclaimed after a crashed process.
 */
export async function acquireNexusCloudWriteLease(
  input: AcquireNexusCloudWriteLeaseInput,
): Promise<AcquireNexusCloudWriteLeaseResult> {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_INVALID_WORKSPACE",
    );
  }
  if (!Number.isFinite(input.leaseDurationMs) || input.leaseDurationMs < 5_000) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_INVALID_LEASE_DURATION",
    );
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_INVALID_NOW",
    );
  }

  const operationId = requireString(input.operationId, "operation_id");
  const projectId = requireString(input.projectId, "project_id");
  const worldId = requireString(input.worldId, "world_id");
  const providerConnectorId = requireString(
    input.providerConnectorId,
    "provider_connector_id",
  );
  const providerWriteIdentity = requireString(
    input.providerWriteIdentity,
    "provider_write_identity",
  );
  const requestFingerprint = requireString(
    input.requestFingerprint,
    "request_fingerprint",
  );
  const leaseOwner = requireString(input.leaseOwner, "lease_owner");
  const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs);

  try {
    await db
      .insert(nexusPmCloudWriteOperationsTable)
      .values({
        operationId,
        workspaceId: input.workspaceId,
        projectId,
        worldId,
        providerConnectorId,
        providerWriteIdentity,
        requestFingerprint,
        state: "PENDING_PROVIDER",
        leaseOwner,
        leaseExpiresAt,
        updatedAt: input.now,
      })
      .onConflictDoNothing();

    let [row] = await db
      .select()
      .from(nexusPmCloudWriteOperationsTable)
      .where(
        eq(
          nexusPmCloudWriteOperationsTable.providerWriteIdentity,
          providerWriteIdentity,
        ),
      )
      .limit(1);

    if (!row) {
      throw new NexusCloudWriteOperationError(
        "NEXUS_CLOUD_WRITE_OPERATION_ROW_MISSING",
      );
    }

    validateIdentity(row, input);

    if (row.leaseOwner === leaseOwner && stateOf(row) === "PENDING_PROVIDER") {
      return {
        status: "ACQUIRED",
        operationId: row.operationId,
        leaseOwner,
        leaseExpiresAt: row.leaseExpiresAt ?? leaseExpiresAt,
      };
    }

    const existing = resultFromExisting(row, input.now);
    if (existing) return existing;

    const [claimed] = await db
      .update(nexusPmCloudWriteOperationsTable)
      .set({
        leaseOwner,
        leaseExpiresAt,
        lastErrorCode: null,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(nexusPmCloudWriteOperationsTable.operationId, operationId),
          eq(nexusPmCloudWriteOperationsTable.state, "PENDING_PROVIDER"),
          lte(nexusPmCloudWriteOperationsTable.leaseExpiresAt, input.now),
        ),
      )
      .returning();

    if (claimed) {
      validateIdentity(claimed, input);
      return {
        status: "ACQUIRED",
        operationId,
        leaseOwner,
        leaseExpiresAt,
      };
    }

    [row] = await db
      .select()
      .from(nexusPmCloudWriteOperationsTable)
      .where(eq(nexusPmCloudWriteOperationsTable.operationId, operationId))
      .limit(1);

    if (!row) {
      throw new NexusCloudWriteOperationError(
        "NEXUS_CLOUD_WRITE_OPERATION_ROW_MISSING_AFTER_CLAIM",
      );
    }
    validateIdentity(row, input);

    const raced = resultFromExisting(row, input.now);
    if (raced) return raced;

    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_LEASE_CLAIM_FAILED",
    );
  } catch (error) {
    if (error instanceof NexusCloudWriteOperationError) throw error;
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORE_UNAVAILABLE",
      error,
    );
  }
}

export interface ConfirmNexusCloudProviderWriteInput {
  operationId: string;
  leaseOwner: string;
  providerObjectId: string;
  providerReceiptJson: Record<string, unknown>;
  confirmedAt: Date;
}

/** Persist provider confirmation before canonical Project Memory commit. */
export async function confirmNexusCloudProviderWrite(
  input: ConfirmNexusCloudProviderWriteInput,
): Promise<void> {
  const providerObjectId = requireString(
    input.providerObjectId,
    "provider_object_id",
  );
  if (!input.providerReceiptJson || typeof input.providerReceiptJson !== "object") {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_PROVIDER_RECEIPT_REQUIRED",
    );
  }

  try {
    const [updated] = await db
      .update(nexusPmCloudWriteOperationsTable)
      .set({
        state: "PROVIDER_CONFIRMED",
        providerObjectId,
        providerReceiptJson: input.providerReceiptJson,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        updatedAt: input.confirmedAt,
      })
      .where(
        and(
          eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId),
          eq(nexusPmCloudWriteOperationsTable.state, "PENDING_PROVIDER"),
          eq(nexusPmCloudWriteOperationsTable.leaseOwner, input.leaseOwner),
        ),
      )
      .returning();

    if (updated) return;

    const [row] = await db
      .select()
      .from(nexusPmCloudWriteOperationsTable)
      .where(eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId))
      .limit(1);

    if (
      row &&
      (row.state === "PROVIDER_CONFIRMED" ||
        row.state === "PERSISTENCE_FAILED" ||
        row.state === "COMMITTED") &&
      row.providerObjectId === providerObjectId
    ) {
      return;
    }

    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_PROVIDER_CONFIRMATION_CONFLICT",
    );
  } catch (error) {
    if (error instanceof NexusCloudWriteOperationError) throw error;
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORE_UNAVAILABLE",
      error,
    );
  }
}

export async function releaseNexusCloudProviderLease(
  input: {
    operationId: string;
    leaseOwner: string;
    errorCode: string;
    releasedAt: Date;
  },
): Promise<void> {
  try {
    await db
      .update(nexusPmCloudWriteOperationsTable)
      .set({
        leaseOwner: null,
        leaseExpiresAt: input.releasedAt,
        lastErrorCode: input.errorCode.slice(0, 160),
        updatedAt: input.releasedAt,
      })
      .where(
        and(
          eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId),
          eq(nexusPmCloudWriteOperationsTable.state, "PENDING_PROVIDER"),
          eq(nexusPmCloudWriteOperationsTable.leaseOwner, input.leaseOwner),
        ),
      );
  } catch (error) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORE_UNAVAILABLE",
      error,
    );
  }
}

export async function markNexusCloudPersistenceFailed(
  input: { operationId: string; errorCode: string; failedAt: Date },
): Promise<void> {
  try {
    await db
      .update(nexusPmCloudWriteOperationsTable)
      .set({
        state: "PERSISTENCE_FAILED",
        lastErrorCode: input.errorCode.slice(0, 160),
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: input.failedAt,
      })
      .where(
        and(
          eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId),
          eq(nexusPmCloudWriteOperationsTable.state, "PROVIDER_CONFIRMED"),
        ),
      );
  } catch (error) {
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORE_UNAVAILABLE",
      error,
    );
  }
}

export async function markNexusCloudWriteCommitted(
  input: { operationId: string; canonicalFileId: string; committedAt: Date },
): Promise<void> {
  const canonicalFileId = requireString(
    input.canonicalFileId,
    "canonical_file_id",
  );
  try {
    const [updated] = await db
      .update(nexusPmCloudWriteOperationsTable)
      .set({
        state: "COMMITTED",
        canonicalFileId,
        lastErrorCode: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: input.committedAt,
      })
      .where(
        and(
          eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId),
          eq(nexusPmCloudWriteOperationsTable.state, "PROVIDER_CONFIRMED"),
        ),
      )
      .returning();

    if (updated) return;

    const [row] = await db
      .select()
      .from(nexusPmCloudWriteOperationsTable)
      .where(eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId))
      .limit(1);

    if (
      row?.state === "COMMITTED" &&
      row.canonicalFileId === canonicalFileId
    ) {
      return;
    }

    if (row?.state === "PERSISTENCE_FAILED") {
      const [recovered] = await db
        .update(nexusPmCloudWriteOperationsTable)
        .set({
          state: "COMMITTED",
          canonicalFileId,
          lastErrorCode: null,
          updatedAt: input.committedAt,
        })
        .where(
          and(
            eq(nexusPmCloudWriteOperationsTable.operationId, input.operationId),
            eq(nexusPmCloudWriteOperationsTable.state, "PERSISTENCE_FAILED"),
          ),
        )
        .returning();
      if (recovered) return;
    }

    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_COMMIT_STATE_CONFLICT",
    );
  } catch (error) {
    if (error instanceof NexusCloudWriteOperationError) throw error;
    throw new NexusCloudWriteOperationError(
      "NEXUS_CLOUD_WRITE_OPERATION_STORE_UNAVAILABLE",
      error,
    );
  }
}
