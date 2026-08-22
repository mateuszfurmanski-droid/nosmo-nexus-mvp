import assert from "node:assert/strict";
import type { Request } from "express";
import {
  getRequestDeclaredOrigin,
  isSameOriginRequest,
  parseContextTicketSameOrigins,
} from "../src/lib/request-origin";
import {
  isAllowedContextTicketExchangeOrigin,
  parseContextTicketAllowedOrigins,
} from "../src/lib/nexus-context-ticket-origin";

function request(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

const previousNodeEnv = process.env.NODE_ENV;
const previousSameOrigins = process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS;
const previousExchangeOrigins = process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS;

try {
  process.env.NODE_ENV = "production";
  process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS = [
    "https://nexus.example",
    "https://secondary.example",
    "http://127.0.0.1:3000",
    "https://invalid.example/path",
  ].join(",");

  const sameOrigins = parseContextTicketSameOrigins();
  assert.deepEqual(
    [...sameOrigins].sort(),
    ["https://nexus.example", "https://secondary.example"].sort(),
  );

  assert.equal(
    isSameOriginRequest(request({ origin: "https://nexus.example" })),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://nexus.example.evil.test",
        "x-forwarded-host": "nexus.example.evil.test",
        "x-forwarded-proto": "https",
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://evil.test",
        "x-forwarded-host": "evil.test",
        "x-forwarded-proto": "https",
        host: "evil.test",
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://nexus.example",
        "x-forwarded-host": "evil.test",
        "x-forwarded-proto": "http",
        host: "evil.test",
      }),
    ),
    true,
  );
  assert.equal(
    isSameOriginRequest(request({ referer: "https://nexus.example/bootstrap?x=1" })),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      request({
        origin: "https://nexus.example",
        referer: "https://evil.test/bootstrap",
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(request({ origin: "https://nexus.example:444" })),
    false,
  );
  assert.equal(isSameOriginRequest(request({ origin: "null" })), false);
  assert.equal(isSameOriginRequest(request({})), false);

  const extensionId = "abcdefghijklmnopabcdefghijklmnop";
  const extensionOrigin = `chrome-extension://${extensionId}`;
  process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = [
    extensionOrigin,
    "https://exchange.example",
    "https://exchange.example/path",
    "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaq",
  ].join(",");

  const exchangeOrigins = parseContextTicketAllowedOrigins();
  assert.equal(exchangeOrigins.has(extensionOrigin), true);
  assert.equal(exchangeOrigins.has("https://exchange.example"), true);
  assert.equal(exchangeOrigins.has("https://exchange.example/path"), false);

  assert.equal(
    getRequestDeclaredOrigin(request({ origin: extensionOrigin })),
    extensionOrigin,
  );
  assert.equal(
    isAllowedContextTicketExchangeOrigin(request({ origin: extensionOrigin })),
    true,
  );
  assert.equal(
    isAllowedContextTicketExchangeOrigin(
      request({ origin: `${extensionOrigin}.evil.test` }),
    ),
    false,
  );
  assert.equal(
    isAllowedContextTicketExchangeOrigin(request({ origin: "https://exchange.example" })),
    true,
  );
  assert.equal(
    isAllowedContextTicketExchangeOrigin(
      request({ origin: "https://exchange.example.evil.test" }),
    ),
    false,
  );
  assert.equal(
    isAllowedContextTicketExchangeOrigin(request({ origin: "https://nexus.example" })),
    true,
  );

  process.env.NODE_ENV = "development";
  process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS = "";
  assert.equal(
    parseContextTicketSameOrigins().has("http://127.0.0.1:3000"),
    true,
  );
  assert.equal(
    isSameOriginRequest(request({ origin: "http://127.0.0.1:3000" })),
    true,
  );
  assert.equal(
    isSameOriginRequest(request({ origin: "http://localhost:3000" })),
    false,
  );

  process.stdout.write("WORK_WALLET_CONTEXT_TICKET_ORIGIN_BOUNDARY_PASS\n");
} finally {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;

  if (previousSameOrigins === undefined) {
    delete process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS;
  } else {
    process.env.NEXUS_CONTEXT_TICKET_SAME_ORIGINS = previousSameOrigins;
  }

  if (previousExchangeOrigins === undefined) {
    delete process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS;
  } else {
    process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = previousExchangeOrigins;
  }
}
