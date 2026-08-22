import assert from "node:assert/strict";
import vm from "node:vm";
import {
  buildContextTicketBootstrapReturnTo,
  parseContextTicketBootstrapRequest,
  sendContextTicketBootstrapPage,
  type ContextTicketBootstrapRequest,
} from "../src/lib/nexus-context-ticket-bootstrap";

const EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";
const RAW_TICKET = "B".repeat(43);
const REQUEST_ID = "bootstrap_request_1234567890";

process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS =
  `chrome-extension://${EXTENSION_ID}`;

const hostileReference = "WW-REC-001</script><img-src=x>";

const parsed = parseContextTicketBootstrapRequest({
  adapterId: "work-wallet",
  projectId: "project-esafe-catania",
  worldId: "world-esafe-catania",
  connectorAccountId: "connector-work-wallet-demo",
  externalObjectType: "permit",
  externalRecordReference: hostileReference,
  extensionId: EXTENSION_ID,
  requestId: REQUEST_ID,
});

assert.ok(parsed);
assert.equal(parsed.externalRecordReference, hostileReference);
assert.equal(
  parseContextTicketBootstrapRequest({
    ...parsed,
    extensionId: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
  }),
  null,
);
assert.equal(
  parseContextTicketBootstrapRequest({
    ...parsed,
    adapterId: "other-provider",
  }),
  null,
);
assert.equal(
  parseContextTicketBootstrapRequest({
    ...parsed,
    requestId: "short",
  }),
  null,
);

const returnTo = buildContextTicketBootstrapReturnTo(parsed);
assert.ok(returnTo.startsWith("/api/nexus/context-tickets/work-wallet/bootstrap?"));
assert.ok(returnTo.includes("projectId=project-esafe-catania"));
assert.ok(returnTo.includes(`extensionId=${EXTENSION_ID}`));
assert.ok(!returnTo.includes("ticket="));
assert.ok(!returnTo.includes(RAW_TICKET));
assert.ok(!returnTo.includes("</script>"));

const headers = new Map<string, string>();
let html = "";
const response = {
  setHeader(name: string, value: string) {
    headers.set(name.toLowerCase(), value);
  },
  send(value: string) {
    html = value;
    return this;
  },
} as never;

sendContextTicketBootstrapPage(response, parsed);

assert.equal(headers.get("cache-control"), "no-store");
assert.equal(headers.get("pragma"), "no-cache");
assert.equal(headers.get("x-frame-options"), "DENY");
assert.equal(headers.get("referrer-policy"), "no-referrer");
assert.match(headers.get("content-security-policy") ?? "", /default-src 'none'/);
assert.match(headers.get("content-security-policy") ?? "", /connect-src 'self'/);
assert.match(headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
assert.ok(!html.includes("localStorage"));
assert.ok(!html.includes("sessionStorage"));
assert.ok(!html.includes("console."));
assert.ok(!html.includes(RAW_TICKET));
assert.ok(!html.includes(hostileReference));
assert.ok(html.includes("\\u003c/script\\u003e"));
assert.ok(html.includes('document.getElementById("record").textContent'));

const scriptMatch = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "bootstrap page inline script missing");

const elements = new Map([
  ["status", { textContent: "" }],
  ["project", { textContent: "" }],
  ["record", { textContent: "" }],
]);
let sentExtensionId: string | null = null;
let sentMessage: Record<string, unknown> | null = null;
let issueRequest: { url: string; init: Record<string, unknown> } | null = null;
let closeCalled = false;

const sandbox = {
  globalThis: {} as Record<string, unknown>,
  document: {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
  },
  fetch: async (url: string, init: Record<string, unknown>) => {
    issueRequest = { url, init: structuredClone(init) };
    return {
      ok: true,
      async json() {
        return {
          schema: "nexus-context-ticket/v1",
          ticket: RAW_TICKET,
          expiresAt: new Date(Date.now() + 45_000).toISOString(),
          purpose: "CONNECTOR_CONTEXT_READ",
        };
      },
    };
  },
  chrome: {
    runtime: {
      lastError: null,
      sendMessage(
        extensionId: string,
        message: Record<string, unknown>,
        callback: (response: { ok: boolean }) => void,
      ) {
        sentExtensionId = extensionId;
        sentMessage = structuredClone(message);
        callback({ ok: true });
      },
    },
  },
  window: {
    close() {
      closeCalled = true;
    },
  },
  JSON,
  Date,
  Object,
  String,
  URLSearchParams,
  setTimeout(callback: () => void) {
    callback();
    return 1;
  },
};

sandbox.globalThis = sandbox as unknown as Record<string, unknown>;
vm.runInNewContext(scriptMatch[1], sandbox);

for (let index = 0; index < 5; index += 1) {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

assert.ok(issueRequest);
assert.equal(issueRequest.url, "/api/nexus/context-tickets/work-wallet");
assert.equal(issueRequest.init.method, "POST");
assert.equal(issueRequest.init.credentials, "include");
assert.equal(issueRequest.init.cache, "no-store");
const issueBody = JSON.parse(String(issueRequest.init.body));
assert.deepEqual(issueBody, {
  projectId: parsed.projectId,
  worldId: parsed.worldId,
  connectorAccountId: parsed.connectorAccountId,
  externalObjectType: parsed.externalObjectType,
  externalRecordReference: parsed.externalRecordReference,
});
assert.equal(sentExtensionId, EXTENSION_ID);
assert.ok(sentMessage);
assert.equal(sentMessage.type, "NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1");
assert.equal(sentMessage.requestId, REQUEST_ID);
assert.equal(sentMessage.ticket, RAW_TICKET);
assert.equal(sentMessage.projectId, parsed.projectId);
assert.equal(sentMessage.worldId, parsed.worldId);
assert.equal(sentMessage.connectorAccountId, parsed.connectorAccountId);
assert.equal(sentMessage.externalRecordReference, parsed.externalRecordReference);
assert.equal(elements.get("status")?.textContent, "Authorised. You can return to Work Wallet.");
assert.equal(elements.get("project")?.textContent, parsed.projectId);
assert.equal(elements.get("record")?.textContent, parsed.externalRecordReference);
assert.equal(closeCalled, true);

process.stdout.write("WORK_WALLET_CONTEXT_TICKET_BOOTSTRAP_PASS\n");
