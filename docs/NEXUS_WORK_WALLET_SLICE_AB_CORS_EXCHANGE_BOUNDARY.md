# Work Wallet Slice AB — CORS versus exchange authority

Status: `VALIDATION IMPLEMENTED / ISOLATED PASS`

## Purpose

The unified Express runtime applies global CORS before API routes. Approved Chromium extension origins used by the Work Wallet Context Ticket exchange must therefore be able to pass the transport layer, but CORS configuration must never itself grant Context Ticket authority.

## Existing runtime behavior

`getNexusCorsAllowedOrigins()` includes:

- general `NEXUS_CORS_ALLOWED_ORIGINS`; and
- exact origins from `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`.

The Context Ticket exchange route separately requires `isAllowedContextTicketExchangeOrigin()`.

After Slice Y, `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS` accepts only exact Chromium extension origins. Web same-origin authority remains separate in `NEXUS_CONTEXT_TICKET_SAME_ORIGINS`.

## Regression

Adds:

`validate:work-wallet-context-ticket-cors`

The test verifies:

1. exact reviewed extension origin in Context Ticket allowlist -> CORS allowed AND exchange allowed;
2. different extension origin present only in general CORS -> transport allowed, exchange denied;
3. web origin present only in general CORS -> transport allowed, exchange denied;
4. exact server same-origin web origin -> exchange allowed through same-origin policy without requiring CORS;
5. unknown extension origin -> denied by both layers.

Therefore:

`CORS ALLOW != CONTEXT TICKET AUTHORITY`

## Validation

An isolated boundary harness completed with:

`WORK_WALLET_CONTEXT_TICKET_CORS_BOUNDARY_PASS`

The validator is wired into normal `Validate and Build`.

GitHub-hosted CI PASS is not claimed while repository Actions remains affected by runner-startup failures.

## Current truth

- extension transport/authority separation: isolated PASS;
- production Nexus API host: NOT ENABLED;
- remote production API preflight: NOT RUN;
- safe Nexus MVP development Postgres: NOT IDENTIFIED;
- DB schema: NOT APPLIED;
- DB-backed Context Ticket smoke: NOT RUN;
- unpacked Chrome E2E: BLOCKED by current container browser policy;
- authorised Work Wallet portal smoke: PENDING.

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No deployment, DB mutation, external Work Wallet write, #91 change or protected UI change is included.
