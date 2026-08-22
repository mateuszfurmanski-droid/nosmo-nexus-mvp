import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
  NexusContextTicketRateLimitError,
  NexusContextTicketStoreUnavailableError,
} from "../lib/nexus-context-ticket";
import {
  exchangeWorkWalletContextTicketService,
  issueWorkWalletContextTicketService,
  productionWorkWalletContextTicketSourceEventId,
  type WorkWalletContextTicketServiceDependencies,
} from "../lib/work-wallet-context-ticket-service";

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

const serviceDependencies: WorkWalletContextTicketServiceDependencies = {
  resolvePersonBinding: resolveNexusPersonBinding,
  loadProjectMemoryScope: loadNexusWorkWalletProjectMemoryScope,
  issueTicket: issueNexusContextTicket,
  consumeTicket: consumeNexusContextTicket,
  createSourceEventId: productionWorkWalletContextTicketSourceEventId,
};

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
  return safeString(ticket, 64) ? { ticket } : null;
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

function requireContextTicketIssueSameOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  noStore(res);
  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: "CONTEXT_TICKET_SAME_ORIGIN_REQUIRED" });
    return;
  }
  next();
}

/**
 * Same-origin authenticated issue route.
 *
 * HTTP gates stay here. Canonical Person binding, exact mapping/access and ticket
 * issuance are delegated to one server-owned orchestration service.
 */
router.post(
  "/nexus/context-tickets/work-wallet",
  requireContextTicketIssueSameOrigin,
  requireWorkspace,
  async (req: Request, res: Response) => {
    noStore(res);

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
      const result = await issueWorkWalletContextTicketService(serviceDependencies, {
        workspaceId: req.workspaceId,
        providerSubject: req.user.id,
        sessionId,
        locator: body,
      });

      if (result.status === "IDENTITY_UNBOUND") {
        res.status(403).json({ error: "NEXUS_IDENTITY_UNBOUND" });
        return;
      }

      if (result.status === "NOT_AUTHORIZED") {
        req.log.info(
          { reason: result.reason },
          "Work Wallet Context Ticket denied by canonical domain gate",
        );
        res.status(403).json({ error: "CONTEXT_TICKET_NOT_AUTHORIZED" });
        return;
      }

      res.status(201).json(result.issued);
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
 * Origin is rejected before the service can consume a ticket. The service then
 * reloads current canonical state, re-runs access and requires the frozen scope
 * to match before a sanitized verified context can be returned.
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
      const result = await exchangeWorkWalletContextTicketService(
        serviceDependencies,
        body.ticket,
      );

      switch (result.status) {
        case "INVALID_TICKET":
          res.status(401).json({ error: "INVALID_CONTEXT_TICKET" });
          return;
        case "SCOPE_REJECTED":
          res.status(403).json({ error: "CONTEXT_TICKET_SCOPE_REJECTED" });
          return;
        case "ACCESS_CHANGED":
          res.status(403).json({ error: "CONTEXT_TICKET_ACCESS_CHANGED" });
          return;
        case "CONTEXT_REJECTED":
          res.status(403).json({ error: "CONTEXT_TICKET_CONTEXT_REJECTED" });
          return;
        case "VERIFIED_CONTEXT":
          res.json({ context: result.context });
          return;
      }
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
