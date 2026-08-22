# Work Wallet Slice N — Authenticated Bootstrap Behavioral Validation

Status: `IMPLEMENTED / ISOLATED BEHAVIORAL PASS / FULL BROWSER E2E BLOCKED`

## Purpose

Validate the current authenticated Nexus bootstrap hand-off as executable behavior rather than source inspection only.

The bootstrap remains the bridge between:

`authenticated Nexus browser session -> same-origin ticket issue -> direct extension runtime message`

No raw Context Ticket is placed in the URL or Web Storage.

## Behavioral validator

`artifacts/api-server/tests/work-wallet-context-ticket-bootstrap.ts`

The validator exercises the current bootstrap parser/page generator and then executes the generated inline bootstrap script in a VM with:

- fake DOM nodes;
- fake same-origin ticket issue response;
- fake approved Chromium extension runtime;
- no localStorage/sessionStorage implementation.

Expected marker:

`WORK_WALLET_CONTEXT_TICKET_BOOTSTRAP_PASS`

## Assertions

The test verifies:

- exact `work-wallet` adapter requirement;
- exact 32-character Chromium extension ID format;
- extension origin must already exist in the server allowlist;
- short/invalid request IDs are rejected;
- login `returnTo` is a relative Nexus bootstrap path;
- `returnTo` contains non-secret metadata only and no raw ticket;
- hostile-looking external record text is URL-encoded in returnTo;
- page headers include `no-store`, `no-cache`, `X-Frame-Options: DENY`, `no-referrer` and nonce CSP;
- CSP keeps `default-src 'none'`, `connect-src 'self'` and `frame-ancestors 'none'`;
- generated page contains no `localStorage`, `sessionStorage` or console logging;
- dynamic external record text is JS-escaped and rendered through `textContent`, not raw HTML;
- page issues the ticket through the same-origin Work Wallet issue endpoint with `credentials: include` and `cache: no-store`;
- the raw 43-character ticket is sent directly to the exact extension ID in `NEXUS_CONTEXT_TICKET_BOOTSTRAP_V1`;
- the message includes exact project/world/connector/type/reference handshake metadata;
- successful extension acknowledgement updates the status and closes the bootstrap page.

## Local isolated result

The current behavior was reconstructed in an isolated TypeScript mirror, compiled and executed successfully on 2026-08-22:

`WORK_WALLET_CONTEXT_TICKET_BOOTSTRAP_PASS`

This is an isolated behavioral PASS, not a claim of live OIDC/PostgreSQL/Chrome end-to-end operation.

## Workflow cleanup

The latest integration branch restores `Validate and Build` push triggers to `main` only, while preserving normal PR and manual dispatch triggers.

Temporary K/L/M branch-specific validation triggers were used only to diagnose GitHub Actions. They repeatedly failed before any job step (`steps=null`) and are not retained as the final workflow configuration.

The workflow now contains the Work Wallet validation sequence:

1. MV3 extension receiver;
2. Context Ticket core;
3. canonical mapping/access/ticket pipeline;
4. authenticated bootstrap;
5. workspace typecheck/build/runtime smoke.

## Remaining external blockers

- verified non-production `nosmo-nexus-mvp` PostgreSQL target and schema application;
- real Nexus OIDC + canonical Person binding data;
- unpacked Chrome browser smoke (current container Chromium is admin-blocked);
- Edge smoke;
- authorised real Work Wallet portal smoke.

External capability remains:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write, deployment or protected UI/Spark change is included.
