import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmAccessDecisionsTable,
  nexusPmCanonicalObjectsTable,
  nexusPmConnectorAccountsTable,
  nexusPmConnectorObjectMappingsTable,
  nexusPmPeopleTable,
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
} from "./schema";

export const NEXUS_WORK_WALLET_PROJECT_MEMORY_SCOPE_SCHEMA =
  "nexus-work-wallet-project-memory-scope/v1" as const;

export type NexusWorkWalletProjectMemoryScopeInput = {
  workspaceId: number;
  personId: string;
  projectId: string;
  worldId: string;
  connectorAccountId: string;
  externalObjectType: string;
  externalRecordReference: string;
};

export type NexusWorkWalletProjectMemoryScope = {
  schema: typeof NEXUS_WORK_WALLET_PROJECT_MEMORY_SCOPE_SCHEMA;
  workspaceId: number;
  person: Record<string, unknown> | null;
  connectorAccount: Record<string, unknown> | null;
  connectorObjectMappings: Record<string, unknown>[];
  canonicalObjects: Record<string, unknown>[];
  projectParticipations: Record<string, unknown>[];
  permissionGrants: Record<string, unknown>[];
  accessDecisions: Record<string, unknown>[];
};

export class NexusWorkWalletProjectMemoryStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus Work Wallet Project Memory store is unavailable", { cause });
    this.name = "NexusWorkWalletProjectMemoryStoreUnavailableError";
  }
}

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function isSafeScopeValue(value: string, maxLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new NexusWorkWalletProjectMemoryStoreUnavailableError();
  }
  return value as Record<string, unknown>;
}

function exactString(
  record: Record<string, unknown>,
  key: string,
  expected: string | null,
): void {
  const actual = record[key];
  if (expected === null) {
    if (actual !== undefined && actual !== null) {
      throw new NexusWorkWalletProjectMemoryStoreUnavailableError();
    }
    return;
  }
  if (actual !== expected) {
    throw new NexusWorkWalletProjectMemoryStoreUnavailableError();
  }
}

function validateInput(input: NexusWorkWalletProjectMemoryScopeInput): void {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
    throw new Error("Invalid workspaceId");
  }
  if (!isSafeScopeValue(input.personId, 160)) throw new Error("Invalid personId");
  if (!isSafeScopeValue(input.projectId, 160)) throw new Error("Invalid projectId");
  if (!isSafeScopeValue(input.worldId, 160)) throw new Error("Invalid worldId");
  if (!isSafeScopeValue(input.connectorAccountId, 160)) {
    throw new Error("Invalid connectorAccountId");
  }
  if (!isSafeScopeValue(input.externalObjectType, 120)) {
    throw new Error("Invalid externalObjectType");
  }
  if (!isSafeScopeValue(input.externalRecordReference, 256)) {
    throw new Error("Invalid externalRecordReference");
  }
}

/**
 * Load only the exact server-owned Project Memory records needed to resolve one
 * Work Wallet context request. This function does not make an access decision and
 * does not perform connector mapping itself; it supplies the persisted canonical
 * records to the existing #92/#99 domain contracts.
 */
