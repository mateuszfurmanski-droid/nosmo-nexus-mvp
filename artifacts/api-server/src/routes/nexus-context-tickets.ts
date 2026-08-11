import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../lib/auth";
import {
  consumeNexusContextTicket,
  isSafeExternalRecordReference,
  issueNexusContextTicket,
  NexusContextTicketRateLimitError,
  NexusContextTicketStoreUnavailableError,
} from "../lib/nexus-context-ticket";
import { isAllowedContextTicketExchangeOrigin } from "../lib/nexus-context-ticket-origin";
import {
  NexusIdentityBindingStoreUnavailableError,
  resolveNexusPersonBinding,
} from "../lib/nexus-person-binding";
import {
  NexusProjectAuthorizationStoreUnavailableError,
  resolveNexusProjectApplicationAccess,
} from "../lib/nexus-project-authorization";
import { isSafeNexusProjectId } from "../lib/nexus-project-access-policy";
import {
  resolveWorkWalletConnectorContext,
  type WorkWalletConnectorContext,
} from "../lib/work-wallet-runtime";
import { isSameOriginRequest } from "../lib/request-origin";

const router: IRouter = Router();
const ISSUE_ALLOWED_KEYS = new Set([
  "adapterId",
  "projectId",
  "externalRecordReference",
]);
const EXCHANGE_ALLOWED_KEYS = new Set(["ticket"]);

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function hasOnlyKeys(record: JsonRecord, allowed: Set<string>): boolean {
  return Object.keys(record).every((key) => allowed.has(key));
}

function stringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
}

async function requireLiveConnectorContext(
  nexusProjectId: string,
  externalRecordReference: string,
): Promise<WorkWalletConnectorContext | null> {
  const context = await resolveWorkWalletConnectorContext({
    source: "WORK_WALLET",
    projectId: nexusProjectId,
    sourceRecord: externalRecordReference,
  });

  if (!context) return null;
  if (context.developmentContext) return null;
  if (context.verificationSource !== "WORK_WALLET") return null;
  return context;
}

router.post("/nexus/context-tickets", async (req: Request, res: Response) => {
  noStore(res);

  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: "ORIGIN_NOT_ALLOWED" });
    return;
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    return;
  }

  const body = asRecord(req.body);
  if (!body || !hasOnlyKeys(body, ISSUE_ALLOWED_KEYS)) {
    res.status(400).json({ error: "INVALID_TICKET_REQUEST" });
    return;
  }

  const adapterId = stringField(body, "adapterId");
  const nexusProjectId = stringField(body, "projectId");
  const externalRecordReference = stringField(
    body,
    "externalRecordReference",
  );

  if (
    adapterId !== "work-wallet" ||
    !nexusProjectId ||
    !isSafeNexusProjectId(nexusProjectId) ||
    !externalRecordReference ||
    !isSafeExternalRecordReference(externalRecordReference)
  ) {
    res.status(400).json({ error: "INVALID_TICKET_REQUEST" });
    return;
  }

  try {
    const person = await resolveNexusPersonBinding(req.user.id);
    if (!person) {
      res.status(403).json({ error: "NEXUS_PERSON_BINDING_REQUIRED" });
      return;
    }

    const access = await resolveNexusProjectApplicationAccess(
      person.personId,
      nexusProjectId,
      "work-wallet",
    );

    if (!access.allowed || !access.participationId) {
      res.status(403).json({ error: "PROJECT_ACCESS_DENIED" });
      return;
    }

    const context = await requireLiveConnectorContext(
      nexusProjectId,
      externalRecordReference,
    );
    if (!context) {
      res.status(404).json({ error: "CONNECTOR_CONTEXT_NOT_FOUND" });
      return;
    }

    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
      return;
    }

    const issued = await issueNexusContextTicket({
      personId: person.personId,
      nexusProjectId,
      participationId: access.participationId,
      adapterId: "work-wallet",
      sourceApplication: "WORK_WALLET",
      externalRecordReference,
      sessionId,
    });

    res.status(201).json({
      schema: "nexus-context-ticket/v1",
      ticket: issued.ticket,
      expiresAt: issued.expiresAt,
      purpose: "CONNECTOR_CONTEXT_READ",
    });
  } catch (error) {
    if (error instanceof NexusContextTicketRateLimitError) {
      res.status(429).json({ error: "CONTEXT_TICKET_RATE_LIMITED" });
      return;
    }
    if (
      error instanceof NexusIdentityBindingStoreUnavailableError ||
      error instanceof NexusProjectAuthorizationStoreUnavailableError ||
      error instanceof NexusContextTicketStoreUnavailableError
    ) {
      req.log.error({ err: error }, "Nexus context ticket issue dependency unavailable");
      res.status(503).json({ error: "CONTEXT_TICKET_SERVICE_UNAVAILABLE" });
      return;
    }
    throw error;
  }
});

router.post(
  "/nexus/context-tickets/exchange",
  async (req: Request, res: Response) => {
    noStore(res);

    if (!isAllowedContextTicketExchangeOrigin(req)) {
      res.status(403).json({ error: "ORIGIN_NOT_ALLOWED" });
      return;
    }

    const body = asRecord(req.body);
    if (!body || !hasOnlyKeys(body, EXCHANGE_ALLOWED_KEYS)) {
      res.status(400).json({ error: "INVALID_TICKET_EXCHANGE" });
      return;
    }

    const rawTicket = stringField(body, "ticket");
    if (!rawTicket) {
      res.status(400).json({ error: "INVALID_TICKET_EXCHANGE" });
      return;
    }

    try {
      const ticket = await consumeNexusContextTicket(rawTicket);
      if (!ticket) {
        res.status(410).json({ error: "CONTEXT_TICKET_INVALID" });
        return;
      }

      if (
        ticket.adapterId !== "work-wallet" ||
        ticket.sourceApplication !== "WORK_WALLET" ||
        ticket.purpose !== "CONNECTOR_CONTEXT_READ" ||
        !ticket.allowedActions.includes("CONNECTOR_CONTEXT_READ")
      ) {
        res.status(410).json({ error: "CONTEXT_TICKET_INVALID" });
        return;
      }

      const access = await resolveNexusProjectApplicationAccess(
        ticket.personId,
        ticket.nexusProjectId,
        "work-wallet",
      );

      if (
        !access.allowed ||
        !access.participationId ||
        access.participationId !== ticket.participationId
      ) {
        res.status(403).json({ error: "PROJECT_ACCESS_DENIED" });
        return;
      }

      const context = await requireLiveConnectorContext(
        ticket.nexusProjectId,
        ticket.externalRecordReference,
      );
      if (!context) {
        res.status(404).json({ error: "CONNECTOR_CONTEXT_NOT_FOUND" });
        return;
      }

      res.json({
        schema: "nexus-context-ticket-exchange/v1",
        context,
      });
    } catch (error) {
      if (
        error instanceof NexusProjectAuthorizationStoreUnavailableError ||
        error instanceof NexusContextTicketStoreUnavailableError
      ) {
        req.log.error({ err: error }, "Nexus context ticket exchange dependency unavailable");
        res.status(503).json({ error: "CONTEXT_TICKET_SERVICE_UNAVAILABLE" });
        return;
      }
      throw error;
    }
  },
);

export default router;
