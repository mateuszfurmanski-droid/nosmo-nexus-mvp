import assert from "node:assert/strict";
import type { Request } from "express";
import { isNexusCorsOriginAllowed } from "../src/lib/nexus-cors";
import { isAllowedContextTicketExchangeOrigin } from "../src/lib/nexus-context-ticket-origin";

function request(origin: string): Request {
  return { headers: { origin } } as unknown as Request;
}

const approvedExtension = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
const corsOnlyExtension = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const corsOnlyWeb = "https://cors-only.example";
const sameOriginWeb = "https://nexus.example";

const previous = {
  nodeEnv: process.env.NODE_ENV,
  cors: process.env.NEXUS_CORS_ALLOWED_ORIGINS,
  context: process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS,
  same: process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS,
};

try {
  process.env.NODE_ENV = "production";
  process.env.NEXUS_CORS_ALLOWED_ORIGINS = [corsOnlyExtension, corsOnlyWeb].join(",");
  process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = approvedExtension;
  process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS = sameOriginWeb;

  assert.equal(isNexusCorsOriginAllowed(approvedExtension), true);
  assert.equal(isAllowedContextTicketExchangeOrigin(request(approvedExtension)), true);

  assert.equal(isNexusCorsOriginAllowed(corsOnlyExtension), true);
  assert.equal(isAllowedContextTicketExchangeOrigin(request(corsOnlyExtension)), false);

  assert.equal(isNexusCorsOriginAllowed(corsOnlyWeb), true);
  assert.equal(isAllowedContextTicketExchangeOrigin(request(corsOnlyWeb)), false);

  assert.equal(isAllowedContextTicketExchangeOrigin(request(sameOriginWeb)), true);
  assert.equal(isNexusCorsOriginAllowed(sameOriginWeb), false);

  assert.equal(isNexusCorsOriginAllowed("chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), false);
  assert.equal(
    isAllowedContextTicketExchangeOrigin(
      request("chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    ),
    false,
  );

  process.stdout.write("WORK_WALLET_CONTEXT_TICKET_CORS_BOUNDARY_PASS\n");
} finally {
  if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous.nodeEnv;
  if (previous.cors === undefined) delete process.env.NEXUS_CORS_ALLOWED_ORIGINS;
  else process.env.NEXUS_CORS_ALLOWED_ORIGINS = previous.cors;
  if (previous.context === undefined) delete process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS;
  else process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = previous.context;
  if (previous.same === undefined) delete process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS;
  else process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS = previous.same;
}
