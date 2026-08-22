import crypto from "node:crypto";
import { and, count, eq, gt, gte, isNull } from "drizzle-orm";
import { db, nexusContextTicketsTable } from "@workspace/db";

export const NEXUS_CONTEXT_TICKET_SCHEMA = "nexus-context-ticket/v1" as const;
export const NEXUS_CONTEXT_TICKET_PURPOSE = "CONNECTOR_CONTEXT_READ" as const;
export const NEXUS_CONTEXT_TICKET_TTL_MS = 60_000;

const TICKET_BYTES = 32;
const ISSUE_WINDOW_MS = 60_000;
const MAX_TICKETS_PER_PERSON_PROJECT_WINDOW = 10;
const SAFE_RAW_TICKET = /^[A-Za-z0-9_-]{43}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

type TicketScopeString = string;

export type IssueNexusContextTicketInput = {
  personId: TicketScopeString;
  projectId: TicketScopeString;
  worldId: TicketScopeString;
  participationId: TicketScopeString;
  accessDecisionId: TicketScopeString;
  nexusObjectId: TicketScopeString;
  connectorAccountId: TicketScopeString;
  adapterId: "work-wallet";
  sourceApplication: "WORK_WALLET";
  externalObjectType: string;
  externalRecordReference: string;
  sessionId: string;
};

export type IssuedNexusContextTicket = {
  schema: typeof NEXUS_CONTEXT_TICKET_SCHEMA;
  ticket: string;
  expiresAt: string;
  purpose: typeof NEXUS_CONTEXT_TICKET_PURPOSE;
};

export type ConsumedNexusContextTicket = {
  personId: string;
  projectId: string;
  worldId: string;
  participationId: string;
  accessDecisionId: string;
  nexusObjectId: string;
  connectorAccountId: string;
  adapterId: string;
  sourceApplication: string;
  externalObjectType: string;
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

function isSafeScopeValue(value: string, maxLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

export function isSafeRawContextTicket(value: string): boolean {
  return SAFE_RAW_TICKET.test(value);
}

export function isValidContextTicketIssueInput(
  input: IssueNexusContextTicketInput,
): boolean {
  return (
    input.adapterId === "work-wallet" &&
    input.sourceApplication === "WORK_WALLET" &&
    isSafeScopeValue(input.personId, 160) &&
    isSafeScopeValue(input.projectId, 160) &&
    isSafeScopeValue(input.worldId, 160) &&
    isSafeScopeValue(input.participationId, 160) &&
    isSafeScopeValue(input.accessDecisionId, 160) &&
    isSafeScopeValue(input.nexusObjectId, 160) &&
    isSafeScopeValue(input.connectorAccountId, 160) &&
    isSafeScopeValue(input.externalObjectType, 120) &&
    isSafeScopeValue(input.externalRecordReference, 256) &&
    isSafeScopeValue(input.sessionId, 512)
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function createOpaqueTicket(): string {
  return crypto.randomBytes(TICKET_BYTES).toString("base64url");
}

/**
 * Persist one short-lived capability after the caller has already completed the
 * canonical #90 Work Wallet ticket-eligibility gate.
 *
 * This function deliberately does not resolve Person, Participation, grants or
 * AccessDecision. Those are canonical Project Memory concerns. The exact IDs of
 * the successful decision are frozen into the capability so exchange can
 * re-check the same scope before context is returned.
 */
export async function issueNexusContextTicket(
  input: IssueNexusContextTicketInput,
  now = new Date(),
): Promise<IssuedNexusContextTicket> {
  if (!isValidContextTicketIssueInput(input)) {
    throw new Error("Invalid context ticket scope");
  }

  try {
    const windowStart = new Date(now.getTime() - ISSUE_WINDOW_MS);
    const [rate] = await db
      .select({ value: count() })
      .from(nexusContextTicketsTable)
      .where(
        and(
          eq(nexusContextTicketsTable.personId, input.personId),
          eq(nexusContextTicketsTable.projectId, input.projectId),
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

    const expiresAt = new Date(now.getTime() + NEXUS_CONTEXT_TICKET_TTL_MS);

    await db.insert(nexusContextTicketsTable).values({
      ticketDigest: sha256(ticket),
      personId: input.personId,
      projectId: input.projectId,
      worldId: input.worldId,
      participationId: input.participationId,
      accessDecisionId: input.accessDecisionId,
      nexusObjectId: input.nexusObjectId,
      connectorAccountId: input.connectorAccountId,
      adapterId: input.adapterId,
      sourceApplication: input.sourceApplication,
      externalObjectType: input.externalObjectType,
      externalRecordReference: input.externalRecordReference,
      purpose: NEXUS_CONTEXT_TICKET_PURPOSE,
      allowedActions: [NEXUS_CONTEXT_TICKET_PURPOSE],
      issuedSessionDigest: sha256(input.sessionId),
      issuedAt: now,
      expiresAt,
    });

    return {
      schema: NEXUS_CONTEXT_TICKET_SCHEMA,
      ticket,
      expiresAt: expiresAt.toISOString(),
      purpose: NEXUS_CONTEXT_TICKET_PURPOSE,
    };
  } catch (error) {
    if (error instanceof NexusContextTicketRateLimitError) throw error;
    if (error instanceof NexusContextTicketStoreUnavailableError) throw error;
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}

/**
 * Atomically consumes a ticket before any connector context is returned.
 * Expired, unknown and already-consumed tickets intentionally share a null
 * result so this primitive does not expose a ticket-state oracle.
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
  } catch (error) {
    throw new NexusContextTicketStoreUnavailableError(error);
  }
}
