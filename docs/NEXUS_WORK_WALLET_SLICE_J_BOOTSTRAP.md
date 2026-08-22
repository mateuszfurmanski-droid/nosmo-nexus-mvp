# Work Wallet Slice J — Authenticated Browser Bootstrap

Status: `IMPLEMENTED / EXTENSION RECEIVER PENDING / DB_SCHEMA_NOT_APPLIED`

## Purpose

Reconcile the authenticated bootstrap behavior from historical PR #61 onto the current #90-native Work Wallet ticket route without exposing the raw Context Ticket in navigation state or browser storage.

## Bootstrap route

`GET /api/nexus/context-tickets/work-wallet/bootstrap`

Allowed query metadata is non-secret only:

- `adapterId=work-wallet`;
- `projectId`;
- `worldId`;
- `connectorAccountId`;
- `externalObjectType`;
- `externalRecordReference`;
- exact Chromium `extensionId`;
- opaque non-secret `requestId`.

The exact extension origin must already be configured in `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`.

## Authentication hand-off

If the Nexus browser session is absent, bootstrap redirects through the existing `/api/login` flow using the existing safe relative `returnTo` contract. The return URL contains the same non-secret metadata only.

After authentication, the page POSTs same-origin to:

`POST /api/nexus/context-tickets/work-wallet`

The server still owns Person binding, workspace, mapping, Project Participation, PermissionGrant and AccessDecision authority.

## Ticket secrecy

The bootstrap page:

- never places the raw ticket in the URL/query string;
- never writes the raw ticket to `localStorage`;
- never writes the raw ticket to `sessionStorage`;
- never logs the raw ticket;
- keeps it in a local JavaScript variable only;
- deletes the parsed response ticket field;
- transfers the raw value directly with `chrome.runtime.sendMessage(extensionId, ...)`;
- clears both message and local ticket variables after the extension callback.

## Page hardening

- `Cache-Control: no-store` + `Pragma: no-cache`;
- nonce-based CSP;
- `default-src 'none'`;
- `connect-src 'self'`;
- no forms / frames / base URI;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- same-origin COOP/CORP;
- dynamic project / external-reference text is inserted through DOM `textContent`, not raw HTML interpolation.

## Next slice

Reconcile the memory-only MV3 extension receiver from historical PR #63 onto the current #18/#52 lineage:

1. validate the bootstrap sender and request metadata;
2. keep the raw ticket memory-only;
3. remove pending non-secret request state before exchange;
4. perform one exchange POST with `credentials: omit`;
5. clear the raw ticket variable;
6. persist only sanitized `nexus-work-wallet-context/v1`;
7. clear stale context when the selected Work Wallet record changes.

## Current truth

No DB schema has been applied and no browser extension smoke has run on this stack yet.

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`
