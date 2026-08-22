import { and, count, eq, gt, gte, isNull } from "drizzle-orm";
import { db, nexusContextTicketsTable } from "@workspace/db";
import {
  consumeNexusContextTicketWithStore,
  issueNexusContextTicketWithStore,
  NexusContextTicketRateLimitError,
  NEXUS_CONTEXT_TICKET_PURPOSE,
  NEXUS_CONTEXT_TICKET_SCHEMA,
  NEXUS_CONTEXT_TICKET_TTL_MS,
  type ConsumedNexusContextTicket,
  type IssueNexusContextTicketInput,
  type IssuedNexusContextTicket,
  type NexusContextTicketStore,
  type StoredNexusContextTicket,
  isSafeRawContextTicket,
  isValidContextTicketIssueInput,
} from "./nexus-context-ticket-core";

export {
  NexusContextTicketRateLimitError,
  NEXUS_CONTEXT_TICKET_PURPOSE,
  NEXUS_CONTEXT_TICKET_SCHEMA,
  NEXUS_CONTEXT_TICKET_TTL_MS,
  isSafeRawContextTicket,
  isValidContextTicketIssueInput,
};
export type {
  ConsumedNexusContextTicket,
  IssueNexusContextTicketInput,
  IssuedNexusContextTicket,
};

export class NexusContextTicketStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus context ticket store is unavailable", { cause });
    this.name = "NexusContextTicketStoreUnavailableError";
  }
}

const postgresContextTicketStore: NexusContextTicketStore = {
  async countIssuedSince(input) {
    const [rate] = await db
      .select({ value: count() })
      .from(nexusContextTicketsTable)
      .where(
        and(
          eq(nexusContextTicketsTable.workspaceId, input.workspaceId),
          eq(nexusContextTicketsTable.personId, input.personId),
          eq(nexusContextTicketsTable.projectId, input.projectId),
          gte(nexusContextTicketsTable.issuedAt, input.since),
        ),
      );
    return Number(rate?.value ?? 0);
  },

  async insert(record: StoredNexusContextTicket) {
    await db.insert(nexusContextTicketsTable).values(record);
  },

  async consume(input) {
    const [record] = await db
      .update(nexusContextTicketsTable)
      .set({ consumedAt: input.now })
      .where(
        and(
          eq(nexusContextTicketsTable.ticketDigest, input.ticketDigest),
          isNull(nexusContextTicketsTable.consumedAt),
          gt(nexusContextTicketsTable.expiresAt, input.now),
        ),
      )
      .returning({
        workspaceId: nexusContextTicketsTable.workspaceId,
        personId: nexusContextTicketsTable.personId,
        projectId: nexusContextTicketsTable.projectId,
        worldId: nexusContextTicketsTable.worldId,
        participationId: nexusContextTicketsTable.participationId,
        accessDecisionId: nexusContextTicketsTable.accessDecisionId,
        nexusObjectId: nexusContextTicketsTable.nexusObjectId,
        connectorAccountId: nexusContextTicketsTable.connectorAccountId,
        adapterId: nexusContextTicketsTable.adapterId,
        sourceApplication: nexusContextTicketsTable.sourceApplication,
        externalObjectType: nexusContextTicketsTable.externalObjectType,
        externalRecordReference: nexusContextTicketsTable.externalRecordReference,
        purpose: nexusContextTicketsTable.purpose,
        allowedActions: nexusContextTicketsTable.allowedActions,
        issuedAt: nexusContextTicketsTable.issuedAt,
        expiresAt: nexusContextTicketsTable.expiresAt,
        consumedAt: nexusContextTicketsTable.consumedAt,
      });

    if (!record?.consumedAt) return null;
    return record as ConsumedNexusContextTicket;
  },
};

/**
 * Production wrapper. The only production store remains the existing
 * PostgreSQL/Drizzle `nexus_context_tickets` table. No environment-controlled
 * in-memory or auth bypass is introduced here.
 */
export async function issueNexusContextTicket(
  input: IssueNexusContextTicketInput,
  now = new Date(),
): Promise<IssuedNexusContextTicket> {
  try {
    return await issueNexusContextTicketWithStore(
      postgresContextTicketStore,
      input,
      now,
    );
  } catch (error) {
    if (error instanceof NexusContextTicketRateLimitError) throw error;
    if (error instanceof NexusContextTicketStoreUnavailableError) throw error;
    if (error instanceof Error && error.message === "Invalid context ticket scope") {
      throw error;
    }
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}

/**
 * Production single-use consume wrapper over PostgreSQL. Unknown, expired and
 * already-consumed tickets still share the same null result from the atomic
 * store operation.
 */
export async function consumeNexusContextTicket(
  rawTicket: string,
  now = new Date(),
): Promise<ConsumedNexusContextTicket | null> {
  try {
    return await consumeNexusContextTicketWithStore(
      postgresContextTicketStore,
      rawTicket,
      now,
    );
  } catch (error) {
    if (error instanceof NexusContextTicketStoreUnavailableError) throw error;
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}
