import crypto from "node:crypto";
import { and, count, eq, gt, gte, isNull } from "drizzle-orm";
import { db, nexusContextTicketsTable } from "@workspace/db";

const TICKET_BYTES = 32;
const TICKET_TTL_MS = 60_000;
const ISSUE_WINDOW_MS = 60_000;
const MAX_TICKETS_PER_PERSON_PROJECT_WINDOW = 10;
const SAFE_EXTERNAL_REFERENCE = /^[A-Za-z0-9._~-]{1,128}$/;
const SAFE_RAW_TICKET = /^[A-Za-z0-9_-]{43}$/;

export type IssueNexusContextTicketInput = {
  personId: string;
  nexusProjectId: string;
  participationId: string;
  adapterId: "work-wallet";
  sourceApplication: "WORK_WALLET";
  externalRecordReference: string;
  sessionId: string;
};

export type IssuedNexusContextTicket = {
  ticket: string;
  expiresAt: string;
};

export type ConsumedNexusContextTicket = {
  personId: string;
  nexusProjectId: string;
  participationId: string;
  adapterId: string;
  sourceApplication: string;
  externalRecordReference: string;
  purpose: string;
  allowedActions: string[];
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date;
};

export class NexusContextTicketStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus context ticket store is unavailable", { cause });
    this.name = "NexusContextTicketStoreUnavailableError";
  }
}

export class NexusContextTicketRateLimitError extends Error {
  constructor() {
    super("Nexus context ticket issue rate exceeded");
    this.name = "NexusContextTicketRateLimitError";
  }
}

export function isSafeExternalRecordReference(value: string): boolean {
  return SAFE_EXTERNAL_REFERENCE.test(value);
}

export function isSafeRawContextTicket(value: string): boolean {
  return SAFE_RAW_TICKET.test(value);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function createOpaqueTicket(): string {
  return crypto.randomBytes(TICKET_BYTES).toString("base64url");
}

export async function issueNexusContextTicket(
  input: IssueNexusContextTicketInput,
  now = new Date(),
): Promise<IssuedNexusContextTicket> {
  if (!isSafeExternalRecordReference(input.externalRecordReference)) {
    throw new Error("Invalid external record reference");
  }
  if (!input.sessionId) {
    throw new Error("Session identifier is required for ticket issuance");
  }

  try {
    const windowStart = new Date(now.getTime() - ISSUE_WINDOW_MS);
    const [rate] = await db
      .select({ value: count() })
      .from(nexusContextTicketsTable)
      .where(
        and(
          eq(nexusContextTicketsTable.personId, input.personId),
          eq(nexusContextTicketsTable.nexusProjectId, input.nexusProjectId),
          gte(nexusContextTicketsTable.issuedAt, windowStart),
        ),
      );

    if (Number(rate?.value ?? 0) >= MAX_TICKETS_PER_PERSON_PROJECT_WINDOW) {
      throw new NexusContextTicketRateLimitError();
    }

    const ticket = createOpaqueTicket();
    if (!isSafeRawContextTicket(ticket)) {
      throw new NexusContextTicketStoreUnavailableError();
    }

    const expiresAt = new Date(now.getTime() + TICKET_TTL_MS);

    await db.insert(nexusContextTicketsTable).values({
      ticketDigest: sha256(ticket),
      personId: input.personId,
      nexusProjectId: input.nexusProjectId,
      participationId: input.participationId,
      adapterId: input.adapterId,
      sourceApplication: input.sourceApplication,
      externalRecordReference: input.externalRecordReference,
      purpose: "CONNECTOR_CONTEXT_READ",
      allowedActions: ["CONNECTOR_CONTEXT_READ"],
      issuedSessionDigest: sha256(input.sessionId),
      issuedAt: now,
      expiresAt,
    });

    return {
      ticket,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof NexusContextTicketRateLimitError) throw error;
    if (error instanceof NexusContextTicketStoreUnavailableError) throw error;
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}

/**
 * Atomically consumes a ticket before connector context is returned.
 * Expired, unknown and already-consumed tickets all fail through the same null
 * result to avoid exposing a ticket-state oracle.
 */
export async function consumeNexusContextTicket(
  rawTicket: string,
  now = new Date(),
): Promise<ConsumedNexusContextTicket | null> {
  if (!isSafeRawContextTicket(rawTicket)) return null;

  try {
    const [record] = await db
      .update(nexusContextTicketsTable)
      .set({ consumedAt: now })
      .where(
        and(
          eq(nexusContextTicketsTable.ticketDigest, sha256(rawTicket)),
          isNull(nexusContextTicketsTable.consumedAt),
          gt(nexusContextTicketsTable.expiresAt, now),
        ),
      )
      .returning({
        personId: nexusContextTicketsTable.personId,
        nexusProjectId: nexusContextTicketsTable.nexusProjectId,
        participationId: nexusContextTicketsTable.participationId,
        adapterId: nexusContextTicketsTable.adapterId,
        sourceApplication: nexusContextTicketsTable.sourceApplication,
        externalRecordReference:
          nexusContextTicketsTable.externalRecordReference,
        purpose: nexusContextTicketsTable.purpose,
        allowedActions: nexusContextTicketsTable.allowedActions,
        issuedAt: nexusContextTicketsTable.issuedAt,
        expiresAt: nexusContextTicketsTable.expiresAt,
        consumedAt: nexusContextTicketsTable.consumedAt,
      });

    if (!record?.consumedAt) return null;
    return record as ConsumedNexusContextTicket;
  } catch (error) {
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}
