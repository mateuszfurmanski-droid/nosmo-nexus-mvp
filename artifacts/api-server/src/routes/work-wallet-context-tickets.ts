import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  loadNexusWorkWalletProjectMemoryScope,
  NexusWorkWalletProjectMemoryStoreUnavailableError,
} from "@workspace/db/nexus-work-wallet-project-memory";
import { requireWorkspace } from "../middlewares/requireWorkspace";
import { getSessionId } from "../lib/auth";
import {
  NexusIdentityBindingStoreUnavailableError,
  resolveNexusPersonBinding,
} from "../lib/nexus-person-binding";
import { isSameOriginRequest } from "../lib/request-origin";
import { isAllowedContextTicketExchangeOrigin } from "../lib/nexus-context-ticket-origin";
import {
  consumeNexusContextTicket,
  issueNexusContextTicket,
  NEXUS_CONTEXT_TICKET_PURPOSE,
  NexusContextTicketRateLimitError,
  NexusContextTicketStoreUnavailableError,
} from "../lib/nexus-context-ticket";
import {
  buildVerifiedContextFromEligibleScope,
  evaluateLoadedWorkWalletScope,
} from "../lib/work-wallet-domain-runtime";
import type { NexusRuntimeIdentityContext } from "../../../../src/core/permissions/runtimeIdentityContract";

const router: IRouter = Router();
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

type IssueBody = {
  projectId: string;
  worldId: string;
  connectorAccountId: string;
  externalObjectType: string;
  externalRecordReference: string;
};

type ExchangeBody = { ticket: string };

function safeString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER.test(value)
  );
}

function parseIssueBody(value: unknown): IssueBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    !safeString(body.projectId, 160) ||
    !safeString(body.worldId, 160) ||
    !safeString(body.connectorAccountId, 160) ||
    !safeString(body.externalObjectType, 120) ||
    !safeString(body.externalRecordReference, 256)
  ) {
    return null;
  }
  return {
    projectId: body.projectId,
    worldId: body.worldId,
    connectorAccountId: body.connectorAccountId,
    externalObjectType: body.externalObjectType,
    externalRecordReference: body.externalRecordReference,
  };
}

function parseExchangeBody(value: unknown): ExchangeBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const ticket = (value as Record<string, unknown>).ticket;
  return typeof ticket === "string" ? { ticket } : null;
}

function canonicalAccountMatches(
  value: Record<string, unknown> | null,
  connectorAccountId: string,
): boolean {
  return (
    value !== null &&
    value.id === connectorAccountId &&
    value.status === "active" &&
    safeString(value.connectorDefinitionId, 160) &&
    safeString(value.tenantId, 160) &&
    safeString(value.connectionState, 32)
  );
}

function sessionIdentity(person: {
  personId: string;
  displayName: string;
}): NexusRuntimeIdentityContext {
  return {
    schema: "nexus-runtime-identity-context/v1",
    authenticated: true,
    identityState: "BOUND",
    personId: person.personId,
    displayName: person.displayName,
    source: "server-session",
  };
}

function ticketIdentity(personId: string): NexusRuntimeIdentityContext {
  return {
    schema: "nexus-runtime-identity-context/v1",
    authenticated: true,
    identityState: "BOUND",
    personId,
    source: "server-context-ticket",
  };
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

/**
 * Same-origin authenticated issue route.
 *
 * Browser input contains only the exact external locator and connector account.
 * Person, workspace, mapping, participation, grants and AccessDecision are all
 * resolved server-side before a capability is created.
 */
router.post(
  "/nexus/context-tickets/work-wallet",
  requireWorkspace,
  async (req: Request, res: Response) => {
    noStore(res);

    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: "CONTEXT_TICKET_SAME_ORIGIN_REQUIRED" });
      return;
    }

    const body = parseIssueBody(req.body);
    if (!body) {
      res.status(400).json({ error: "INVALID_CONTEXT_TICKET_REQUEST" });
      return;
    }

    if (!req.isAuthenticated() || !req.user || !req.workspaceId) {
      res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
      return;
    }

    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(401).json({ error: "AUTHENTICATED_SESSION_REQUIRED" });
      return;
    }

    try {
      const person = await resolveNexusPersonBinding(req.user.id);
      if (!person) {
        res.status(403).json({ error: "NEXUS_IDENTITY_UNBOUND" });
        return;
      }

      const loaded = await loadNexusWorkWalletProjectMemoryScope({
        workspaceId: req.workspaceId,
        personId: person.personId,
        projectId: body.projectId,
        worldId: body.worldId,
        connectorAccountId: body.connectorAccountId,
        externalObjectType: body.externalObjectType,
        externalRecordReference: body.externalRecordReference,
      });

      if (!canonicalAccountMatches(loaded.connectorAccount, body.connectorAccountId)) {
        res.status(403).json({ error: "CONTEXT_TICKET_NOT_AUTHORIZED" });
        return;
      }

      const evaluatedAt = new Date().toISOString();
      const resolution = evaluateLoadedWorkWalletScope({
        loaded,
        identity: sessionIdentity(person),
        connectorAccountId: body.connectorAccountId,
        locator: {
          projectId: body.projectId,
          externalObjectType: body.externalObjectType,
          externalRecordReference: body.externalRecordReference,
        },
        worldId: body.worldId,
        evaluatedAt,
      });

      if (resolution.status !== "ELIGIBLE") {
        req.log.info(
          { status: resolution.status },
          "Work Wallet Context Ticket denied by canonical domain gate",
        );
        res.status(403).json({ error: "CONTEXT_TICKET_NOT_AUTHORIZED" });
        return;
      }

      const issued = await issueNexusContextTicket({
        workspaceId: req.workspaceId,
        personId: resolution.eligibility.personId,
        projectId: body.projectId,
        worldId: body.worldId,
        participationId: resolution.eligibility.participationId,
        accessDecisionId: resolution.eligibility.accessDecisionId,
        nexusObjectId: resolution.eligibility.nexusObjectId,
        connectorAccountId: body.connectorAccountId,
        adapterId: "work-wallet",
        sourceApplication: "WORK_WALLET",
        externalObjectType: body.externalObjectType,
        externalRecordReference: body.externalRecordReference,
        sessionId,
      });

      res.status(201).json(issued);
    } catch (error) {
      if (error instanceof NexusContextTicketRateLimitError) {
        res.status(429).json({ error: "CONTEXT_TICKET_RATE_LIMITED" });
        return;
      }
      if (
        error instanceof NexusIdentityBindingStoreUnavailableError ||
        error instanceof NexusWorkWalletProjectMemoryStoreUnavailableError ||
        error instanceof NexusContextTicketStoreUnavailableError
      ) {
        req.log.error({ err: error }, "Work Wallet Context Ticket issue store unavailable");
        res.status(503).json({ error: "CONTEXT_TICKET_RUNTIME_UNAVAILABLE" });
        return;
      }
      throw error;
    }
  },
);

