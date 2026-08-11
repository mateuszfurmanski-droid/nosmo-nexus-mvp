import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const schema = read("lib/db/src/schema/nexus-context-ticket.ts");
const store = read("artifacts/api-server/src/lib/nexus-context-ticket.ts");
const origins = read("artifacts/api-server/src/lib/nexus-context-ticket-origin.ts");
const route = read("artifacts/api-server/src/routes/nexus-context-tickets.ts");
const routeIndex = read("artifacts/api-server/src/routes/index.ts");
const workWalletRuntime = read("artifacts/api-server/src/lib/work-wallet-runtime.ts");
const workWalletApi = read("scripts/src/work-wallet-api.mjs");
const app = read("artifacts/api-server/src/app.ts");

assert(schema.includes('pgTable(\n  "nexus_context_tickets"'), "ticket table missing");
assert(schema.includes('ticketDigest: varchar("ticket_digest", { length: 64 }).primaryKey()'), "ticket digest PK missing");
assert(!/rawTicket|raw_ticket|ticketValue|ticket_value/.test(schema), "raw ticket must not be persisted");
assert(schema.includes('issuedSessionDigest: varchar("issued_session_digest", { length: 64 })'), "session digest missing");
assert(schema.includes('default("CONNECTOR_CONTEXT_READ")'), "ticket purpose must be fixed");

assert(store.includes("const TICKET_BYTES = 32"), "ticket must use 256-bit random input");
assert(store.includes("const TICKET_TTL_MS = 60_000"), "ticket TTL must be 60 seconds");
assert(store.includes('crypto.randomBytes(TICKET_BYTES).toString("base64url")'), "opaque random ticket generation missing");
assert(store.includes('crypto.createHash("sha256")'), "ticket/session digest hashing missing");
assert(store.includes("isNull(nexusContextTicketsTable.consumedAt)"), "single-use consumed gate missing");
assert(store.includes("gt(nexusContextTicketsTable.expiresAt, now)"), "expiry gate missing");
assert(store.includes(".set({ consumedAt: now })"), "atomic consume update missing");
assert(store.includes("MAX_TICKETS_PER_PERSON_PROJECT_WINDOW"), "server-side issue rate limit missing");

assert(route.includes('router.post("/nexus/context-tickets"'), "ticket issue route missing");
assert(route.includes('"/nexus/context-tickets/exchange"'), "ticket exchange route missing");
assert(route.includes("isSameOriginRequest(req)"), "ticket issue must require same origin");
assert(route.includes("req.isAuthenticated()"), "ticket issue must require authenticated session");
assert(route.includes("resolveNexusPersonBinding(req.user.id)"), "ticket issue must resolve canonical Person server-side");
assert(route.includes('resolveNexusProjectApplicationAccess(\n      person.personId,\n      nexusProjectId,\n      "work-wallet"'), "ticket issue must authorize project server-side");
assert(route.includes('source: "WORK_WALLET"'), "ticket must use live connector context, not demo context");
assert(route.includes("getSessionId(req)"), "ticket issue must bind to the current server session digest");
assert(route.includes("isAllowedContextTicketExchangeOrigin(req)"), "exchange exact-origin gate missing");
assert(route.includes("consumeNexusContextTicket(rawTicket)"), "exchange must consume ticket before returning context");
assert(route.includes("access.participationId !== ticket.participationId"), "exchange must re-check same active participation");
assert(!route.includes("NEXUS_INTEGRATION_KEY"), "browser ticket route must never use inbound connector credential");
assert(!route.includes("x-nexus-integration-key"), "browser ticket route must never send inbound connector credential");

assert(origins.includes("NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS"), "ticket exchange allowlist env missing");
assert(origins.includes("chrome-extension:\\/\\/"), "Chrome extension origin support missing");
for (const forbiddenWildcard of [
  'allowed.add("*")',
  '"*://"',
  '"https://*"',
  '"http://*"',
  '"<all_urls>"',
]) {
  assert(
    !origins.includes(forbiddenWildcard),
    `ticket origin policy must not grant wildcard authority: ${forbiddenWildcard}`,
  );
}

assert(workWalletApi.includes("export function resolveStoredWorkWalletContext"), "internal connector context resolver missing");
assert(workWalletRuntime.includes("resolveWorkWalletConnectorContext"), "unified runtime connector context bridge missing");

const ticketMount = routeIndex.indexOf("router.use(nexusContextTicketsRouter)");
const workspaceGate = routeIndex.indexOf("router.use(requireWorkspace)");
assert(ticketMount >= 0 && workspaceGate >= 0 && ticketMount < workspaceGate, "ticket routes must be mounted before legacy workspace gate");

assert(app.includes("url: req.url?.split(\"?\")[0]"), "request logger must omit query strings");
assert(!app.includes("req.body"), "global logger must not log request bodies");

console.log("PASS validate-nexus-context-ticket");