export async function loadNexusWorkWalletProjectMemoryScope(
  input: NexusWorkWalletProjectMemoryScopeInput,
): Promise<NexusWorkWalletProjectMemoryScope> {
  validateInput(input);

  try {
    const [personRows, accountRows, participationRows, decisionRows, mappingRows] =
      await Promise.all([
        db
          .select()
          .from(nexusPmPeopleTable)
          .where(eq(nexusPmPeopleTable.personId, input.personId))
          .limit(2),
        db
          .select()
          .from(nexusPmConnectorAccountsTable)
          .where(
            and(
              eq(nexusPmConnectorAccountsTable.workspaceId, input.workspaceId),
              eq(
                nexusPmConnectorAccountsTable.connectorAccountId,
                input.connectorAccountId,
              ),
            ),
          )
          .limit(2),
        db
          .select()
          .from(nexusPmProjectParticipationsTable)
          .where(
            and(
              eq(nexusPmProjectParticipationsTable.workspaceId, input.workspaceId),
              eq(nexusPmProjectParticipationsTable.personId, input.personId),
              eq(nexusPmProjectParticipationsTable.projectId, input.projectId),
              eq(nexusPmProjectParticipationsTable.worldId, input.worldId),
            ),
          ),
        db
          .select()
          .from(nexusPmAccessDecisionsTable)
          .where(
            and(
              eq(nexusPmAccessDecisionsTable.workspaceId, input.workspaceId),
              eq(nexusPmAccessDecisionsTable.personId, input.personId),
              eq(nexusPmAccessDecisionsTable.projectId, input.projectId),
              eq(nexusPmAccessDecisionsTable.worldId, input.worldId),
              eq(nexusPmAccessDecisionsTable.moduleId, "work-wallet"),
              eq(
                nexusPmAccessDecisionsTable.actionKey,
                "connector.context.read",
              ),
            ),
          ),
        db
          .select()
          .from(nexusPmConnectorObjectMappingsTable)
          .where(
            and(
              eq(nexusPmConnectorObjectMappingsTable.workspaceId, input.workspaceId),
              eq(
                nexusPmConnectorObjectMappingsTable.connectorAccountId,
                input.connectorAccountId,
              ),
              eq(
                nexusPmConnectorObjectMappingsTable.externalObjectType,
                input.externalObjectType,
              ),
              eq(
                nexusPmConnectorObjectMappingsTable.externalObjectId,
                input.externalRecordReference,
              ),
            ),
          ),
      ]);

    if (personRows.length > 1 || accountRows.length > 1) {
      throw new NexusWorkWalletProjectMemoryStoreUnavailableError();
    }

    const person = personRows[0]
      ? asRecord(personRows[0].recordJson)
      : null;
    if (personRows[0] && person) {
      exactString(person, "id", personRows[0].personId);
      exactString(person, "displayName", personRows[0].displayName);
      exactString(person, "personType", personRows[0].personType);
      exactString(person, "status", personRows[0].status);
    }

    const connectorAccount = accountRows[0]
      ? asRecord(accountRows[0].recordJson)
      : null;
    if (accountRows[0] && connectorAccount) {
      exactString(connectorAccount, "id", accountRows[0].connectorAccountId);
      exactString(
        connectorAccount,
        "connectorDefinitionId",
        accountRows[0].connectorDefinitionId,
      );
      exactString(connectorAccount, "tenantId", accountRows[0].tenantId);
      exactString(
        connectorAccount,
        "connectionState",
        accountRows[0].connectionState,
      );
    }

    const mappingRecords = mappingRows.map((row) => {
      const record = asRecord(row.recordJson);
      exactString(record, "id", row.mappingId);
      exactString(record, "connectorAccountId", row.connectorAccountId);
      exactString(record, "nexusObjectId", row.nexusObjectId);
      exactString(record, "externalObjectType", row.externalObjectType);
      exactString(record, "externalObjectId", row.externalObjectId);
      exactString(record, "mappingMethod", row.mappingMethod);
      return record;
    });

    const canonicalObjectIds = [
      ...new Set(mappingRows.map((row) => row.nexusObjectId)),
    ];
    const canonicalRows = canonicalObjectIds.length
      ? await db
          .select()
          .from(nexusPmCanonicalObjectsTable)
          .where(
            and(
              eq(nexusPmCanonicalObjectsTable.workspaceId, input.workspaceId),
              eq(nexusPmCanonicalObjectsTable.projectId, input.projectId),
              eq(nexusPmCanonicalObjectsTable.worldId, input.worldId),
              inArray(nexusPmCanonicalObjectsTable.objectId, canonicalObjectIds),
            ),
          )
      : [];

    const canonicalObjects = canonicalRows.map((row) => {
      const record = asRecord(row.recordJson);
      exactString(record, "id", row.objectId);
      exactString(record, "projectId", row.projectId);
      exactString(record, "worldId", row.worldId);
      exactString(record, "objectType", row.objectType);
      return record;
    });

    const projectParticipations = participationRows.map((row) => {
      const record = asRecord(row.recordJson);
      exactString(record, "id", row.participationId);
      exactString(record, "personId", row.personId);
      exactString(record, "projectId", row.projectId);
      exactString(record, "worldId", row.worldId);
      exactString(
        record,
        "participationStatus",
        row.participationStatus,
      );
      return record;
    });

    const participationIds = participationRows.map((row) => row.participationId);
    const grantRows = participationIds.length
      ? await db
          .select()
          .from(nexusPmPermissionGrantsTable)
          .where(
            and(
              eq(nexusPmPermissionGrantsTable.workspaceId, input.workspaceId),
              inArray(
                nexusPmPermissionGrantsTable.participationId,
                participationIds,
              ),
            ),
          )
      : [];

    const permissionGrants = grantRows.map((row) => {
      const record = asRecord(row.recordJson);
      exactString(record, "id", row.grantId);
      exactString(record, "participationId", row.participationId);
      exactString(record, "effect", row.effect);
      exactString(record, "moduleId", row.moduleId);
      exactString(record, "actionKey", row.actionKey);
      exactString(record, "objectScopeId", row.objectScopeId);
      return record;
    });

    const accessDecisions = decisionRows.map((row) => {
      const record = asRecord(row.recordJson);
      exactString(record, "id", row.decisionId);
      exactString(record, "personId", row.personId);
      exactString(record, "participationId", row.participationId);
      exactString(record, "projectId", row.projectId);
      exactString(record, "worldId", row.worldId);
      exactString(record, "moduleId", row.moduleId);
      exactString(record, "actionKey", row.actionKey);
      exactString(record, "objectScopeId", row.objectScopeId);
      exactString(record, "result", row.result);
      return record;
    });

    return {
      schema: NEXUS_WORK_WALLET_PROJECT_MEMORY_SCOPE_SCHEMA,
      workspaceId: input.workspaceId,
      person,
      connectorAccount,
      connectorObjectMappings: mappingRecords,
      canonicalObjects,
      projectParticipations,
      permissionGrants,
      accessDecisions,
    };
  } catch (error) {
    if (error instanceof NexusWorkWalletProjectMemoryStoreUnavailableError) {
      throw error;
    }
    throw new NexusWorkWalletProjectMemoryStoreUnavailableError(error);
  }
}