/**
 * Exact-origin single-use exchange route.
 *
 * Origin is rejected before consume. After atomic consume, current canonical
 * Project Memory is reloaded and the exact #99 access gate is run again. The
 * frozen Person/Participation/AccessDecision/Object IDs must still be the same.
 */
router.post(
  "/nexus/context-tickets/work-wallet/exchange",
  async (req: Request, res: Response) => {
    noStore(res);

    if (!isAllowedContextTicketExchangeOrigin(req)) {
      res.status(403).json({ error: "CONTEXT_TICKET_ORIGIN_REJECTED" });
      return;
    }

    const body = parseExchangeBody(req.body);
    if (!body) {
      res.status(400).json({ error: "INVALID_CONTEXT_TICKET_REQUEST" });
      return;
    }

    try {
      const consumed = await consumeNexusContextTicket(body.ticket);
      if (!consumed) {
        res.status(401).json({ error: "INVALID_CONTEXT_TICKET" });
        return;
      }

      if (
        consumed.adapterId !== "work-wallet" ||
        consumed.sourceApplication !== "WORK_WALLET" ||
        consumed.purpose !== NEXUS_CONTEXT_TICKET_PURPOSE ||
        consumed.allowedActions.length !== 1 ||
        consumed.allowedActions[0] !== NEXUS_CONTEXT_TICKET_PURPOSE
      ) {
        res.status(403).json({ error: "CONTEXT_TICKET_SCOPE_REJECTED" });
        return;
      }

      const loaded = await loadNexusWorkWalletProjectMemoryScope({
        workspaceId: consumed.workspaceId,
        personId: consumed.personId,
        projectId: consumed.projectId,
        worldId: consumed.worldId,
        connectorAccountId: consumed.connectorAccountId,
        externalObjectType: consumed.externalObjectType,
        externalRecordReference: consumed.externalRecordReference,
      });

      if (!canonicalAccountMatches(loaded.connectorAccount, consumed.connectorAccountId)) {
        res.status(403).json({ error: "CONTEXT_TICKET_ACCESS_CHANGED" });
        return;
      }

      const verifiedAt = new Date().toISOString();
      const resolution = evaluateLoadedWorkWalletScope({
        loaded,
        identity: ticketIdentity(consumed.personId),
        connectorAccountId: consumed.connectorAccountId,
        locator: {
          projectId: consumed.projectId,
          externalObjectType: consumed.externalObjectType,
          externalRecordReference: consumed.externalRecordReference,
        },
        worldId: consumed.worldId,
        evaluatedAt: verifiedAt,
      });

      if (
        resolution.status !== "ELIGIBLE" ||
        resolution.eligibility.personId !== consumed.personId ||
        resolution.eligibility.participationId !== consumed.participationId ||
        resolution.eligibility.accessDecisionId !== consumed.accessDecisionId ||
        resolution.eligibility.nexusObjectId !== consumed.nexusObjectId
      ) {
        res.status(403).json({ error: "CONTEXT_TICKET_ACCESS_CHANGED" });
        return;
      }

      const context = buildVerifiedContextFromEligibleScope({
        resolution,
        connectorAccountId: consumed.connectorAccountId,
        locator: {
          projectId: consumed.projectId,
          externalObjectType: consumed.externalObjectType,
          externalRecordReference: consumed.externalRecordReference,
        },
        canonicalPersonId: consumed.personId,
        verifiedAt,
        verificationSource: "WORK_WALLET_DEMO",
        sourceEventId: `work-wallet-context-${crypto.randomUUID()}`,
      });

      if (!context || context.nexusObjectId !== consumed.nexusObjectId) {
        res.status(403).json({ error: "CONTEXT_TICKET_CONTEXT_REJECTED" });
        return;
      }

      res.json({ context });
    } catch (error) {
      if (
        error instanceof NexusWorkWalletProjectMemoryStoreUnavailableError ||
        error instanceof NexusContextTicketStoreUnavailableError
      ) {
        req.log.error({ err: error }, "Work Wallet Context Ticket exchange store unavailable");
        res.status(503).json({ error: "CONTEXT_TICKET_RUNTIME_UNAVAILABLE" });
        return;
      }
      throw error;
    }
  },
);

export default router;
