import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = await fs.readFile(
  path.join(here, "../src/routes/work-wallet-context-tickets.ts"),
  "utf8",
);
const originSource = await fs.readFile(
  path.join(here, "../src/lib/request-origin.ts"),
  "utf8",
);
const exchangeOriginSource = await fs.readFile(
  path.join(here, "../src/lib/nexus-context-ticket-origin.ts"),
  "utf8",
);

const exchangeRouteStart = routeSource.indexOf(
  '"/nexus/context-tickets/work-wallet/exchange"',
);
const originReject = routeSource.indexOf(
  "if (!isAllowedContextTicketExchangeOrigin(req))",
  exchangeRouteStart,
);
const parseBody = routeSource.indexOf("const body = parseExchangeBody(req.body)", exchangeRouteStart);
const exchangeService = routeSource.indexOf(
  "exchangeWorkWalletContextTicketService(",
  exchangeRouteStart,
);

assert.ok(exchangeRouteStart >= 0, "exchange route must exist");
assert.ok(originReject > exchangeRouteStart, "exchange route must reject origin");
assert.ok(parseBody > originReject, "origin must be rejected before ticket body parsing");
assert.ok(
  exchangeService > parseBody,
  "origin and request parsing must complete before ticket consume/orchestration",
);

const issueRouteStart = routeSource.indexOf('"/nexus/context-tickets/work-wallet"');
const issueSameOriginMiddleware = routeSource.indexOf(
  "requireContextTicketIssueSameOrigin",
  issueRouteStart,
);
const issueWorkspaceMiddleware = routeSource.indexOf("requireWorkspace", issueRouteStart);
assert.ok(issueRouteStart >= 0, "issue route must exist");
assert.ok(
  issueSameOriginMiddleware > issueRouteStart &&
    issueWorkspaceMiddleware > issueSameOriginMiddleware,
  "same-origin rejection must occur before workspace/auth side effects",
);

assert.ok(
  originSource.includes("NEXUS_CONTEXT_TICKET_SAME_ORIGINS"),
  "same-origin web authority must be server-configured",
);
assert.ok(
  originSource.includes("parseContextTicketSameOrigins().has(declared)"),
  "same-origin authorization must be exact-set membership",
);
assert.equal(
  /x-forwarded-host|x-forwarded-proto/i.test(originSource),
  false,
  "forwarded headers must not participate in Context Ticket origin authority",
);
assert.equal(
  /req\.headers\[\s*["']host["']\s*\]/i.test(originSource),
  false,
  "Host header must not participate in Context Ticket origin authority",
);
assert.ok(
  exchangeOriginSource.includes("parseContextTicketAllowedOrigins().has(origin)"),
  "extension/web exchange origins must use exact configured set membership",
);
assert.equal(
  /startsWith\(|endsWith\(|includes\(/.test(
    exchangeOriginSource.slice(
      exchangeOriginSource.indexOf("isAllowedContextTicketExchangeOrigin"),
    ),
  ),
  false,
  "exchange origin authorization must not use prefix/suffix/substring matching",
);

process.stdout.write("WORK_WALLET_CONTEXT_TICKET_ORIGIN_ORDER_AUDIT_PASS\n");
