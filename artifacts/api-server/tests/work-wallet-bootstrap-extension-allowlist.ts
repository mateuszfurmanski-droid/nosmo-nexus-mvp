import assert from "node:assert/strict";
import { parseContextTicketBootstrapRequest } from "../src/lib/nexus-context-ticket-bootstrap";

const APPROVED_EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";
const UNAPPROVED_VALID_EXTENSION_ID = "pppppppppppppppppppppppppppppppp";
const REQUEST_ID = "bootstrap_allowlist_1234567890";

const query = {
  adapterId: "work-wallet",
  projectId: "project-work-wallet-dev",
  worldId: "world-work-wallet-dev",
  connectorAccountId: "connector-work-wallet-dev",
  externalObjectType: "permit",
  externalRecordReference: "WW-PERMIT-001",
  extensionId: APPROVED_EXTENSION_ID,
  requestId: REQUEST_ID,
};

const previousAllowedOrigins = process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS;

try {
  process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS =
    `chrome-extension://${APPROVED_EXTENSION_ID}`;

  assert.ok(parseContextTicketBootstrapRequest(query));

  assert.equal(
    parseContextTicketBootstrapRequest({
      ...query,
      extensionId: UNAPPROVED_VALID_EXTENSION_ID,
    }),
    null,
    "a syntactically valid but unapproved extension ID must be rejected",
  );

  process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = [
    `chrome-extension://${APPROVED_EXTENSION_ID}`,
    `chrome-extension://${UNAPPROVED_VALID_EXTENSION_ID}`,
  ].join(",");

  const explicitlyApproved = parseContextTicketBootstrapRequest({
    ...query,
    extensionId: UNAPPROVED_VALID_EXTENSION_ID,
  });
  assert.ok(explicitlyApproved);
  assert.equal(explicitlyApproved.extensionId, UNAPPROVED_VALID_EXTENSION_ID);

  process.stdout.write("WORK_WALLET_BOOTSTRAP_EXTENSION_ALLOWLIST_PASS\n");
} finally {
  if (previousAllowedOrigins === undefined) {
    delete process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS;
  } else {
    process.env.NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS = previousAllowedOrigins;
  }
}
