# Work Wallet Slice Z — API host truth

Status: `IMPLEMENTED / ISOLATED VALIDATION PASS / PRODUCTION API HOST NOT ENABLED`

## Purpose

The canonical MV3 extension previously treated `https://nosmotechnology.co.uk` as a Nexus API base in four places:

- extension `host_permissions`;
- `externally_connectable` bootstrap matches;
- service-worker `ALLOWED_API_BASES`;
- extension options UI.

That host is currently owned by the static `NOSMO-website` publishing surface. The `nosmo-nexus-mvp` repository separately defines the unified Express API runtime and a Replit application deployment target. There is no verified evidence that the static website origin currently routes the Work Wallet Context Ticket API to that unified runtime.

A static public website must not be represented as a production connector API merely because it shares the NOSMO brand/domain.

## Slice Z change

Until an exact reviewed HTTPS deployment of the unified API runtime exists, the extension accepts only:

`http://127.0.0.1:3000`

for its Nexus Context Ticket API base.

The static website host is removed from:

- `manifest.host_permissions`;
- `manifest.externally_connectable.matches`;
- service-worker API allowlist;
- options-page API choices.

The Work Wallet portal host remains only as the exact content-script host:

`https://portal.work-wallet.com/*`

## Production activation rule

A future production Nexus API origin must not be added until all of the following are true:

1. the unified API server is actually deployed on that exact HTTPS origin;
2. `/health` identifies the Nexus unified runtime;
3. the authenticated Work Wallet bootstrap route is served by that runtime;
4. server `NEXUS_CONTEXT_TICKET_SAME_ORIGINS` contains the exact web origin;
5. server `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS` contains only the reviewed exact Chromium extension origin(s);
6. extension `host_permissions`, `externally_connectable`, options and service-worker API allowlist all use the same reviewed API origin;
7. DB preflight/readiness passes against the separately approved non-production Nexus MVP database before DB-backed connector smoke;
8. no static website mirror is used as authority for an API runtime unless an explicit reviewed reverse-proxy/runtime deployment makes that statement true.

## Validation

Adds:

`tools/nexus-overlay-extension/tests/validate-api-host-truth.mjs`

It verifies:

- the static `nosmotechnology.co.uk` website origin is absent from all extension API-authority surfaces;
- extension API permission is loopback-only;
- externally connectable bootstrap is loopback-only;
- the options UI explicitly states that no production Nexus API host is enabled.

An isolated Node execution completed with:

`WORK_WALLET_API_HOST_TRUTH_PASS`

GitHub-hosted CI PASS is not claimed while the repository runner continues to fail before steps execute.

## Current connector truth

- local connector code path: implemented;
- isolated ticket/access/bootstrap/receiver/origin validations: PASS where explicitly recorded;
- production Nexus API origin: NOT ENABLED;
- safe Nexus MVP development Postgres: NOT IDENTIFIED;
- DB schema: NOT APPLIED;
- DB-backed Context Ticket smoke: NOT RUN;
- unpacked Chrome E2E: BLOCKED by current container browser policy;
- authorised real Work Wallet portal smoke: PENDING.

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No deployment, DB mutation, external Work Wallet write, #91 change or protected UI change is included.
